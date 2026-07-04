import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      business_name,
      business_type,
      product_or_offer,
      trending_format,
      occasion,
      language,
      tone
    } = body

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY environment variable is not set" }, { status: 500 })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const systemPrompt = `You are India's top viral reel scriptwriter.
You have created content that got millions of views on Instagram 
and YouTube Shorts for Indian small businesses.

You deeply understand:
- Trending Hinglish audio formats and how to apply them to any business
- Indian cultural references, emotions, and humor
- How to weave business promotions naturally into skits
- What makes Indian audiences stop scrolling and share content
- The exact rhythm and pacing of viral Indian reels

Your scripts are always:
- Filmable with just a smartphone
- Natural sounding, not corporate
- Funny or emotional in a genuinely Indian way
- Promotional without feeling like an ad

Always respond with valid JSON only. No markdown.`

    const userPrompt = `Create a complete viral reel script for this Indian business:

Business Name: ${business_name}
Business Type: ${business_type}  
What to Promote: ${product_or_offer}
Trending Format to Apply: ${trending_format}
Occasion/Festival: ${occasion}
Language Style: ${language}
Tone: ${tone}

IMPORTANT: Apply the "${trending_format}" format creatively.
The promotion should feel NATURAL inside the skit, not forced.
${language === 'hinglish' ? 
  'Write dialogue in natural Hinglish (mix of Hindi and English like Indians actually speak). Use Devanagari for Hindi words.' : 
  language === 'hindi' ? 'Write dialogue primarily in Hindi with Devanagari script.' :
  'Write in clean conversational English.'
}

Return ONLY this JSON:
{
  "skit": {
    "title": "catchy title for this reel",
    "hook": "FIRST 3 SECONDS - what grabs attention immediately",
    "duration_estimate": "e.g. 30-45 seconds",
    "characters": ["Character 1", "Character 2"],
    "scenes": [
      {
        "scene_number": 1,
        "duration_seconds": 5,
        "character": "Character name or NARRATOR",
        "dialogue": "Exact words to say",
        "action": "What they physically do (expression, movement)",
        "camera_angle": "Close-up on face | Wide shot | Over shoulder | etc.",
        "text_overlay": "Bold text to show on screen OR null",
        "emoji_overlay": "Emojis to show on screen OR null"
      }
    ],
    "closing_slide": {
      "text": "Final text slide content with offer details",
      "duration_seconds": 3
    }
  },
  "shooting_guide": {
    "location": "Where to film this (e.g. inside your shop, outdoors, home)",
    "props_needed": ["list of simple props"],
    "outfit_suggestion": "What to wear",
    "lighting_tip": "Natural light from window | Ring light | etc.",
    "total_shoot_time_estimate": "e.g. 20-30 minutes",
    "editing_tip": "One key editing tip for this reel",
    "difficulty": "easy|medium|hard"
  },
  "caption": {
    "hook_line": "First line of caption that stops scrolling",
    "body": "Rest of caption with offer details and story",
    "cta": "Call to action line",
    "full_caption": "Complete ready-to-paste caption with emojis"
  },
  "hashtags": {
    "trending_format": ["hashtags related to the trending audio/format"],
    "business_niche": ["hashtags for the business type"],
    "location": ["#Mumbai #India #Maharashtra and relevant ones"],
    "occasion": ["hashtags for the festival or occasion"],
    "all": ["all 20 hashtags combined ready to copy"]
  },
  "thumbnail": {
    "text": "Bold 3-5 word thumbnail text",
    "visual_description": "What should be visible in thumbnail",
    "emoji": "2-3 emojis for thumbnail"
  },
  "audio_suggestion": {
    "if_using_trending_audio": "Name of trending audio to search on Instagram",
    "if_original_audio": "Type of background music (e.g. upbeat Bollywood, dramatic orchestral)",
    "mood": "energy level and feel of audio needed"
  },
  "zsky_video_prompt": "A detailed prompt to paste into ZSky AI to generate a video preview of scene 1",
  "capcut_export": "Scene by scene breakdown formatted for CapCut editing"
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

    try {
      const reelData = JSON.parse(cleaned)
      return NextResponse.json(reelData)
    } catch (parseError) {
      console.error("Defensive parsing failed on text:", cleaned)
      return NextResponse.json({
        error: "Failed to parse JSON response from Groq. Please try again.",
        raw_text: cleaned
      }, { status: 422 })
    }
  } catch (error: any) {
    console.error("Error generating reel script:", error)
    return NextResponse.json({ error: error.message || "Failed to generate reel idea" }, { status: 500 })
  }
}
