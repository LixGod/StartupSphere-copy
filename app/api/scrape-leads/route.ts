import { createClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server";
import { groq, parseCleanJson } from "@/lib/ai-marketing/groq";

export const maxDuration = 120; // Allow more time for external API calls

const SYSTEM_PROMPT = `You are a Lead Data Validation and Refinement Engine.
Your task is to CLEAN and VALIDATE the provided lead dataset to produce structured, high-quality CRM-ready leads.

CORE RULES — DO NOT BREAK:
1. VALIDATION: Check each field. If not verifiable -> set to null. If duplicated -> flag as "suspicious".
2. DEDUPLICATION: Remove or flag duplicate phones, emails, and owners across different companies.
3. OWNER VERIFICATION: Only keep owner/founder if explicitly present in source data. Otherwise, set to null.
4. CONTACT VERIFICATION: NEVER guess email formats or missing domains. If not explicitly present -> null.
5. NO HALLUCINATION: NEVER invent missing data. NEVER improve or "fix" incorrect emails/phones. Only use verified or extracted information.

LEAD SCORING FORMULA (0–100):
+30 if decision maker is VERIFIED (present in source)
+25 if email is VERIFIED (from source, not guessed)
+20 if website is REAL and present
+15 if phone is UNIQUE (not duplicated across leads)
+10 if social presence is valid
-30 if any field is suspicious or duplicated

Map scores to quality levels: 80+ = HIGH, 50-79 = MEDIUM, <50 = LOW.
You respond ONLY in valid raw JSON. No markdown. No code fences. No preamble.`;

const getGroqPrompt = (niche: string, location: string, decisionMaker: string, leadCount: number, rawData: string) => `
You are running in autonomous lead generation mode.
TARGET NICHE: "${niche}"
TARGET LOCATION: "${location}"
TARGET DECISION MAKER: "${decisionMaker || 'Owner/Founder'}"
NUMBER OF LEADS REQUESTED: ${leadCount}

RAW APOLLO API DATA:
---
${rawData}
---

Using the raw data above, extract and validate the top ${leadCount} businesses.
Apply the strict validation and refinement rules. Structure them into the EXACT JSON format below.

{
  "search_metadata": {
    "niche": "${niche}",
    "location": "${location}",
    "decision_maker_target": "${decisionMaker || 'Owner/Founder'}",
    "searches_performed": ["Apollo API organizations/search"],
    "sources_checked": ["Apollo"],
    "total_leads_found": 0,
    "high_quality_leads": 0,
    "scrape_notes": "Validation and refinement performed on Apollo data pass."
  },
  "leads": [
    {
      "id": 1,
      "business_name": "...",
      "website": "https://... or null",
      "niche_tags": ["tag1", "tag2"],
      "location_detail": "Specific area, City, Country",
      "business_email": "... or null",
      "business_phone": "... or null",
      "instagram_handle": "@... or null",
      "company_linkedin": "https://linkedin.com/company/... or null",
      "owner": {
        "name": "... or null",
        "title": "Founder / Owner / Director / CEO",
        "linkedin_url": "https://linkedin.com/in/... or null",
        "personal_email": "... or null",
        "instagram": "@... or null",
        "source_of_name": "Apollo / Explicitly found"
      },
      "lead_quality": "HIGH or MEDIUM or LOW",
      "lead_score": 0,
      "flags": [],
      "contact_signals_found": ["email", "phone", "linkedin", "instagram"],
      "outreach_note": "Personalized outreach message/angle",
      "source_urls": ["url1"]
    }
  ],
  "outreach_intel": {
    "common_pain_points": "...",
    "best_outreach_channel": "Email / LinkedIn DM / Phone",
    "best_time_to_reach": "...",
    "icebreaker_angle": "..."
  }
}
`;

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

  try {
    const { niche, location, decisionMaker, leadCount } = await req.json();

    if (!niche || !location) {
      return NextResponse.json({ error: "Niche and Location are required" }, { status: 400 });
    }

    const apolloApiKey = process.env.APOLLO_API_KEY;
    let rawApolloData = "";

    if (apolloApiKey) {
      try {
        // Removed console.log for production
        const apolloRes = await fetch("https://api.apollo.io/v1/organizations/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Api-Key": apolloApiKey,
          },
          body: JSON.stringify({
            q_organization_keyword_tags: niche.split(" "),
            organization_locations: [location],
            per_page: leadCount || 10,
          }),
        });

        if (apolloRes.ok) {
          const apolloJson = await apolloRes.json();
          const simplifiedOrgs = (apolloJson.organizations || []).map((org: any) => ({
            name: org.name,
            website: org.website_url,
            linkedin: org.linkedin_url,
            phone: org.primary_phone?.number || org.phone,
            industry: org.industry,
            location: org.raw_address || org.city + ", " + org.state,
            keywords: org.keywords?.slice(0, 5),
            revenue: org.organization_revenue_printed,
            employees: org.estimated_num_employees,
          }));
          rawApolloData = JSON.stringify(simplifiedOrgs);
        } else {
          console.warn("[Apollo] Search failed", await apolloRes.text());
        }
      } catch (err) {
        console.warn("[Apollo] Error calling API", err);
      }
    }

    if (!rawApolloData || rawApolloData === "[]") {
      rawApolloData = "No Apollo data found. Use your knowledge to find real businesses for this niche and location.";
    } else {
      rawApolloData = rawApolloData.substring(0, 15000);
    }

    // Removed console.log for production
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: getGroqPrompt(niche, location, decisionMaker, leadCount || 5, rawApolloData) },
      ],
      temperature: 0.1, // Even lower temp for stricter validation
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from Groq");
    }

    try {
      const parsedData = parseCleanJson(content);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Failed to parse JSON from Groq:", content);
      return NextResponse.json({ error: "Failed to parse AI output", details: content }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Error in scrape-leads API:", error);
    if (error.message?.includes("Rate limit reached") || error.status === 429 || error.message?.includes("429")) {
      return NextResponse.json(
        { error: "Groq AI Rate Limit Reached. Please wait 10 seconds and try again." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to scrape leads", details: error.toString() },
      { status: 500 }
    );
  }
}
