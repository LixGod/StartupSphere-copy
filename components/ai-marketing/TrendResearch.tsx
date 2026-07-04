import React from "react";
import { Loader2, Search, Smartphone, Music, TrendingUp, RefreshCw, Sparkles } from "lucide-react";

interface TrendResearchProps {
  isLoading: boolean;
  trendData: any; // Supports both old and new format
  onUseIdea?: (ideaText: string, hashtags: string[]) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TrendResearch({
  isLoading,
  trendData,
  onUseIdea,
  onRefresh,
  isRefreshing = false,
}: TrendResearchProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-[#111116] border border-[#22222a] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#e8365d]/10 via-[#ff7c3a]/10 to-[#0fd49a]/10 animate-pulse" />
        <div className="relative z-10 flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full border-t-2 border-[#e8365d] animate-spin"></div>
            <Search className="text-[#e8365d] w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-xl font-black font-['Unbounded'] text-white mb-2">
            Scouting Live Indian Trends
          </h3>
          <p className="text-[#888894] font-['DM_Sans'] text-center max-w-md">
            Parallel crawling Google Trends RSS, YouTube Popular, and Reddit hot-threads for real-time market analysis...
          </p>
        </div>
      </div>
    );
  }

  if (!trendData) return null;

  // New Trend Format Rendering
  if (trendData.trends && Array.isArray(trendData.trends)) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0fd49a]/10 flex items-center justify-center">
              <TrendingUp className="text-[#0fd49a] w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black font-['Unbounded'] text-white flex items-center gap-2">
                Live Insights
              </h3>
              <p className="text-xs text-slate-400 font-['DM_Sans']">
                Successfully parsed live social sources in India
              </p>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white text-xs font-bold rounded-lg border border-slate-700 transition-all hover:scale-105"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-slate-500" : "text-slate-300"}`} />
              {isRefreshing ? "Refreshing..." : "🔄 Refresh Trends"}
            </button>
          )}
        </div>

        {/* Trend Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trendData.trends.map((trend: any, idx: number) => {
            // Border color by relevance
            let borderStyle = "border-slate-800 hover:border-slate-700";
            if (trend.relevance === "high") {
              borderStyle = "border-[#e8365d]/50 hover:border-[#e8365d] shadow-[0_0_15px_rgba(232,54,93,0.05)]";
            } else if (trend.relevance === "medium") {
              borderStyle = "border-blue-500/50 hover:border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.05)]";
            }

            // Source badge
            let sourceBadge = (
              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                🌍 Global
              </span>
            );
            if (trend.source === "youtube") {
              sourceBadge = (
                <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  ▶ YouTube
                </span>
              );
            } else if (trend.source === "reddit") {
              sourceBadge = (
                <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  👽 Reddit
                </span>
              );
            } else if (trend.source === "google") {
              sourceBadge = (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                  🔍 Google
                </span>
              );
            }

            return (
              <div
                key={idx}
                className={`bg-[#0b0b0e] border rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between ${borderStyle}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-bold text-white font-['DM_Sans'] flex items-center gap-1.5">
                      🔥 {trend.topic}
                    </h4>
                    {sourceBadge}
                  </div>

                  <div className="text-xs text-slate-400 mb-4 bg-slate-900/40 px-2 py-1 rounded inline-block font-mono">
                    Best for: <span className="text-blue-400 font-bold uppercase">{trend.best_platform}</span>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                        Content Idea
                      </span>
                      <p className="text-slate-200 text-sm leading-relaxed font-['DM_Sans']">
                        {trend.content_idea}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                        Why Relevant
                      </span>
                      <p className="text-slate-400 text-xs leading-relaxed font-['DM_Sans']">
                        {trend.why_relevant}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-900">
                  <div className="flex flex-wrap gap-1.5">
                    {(trend.hashtags || []).slice(0, 3).map((tag: string, i: number) => (
                      <span key={i} className="text-xs text-[#0fd49a] bg-[#0fd49a]/5 px-2 py-0.5 rounded-full">
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>

                  {onUseIdea && (
                    <button
                      onClick={() => onUseIdea(trend.content_idea, trend.hashtags)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
                    >
                      Use Idea
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback / Old Format Rendering (Backward compatibility)
  return (
    <div className="w-full bg-[#111116] border border-[#22222a] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#0fd49a]/10 flex items-center justify-center">
          <TrendingUp className="text-[#0fd49a] w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-black font-['Unbounded'] text-white">Live Trends Found</h3>
          <p className="text-sm text-[#888894] font-['DM_Sans']">
            Scraped {new Date(trendData.scraped_at).toLocaleTimeString()} in {trendData.region}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(trendData.trending_formats || []).map((format: any, idx: number) => (
          <div key={idx} className="bg-[#1a1a24] rounded-lg p-4 border border-[#33333f]">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-4 h-4 text-[#ff7c3a]" />
              <span className="text-xs font-bold text-[#ff7c3a] uppercase tracking-wider">{format.platform}</span>
            </div>
            <h4 className="text-white font-bold mb-2 font-['DM_Sans']">{format.name}</h4>
            <p className="text-sm text-[#a0a0ab] line-clamp-3 mb-3">{format.description}</p>
            {format.audio_associated && (
              <div className="flex items-center gap-2 text-xs text-[#0fd49a] bg-[#0fd49a]/10 px-2 py-1 rounded-md">
                <Music className="w-3 h-3" />
                <span className="truncate">{format.audio_associated}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#1a1a24] rounded-lg p-4 border border-[#33333f] flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <h5 className="text-xs font-bold text-[#888894] uppercase tracking-wider mb-2">Visual Language</h5>
          <p className="text-sm text-white font-['DM_Sans']">{trendData.dominant_visual_language}</p>
        </div>
        <div className="hidden md:block w-px bg-[#33333f]"></div>
        <div className="flex-1">
          <h5 className="text-xs font-bold text-[#888894] uppercase tracking-wider mb-2">Creator Archetypes</h5>
          <p className="text-sm text-white font-['DM_Sans']">{trendData.rising_creator_archetypes}</p>
        </div>
      </div>
    </div>
  );
}
