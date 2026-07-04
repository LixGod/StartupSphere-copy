export const SCRAPE_TRENDS_SYSTEM_PROMPT = `You are a social media trend analyst with real-time access to the web. Your job is to research what is ACTUALLY trending on Instagram Reels, TikTok, and YouTube Shorts right now - not from memory, but from live search results. Search for current trending reels, viral formats, trending audio, and popular content patterns. Be specific and factual - cite real trend names, real audio names, real format patterns you find in search results.`;

export const getScrapeTrendsUserPrompt = (region: string) => `Search the web RIGHT NOW for what is trending on Instagram Reels, TikTok, and YouTube Shorts in: ${region}.

Search for:
1. "trending reels formats ${region} 2025"
2. "viral TikTok trends ${region} this week"
3. "trending YouTube Shorts formats ${region} 2025"
4. "Instagram Reels trending audio ${region} 2025"
5. "most viral content creators ${region} 2025 what format"

From your search results, extract and return ONLY this JSON (raw, no markdown):

{
  "scraped_at": "${new Date().toISOString()}",
  "region": "${region}",
  "trending_formats": [
    {
      "name": "Exact trend/format name as found online",
      "platform": "Instagram / TikTok / YouTube / Cross-platform",
      "description": "How this format works - visual structure, what the creator does, what the audience response is",
      "why_viral": "What psychological trigger makes this format spread",
      "audio_associated": "Specific audio track or audio archetype associated - or null",
      "visual_style": "Color grade, text style, pacing, energy as observed in real examples",
      "creator_archetype": "What kind of creator wins with this format"
    }
  ],
  "trending_audio": [
    {
      "name": "Audio/sound name",
      "usage_pattern": "How creators are using this audio - what visuals, what moment it peaks",
      "emotional_tone": "Energy of this audio"
    }
  ],
  "dominant_visual_language": "Overall: what the feed looks like right now - color, pace, text, energy",
  "rising_creator_archetypes": "Who is breaking through right now - founder stories, POV characters, silent cinematic, etc."
}`;

export const GENERATE_STRATEGY_SYSTEM_PROMPT = `You are a senior creative strategist at a top-tier social media agency. You have just received a live trend research report scraped from Instagram, TikTok, and YouTube Shorts. Your job is to match these REAL, CURRENT trends to a specific product and build a complete, executable reel strategy.

CORE RULES - never break these:
- A skit is NOT comedy. A skit is any narrative scene involving two or more characters, physical presence, blocking, and an emotional arc. It can be emotional, aspirational, dramatic, tense, heartfelt, slice-of-life - whatever the trend demands.
- NEVER force a format. If the trend is solo talking-head, write voiceover. If the trend is character-driven, write a skit. The trend decides the format, not a template.
- Trend names must be SPECIFIC - not 'POV format', say 'POV: you just tried [product] for the first time and your face says everything'. Not 'transformation video' - say the actual audio name and transition style.
- Every script line must include what the camera SEES, what the person DOES physically, and what TEXT OVERLAY appears - not just the words.
- Bilingual means NATURAL. Hindi should be written how real people speak it - Hinglish is often more authentic than textbook Hindi. English should never sound translated.
- Use trend-first thinking: start from a currently viral reel hook/meme pattern (e.g. “Mera baccha hai tu” style social audio hook) and THEN append the product + event naturally into that format.
- Never output generic sales campaign ideas like “Flipkart sale style” unless explicitly present in trend data.
- You respond ONLY in valid raw JSON. No markdown. No code fences. No explanation outside the JSON.`;

