import React, { useState } from "react";
import { Sparkles, Loader2, Award, Zap, AlertCircle, Compass, Target } from "lucide-react";

interface CompetitorAnalysis {
  opportunities: string[];
  content_gaps: string[];
  suggested_usp: string;
  competitor_count: number;
}

export function MarketIntelligence() {
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompetitorAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !city) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/analyze-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, city }),
      });

      if (!res.ok) throw new Error("Failed to analyze competitor intelligence");
      const data = await res.json();
      if (data.success && data.analysis) {
        setResult(data.analysis);
      } else {
        throw new Error(data.error || "Failed parsing competitor reports");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#0b0b0e] border border-[#22222a] rounded-2xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[90px]" />

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-black font-['Unbounded'] text-white">Market & Competitor Intelligence</h3>
            <p className="text-xs text-slate-400">Discover local competitor gaps and engineer a winning social media USP</p>
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300">Your Business Niche</label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Specialty Coffee, Organic Cosmetics"
                className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300">City / Location</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Pune"
                className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !niche || !city}
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Crawling Local Competitors...</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4" />
                <span>Run Market Intelligence Discovery</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="border-t border-[#22222a] pt-6 space-y-6 animate-in fade-in duration-300">
            {/* Top Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111116] border border-[#22222a] p-5 rounded-2xl flex items-center gap-4">
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Estimated Local Competitors</span>
                  <span className="text-xl font-bold text-white font-['Unbounded']">
                    {result.competitor_count}+ Active Outlets
                  </span>
                </div>
              </div>

              <div className="bg-emerald-950/15 border border-emerald-500/25 p-5 rounded-2xl flex items-start gap-4">
                <div className="bg-emerald-500/20 p-2.5 rounded-xl mt-0.5">
                  <Zap className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block mb-1">Suggested USP Opportunity</span>
                  <p className="text-white text-sm font-bold leading-relaxed">
                    {result.suggested_usp}
                  </p>
                </div>
              </div>
            </div>

            {/* Opportunities & Gaps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opportunities */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Social Media Content Opportunities</span>
                <div className="space-y-2">
                  {result.opportunities.map((opp, idx) => (
                    <div key={idx} className="bg-[#111116] border border-[#22222a] p-4 rounded-xl flex gap-3">
                      <span className="text-emerald-400 font-bold">0{idx + 1}</span>
                      <p className="text-slate-200 text-xs leading-relaxed font-['DM_Sans']">{opp}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gaps */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Competitor Content Gaps (Unserved Areas)</span>
                <div className="space-y-2">
                  {result.content_gaps.map((gap, idx) => (
                    <div key={idx} className="bg-[#111116] border border-[#22222a] p-4 rounded-xl flex gap-3 border-l-amber-500/40">
                      <span className="text-amber-400 font-bold">0{idx + 1}</span>
                      <p className="text-slate-200 text-xs leading-relaxed font-['DM_Sans']">{gap}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
