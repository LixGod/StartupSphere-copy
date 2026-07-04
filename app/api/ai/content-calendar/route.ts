import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchTrends } from '@/lib/ai-marketing/trends'

export const maxDuration = 60

async function fetchGoogleIndianFestivalsForMonth(monthStr: string): Promise<Array<{ name: string; date: string }>> {
  // monthStr is e.g. "2026-06"
  try {
    const res = await fetch(
      'https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics',
      { next: { revalidate: 24 * 60 * 60 } }
    )
    if (!res.ok) throw new Error("ICS fetch failed")
    const ics = await res.text()

    const events: Array<{ name: string; date: string }> = []
    const chunks = ics.split('BEGIN:VEVENT')
    for (const chunk of chunks) {
      const summaryMatch = chunk.match(/SUMMARY:(.*)/)
      const dateMatch = chunk.match(/DTSTART;VALUE=DATE:(\d{8})/)
      if (!summaryMatch || !dateMatch) continue
      const rawDate = dateMatch[1] // YYYYMMDD
      const isoDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      
      if (isoDate.startsWith(monthStr)) {
        const name = summaryMatch[1].trim().replace(/\\,/g, ',')
        events.push({ name, date: isoDate })
      }
    }
    return events
  } catch (err) {
    console.warn("Failed to fetch ICS feed, falling back to static list:", err)
    return getFallbackIndianFestivals(monthStr)
  }
}

