import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import axios from 'axios';
import { createClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto';
import { AIOrchestrator } from '@/lib/ai';

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET && process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const results: any[] = [];
  const reminderResults: any[] = [];

  try {
    // 1. Process Overdue Sales Order Payment Reminders (> 3 days unpaid/partially paid)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: overdueOrders } = await supabase
      .from('sales_orders')
      .select('*')
      .in('payment_status', ['unpaid', 'partially_paid'])
      .lt('order_date', threeDaysAgo)
      .limit(50);

    if (overdueOrders && overdueOrders.length > 0) {
      for (const order of overdueOrders) {
        // Check if user has auto payment reminders enabled in user_configs
        const { data: config } = await supabase
          .from('user_configs')
          .select('auto_payment_reminders')
          .eq('user_id', order.owner_id)
          .maybeSingle();

        if (config && config.auto_payment_reminders === false) {
          continue; // Skipped by user preference
        }

        const balance = Number(order.balance_due ?? order.total_amount ?? 0);
        const invNo = `INV-${order.id.slice(-6).toUpperCase()}`;
        const phone = (order.customer_phone || '').replace(/\D/g, '');
        const messageText = `Hello ${order.customer_name || 'Customer'},\n\nThis is a gentle payment reminder from our store regarding invoice ${invNo}.\nAmount due: ₹${balance.toLocaleString('en-IN')}.\nKindly settle the balance at your earliest convenience.\n\nThank you!`;
        const waLink = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}` : null;

        // Create notification entry for business owner
        await supabase.from('notifications').insert({
          owner_id: order.owner_id,
          user_id: order.created_by || order.owner_id,
          action_type: 'payment_reminder',
          entity_type: 'order',
          entity_id: order.id,
          message: `⏰ Payment Reminder generated for ${order.customer_name || 'Customer'} (${invNo} - ₹${balance.toLocaleString('en-IN')} overdue)`,
        });

        reminderResults.push({
          orderId: order.id,
          customerName: order.customer_name,
          phone: order.customer_phone,
          balance,
          waLink,
        });
      }
    }

    // 2. Process CRM Follow-up Automation Jobs
    const { data: jobs } = await supabase
      .from('automation_jobs')
      .select('*, leads(*)')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .is('locked_until', null)
      .limit(10);

    if (jobs?.length) {
      const processJob = async (job: any) => {
        const lead = job.leads;
        if (!lead) return;

        await supabase.from('automation_jobs').update({ 
          locked_until: new Date(Date.now() + 5 * 60 * 1000).toISOString() 
        }).eq('id', job.id);

        try {
          const { data: config } = await supabase.from('user_configs').select('*').eq('user_id', job.user_id).single();
          if (!config) throw new Error('Configuration missing for this user.');

          const { data: history } = await supabase
            .from('messages')
            .select('direction, content')
            .eq('lead_id', lead.id)
            .order('sent_at', { ascending: true })
            .limit(10);

          const ai = new AIOrchestrator();
          const personalizedMsg = await ai.generateFollowUp(lead, history || []);

          const resendKey = decrypt(config.resend_key_encrypted);
          const fromEmail = config.from_email || 'onboarding@resend.dev';

          let sent = false;
          if (lead.email && resendKey) {
            const resend = new Resend(resendKey);
            await resend.emails.send({
              from: `Founder CRM <${fromEmail}>`,
              to: [lead.email],
              subject: `Re: Our connection`,
              text: personalizedMsg
            });
            sent = true;
          } else if (lead.phone && config.whatsapp_token_encrypted) {
            await axios.post(`https://graph.facebook.com/v19.0/${config.whatsapp_phone_number_id}/messages`, {
              messaging_product: "whatsapp",
              to: lead.phone.replace(/[^0-9]/g, ''),
              type: "text",
              text: { body: personalizedMsg }
            }, { headers: { 'Authorization': `Bearer ${decrypt(config.whatsapp_token_encrypted)}` } });
            sent = true;
          }

          if (sent) {
            await supabase.from('messages').insert({
              lead_id: lead.id,
              direction: 'outbound',
              channel: lead.email ? 'email' : 'whatsapp',
              content: personalizedMsg,
              metadata: { job_id: job.id, type: 'ai_followup' }
            });

            await supabase.from('automation_jobs').update({ status: 'completed', executed_at: new Date().toISOString() }).eq('id', job.id);
            return { leadId: lead.id, status: 'sent' };
          } else {
            throw new Error('No valid channel or missing credentials to send follow-up.');
          }
        } catch (jobErr: any) {
          console.error(`[Follow-up Job Error] Lead: ${lead.id}`, jobErr.message);
          await supabase.from('automation_jobs').update({ 
            status: 'failed', 
            locked_until: null,
            error_message: jobErr.message 
          }).eq('id', job.id);
          throw jobErr;
        }
      };

      const jobResults = await Promise.allSettled(jobs.map(processJob));
      for (const res of jobResults) {
        if (res.status === 'fulfilled' && res.value) {
          results.push(res.value);
        }
      }
    }

    return NextResponse.json({
      success: true,
      overdue_reminders_processed: reminderResults.length,
      overdue_reminders: reminderResults,
      crm_jobs_processed: results.length,
      crm_results: results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

