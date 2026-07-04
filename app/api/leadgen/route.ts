import { createClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { groq } from "@/lib/ai-marketing/groq";

export const maxDuration = 300; // Increased timeout for deep scraper pipeline (5 minutes)

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

  try {
    const { niche, location, leadCount, autoSync } = await req.json();

    if (!niche || !location) {
      return NextResponse.json({ error: "Niche and Location are required" }, { status: 400 });
    }

    const pythonPath = "python"; 
    const leadgenDir = path.join(process.cwd(), "leadgen");
    const scriptPath = path.join(leadgenDir, "run_pipeline.py");
    const outputJsonPath = path.join(leadgenDir, "output", "stage6_scored.json");

    // Clean up old output if it exists to ensure we don't return stale data
    if (fs.existsSync(outputJsonPath)) {
      try {
        fs.unlinkSync(outputJsonPath);
      } catch (e) {
        console.warn("Could not delete old output file", e);
      }
    }

    // Removed console.log for production`);
    
    // Use --limit to avoid interactive input. 
    // We execute the script and wait for it to finish.
    let commandArgs = [scriptPath, "--niche", niche, "--city", location, "--limit", (leadCount || 10).toString()];
    if (autoSync) {
      commandArgs.push("--sync");
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`STAGE: [Stage 1] Initializing pipeline...\n`));

        const child = spawn(pythonPath, commandArgs, {
          cwd: leadgenDir,
          env: { ...process.env, PYTHONUNBUFFERED: "1", PYTHONIOENCODING: "utf-8" }
        });

        child.stdout.on("data", (chunk) => {
          const text = chunk.toString();
          // Removed console.log for production
          const lines = text.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.includes("[Stage") || trimmed.includes("✅") || trimmed.includes("→")) {
              controller.enqueue(encoder.encode(`STAGE: ${trimmed}\n`));
            }
          }
        });

        child.stderr.on("data", (chunk) => {
          console.error("[LeadGen Stderr]:", chunk.toString());
        });

        child.on("close", async (code) => {
          if (code !== 0) {
            controller.enqueue(encoder.encode(`ERROR: Pipeline execution failed with code ${code}\n`));
            controller.close();
            return;
          }

          if (!fs.existsSync(outputJsonPath)) {
            controller.enqueue(encoder.encode(`ERROR: Pipeline completed but output file not found.\n`));
            controller.close();
            return;
          }

          try {
            const rawData = fs.readFileSync(outputJsonPath, "utf-8");
            const businesses = JSON.parse(rawData);

            // Removed console.log for production
            let outreachIntel = {
              common_pain_points: "Analyzing niche-specific pain points...",
              best_outreach_channel: "Email / LinkedIn",
              best_time_to_reach: "9 AM - 11 AM local time",
              icebreaker_angle: "Mentioning their recent business activity."
            };

            try {
              const intelResponse = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [
                  { 
                    role: "system", 
                    content: "You are a sales strategy expert. Analyze the lead batch and provide a concise outreach strategy." 
                  },
                  { 
                    role: "user", 
                    content: `Niche: ${niche}\nLocation: ${location}\nLeads Found: ${businesses.length}\n\nProvide a strategic summary in JSON format: { "common_pain_points": "...", "best_outreach_channel": "...", "best_time_to_reach": "...", "icebreaker_angle": "..." }` 
                  }
                ],
                response_format: { type: "json_object" }
              });
              const intelContent = intelResponse.choices[0]?.message?.content;
              if (intelContent) {
                outreachIntel = JSON.parse(intelContent);
              }
            } catch (e) {
              console.warn("[LeadGen] Could not generate global outreach intel", e);
            }

            const leads = businesses.map((b: any, idx: number) => ({
              id: idx + 1,
              business_name: b.name,
              website: b.website,
              niche_tags: [b.category, b.niche].filter(Boolean),
              location_detail: b.address || b.city,
              business_email: b.email,
              business_phone: b.phone_cleaned || b.phone,
              owner: {
                name: b.owner_name || null,
                title: b.owner_title || "Decision Maker",
                linkedin_url: b.owner_linkedin || null,
                personal_email: b.email || null,
              },
              lead_quality: b.icp_tier?.toUpperCase() || "MEDIUM",
              lead_score: (b.icp_score || 0) * 10,
              outreach_note: b.outreach_angle || b.icp_reasoning || "Highly relevant lead for your niche.",
              flags: b.icp_missing || [],
              contact_signals_found: [
                b.email ? "email" : null,
                b.phone_cleaned ? "phone" : null,
                b.owner_linkedin ? "linkedin" : null
              ].filter(Boolean)
            }));

            const finalPayload = {
              leads,
              outreach_intel: outreachIntel,
              search_metadata: {
                niche,
                location,
                total_leads_found: leads.length,
                scrape_notes: `Deep AI Pipeline successfully analyzed ${leads.length} leads across 8 autonomous stages.`
              }
            };

            controller.enqueue(encoder.encode(`RESULT: ${JSON.stringify(finalPayload)}\n`));
          } catch (e: any) {
            controller.enqueue(encoder.encode(`ERROR: Failed to process results: ${e.message}\n`));
          }

          controller.close();
        });
      }
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain", "Transfer-Encoding": "chunked" } });

  } catch (error: any) {
    console.error("[LeadGen] API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