function getFallbackIndianFestivals(monthStr: string): Array<{ name: string; date: string }> {
  const [year, month] = monthStr.split("-").map(Number);
  const festivals: Array<{ name: string; date: string }> = [];

  const addFest = (day: number, name: string) => {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    festivals.push({ name, date: dStr });
  };

  if (month === 1) {
    addFest(26, "Republic Day");
  } else if (month === 8) {
    addFest(15, "Independence Day");
  } else if (month === 10) {
    addFest(2, "Gandhi Jayanti");
  } else if (month === 12) {
    addFest(25, "Christmas Day");
  }

  // Common floating approximate dates for 2026/general reference
  if (month === 3) {
    addFest(14, "Holi Festival");
  } else if (month === 9) {
    addFest(17, "Ganesh Chaturthi");
  } else if (month === 10) {
    addFest(22, "Dussehra");
  } else if (month === 11) {
    addFest(12, "Diwali (Deepavali)");
  } else if (month === 8) {
    addFest(29, "Raksha Bandhan");
  }
  
  return festivals;
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

  try {
    if (!force) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: cached } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('owner_id', user.id)
        .eq('type', 'content_calendar')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)

      if (cached && cached.length > 0) {
        const calendarData = cached[0].metadata?.insight_data
        if (calendarData) {
          return NextResponse.json({
            ...calendarData,
            cached: true,
            cached_at: cached[0].created_at
          })
        }
      }
    }
    return NextResponse.json({ calendar: [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { products, event, month, reelsPerWeek, regenerateDate, regenerateProduct, regenerateFestival } = body

    const groqApiKey = process.env.GROQ_API_KEY
    if (!groqApiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 })
    }

    // ── CASE 1: Single day concept regeneration ──────────────────────────
    if (regenerateDate) {
      const trends = await fetchTrends(regenerateProduct || "marketing");
      const systemPrompt = "You are a viral short-form video strategist specializing in Instagram Reels and YouTube Shorts.";
      const userPrompt = `
Generate a SINGLE reel concept for:
Date: ${regenerateDate}
Product Focus: ${regenerateProduct || "General"}
Festival Context: ${regenerateFestival || "None"}
Campaign/Theme: ${event || "General promotion"}
Trend Data: ${JSON.stringify(trends.slice(0, 3))}

Output EXACTLY this format:
DATE: ${regenerateDate}
PRODUCT: ${regenerateProduct || "General"}
FESTIVAL: ${regenerateFestival || "None"}
▸ Trend Used: [Short trend description]
▸ Hook (0–3 sec): [Scroll-stopping hook detail]
▸ Middle (4–20 sec): [The story, skit or detail]
▸ CTA: [Call to action]
▸ Caption (with hashtags): [Viral caption text with hashtags]
▸ Difficulty: [Easy / Medium / Hard]
`;
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.85,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      if (!groqRes.ok) {
        throw new Error(`Groq API error during regeneration: ${await groqRes.text()}`);
      }

      const rawData = await groqRes.json();
      const content = rawData?.choices?.[0]?.message?.content || "";
      const parsedItems = parseCalendarOutput(content);
      if (parsedItems.length > 0) {
        return NextResponse.json({ item: parsedItems[0] });
      } else {
        throw new Error("Failed to parse regenerated concept");
      }
    }

    // ── CASE 2: Full Month Content Calendar Generation ─────────────────────
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Missing selected products" }, { status: 400 })
    }

    const targetMonth = month || new Date().toISOString().slice(0, 7) // "YYYY-MM"
    const targetReelsPerWeek = Number(reelsPerWeek) || 3

    // 1. Fetch Indian festivals for the month
    const festivals = await fetchGoogleIndianFestivalsForMonth(targetMonth)

    // 2. Fetch trends for all selected products in parallel
    const trendPromises = products.map(p => fetchTrends(p).catch(() => []))
    const allTrendsArrays = await Promise.all(trendPromises)
    const combinedTrends = allTrendsArrays.flat().slice(0, 10)

    // 3. Determine posting days in targetMonth
    const [year, monthNum] = targetMonth.split("-").map(Number)
    const totalDays = new Date(year, monthNum, 0).getDate() // days in month

    const schedule: Array<{ date: string; product: string; festival: string | null }> = []

    // Map of festival dates for lookup
    const festMap = new Map<string, string>()
    festivals.forEach(f => festMap.set(f.date, f.name))

    // Determine regular posting day weekday indices based on reelsPerWeek
    // W = 1: Sun(0), W = 2: Sun(0), Wed(3), W = 3: Mon(1), Wed(3), Fri(5)...
    let activeWeekdays = [0]
    if (targetReelsPerWeek === 2) activeWeekdays = [0, 3]
    else if (targetReelsPerWeek === 3) activeWeekdays = [1, 3, 5]
    else if (targetReelsPerWeek === 4) activeWeekdays = [0, 2, 4, 6]
    else if (targetReelsPerWeek === 5) activeWeekdays = [1, 2, 4, 5, 6]
    else if (targetReelsPerWeek === 6) activeWeekdays = [1, 2, 3, 4, 5, 6]
    else if (targetReelsPerWeek === 7) activeWeekdays = [0, 1, 2, 3, 4, 5, 6]

    let productIndex = 0

    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(year, monthNum - 1, day)
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const weekday = dateObj.getDay()

      const isFestival = festMap.has(dateStr)
      const isRegularPostDay = activeWeekdays.includes(weekday)

      if (isFestival || isRegularPostDay) {
        const productFocus = products[productIndex % products.length]
        productIndex++
        schedule.push({
          date: dateStr,
          product: productFocus,
          festival: festMap.get(dateStr) || null
        })
      }
    }

    // 4. Generate with Groq in one batch
    const systemPrompt = "You are a viral social media strategist specializing in Indian retail products.";
    const userPrompt = `
Create a content strategy calendar for the month: ${targetMonth}.
Selected Products: ${products.join(", ")}
Theme/Campaign: ${event || "General promotion"}
Indian Festivals this month: ${festivals.map(f => `${f.name} on ${f.date}`).join(", ") || "None"}
Live Trends Summary: ${JSON.stringify(combinedTrends)}

Generate a concept for each date in this schedule:
${JSON.stringify(schedule, null, 2)}

For each scheduled date, output EXACTLY this block:
DATE: YYYY-MM-DD
PRODUCT: [Product name]
FESTIVAL: [Festival name or None]
▸ Trend Used: [Short trend description]
▸ Hook (0–3 sec): [Scroll-stopping hook detail]
▸ Middle (4–20 sec): [The story, skit or detail]
▸ CTA: [Call to action]
▸ Caption (with hashtags): [Viral caption text with hashtags]
▸ Difficulty: [Easy / Medium / Hard]

Do not include any extra text, headings, or explanation. Produce only the blocks.
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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    })

    if (!groqRes.ok) {
      throw new Error(`Groq API returned an error: ${await groqRes.text()}`)
    }

    const rawData = await groqRes.json()
    const content = rawData?.choices?.[0]?.message?.content || ""
    const parsedCalendar = parseCalendarOutput(content)

    // Save/cache new calendar in database
    await supabase
      .from('ai_insights')
      .delete()
      .eq('owner_id', user.id)
      .eq('type', 'content_calendar')

    const cacheResult = { calendar: parsedCalendar }
    await supabase.from('ai_insights').insert({
      owner_id: user.id,
      type: 'content_calendar',
      severity: 'info',
      category: 'marketing',
      title: 'Content Calendar',
      description: 'Cached marketing 30-day content calendar',
      metadata: {
        insight_type: 'content_calendar',
        insight_data: cacheResult
      }
    })

    return NextResponse.json({
      calendar: parsedCalendar,
      cached: false
    })

  } catch (err: any) {
    console.error("Content calendar generation failure:", err)
    return NextResponse.json(
      { error: 'Failed to generate content calendar', details: err.message },
      { status: 500 }
    )
  }
}

function parseCalendarOutput(text: string): any[] {
  const items: any[] = [];
  const segments = text.split(/DATE:\s*/i);

  for (const segment of segments) {
    if (!segment.trim()) continue;

    const lines = segment.split('\n');
    const date = lines[0].trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      continue;
    }

    let product = "";
    let festival = "";
    let trendUsed = "";
    let hook = "";
    let middle = "";
    let cta = "";
    let caption = "";
    let difficulty = "Medium";

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toUpperCase().startsWith("PRODUCT:")) {
        product = line.replace(/^PRODUCT:\s*/i, "").trim();
      } else if (line.toUpperCase().startsWith("FESTIVAL:")) {
        festival = line.replace(/^FESTIVAL:\s*/i, "").trim();
        if (festival.toLowerCase() === "none" || festival.toLowerCase() === "null") {
          festival = "";
        }
      } else if (line.includes("Trend Used:")) {
        trendUsed = line.split(/Trend Used:\s*/i)[1] || "";
      } else if (line.includes("Hook (0–3 sec):") || line.includes("Hook:")) {
        hook = line.split(/Hook\s*(\(0[–-]3\s*sec\))?:\s*/i)[2] || line.split(/Hook:\s*/i)[1] || "";
      } else if (line.includes("Middle (4–20 sec):") || line.includes("Middle:")) {
        middle = line.split(/Middle\s*(\(4[–-]20\s*sec\))?:\s*/i)[2] || line.split(/Middle:\s*/i)[1] || "";
      } else if (line.includes("CTA:")) {
        cta = line.split(/CTA:\s*/i)[1] || "";
      } else if (line.includes("Caption (with hashtags):") || line.includes("Caption:")) {
        caption = line.split(/Caption\s*(\(with\s*hashtags\))?:\s*/i)[2] || line.split(/Caption:\s*/i)[1] || "";
      } else if (line.includes("Difficulty:")) {
        difficulty = line.split(/Difficulty:\s*/i)[1] || "";
      }
    }

    const cleanStr = (s: string) => s.trim().replace(/^▸\s*/, "");

    items.push({
      date,
      product: cleanStr(product),
      is_festival: !!festival,
      festival_name: festival ? cleanStr(festival) : null,
      trendUsed: cleanStr(trendUsed),
      hook: cleanStr(hook),
      middle: cleanStr(middle),
      cta: cleanStr(cta),
      caption: cleanStr(caption),
      difficulty: cleanStr(difficulty),
      priority: festival ? "high" : "medium" // mapping
    });
  }

  return items;
}
