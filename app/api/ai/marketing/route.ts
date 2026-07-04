import { createClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchTrends } from "@/lib/ai-marketing/trends";
import Groq from 'groq-sdk'
import { INDIAN_CONTENT_OCCASIONS } from '@/lib/constants'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json();

    // 0. Quick Caption Action
    if (body.action === 'caption') {
      const { topic, description, product } = body;
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
      }
      const groq = new Groq({ apiKey: groqApiKey });
      const systemPrompt = `You are India's top social media copywriter. Write engaging, high-conversion captions with emojis and hashtags for Indian businesses. Always respond with valid JSON only. No explanation. No markdown.`;
      const userPrompt = `Write an engaging caption for a social media post.
Topic: ${topic}
Description: ${description}
Product Focus: ${product || 'General'}

Include:
- A scroll-stopping first line (hook)
- Core details/benefits
- Strong call to action
- 5-10 relevant hashtags

Return ONLY JSON:
{
  "caption": "complete ready-to-copy caption text with emojis and hashtags"
}`;

      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const text = completion.choices[0]?.message?.content || '{}';
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
      }

      return NextResponse.json(JSON.parse(cleaned));
    }

    // 1. Calendar Action
    if (body.action === 'calendar') {
      const { business_name, business_type, top_products, force } = body

      // Check Cache (24 hours cache)
      if (!force) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: cached } = await supabase
          .from('ai_insights')
          .select('metadata, created_at')
          .eq('owner_id', user.id)
          .eq('type', 'content_calendar')
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cached?.metadata?.insight_data) {
          return NextResponse.json({
            ...cached.metadata.insight_data,
            cached: true,
            cached_at: cached.created_at
          })
        }
      }

      const today = new Date().toISOString().slice(0, 10)
      const festivals = INDIAN_CONTENT_OCCASIONS.filter(o => o.type === 'festival').map(o => o.name).join(', ')

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
      }

      const groq = new Groq({ apiKey: groqApiKey })

      const systemPrompt = `You are India's top social media strategist. Always respond with valid JSON only. No explanation. No markdown.`
      const userPrompt = `Create a 30-day social media content calendar for an Indian ${business_type || 'business'} business called ${business_name || 'My Startup'}.
Products/services: ${top_products || 'General services'}
Today's date: ${today}

Include these upcoming Indian occasions/festivals:
${festivals}

Mix content types:
- 40% Reel ideas (with format suggestion)
- 30% Static posts (offer/product showcase)
- 20% Stories (behind the scenes)
- 10% WhatsApp Broadcast

Return ONLY JSON matching this structure:
{
  "calendar": [
    {
      "date": "YYYY-MM-DD",
      "day_name": "Monday",
      "content_type": "Reel|Post|Story|WhatsApp",
      "format": "reel format name if Reel, else null",
      "topic": "specific topic",
      "description": "what to create in 1 sentence",
      "is_festival": true|false,
      "festival_name": "string or null",
      "priority": "high|medium|low",
      "best_time": "e.g. 7 PM IST"
    }
  ]
}`

      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })

      const text = completion.choices[0]?.message?.content || '{}'
      let cleaned = text.trim()
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim()
      }

      const calendarData = JSON.parse(cleaned)

      // Cache the result
      try {
        await supabase
          .from('ai_insights')
          .delete()
          .eq('owner_id', user.id)
          .eq('type', 'content_calendar')

        await supabase.from('ai_insights').insert({
          owner_id: user.id,
          type: 'content_calendar',
          severity: 'info',
          category: 'marketing',
          title: 'Content Calendar',
          description: 'Cached marketing 30-day content calendar',
          metadata: {
            insight_type: 'content_calendar',
            insight_data: calendarData
          },
          created_at: new Date().toISOString()
        })
      } catch (cacheError) {
        console.error("Calendar cache save failed:", cacheError)
      }

      return NextResponse.json({
        ...calendarData,
        cached: false
      })
    }

    // 2. Default Concept Generation Action
    const { product, description } = z
      .object({
        product: z.string().min(1),
        description: z.string().min(1),
      })
      .parse(body);

    let trends: any[] = [];
    let warning = "";
    try {
      trends = await fetchTrends(product);
    } catch (scraperErr) {
      console.warn("Shared trend scraper failed:", scraperErr);
    }

    if (trends.length === 0) {
      warning = "YouTube and Instagram scraping failed. Generated ideas are based on general knowledge.";
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 });
    }

    const systemPrompt = "You are a viral short-form video strategist specializing in Instagram Reels and YouTube Shorts.";
    const userPrompt = `
Trending formats this week:
${trends.length > 0 ? JSON.stringify(trends, null, 2) : "No live trend data available."}

Product: ${product}
Event Description: ${description}

Generate 5 reel concepts. For each output, follow this EXACT format:
CONCEPT 1:
▸ Trend Used: [Short trend description]
▸ Hook (0–3 sec): [Scroll-stopping hook detail]
▸ Middle (4–20 sec): [The story, skit or detail]
▸ CTA (last 3 sec): [Call to action]
▸ Caption (with hashtags): [Viral caption text with hashtags]
▸ Audio Style: [Music or sound description]
▸ Difficulty: [Easy / Medium / Hard]

CONCEPT 2:
...
`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        max_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq API returned an error: ${groqRes.status} ${errText}`);
    }

    const rawData = await groqRes.json();
    const content = rawData?.choices?.[0]?.message?.content || "";

    const concepts = parseReelConcepts(content);

    return NextResponse.json({
      concepts,
      trends,
      warning
    });
  } catch (err: any) {
    console.error("Reel generation route crash:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate reel ideas", stack: err.stack },
      { status: 500 }
    );
  }
}

function parseReelConcepts(text: string): any[] {
  const concepts: any[] = [];
  const segments = text.split(/CONCEPT \d+:\s*/i);

  for (const segment of segments) {
    if (!segment.trim()) continue;

    let trendUsed = "";
    let hook = "";
    let middle = "";
    let cta = "";
    let caption = "";
    let audioStyle = "";
    let difficulty = "Medium";

    const lines = segment.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes("Trend Used:")) {
        trendUsed = trimmed.split(/Trend Used:\s*/i)[1] || "";
      } else if (trimmed.includes("Hook (0–3 sec):") || trimmed.includes("Hook:")) {
        hook = trimmed.split(/Hook\s*(\(0[–-]3\s*sec\))?:\s*/i)[2] || trimmed.split(/Hook:\s*/i)[1] || "";
      } else if (trimmed.includes("Middle (4–20 sec):") || trimmed.includes("Middle:")) {
        middle = trimmed.split(/Middle\s*(\(4[–-]20\s*sec\))?:\s*/i)[2] || trimmed.split(/Middle:\s*/i)[1] || "";
      } else if (trimmed.includes("CTA (last 3 sec):") || trimmed.includes("CTA:")) {
        cta = trimmed.split(/CTA\s*(\(last\s*3\s*sec\))?:\s*/i)[2] || trimmed.split(/CTA:\s*/i)[1] || "";
      } else if (trimmed.includes("Caption (with hashtags):") || trimmed.includes("Caption:")) {
        caption = trimmed.split(/Caption\s*(\(with\s*hashtags\))?:\s*/i)[2] || trimmed.split(/Caption:\s*/i)[1] || "";
      } else if (trimmed.includes("Audio Style:")) {
        audioStyle = trimmed.split(/Audio Style:\s*/i)[1] || "";
      } else if (trimmed.includes("Difficulty:")) {
        difficulty = trimmed.split(/Difficulty:\s*/i)[1] || "";
      }
    }

    const cleanStr = (s: string) => s.trim().replace(/^▸\s*/, "");

    concepts.push({
      trendUsed: cleanStr(trendUsed),
      hook: cleanStr(hook),
      middle: cleanStr(middle),
      cta: cleanStr(cta),
      caption: cleanStr(caption),
      audioStyle: cleanStr(audioStyle),
      difficulty: cleanStr(difficulty)
    });
  }

  return concepts;
}