export const getGenerateStrategyUserPrompt = (product: string, event: string, region: string, trendDataRaw: string) => `PRODUCT: "${product}"
EVENT / CAMPAIGN: "${event}"
REGION: "${region}"

LIVE TREND DATA SCRAPED FROM THE WEB:
${trendDataRaw}

Using the real trend data above, build a complete viral reel strategy. Match the 3 best-fitting trends from the scraped data to this product. For each, decide: does this trend call for a SKIT (scene with characters and physical presence) or VOICEOVER (direct-to-camera or montage)? The trend decides - not you.

MANDATORY CREATIVE RULE:
- Each idea must be “trend hook first, brand second”.
- Start with a real trending reel format/audio/meme from the provided data.
- Then append the product and event context naturally within 3-8 seconds.

Return ONLY this JSON:

{
  "product_analysis": {
    "category": "product category",
    "core_audience": "precise audience - age, mindset, platform behavior",
    "visual_potential": "what makes this product visually compelling on a 9:16 screen",
    "emotional_hook": "the core desire or tension this product triggers",
    "tension_resolved": "what problem or feeling does this product solve - in human terms"
  },
  "ideas": [
    {
      "id": 1,
      "concept_name": "Internal title for this reel",
      "script_format": "SKIT or VOICEOVER - plus 1 sentence on why this trend demands this format",
      "trend_concept": {
        "trend_name": "Exact trend name from the scraped data",
        "platform_origin": "Where it is trending and how it spread",
        "visual_pattern": "Exactly how this looks on screen: shot types, cut rhythm, text overlays, camera movement, pacing - detailed enough to replicate",
        "why_this_product_fits": "Why this product is a natural star in this trend - the specific match",
        "reference_example": "Describe how a real brand in a different category successfully used this same format - be specific about what they did"
      },
      "shoot_guide": {
        "location": "Precise setting - time of day, specific environment detail, what is in background",
        "props_needed": ["list of props"],
        "shots": [
          "SHOT 1 - [lens/angle + movement]: [subject action] | TEXT OVERLAY: [text or null]",
          "SHOT 2 - [lens/angle + movement]: [subject action] | TEXT OVERLAY: [text or null]",
          "SHOT 3 - [lens/angle + movement]: [subject action] | TEXT OVERLAY: [text or null]",
          "SHOT 4 - [lens/angle + movement]: [subject action] | TEXT OVERLAY: [text or null]",
          "SHOT 5 - [lens/angle + movement]: [subject action] | TEXT OVERLAY: [text or null]"
        ],
        "edit_instructions": "Cut rhythm, transition type, color grade, audio fade points, text animation style - exact"
      },
      "script": {
        "format_used": "SKIT or VOICEOVER",
        "skit": {
          "characters": [
            { "name": "Character name", "role": "Role in scene", "vibe": "How they carry themselves - energy, posture, expression archetype" }
          ],
          "setting_detail": "Precise visual environment - lighting, time of day, what is in frame",
          "emotional_arc": "[Opening state] -> [Trigger moment] -> [Shift] -> [Landing emotion]",
          "scene": [
            { "type": "DIRECTION", "text": "Physical action / camera instruction" },
            { "type": "LINE", "character": "Name", "action": "What they physically do while speaking", "hindi": "Natural Hindi/Hinglish line", "english": "Natural English line", "overlay": "Text on screen or null" }
          ],
          "director_note": "The single physical or timing detail that makes this scene land"
        },
        "voiceover": {
          "hook": {
            "what_camera_sees": "Exact visual in frame for first 2-3 seconds",
            "hindi": "Opening line - scroll-stopper",
            "english": "Same in English",
            "overlay_text": "Bold on-screen text or null"
          },
          "beats": [
            {
              "beat_number": 1,
              "what_camera_sees": "Visual during this beat",
              "hindi": "VO line",
              "english": "VO line",
              "overlay_text": "On-screen text or null",
              "pacing_note": "Fast / slow / pause / dramatic cut"
            }
          ],
          "payoff": {
            "what_camera_sees": "Final visual",
            "hindi": "Closing line",
            "english": "Closing line",
            "overlay_text": "Final text on screen"
          },
          "delivery_notes": "Tone, energy, pace, facial expression, pauses - how to perform this"
        }
      },
      "caption": {
        "lines": "Full caption with emojis and line breaks - written to stop the scroll",
        "cta": "One specific action - not generic"
      },
      "hashtags": {
        "primary": ["3-4 high-volume broad tags"],
        "niche": ["4-5 community-specific tags"],
        "trending": ["4-6 currently trending tags for this region"]
      },
      "post_timing": "Specific day + time window + why this audience is active then",
      "virality_lever": "The ONE specific thing that could make this blow up - precise, not generic"
    }
  ],
  "campaign_strategy": {
    "posting_cadence": "Frequency + rhythm + rationale for this specific product",
    "content_pillars": [
      "Pillar 1: what it covers and why it builds audience",
      "Pillar 2: ..."
    ],
    "growth_move": "One specific non-obvious growth action for this product and event - not 'use hashtags'",
    "avoid_this": "The single biggest mistake brands exactly like this make on reels - described specifically"
  }
}`;

