import { createClient } from "@/lib/supabase/client"

const supabase = () => createClient()

export async function getPayments(
  referenceType: string,
  referenceId: string
) {
  if (!referenceId) return []
  const { data, error } = await supabase()
    .from('payment_transactions')
    .select('*')
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("getPayments error:", error)
    throw new Error(error.message || error.details || "Failed to fetch payments")
  }
  return data || []
}

export async function recordPayment(payment: {
  owner_id?: string
  created_by?: string
  reference_type: string
  reference_id: string
  amount: number
  payment_method: string
  payment_date: string
  notes?: string
  cheque_number?: string
  cheque_date?: string
  cheque_bank?: string
}) {
  const client = supabase()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error("User not authenticated")

  let resolvedOwnerId = payment.owner_id
  if (!resolvedOwnerId) {
    const { data: prof } = await client.from("profiles").select("id, role, owner_id").eq("id", user.id).single()
    resolvedOwnerId = prof?.role === "owner" ? user.id : (prof?.owner_id || user.id)
  }

  const payload = {
    ...payment,
    owner_id: resolvedOwnerId,
    created_by: payment.created_by || user.id,
  }

  const { data, error } = await client
    .from('payment_transactions')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error("recordPayment error:", error)
    throw new Error(error.message || error.details || error.hint || "Failed to record payment")
  }

  // 1. Sync purchase / expense payments
  if (payment.reference_type === 'purchase') {
    try {
      // Calculate total paid for this expense
      const { data: allPayData } = await client
        .from('payment_transactions')
        .select('amount')
        .eq('reference_type', 'purchase')
        .eq('reference_id', payment.reference_id)

      const totalPaidForExpense = (allPayData || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

      const { data: exp } = await client.from('expenses').select('*').eq('id', payment.reference_id).single()
      if (exp) {
        const totalAmt = Number(exp.amount) || 0
        const newBalDue = Math.max(0, totalAmt - totalPaidForExpense)
        const newStatus = totalPaidForExpense >= totalAmt ? 'paid' : (totalPaidForExpense > 0 ? 'partial' : 'unpaid')

        await client.from('expenses').update({
          amount_paid: totalPaidForExpense,
          balance_due: newBalDue,
          payment_status: newStatus,
          updated_at: new Date().toISOString()
        }).eq('id', exp.id)

        // Sync manufacturer record
        let mfrId = exp.manufacturer_id
        if (!mfrId && (exp.vendor_name || exp.description)) {
          const vName = exp.vendor_name || exp.description
          const { data: mfr } = await client
            .from('manufacturers')
            .select('id, total_purchased')
            .eq('owner_id', resolvedOwnerId)
            .ilike('name', `%${vName.trim()}%`)
            .maybeSingle()
          if (mfr) {
            mfrId = mfr.id
            await client.from('expenses').update({ manufacturer_id: mfrId }).eq('id', exp.id)
          }
        }

        if (mfrId) {
          const { data: mfr } = await client.from('manufacturers').select('*').eq('id', mfrId).single()
          const { data: mfrExpenses } = await client
            .from('expenses')
            .select('amount, amount_paid, balance_due, payment_status')
            .or(`manufacturer_id.eq.${mfrId},vendor_name.ilike.%${mfr?.name || ''}%`)

          const calcPurchased = (mfrExpenses || []).reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
          const calcPaid = (mfrExpenses || []).reduce((sum: number, e: any) => sum + (Number(e.amount_paid) || 0), 0)
          
          const mfrTotalPurchased = Math.max(Number(mfr?.total_purchased) || 0, calcPurchased)
          const mfrTotalPaid = Math.max(Number(mfr?.total_paid) || 0, calcPaid)
          const mfrOutstanding = Math.max(0, mfrTotalPurchased - mfrTotalPaid)

          await client.from('manufacturers').update({
            total_purchased: mfrTotalPurchased,
            total_paid: mfrTotalPaid,
            outstanding_balance: mfrOutstanding,
            updated_at: new Date().toISOString(),
          }).eq('id', mfrId)
        }
      }
    } catch (mfrSyncErr) {
      console.warn("Manufacturer payment balance sync skipped:", mfrSyncErr)
    }
  }

  // 2. Sync sale / order payments
  if (payment.reference_type === 'sale') {
    try {
      const { data: allSalePays } = await client
        .from('payment_transactions')
        .select('amount')
        .eq('reference_type', 'sale')
        .eq('reference_id', payment.reference_id)

      const totalPaidForOrder = (allSalePays || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

      const { data: order } = await client.from('sales_orders').select('*').eq('id', payment.reference_id).single()
      if (order) {
        const totalAmt = Number(order.total_amount) || 0
        const newBal = Math.max(0, totalAmt - totalPaidForOrder)
        const newStatus = totalPaidForOrder >= totalAmt ? 'paid' : (totalPaidForOrder > 0 ? 'partial' : 'unpaid')

        await client.from('sales_orders').update({
          amount_paid: totalPaidForOrder,
          balance_due: newBal,
          payment_status: newStatus,
          updated_at: new Date().toISOString()
        }).eq('id', order.id)

        if (order.customer_id) {
          const { data: custOrders } = await client.from('sales_orders').select('total_amount, amount_paid').eq('customer_id', order.customer_id)
          const custPurchased = (custOrders || []).reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0)
          const custPaid = (custOrders || []).reduce((sum: number, o: any) => sum + (Number(o.amount_paid) || 0), 0)
          await client.from('customers').update({
            total_purchased: custPurchased,
            total_paid: custPaid,
            outstanding_balance: Math.max(0, custPurchased - custPaid),
            updated_at: new Date().toISOString()
          }).eq('id', order.customer_id)
        }
      }
    } catch (custSyncErr) {
      console.warn("Customer payment balance sync skipped:", custSyncErr)
    }
  }

  return data
}
