import { createClient } from '@/lib/supabase/server'
import { NextResponse } from "next/server";
import { groq, parseCleanJson } from "@/lib/ai-marketing/groq";
import { GENERATE_STRATEGY_SYSTEM_PROMPT, getGenerateStrategyUserPrompt } from "@/lib/ai-marketing/prompts";
import { GeneratedStrategy } from "@/lib/ai-marketing/types";

export const maxDuration = 60; // Allow more time for generation

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

  try {
    const { product, event, region, trendData } = await req.json();

    if (!product || !event || !region || !trendData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const trendDataRaw = JSON.stringify(trendData, null, 2);

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: GENERATE_STRATEGY_SYSTEM_PROMPT },
        { role: "user", content: getGenerateStrategyUserPrompt(product, event, region, trendDataRaw) },
      ],
      temperature: 0.7, // Higher temp for creative strategy generation
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content received from Groq");
    }

    try {
      const parsedStrategy = parseCleanJson<GeneratedStrategy>(content);
      return NextResponse.json(parsedStrategy);
    } catch (parseError) {
      console.error("Failed to parse strategy JSON from Groq:", content);
      throw new Error("Invalid JSON format returned from strategy generation.");
    }

  } catch (error: any) {
    console.error("Error in generate-strategy API:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy", details: error.message },
      { status: 500 }
    );
  }
}
