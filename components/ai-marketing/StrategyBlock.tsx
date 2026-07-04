import React from "react";
import { CampaignStrategy } from "@/lib/ai-marketing/types";
import { Target, Calendar, AlertTriangle, TrendingUp } from "lucide-react";

interface StrategyBlockProps {
  strategy: CampaignStrategy;
}

export function StrategyBlock({ strategy }: StrategyBlockProps) {
  return (
    <div className="bg-[#111116] border border-[#22222a] rounded-2xl p-8 mt-12 mb-20 shadow-2xl relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#0fd49a]/5 rounded-full blur-[100px]" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[#22222a]">
          <div className="bg-[#0fd49a]/10 p-3 rounded-xl">
            <Target className="w-6 h-6 text-[#0fd49a]" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-['Unbounded'] text-white">Campaign Strategy</h2>
            <p className="text-[#888894] font-['DM_Sans'] text-sm">Overall channel execution plan</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider mb-3">
                <Calendar className="w-4 h-4 text-[#888894]" /> Posting Cadence
              </h3>
              <p className="text-[#d0d0d8] font-['DM_Sans'] bg-[#1a1a24] p-4 rounded-xl border border-[#33333f]">
                {strategy.posting_cadence}
              </p>
            </div>

            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider mb-3">
                <Target className="w-4 h-4 text-[#888894]" /> Content Pillars
              </h3>
              <ul className="space-y-3">
                {strategy.content_pillars.map((pillar, idx) => (
                  <li key={idx} className="flex gap-3 bg-[#1a1a24] p-3 rounded-xl border border-[#33333f]">
                    <span className="text-[#0fd49a] font-bold">0{idx + 1}</span>
                    <span className="text-[#d0d0d8] text-sm">{pillar}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-gradient-to-br from-[#1a1a24] to-[#22222a] p-6 rounded-xl border border-[#33333f]">
              <h3 className="flex items-center gap-2 text-sm font-bold text-[#0fd49a] uppercase tracking-wider mb-3">
                <TrendingUp className="w-4 h-4" /> The Growth Move
              </h3>
              <p className="text-white font-['DM_Sans'] leading-relaxed">
                {strategy.growth_move}
              </p>
            </div>

            <div className="bg-[#e8365d]/5 p-6 rounded-xl border border-[#e8365d]/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <AlertTriangle className="w-24 h-24 text-[#e8365d]" />
               </div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-[#e8365d] uppercase tracking-wider mb-3 relative z-10">
                <AlertTriangle className="w-4 h-4" /> Avoid This Mistake
              </h3>
              <p className="text-[#d0d0d8] font-['DM_Sans'] leading-relaxed relative z-10">
                {strategy.avoid_this}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
