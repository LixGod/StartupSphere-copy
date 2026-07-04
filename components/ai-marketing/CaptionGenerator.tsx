import React, { useState } from "react";
import { Sparkles, Clipboard, Check, Send, ShieldAlert, Heart, MessageSquare, AlertCircle } from "lucide-react";

interface CaptionData {
  captions: {
    short: string;
    medium: string;
    long: string;
  };
  hashtags: {
    trending: string[];
    niche: string[];
    location: string[];
  };
  best_time_to_post: string;
  emoji_suggestions: string[];
}

export function CaptionGenerator() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Casual");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CaptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, tone }),
      });

      if (!res.ok) throw new Error("Failed to generate captions");
      const data = await res.json();
      if (data.success && data.captionData) {
        setResult(data.captionData);
      } else {
        throw new Error(data.error || "Failed parsing captions");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getAllHashtags = (hashtags: CaptionData["hashtags"]) => {
    return [
      ...(hashtags.trending || []),
      ...(hashtags.niche || []),
      ...(hashtags.location || []),
    ].join(" ");
  };

  return (
    <div className="bg-[#0b0b0e] border border-[#22222a] rounded-2xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[90px]" />

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/20">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-black font-['Unbounded'] text-white">Caption & Hashtag Engine</h3>
            <p className="text-xs text-slate-400">Generate viral captions and localized hashtag packages in seconds</p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">What is this post about?</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. New gourmet coffee blend launch with a 15% discount for the next week, highlighting rich aroma and organic Indian beans..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-slate-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300">Target Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                <option value="Instagram">Instagram Reels/Post</option>
                <option value="YouTube">YouTube Shorts/Video</option>
                <option value="LinkedIn">LinkedIn Post</option>
                <option value="WhatsApp">WhatsApp Broadcast</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300">Tone of Voice</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                <option value="Funny">Funny / Entertaining</option>
                <option value="Casual">Casual / Friendly</option>
                <option value="Professional">Professional / Authoritative</option>
                <option value="Emotional">Emotional / Storytelling</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !topic}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-purple-500/10 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating Copy...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Optimized Copy</span>
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
            {/* Best Posting Time */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-purple-950/15 rounded-xl border border-purple-500/25">
              <div className="flex items-center gap-2 text-purple-300 text-xs">
                <Heart className="w-4 h-4 text-purple-400 animate-pulse" />
                <span>Best time to publish on {platform}:</span>
                <span className="font-bold text-white bg-purple-900/40 px-2 py-0.5 rounded border border-purple-500/20">{result.best_time_to_post}</span>
              </div>
              <div className="flex gap-1">
                {result.emoji_suggestions.map((e, idx) => (
                  <span key={idx} className="text-base">{e}</span>
                ))}
              </div>
            </div>

            {/* Captions Tabs */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Generated Copy Options</span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Short */}
                <div className="bg-[#111116] border border-[#22222a] p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Short Form
                    </span>
                    <p className="text-white text-xs leading-relaxed font-['DM_Sans']">"{result.captions.short}"</p>
                  </div>
                  <button
                    onClick={() => handleCopy(result.captions.short, "short")}
                    className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedKey === "short" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Caption</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Medium */}
                <div className="bg-[#111116] border border-[#22222a] p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Standard
                    </span>
                    <p className="text-white text-xs leading-relaxed whitespace-pre-wrap font-['DM_Sans']">"{result.captions.medium}"</p>
                  </div>
                  <button
                    onClick={() => handleCopy(result.captions.medium, "medium")}
                    className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedKey === "medium" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Caption</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Long */}
                <div className="bg-[#111116] border border-[#22222a] p-5 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Storytelling Focus
                    </span>
                    <p className="text-white text-xs leading-relaxed whitespace-pre-wrap font-['DM_Sans']">"{result.captions.long}"</p>
                  </div>
                  <button
                    onClick={() => handleCopy(result.captions.long, "long")}
                    className="w-full py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedKey === "long" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Caption</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Hashtag Sections */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-[#22222a] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hashtag Pack (20 tags)</span>
                <button
                  onClick={() => handleCopy(getAllHashtags(result.hashtags), "all_tags")}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === "all_tags" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied All!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Hashtag Package</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-['DM_Sans']">
                <div className="bg-[#111116] p-3.5 rounded-xl border border-slate-900">
                  <span className="text-[#0fd49a] font-bold block mb-2">🔥 Trending Indian</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.hashtags.trending.map((tag, i) => (
                      <span key={i} className="text-slate-350 bg-slate-900 px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111116] p-3.5 rounded-xl border border-slate-900">
                  <span className="text-purple-400 font-bold block mb-2">⚡ Business/Niche</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.hashtags.niche.map((tag, i) => (
                      <span key={i} className="text-slate-350 bg-slate-900 px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111116] p-3.5 rounded-xl border border-slate-900">
                  <span className="text-blue-400 font-bold block mb-2">📍 Location/Local</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.hashtags.location.map((tag, i) => (
                      <span key={i} className="text-slate-350 bg-slate-900 px-2 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