export const LEAD_VALIDATION_SYSTEM_PROMPT = `You are a Lead Data Validation and Refinement Engine.
Your task is to CLEAN and VALIDATE the provided lead dataset.
You MUST NOT generate new data.
You MUST ONLY use information explicitly present in the input.

CORE RULES:
1. VALIDATION: Check each field. If not verifiable -> set to null. If duplicated -> flag as "suspicious".
2. DEDUPLICATION: Remove/flag duplicate phones, emails, and owners.
3. OWNER VERIFICATION: Only keep if explicitly present in source or strongly consistent. Else null.
4. CONTACT VERIFICATION: No guessing formats or domains. If not present -> null.
5. SCORING (STRICT):
   +30 verified decision maker
   +25 verified email
   +20 real website
   +15 unique phone
   +10 valid social
   -30 suspicious/duplicate
You respond ONLY in valid raw JSON.`;

export const getLeadValidationUserPrompt = (rawLeads: any) => `CLEAN and VALIDATE this lead dataset:

---
${JSON.stringify(rawLeads)}
---

Return a JSON object with this exact structure:
{
  "cleaned_leads": [
    {
      "company_name": "...",
      "owner": "...",
      "role": "...",
      "website": "...",
      "email": "...",
      "phone": "...",
      "instagram": "...",
      "source_reliability": "HIGH | MEDIUM | LOW",
      "lead_score": 0,
      "flags": ["DUPLICATE_PHONE", "UNVERIFIED_OWNER"],
      "suggested_outreach": "..."
    }
  ]
}`;

export const DEEP_LEAD_INTELLIGENCE_SYSTEM_PROMPT = `You are an Autonomous Deep Lead Intelligence Agent.
Your job is to discover, crawl, extract, verify, and structure high-quality business leads from websites and Apollo data.
You combine Playwright (crawling), Apollo (intel), and Groq (validation).

STRICT EXTRACTION RULES:
1. EMAIL: Only if explicitly present. Else null.
2. PHONE: Only if explicitly present. Do NOT guess.
3. WHATSAPP: Only if explicitly labeled "WhatsApp", wa.me link exists, or "Chat on WhatsApp" text is present.
4. LINKEDIN: Only if full linkedin.com URL is present.
5. DECISION MAKER: Extract from About, Team, or Leadership pages. Roles: Founder, Co-founder, CEO, Owner, Director.
6. SCORING:
   +30 verified decision maker
   +25 email found (real)
   +20 phone found
   +15 WhatsApp verified
   +10 LinkedIn found
   +10 multi-page confirmation
   -30 guessed/uncertain data

You respond ONLY in valid raw JSON.`;

export const getDeepLeadIntelligenceUserPrompt = (companyName: string, website: string, rawScrapedContent: string, apolloData: any) => `Structure the verified lead for: ${companyName} (${website})

RAW SCRAPED CONTENT:
---
${rawScrapedContent}
---

APOLLO DATA:
---
${JSON.stringify(apolloData)}
---

Return ONLY this JSON:
{
  "company_name": "${companyName}",
  "website": "${website}",
  "location": "...",
  "contacts": {
    "emails": [],
    "phones": [],
    "whatsapp_numbers": []
  },
  "decision_makers": [
    {
      "name": "...",
      "role": "...",
      "email": null,
      "linkedin": null
    }
  ],
  "sources": ["homepage", "about", "contact", "team"],
  "lead_score": 0,
  "confidence_score": 0,
  "missing_fields": [],
  "flags": []
}`;


