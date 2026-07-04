import { createClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server"
import { Groq } from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

  try {
    const { contact, deals, interactions } = await req.json()

    if (!contact) {
      return NextResponse.json({ error: "Contact data is required" }, { status: 400 })
    }

    const prompt = `
      You are an expert sales analyst. Analyze the following lead data and provide a lead score (0-100) and a brief justification.
      
      Lead: ${JSON.stringify(contact)}
      Deals: ${JSON.stringify(deals)}
      Interactions: ${JSON.stringify(interactions || [])}
      
      Consider:
      1. Completeness of profile.
      2. Deal value and current pipeline stage.
      3. Frequency and quality of interactions.
      4. Lead source and industry potential.
      
      Return ONLY a JSON object in this format:
      {
        "score": number,
        "justification": "string",
        "priority": "low" | "medium" | "high",
        "next_step": "string"
      }
    `

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional sales lead scoring assistant. Respond only with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-specdec",
      response_format: { type: "json_object" },
    })

    const response = JSON.parse(chatCompletion.choices[0].message.content || "{}")
    return NextResponse.json(response)
  } catch (error) {
    console.error("Lead scoring error:", error)
    return NextResponse.json({ error: "Failed to score lead" }, { status: 500 })
  }
}
