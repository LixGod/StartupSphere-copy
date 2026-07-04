import React from "react";
import { TrendConcept } from "@/lib/ai-marketing/types";
import { Flame, ArrowUpRight, Calendar, Clock, Sparkles } from "lucide-react";

interface TrendBannerProps {
  concept?: TrendConcept;
  conceptName?: string;
  // Mode B: Dashboard Summary
  topTrend?: string;
  weeklyTheme?: string;
  bestPostingTime?: string;
  sources?: { youtube: number; reddit: number; google: number };
  generatedAt?: string;
}

export function TrendBanner({
  concept,
  conceptName,
  topTrend,
  weeklyTheme,
  bestPostingTime,
  sources,
  generatedAt,
}: TrendBannerProps) {
  // Mode A: Original Trend Concept Banner (used inside IdeaCard)
  if (concept && conceptName) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-[#111116] border border-[#e8365d]/30 shadow-[0_0_15px_rgba(232,54,93,0.1)] p-6 mb-6">
        {/* Glowing accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e8365d]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#ff7c3a]/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3 text-[#ff7c3a]">
            <Flame className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">{concept.platform_origin} Trend</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black font-['Unbounded'] text-white mb-2">
            {conceptName}
          </h2>
          
          <div className="inline-flex items-center gap-2 bg-[#22222a] border border-[#33333f] px-3 py-1.5 rounded-full mb-6 text-sm">
            <span className="text-[#888894]">Trend Name:</span>
            <span className="text-white font-bold">{concept.trend_name}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-[#0fd49a] text-sm font-bold mb-2 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4" /> Why it fits
              </h4>
              <p className="text-sm text-[#d0d0d8] font-['DM_Sans'] leading-relaxed">
                {concept.why_this_product_fits}
              </p>
            </div>
            <div>
              <h4 className="text-[#e8365d] text-sm font-bold mb-2 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4" /> Visual Pattern
              </h4>
              <p className="text-sm text-[#d0d0d8] font-['DM_Sans'] leading-relaxed">
                {concept.visual_pattern}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#33333f]">
            <p className="text-xs text-[#888894]">
              <span className="font-bold text-white mr-2">Reference:</span> 
              {concept.reference_example}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Mode B: Dashboard Summary Banner
  const totalSources = (sources?.youtube || 0) + (sources?.reddit || 0) + (sources?.google || 0);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl p-8 mb-8">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm uppercase tracking-wider">
            <Sparkles className="w-5 h-5 animate-pulse" />
            Live Trend Scouting Report
          </div>
          <div>
            <span className="text-slate-400 text-sm uppercase font-bold tracking-wider block mb-1">Top Trend Today</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white font-['Unbounded'] tracking-tight">
              {topTrend || "Scanning Trends..."}
            </h2>
          </div>
          <div>
            <span className="text-slate-400 text-sm uppercase font-bold tracking-wider block mb-1">Weekly Theme</span>
            <p className="text-slate-300 text-lg leading-relaxed">{weeklyTheme || "Loading dynamic marketing strategy..."}</p>
          </div>
        </div>

        <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Best Posting Time</span>
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                {bestPostingTime || "e.g. 7-9 PM IST"}
              </span>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Scouting Sources</span>
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                {totalSources > 0 ? `From ${totalSources} live topics` : "3 Live Sources"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-900/40 p-3 rounded-lg border border-slate-800/40">
            <span>Last Scraped:</span>
            <span className="font-mono text-slate-300">
              {generatedAt ? new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
