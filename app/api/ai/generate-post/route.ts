import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function parseCleanJson(content: string): any {
  let cleaned = content.trim()
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json\s*/, "")
  else if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\s*/, "")
  if (cleaned.endsWith("```")) cleaned = cleaned.replace(/\s*```$/, "")
  return JSON.parse(cleaned)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 })
  }

  try {
    const { product, event, conceptName, trendName, caption, hashtags } = await req.json()
    const prompt = `You are a social media marketing agency copywriter for Indian SMB brands.
Create post-ready content (not reel script) derived from this reel idea:

Product: ${product}
Event: ${event}
Concept Name: ${conceptName}
Trend Hook: ${trendName}
Reel Caption Draft: ${caption}
Hashtags: ${Array.isArray(hashtags) ? hashtags.join(" ") : ""}

Return ONLY valid JSON:
{
  "instagram_post": "short engaging post copy",
  "linkedin_post": "professional post copy for founders",
  "whatsapp_broadcast": "broadcast-style short message",
  "image_post_idea": "single-image or carousel post concept",
  "cta": "single clear CTA",
  "best_posting_window_ist": "time range in IST"
}`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      }
    )

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Gemini request failed: ${body}`)
    }

    const data = await res.json()
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "{\"instagram_post\":\"\",\"linkedin_post\":\"\",\"whatsapp_broadcast\":\"\",\"image_post_idea\":\"\",\"cta\":\"\",\"best_posting_window_ist\":\"\"}"

    const parsed = parseCleanJson(text)
    return NextResponse.json({ success: true, postPack: parsed })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate post pack" },
      { status: 500 }
    )
  }
}

