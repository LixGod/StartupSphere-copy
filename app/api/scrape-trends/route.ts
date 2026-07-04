import { createClient } from '@/lib/supabase/server'
import { TRENDING_REEL_FORMATS } from '@/lib/constants'
import Groq from 'groq-sdk'

export async function GET(request: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check for force refresh
  const url = new URL(request.url)
  const forceRefresh = url.searchParams.get('force') === 'true'

  // Check cache first (2 hour cache)
  if (!forceRefresh) {
    const twoHoursAgo = new Date()
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

    const { data: cached } = await supabase
      .from('ai_insights')
      .select('metadata, created_at')
      .eq('owner_id', user.id)
      .eq('type', 'trend_report')
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cached?.metadata?.insight_data) {
      return Response.json({
        ...cached.metadata.insight_data,
        cached: true,
        cached_at: cached.created_at
      })
    }
  }

  // Fetch from all sources in parallel
  const [youtubeResult, googleResult, redditResult] = await Promise.allSettled([
    fetchYouTubeTrends(),
    fetchGoogleTrends(),
    fetchRedditTrends(),
  ])

  const youtubeTrends = youtubeResult.status === 'fulfilled' 
    ? youtubeResult.value : []
  const googleTrends = googleResult.status === 'fulfilled' 
    ? googleResult.value : []
  const redditTrends = redditResult.status === 'fulfilled' 
    ? redditResult.value : []

  // Get top 5 reel format names from constants as context
  const formatNames = TRENDING_REEL_FORMATS.slice(0, 5).map(f => f.name)

  // Synthesize with Groq
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  let synthesis
  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a viral content strategist for Indian small businesses. 
You understand what makes Indian audiences stop scrolling on Instagram and YouTube.
You know trending Hinglish audio formats, Indian festivals, and cultural references.
Always respond with valid JSON only. No markdown. No explanation.`
        },
        {
          role: 'user',
          content: `Based on what is currently trending in India, suggest content ideas for Indian SMB owners.

Currently trending on YouTube India: ${youtubeTrends.slice(0,8).join(' | ')}
Currently trending on Google India: ${googleTrends.slice(0,8).join(' | ')}
Currently trending on Reddit India: ${redditTrends.slice(0,8).join(' | ')}

Known trending Indian reel formats: ${formatNames.join(', ')}

Create 6 actionable trend opportunities for Indian business owners.
For each, suggest which reel format fits best.

Return ONLY this JSON:
{
  "trends": [
    {
      "topic": "string (the trending topic)",
      "source": "youtube|google|reddit|evergreen",
      "urgency": "post today|this week|this month",
      "relevance": "high|medium|low",
      "reel_format": "exact name from known formats OR suggest new one",
      "content_idea": "specific reel idea for Indian SMB in 1-2 sentences",
      "why_trending": "why this matters for Indian businesses right now",
      "hashtags": ["5 relevant hashtags"],
      "best_platform": "instagram|youtube|both"
    }
  ],
  "top_trend_today": "single most important trend in one line",
  "weekly_theme": "overarching theme for content this week",
  "best_posting_time": "best time to post today in IST",
  "avoid_topics": ["topics Indian businesses should avoid this week"]
}`
        }
      ]
    })

    const text = completion.choices[0]?.message?.content || '{}'
    const cleaned = text.replace(/```json|```/g, '').trim()
    synthesis = JSON.parse(cleaned)
  } catch (err) {
    // Fallback: use hardcoded formats if Groq fails
    synthesis = {
      trends: TRENDING_REEL_FORMATS.slice(0, 6).map(f => ({
        topic: f.name,
        source: 'evergreen',
        urgency: 'this week',
        relevance: 'high',
        reel_format: f.name,
        content_idea: f.description,
        why_trending: f.best_for,
        hashtags: ['#IndianBusiness', '#SmallBusiness', '#Reels'],
        best_platform: 'instagram'
      })),
      top_trend_today: 'Evergreen Indian reel formats',
      weekly_theme: 'Connect with your customers through relatable content',
      best_posting_time: '7-9 PM IST',
      avoid_topics: []
    }
  }

  const result = {
    ...synthesis,
    sources: {
      youtube: youtubeTrends.length,
      google: googleTrends.length,
      reddit: redditTrends.length,
    },
    generated_at: new Date().toISOString(),
    cached: false
  }

  // Save to cache
  try {
    await supabase
      .from('ai_insights')
      .delete()
      .eq('owner_id', user.id)
      .eq('type', 'trend_report')

    await supabase.from('ai_insights').insert({
      owner_id: user.id,
      type: 'trend_report',
      severity: 'info',
      category: 'marketing',
      title: 'Trend Report',
      description: 'Cached trend report',
      metadata: { insight_type: 'trend_report', insight_data: result },
      created_at: new Date().toISOString()
    })
  } catch {
    // Cache save failure is non-critical
  }

  return Response.json(result)
}

// Helper functions

async function fetchYouTubeTrends(): Promise<string[]> {
  const key = process.env.YOUTUBE_KEY || process.env.YOUTUBE_API_KEY
  if (!key) return []

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=IN&maxResults=10&key=${key}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) return []
    const data = await res.json()

    return (data.items || []).map((item: any) =>
      `${item.snippet.title} - ${item.snippet.channelTitle}`
    )
  } catch {
    return []
  }
}

async function fetchGoogleTrends(): Promise<string[]> {
  try {
    const res = await fetch(
      'https://trends.google.com/trending/rss?geo=IN',
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const xml = await res.text()

    const matches = xml.match(
      /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g
    ) || []

    return matches
      .map(m => m
        .replace(/<title><!\[CDATA\[/, '')
        .replace(/\]\]><\/title>/, '')
        .replace(/<title>/, '')
        .replace(/<\/title>/, '')
        .trim()
      )
      .filter(t => t && t !== 'Google Trends' && t.length > 2)
      .slice(0, 10)
  } catch {
    return []
  }
}

async function fetchRedditTrends(): Promise<string[]> {
  const subreddits = ['india', 'bollywood', 'indianbusiness']
  const results: string[] = []

  for (const sub of subreddits) {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=5`,
        {
          headers: { 'User-Agent': 'StartupSphere/1.0' },
          next: { revalidate: 3600 }
        }
      )
      if (!res.ok) continue
      const data = await res.json()
      const posts = data?.data?.children || []
      posts.forEach((p: any) => {
        if (p.data?.title && p.data.score > 100) {
          results.push(p.data.title)
        }
      })
    } catch {
      continue
    }
  }

  return results.slice(0, 10)
}
