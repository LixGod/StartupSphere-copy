import React, { useState } from "react";
import { ReelIdea } from "@/lib/ai-marketing/types";
import { TrendBanner } from "./TrendBanner";
import { SceneScript } from "./SceneScript";
import { CapCutExport } from "./CapCutExport";
import { ChevronDown, ChevronUp, MapPin, Scissors, Tag, Hash, Clock, Zap, MessageCircle, Bookmark, BookmarkCheck, Loader2 } from "lucide-react";

interface IdeaCardProps {
  idea: ReelIdea;
  isSaved?: boolean;
  onSave?: (idea: ReelIdea) => Promise<void>;
}

export function IdeaCard({ idea, isSaved = false, onSave }: IdeaCardProps) {
  const [isShootGuideOpen, setIsShootGuideOpen] = useState(false);
  const [isScriptOpen, setIsScriptOpen] = useState(true);
  const [isCaptionOpen, setIsCaptionOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postPack, setPostPack] = useState<any | null>(null);
  const [postLoading, setPostLoading] = useState(false);

  const allHashtags = [
    ...(idea.hashtags?.primary || []),
    ...(idea.hashtags?.niche || []),
    ...(idea.hashtags?.trending || []),
  ];

  const handleGeneratePostPack = async () => {
    setPostLoading(true);
    try {
      const res = await fetch("/api/ai/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: idea.concept_name,
          event: idea.trend_concept?.why_this_product_fits || "",
          conceptName: idea.concept_name,
          trendName: idea.trend_concept?.trend_name || "",
          caption: idea.caption?.lines || "",
          hashtags: allHashtags,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate post pack");
      const data = await res.json();
      setPostPack(data.postPack || null);
    } catch {
      setPostPack(null);
    } finally {
      setPostLoading(false);
    }
  };

  return (
    <div className="bg-[#0b0b0e] border border-[#22222a] rounded-2xl p-6 mb-8 shadow-xl">
      <TrendBanner concept={idea.trend_concept} conceptName={idea.concept_name} />

      <div className="space-y-4">
        {/* Shoot Guide Accordion */}
        <div className="bg-[#111116] border border-[#22222a] rounded-xl overflow-hidden">
          <button 
            onClick={() => setIsShootGuideOpen(!isShootGuideOpen)}
            className="w-full flex items-center justify-between p-4 bg-[#16161c] hover:bg-[#1a1a22] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#ff7c3a]/10 p-2 rounded-lg">
                <MapPin className="w-4 h-4 text-[#ff7c3a]" />
              </div>
              <span className="font-bold text-white font-['DM_Sans']">Shoot & Edit Guide</span>
            </div>
            {isShootGuideOpen ? <ChevronUp className="w-5 h-5 text-[#888894]" /> : <ChevronDown className="w-5 h-5 text-[#888894]" />}
          </button>
          
          {isShootGuideOpen && (
            <div className="p-6 border-t border-[#22222a]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h5 className="text-xs font-bold text-[#888894] uppercase tracking-wider mb-2">Location & Vibe</h5>
                  <p className="text-sm text-white">{idea.shoot_guide.location}</p>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#888894] uppercase tracking-wider mb-2">Props Needed</h5>
                  <div className="flex flex-wrap gap-2">
                    {idea.shoot_guide.props_needed.map((prop, i) => (
                      <span key={i} className="bg-[#22222a] text-xs text-[#d0d0d8] px-2 py-1 rounded border border-[#33333f]">
                        {prop}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h5 className="text-xs font-bold text-[#888894] uppercase tracking-wider mb-3">Shot List</h5>
                <div className="space-y-2">
                  {idea.shoot_guide.shots.map((shot, i) => (
                    <div key={i} className="bg-[#1a1a24] p-3 rounded border border-[#33333f] text-sm text-[#d0d0d8]">
                      {shot}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#e8365d]/5 border border-[#e8365d]/20 p-4 rounded-lg flex gap-3">
                <Scissors className="w-5 h-5 text-[#e8365d] flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-[#e8365d] uppercase tracking-wider mb-1">Edit Instructions</h5>
                  <p className="text-sm text-white">{idea.shoot_guide.edit_instructions}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Script Accordion */}
        <div className="bg-[#111116] border border-[#22222a] rounded-xl overflow-hidden">
          <button 
            onClick={() => setIsScriptOpen(!isScriptOpen)}
            className="w-full flex items-center justify-between p-4 bg-[#16161c] hover:bg-[#1a1a22] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#f0c040]/10 p-2 rounded-lg">
                <MessageCircle className="w-4 h-4 text-[#f0c040]" />
              </div>
              <span className="font-bold text-white font-['DM_Sans']">
                Script <span className="bg-[#22222a] text-[#888894] text-xs ml-2 px-2 py-0.5 rounded-full border border-[#33333f]">{idea.script.format_used}</span>
              </span>
            </div>
            {isScriptOpen ? <ChevronUp className="w-5 h-5 text-[#888894]" /> : <ChevronDown className="w-5 h-5 text-[#888894]" />}
          </button>
          
          {isScriptOpen && (
            <div className="p-0 border-t border-[#22222a]">
              <SceneScript script={idea.script} />
            </div>
          )}
        </div>

        {/* Caption & Hashtags */}
        <div className="bg-[#111116] border border-[#22222a] rounded-xl overflow-hidden">
          <button 
            onClick={() => setIsCaptionOpen(!isCaptionOpen)}
            className="w-full flex items-center justify-between p-4 bg-[#16161c] hover:bg-[#1a1a22] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#0fd49a]/10 p-2 rounded-lg">
                <Tag className="w-4 h-4 text-[#0fd49a]" />
              </div>
              <span className="font-bold text-white font-['DM_Sans']">Caption & Hashtags</span>
            </div>
            {isCaptionOpen ? <ChevronUp className="w-5 h-5 text-[#888894]" /> : <ChevronDown className="w-5 h-5 text-[#888894]" />}
          </button>
          
          {isCaptionOpen && (
            <div className="p-6 border-t border-[#22222a]">
               <div className="bg-[#1a1a24] p-4 rounded-lg border border-[#33333f] mb-6">
                 <p className="text-white text-sm whitespace-pre-wrap font-['DM_Sans']">{idea.caption.lines}</p>
                 <div className="mt-4 pt-4 border-t border-[#33333f]">
                    <span className="text-[#0fd49a] text-xs font-bold uppercase tracking-wider block mb-1">Call To Action</span>
                    <p className="text-white font-bold">{idea.caption.cta}</p>
                 </div>
               </div>

               <div>
                 <h5 className="flex items-center gap-2 text-xs font-bold text-[#888894] uppercase tracking-wider mb-3">
                   <Hash className="w-3 h-3" /> Hashtag Strategy
                 </h5>
                 <div className="space-y-3">
                   <div>
                     <span className="text-xs text-[#888894] block mb-1">Primary (Broad Reach)</span>
                     <div className="flex flex-wrap gap-2">
                       {idea.hashtags.primary.map((tag, i) => <span key={`p-${i}`} className="text-xs text-white bg-[#22222a] px-2 py-1 rounded">{tag}</span>)}
                     </div>
                   </div>
                   <div>
                     <span className="text-xs text-[#888894] block mb-1">Niche (Community)</span>
                     <div className="flex flex-wrap gap-2">
                       {idea.hashtags.niche.map((tag, i) => <span key={`n-${i}`} className="text-xs text-[#0fd49a] bg-[#0fd49a]/10 px-2 py-1 rounded">{tag}</span>)}
                     </div>
                   </div>
                   <div>
                     <span className="text-xs text-[#888894] block mb-1">Trending (Live Injection)</span>
                     <div className="flex flex-wrap gap-2">
                       {idea.hashtags.trending.map((tag, i) => <span key={`t-${i}`} className="text-xs text-[#e8365d] bg-[#e8365d]/10 px-2 py-1 rounded">{tag}</span>)}
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          )}
        </div>

        {/* CapCut Export Panel */}
        {((idea as any).scenes || (idea as any).music_suggestion) && (
          <div className="mt-4">
            <CapCutExport reelIdea={idea as any} />
          </div>
        )}

        {/* Post pack from Gemini (reel idea -> post adaptation) */}
        <div className="bg-[#111116] border border-[#22222a] rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">Post Adaptation (Gemini)</p>
              <p className="text-xs text-[#888894]">Generate Instagram/LinkedIn/WhatsApp post copies from this reel idea.</p>
            </div>
            <button
              onClick={handleGeneratePostPack}
              disabled={postLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-60"
            >
              {postLoading ? "Generating..." : "Generate Posts"}
            </button>
          </div>
          {postPack && (
            <div className="mt-4 grid md:grid-cols-3 gap-3">
              <div className="bg-[#1a1a24] border border-[#33333f] rounded-lg p-3">
                <p className="text-[10px] text-[#888894] uppercase font-bold mb-1">Instagram</p>
                <p className="text-xs text-white whitespace-pre-wrap">{postPack.instagram_post}</p>
              </div>
              <div className="bg-[#1a1a24] border border-[#33333f] rounded-lg p-3">
                <p className="text-[10px] text-[#888894] uppercase font-bold mb-1">LinkedIn</p>
                <p className="text-xs text-white whitespace-pre-wrap">{postPack.linkedin_post}</p>
              </div>
              <div className="bg-[#1a1a24] border border-[#33333f] rounded-lg p-3">
                <p className="text-[10px] text-[#888894] uppercase font-bold mb-1">WhatsApp</p>
                <p className="text-xs text-white whitespace-pre-wrap">{postPack.whatsapp_broadcast}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Timing + Virality + Save */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 bg-[#22222a] rounded-lg p-3 flex items-center gap-3">
            <div className="bg-black/30 p-2 rounded-full">
              <Clock className="w-4 h-4 text-[#888894]" />
            </div>
            <div>
              <span className="text-[10px] text-[#888894] font-bold uppercase block">Post Timing</span>
              <span className="text-sm text-white font-bold">{idea.post_timing}</span>
            </div>
          </div>
          <div className="flex-1 bg-[#22222a] rounded-lg p-3 flex items-center gap-3 border border-[#ff7c3a]/30">
            <div className="bg-[#ff7c3a]/10 p-2 rounded-full">
              <Zap className="w-4 h-4 text-[#ff7c3a]" />
            </div>
            <div>
              <span className="text-[10px] text-[#ff7c3a] font-bold uppercase block">Virality Lever</span>
              <span className="text-sm text-white font-bold leading-tight">{idea.virality_lever}</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {onSave && (
          <button
            onClick={async () => {
              if (isSaved || saving) return;
              setSaving(true);
              try {
                await onSave(idea);
              } finally {
                setSaving(false);
              }
            }}
            disabled={isSaved || saving}
            className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-sm transition-all ${
              isSaved
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 cursor-default"
                : "bg-[#22222a] border border-[#33333d] text-slate-300 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-300"
            }`}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : isSaved ? (
              <><BookmarkCheck className="w-4 h-4" /> Saved to Your Ideas</>
            ) : (
              <><Bookmark className="w-4 h-4" /> Save Reel Idea</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
