import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import axios from 'axios'

export const maxDuration = 60

export async function POST(req: Request) {
  const supabaseAuth = await createClient()
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { niche, city } = await req.json()
    if (!niche || !city) {
      return NextResponse.json({ error: 'Niche and City are required.' }, { status: 400 })
    }

    // DuckDuckGo discovery scrape (borrowed from app/api/scrape/discover/route.ts)
    const searchQuery = `${niche} in ${city} businesses categories keywords`
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`
    
    let searchContext = ""
    try {
      const response = await axios.get(ddgUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        timeout: 10000
      })
      searchContext = response.data
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, '')
        .replace(/<[^>]*>?/gm, ' ')
        .substring(0, 15000)
    } catch (e) {
      console.warn('[Competitor Intelligence] Search context failed, falling back to Groq synthesis.')
    }

    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const systemPrompt = "You are an elite business analyst and social media strategist for Indian businesses. Always respond with valid JSON only. Strip markdown formatting and backticks."

    const userPrompt = `Analyze competitor dynamics and social media content opportunities for:
Niche: ${niche}
City/Location: ${city}

Below is the local search context crawled for similar businesses in the city (may be raw):
---
${searchContext}
---

Based on these competitors, analyze what content gaps, opportunities, and unique selling points (USPs) exist for a new business launching in ${city}.
Return ONLY a valid JSON object matching this structure:
{
  "opportunities": ["string (actionable social/marketing idea, e.g. leverage Instagram Collabs with local foodies)"],
  "content_gaps": ["string (unaddressed content type, e.g. lack of behind-the-scenes roasting footage)"],
  "suggested_usp": "string (suggested unique selling proposition tailored to ${niche} in ${city})",
  "competitor_count": number (estimated count of active competitors found in search or general market knowledge, min 3)
}`

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    const text = completion.choices[0]?.message?.content || '{}'
    let cleaned = text.trim()
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '').trim()
    }

    const analysis = JSON.parse(cleaned)

    return NextResponse.json({
      success: true,
      analysis
    })
  } catch (error: any) {
    console.error("Competitor analysis failure:", error)
    return NextResponse.json({ error: error.message || "Failed analyzing competitors" }, { status: 500 })
  }
}
