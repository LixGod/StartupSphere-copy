"use client";

import React, { useState } from "react";
import { TrendResearch } from "@/components/ai-marketing/TrendResearch";
import { IdeaCard } from "@/components/ai-marketing/IdeaCard";
import { StrategyBlock } from "@/components/ai-marketing/StrategyBlock";
import { ScrapedTrendData, GeneratedStrategy } from "@/lib/ai-marketing/types";
import { Wand2, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function MarketingPage() {
  const [product, setProduct] = useState("");
  const [event, setEvent] = useState("");
  const [region, setRegion] = useState("Global");

  const [isScraping, setIsScraping] = useState(false);
  const [trendData, setTrendData] = useState<ScrapedTrendData | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [strategyData, setStrategyData] = useState<GeneratedStrategy | null>(null);

  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !event) return;

    setError(null);
    setTrendData(null);
    setStrategyData(null);

    try {
      // Phase 1: Scrape live trends
      setIsScraping(true);
      const scrapeRes = await fetch("/api/scrape-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region }),
      });

      if (!scrapeRes.ok) throw new Error("Failed to scrape trends");
      const scrapedData: ScrapedTrendData = await scrapeRes.json();
      setTrendData(scrapedData);
      setIsScraping(false);

      // Phase 2: Generate strategy
      setIsGenerating(true);
      const generateRes = await fetch("/api/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          event,
          region,
          trendData: scrapedData,
        }),
      });

      if (!generateRes.ok) throw new Error("Failed to generate strategy");
      const generatedStrategy: GeneratedStrategy = await generateRes.json();
      setStrategyData(generatedStrategy);
      setIsGenerating(false);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
      setIsScraping(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-white font-['DM_Sans'] selection:bg-[#e8365d]/30 selection:text-white">
      {/* Navbar / Header */}
      <header className="border-b border-[#22222a] bg-[#111116]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#e8365d] to-[#ff7c3a] flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-black font-['Unbounded'] tracking-wide">
              AI Marketing <span className="text-[#888894] font-medium text-sm">Engine</span>
            </h1>
          </div>
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[#888894] hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Input Form */}
        {!strategyData && !isScraping && !isGenerating && (
          <div className="max-w-3xl mx-auto mb-16">
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-black font-['Unbounded'] mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-[#888894]">
                Engineer Viral Growth
              </h2>
              <p className="text-[#888894] text-lg">
                Enter your product details to scrape live internet trends and generate a production-ready short-form strategy.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="bg-[#111116] border border-[#22222a] p-8 rounded-2xl shadow-2xl">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[#888894] uppercase tracking-wider mb-2">Product / Brand Name</label>
                  <input
                    type="text"
                    required
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="e.g. Acme Coffee Roasters"
                    className="w-full bg-[#1a1a24] border border-[#33333f] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e8365d] focus:ring-1 focus:ring-[#e8365d] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#888894] uppercase tracking-wider mb-2">Event / Campaign Description</label>
                  <textarea
                    required
                    value={event}
                    onChange={(e) => setEvent(e.target.value)}
                    placeholder="e.g. Launching our new summer cold brew blend"
                    className="w-full bg-[#1a1a24] border border-[#33333f] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e8365d] focus:ring-1 focus:ring-[#e8365d] transition-all min-h-[100px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#888894] uppercase tracking-wider mb-2">Trend Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full bg-[#1a1a24] border border-[#33333f] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e8365d] focus:ring-1 focus:ring-[#e8365d] transition-all appearance-none"
                  >
                    <option value="Global">Global</option>
                    <option value="India">India</option>
                    <option value="US">US</option>
                    <option value="Europe">Europe</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!product || !event}
                className="mt-8 w-full bg-gradient-to-r from-[#e8365d] to-[#ff7c3a] hover:from-[#f03b62] hover:to-[#ff8c4f] text-white font-bold font-['Unbounded'] py-4 rounded-xl shadow-[0_0_20px_rgba(232,54,93,0.3)] hover:shadow-[0_0_30px_rgba(232,54,93,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Campaign
              </button>
            </form>
          </div>
        )}

        {/* Loading & Intermediate States */}
        {(isScraping || isGenerating) && (
           <div className="max-w-4xl mx-auto space-y-8">
             <TrendResearch isLoading={isScraping} trendData={trendData} />
             
             {isGenerating && (
                <div className="w-full bg-[#111116] border border-[#22222a] rounded-xl p-6 relative overflow-hidden flex items-center justify-center gap-4 py-12">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#0fd49a]/5 via-[#f0c040]/5 to-[#ff7c3a]/5 animate-pulse" />
                  <div className="w-6 h-6 border-t-2 border-[#f0c040] border-r-2 rounded-full animate-spin flex-shrink-0" />
                  <div className="relative z-10 text-center">
                    <h3 className="text-xl font-black font-['Unbounded'] text-white">Matching Trends to Product...</h3>
                    <p className="text-[#888894] mt-2">Writing scripts, shoot guides, captions...</p>
                  </div>
                </div>
             )}
           </div>
        )}

        {/* Final Results */}
        {strategyData && !isScraping && !isGenerating && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header / Restart */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <h2 className="text-3xl font-black font-['Unbounded'] text-white mb-2">Campaign Ready</h2>
                <p className="text-[#888894]">Engineered for {product} • {event}</p>
              </div>
              <button 
                onClick={() => { setStrategyData(null); setTrendData(null); }}
                className="bg-[#22222a] hover:bg-[#33333f] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                Start New Campaign
              </button>
            </div>

            {/* Product Analysis Brief */}
            <div className="bg-[#111116] border border-[#22222a] rounded-xl p-6 mb-12 grid grid-cols-1 md:grid-cols-4 gap-6">
               <div>
                  <span className="text-xs text-[#888894] uppercase font-bold block mb-1">Core Audience</span>
                  <span className="text-sm text-white">{strategyData.product_analysis.core_audience}</span>
               </div>
               <div>
                  <span className="text-xs text-[#888894] uppercase font-bold block mb-1">Visual Potential</span>
                  <span className="text-sm text-white">{strategyData.product_analysis.visual_potential}</span>
               </div>
               <div>
                  <span className="text-xs text-[#888894] uppercase font-bold block mb-1">Emotional Hook</span>
                  <span className="text-sm text-[#ff7c3a] font-bold">{strategyData.product_analysis.emotional_hook}</span>
               </div>
               <div>
                  <span className="text-xs text-[#888894] uppercase font-bold block mb-1">Tension Resolved</span>
                  <span className="text-sm text-[#0fd49a] font-bold">{strategyData.product_analysis.tension_resolved}</span>
               </div>
            </div>

            <div className="space-y-12">
              <h3 className="text-2xl font-black font-['Unbounded'] border-b border-[#22222a] pb-4">The 3-Reel Strategy</h3>
              {strategyData.ideas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} />
              ))}
            </div>

            <StrategyBlock strategy={strategyData.campaign_strategy} />
          </div>
        )}

      </main>
    </div>
  );
}
