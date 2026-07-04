export interface UnifiedTrend {
  platform: 'YouTube' | 'Instagram'
  hookStyle: string
  audioType: string
  format: string
  whyTrending: string
}

export async function fetchTrends(keyword: string): Promise<UnifiedTrend[]> {
  const youtubeApiKey = process.env.YOUTUBE_API_KEY
  const rapidApiKey = process.env.RAPIDAPI_KEY
  const groqApiKey = process.env.GROQ_API_KEY

  if (!groqApiKey) {
    console.error("Missing GROQ_API_KEY in environment variables")
    return []
  }

  const ytResults: any[] = []
  const igResults: any[] = []

  // 1. YouTube Shorts Trends
  if (youtubeApiKey) {
    try {
      const publishedAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&order=viewCount&publishedAfter=${encodeURIComponent(publishedAfter)}&maxResults=10&q=${encodeURIComponent(keyword)}&key=${youtubeApiKey}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        const items = data.items || []
        items.forEach((item: any) => {
          ytResults.push({
            title: item.snippet?.title || "",
            description: item.snippet?.description || "",
            channelTitle: item.snippet?.channelTitle || ""
          })
        })
      } else {
        console.warn(`YouTube search API error: ${res.status} ${res.statusText}`)
      }
    } catch (err) {
      console.warn("YouTube search API failed to fetch:", err)
    }
  } else {
    console.warn("Missing YOUTUBE_API_KEY in environment")
  }

  // 2. Instagram Reels Trends
  if (rapidApiKey) {
    try {
      // Primary attempt: instagram-bulk-scraper-latest.p.rapidapi.com
      const primaryHost = 'instagram-bulk-scraper-latest.p.rapidapi.com'
      const primaryUrl = `https://${primaryHost}/reels_by_keyword?query=${encodeURIComponent(keyword)}`
      let igRes = await fetch(primaryUrl, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': primaryHost
        }
      })

      if (!igRes.ok) {
        // Fallback attempt: instagram-scraper-api2.p.rapidapi.com
        const altHost = 'instagram-scraper-api2.p.rapidapi.com'
        const altUrl = `https://${altHost}/v1/search_reels?query=${encodeURIComponent(keyword)}`
        igRes = await fetch(altUrl, {
          method: 'GET',
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': altHost
          }
        })
      }

      if (igRes.ok) {
        const data = await igRes.json()
        const items = data.data || data.items || data.reels || (Array.isArray(data) ? data : [])
        items.slice(0, 10).forEach((item: any) => {
          const caption = item.caption?.text || item.caption || item.description || ""
          const play_count = item.play_count || item.view_count || item.plays || 0
          const audioName = item.audio?.name || item.audio?.title || item.music_name || item.audio_name || "trending audio"
          igResults.push({
            caption,
            play_count,
            audioName
          })
        })
      } else {
        console.warn(`RapidAPI Instagram scrape failed: ${igRes.status} ${igRes.statusText}`)
      }
    } catch (err) {
      console.warn("Instagram RapidAPI failed to fetch:", err)
    }
  } else {
    console.warn("Missing RAPIDAPI_KEY in environment")
  }

  // If both failed or are empty, return empty list []
  if (ytResults.length === 0 && igResults.length === 0) {
    return []
  }

  // 3. Synthesize via Groq
  try {
    const prompt = `
You are a trend analyzer. Given the following raw YouTube Shorts trends and Instagram Reels trends for keyword "${keyword}", synthesize them into a unified list of trending styles.

YouTube Shorts Raw:
${JSON.stringify(ytResults, null, 2)}

Instagram Reels Raw:
${JSON.stringify(igResults, null, 2)}

Output a valid JSON array of up to 10 unified trend items. Each item must exactly follow this schema:
{
  "platform": "YouTube" | "Instagram",
  "hookStyle": "Description of the hook style based on the video details (0-3 sec)",
  "audioType": "Description of the audio style (e.g. audio name or sound type)",
  "format": "Description of the video format (e.g. transition, text-on-screen, skit)",
  "whyTrending": "Analysis of why this format is trending"
}
Return ONLY the JSON array, no markdown backticks, no code blocks, no text before or after the JSON.
`

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`)
    }

    const resData = await response.json()
    const content = resData.choices?.[0]?.message?.content || "[]"
    let cleaned = content.trim()
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim()
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "").trim()
    }

    return JSON.parse(cleaned)
  } catch (err) {
    console.error("Failed to synthesize trends via Groq:", err)
    // Return a basic map of raw trends if synthesis fails
    const fallbacks: UnifiedTrend[] = []
    ytResults.slice(0, 5).forEach(yt => {
      fallbacks.push({
        platform: "YouTube",
        hookStyle: yt.title.slice(0, 50),
        audioType: "Trending Audio",
        format: "Shorts Video",
        whyTrending: "High engagement on YouTube"
      })
    })
    igResults.slice(0, 5).forEach(ig => {
      fallbacks.push({
        platform: "Instagram",
        hookStyle: ig.caption.slice(0, 50),
        audioType: ig.audioName,
        format: "Reels Video",
        whyTrending: "High views on Instagram"
      })
    })
    return fallbacks
  }
}
