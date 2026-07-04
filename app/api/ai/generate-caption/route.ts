import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const maxDuration = 45

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { topic, platform, tone } = await req.json()

    if (!topic || !platform || !tone) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const systemPrompt = `You are a social media copywriter specializing in viral copywriting for Indian and global platforms. Always return valid JSON only. Strip markdown wrappers and backticks.`

    const userPrompt = `Create an optimized caption strategy for:
Post Details: ${topic}
Target Platform: ${platform}
Tone of Voice: ${tone}

Ensure high-engagement copy that drives shares, saves, and comments. Inject appropriate emojis.
Provide 3 variations (Short, Medium, and Long/Storytelling form).
Provide exactly 20 hashtags grouped into:
1. Trending Indian hashtags (8 tags)
2. Business/Niche hashtags (8 tags)
3. Location/Community hashtags (4 tags, e.g. focusing on Mumbai, Pune, India, etc.)

Return ONLY a valid JSON object matching this structure:
{
  "captions": {
    "short": "string (1-2 sentences, high impact)",
    "medium": "string (4-5 lines, high spacing, mid-length hook)",
    "long": "string (storytelling form, deep value / breakdown)"
  },
  "hashtags": {
    "trending": ["string"],
    "niche": ["string"],
    "location": ["string"]
  },
  "best_time_to_post": "string (specific time like 6-8 PM IST based on platform)",
  "emoji_suggestions": ["string"]
}`

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
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

    const captionData = JSON.parse(cleaned)

    return NextResponse.json({
      success: true,
      captionData
    })
  } catch (error: any) {
    console.error("Caption generation failure:", error)
    return NextResponse.json({ error: error.message || "Failed to generate captions" }, { status: 500 })
  }
}
