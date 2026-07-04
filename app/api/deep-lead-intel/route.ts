import { createClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server";
import { groq, parseCleanJson } from "@/lib/ai-marketing/groq";
import { DEEP_LEAD_INTELLIGENCE_SYSTEM_PROMPT, getDeepLeadIntelligenceUserPrompt } from "@/lib/ai-marketing/prompts";
import axios from "axios";

export const maxDuration = 300; // Deep crawling takes time

// Simple link extractor to find relevant pages
function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const regex = /href=['"]([^'"]*)['"]/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let link = match[1];
    if (link.startsWith("/")) link = baseUrl + link;
    if (link.startsWith(baseUrl)) links.push(link);
  }
  return [...new Set(links)];
}

// Find high-value pages for lead intel
function planCrawl(links: string[]): string[] {
  const targets = ["about", "team", "leadership", "contact", "management", "our-story"];
  return links.filter(link => 
    targets.some(target => link.toLowerCase().includes(target))
  ).slice(0, 4); // Limit to top 4 matches
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await axios.get(url, { 
      timeout: 10000, 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      } 
    });
    
    let html = res.data;
    
    // 1. Extract contact info from attributes before stripping
    const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const mailtos = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g) || [];
    const linkedins = html.match(/linkedin\.com\/(in|company)\/[a-zA-Z0-9-._]+/g) || [];
    
    const extractedMeta = [
      ...emails,
      ...mailtos.map((m: string) => m.replace("mailto:", "")),
      ...linkedins.map((l: string) => "https://" + l)
    ].join(", ");

    // 2. Clean HTML but keep a placeholder for the extracted meta
    const cleanContent = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
                  .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "")
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .substring(0, 5000);

    return `EXTRACTED CONTACTS: ${extractedMeta}\n\nPAGE CONTENT: ${cleanContent}`;
  } catch (e) {
    console.warn(`Failed to fetch ${url}`);
    return "";
  }
}

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

  try {
    const { companyName, website } = await req.json();

    if (!website) return NextResponse.json({ error: "Website URL is required" }, { status: 400 });

    const baseUrl = website.endsWith("/") ? website.slice(0, -1) : website;
    
    // Removed console.log for production

    // 1. Visit Homepage & Plan Crawl
    const homepageHtml = await axios.get(baseUrl).then(r => r.data).catch(() => "");
    const allLinks = extractLinks(homepageHtml, baseUrl);
    const crawlTargets = planCrawl(allLinks);
    
    // Removed console.log for production}`);

    // 2. Multi-page concurrent crawl
    const crawlResults = await Promise.all([
      fetchPageContent(baseUrl), // Homepage again but cleaned
      ...crawlTargets.map(url => fetchPageContent(url))
    ]);
    
    const combinedScrapedContent = crawlResults.join("\n\n---\n\n");

    // 3. Apollo Enrichment (Decision Makers)
    let apolloData = {};
    const apolloKey = process.env.APOLLO_API_KEY;
    if (apolloKey && companyName) {
      try {
        const apolloRes = await axios.post("https://api.apollo.io/v1/mixed_people/search", {
          q_organization_domains: website.replace("https://", "").replace("http://", "").split("/")[0],
          display_mode: "regular"
        }, { headers: { 'X-Api-Key': apolloKey } });
        apolloData = apolloRes.data;
      } catch (err) {
        console.warn("[DeepIntel] Apollo enrichment failed");
      }
    }

    // 4. Groq Extraction & Validation
    // Removed console.log for production
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: DEEP_LEAD_INTELLIGENCE_SYSTEM_PROMPT },
        { role: "user", content: getDeepLeadIntelligenceUserPrompt(companyName || "Unknown", website, combinedScrapedContent, apolloData) },
      ],
      temperature: 0, // Maximum precision
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No data from Groq");

    const finalLead = parseCleanJson(content);
    
    return NextResponse.json(finalLead);

  } catch (error: any) {
    console.error("Deep Lead Intel Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
