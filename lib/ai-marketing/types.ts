export interface ScrapedTrendFormat {
  name: string;
  platform: string;
  description: string;
  why_viral: string;
  audio_associated: string | null;
  visual_style: string;
  creator_archetype: string;
}

export interface ScrapedTrendAudio {
  name: string;
  usage_pattern: string;
  emotional_tone: string;
}

export interface ScrapedTrendData {
  scraped_at: string;
  region: string;
  trending_formats: ScrapedTrendFormat[];
  trending_audio: ScrapedTrendAudio[];
  dominant_visual_language: string;
  rising_creator_archetypes: string;
}

export interface ProductAnalysis {
  category: string;
  core_audience: string;
  visual_potential: string;
  emotional_hook: string;
  tension_resolved: string;
}

export interface TrendConcept {
  trend_name: string;
  platform_origin: string;
  visual_pattern: string;
  why_this_product_fits: string;
  reference_example: string;
}

export interface ShootGuide {
  location: string;
  props_needed: string[];
  shots: string[];
  edit_instructions: string;
}

export interface SkitCharacter {
  name: string;
  role: string;
  vibe: string;
}

export interface SkitSceneLine {
  type: "DIRECTION" | "LINE";
  text?: string;
  character?: string;
  action?: string;
  hindi?: string;
  english?: string;
  overlay?: string | null;
}

export interface SkitScript {
  characters: SkitCharacter[];
  setting_detail: string;
  emotional_arc: string;
  scene: SkitSceneLine[];
  director_note: string;
}

export interface VOHook {
  what_camera_sees: string;
  hindi: string;
  english: string;
  overlay_text: string | null;
}

export interface VOBeat {
  beat_number: number;
  what_camera_sees: string;
  hindi: string;
  english: string;
  overlay_text: string | null;
  pacing_note: string;
}

export interface VOPayoff {
  what_camera_sees: string;
  hindi: string;
  english: string;
  overlay_text: string | null;
}

export interface VoiceoverScript {
  hook: VOHook;
  beats: VOBeat[];
  payoff: VOPayoff;
  delivery_notes: string;
}

export interface ScriptSection {
  format_used: "SKIT" | "VOICEOVER";
  skit: SkitScript | null;
  voiceover: VoiceoverScript | null;
}

export interface ReelIdea {
  id: number;
  concept_name: string;
  script_format: "SKIT" | "VOICEOVER" | string;
  trend_concept: TrendConcept;
  shoot_guide: ShootGuide;
  script: ScriptSection;
  caption: {
    lines: string;
    cta: string;
  };
  hashtags: {
    primary: string[];
    niche: string[];
    trending: string[];
  };
  post_timing: string;
  virality_lever: string;
}

export interface CampaignStrategy {
  posting_cadence: string;
  content_pillars: string[];
  growth_move: string;
  avoid_this: string;
}

export interface GeneratedStrategy {
  product_analysis: ProductAnalysis;
  ideas: ReelIdea[];
  campaign_strategy: CampaignStrategy;
}
