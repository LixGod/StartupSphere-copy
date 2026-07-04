import React, { useState } from "react";
import { Clipboard, Check, Music, Video, Sparkles, AlertCircle } from "lucide-react";

interface Scene {
  scene_number: number;
  duration_seconds: number;
  visual: string;
  audio: string;
  text_overlay: string;
}

interface ReelIdea {
  hook: string;
  scenes: Scene[];
  total_duration: number;
  caption: string;
  hashtags: string[];
  cta: string;
  music_suggestion: string;
  thumbnail_idea: string;
  best_time_to_post: string;
}

interface CapCutExportProps {
  reelIdea: ReelIdea;
}

export function CapCutExport({ reelIdea }: CapCutExportProps) {
  const [copied, setCopied] = useState(false);

  const generateCopyString = () => {
    let breakdown = `🎬 STARTUPSPHERE CAPCUT PRODUCTION BREAKDOWN 🎬\n`;
    breakdown += `==============================================\n`;
    breakdown += `HOOK (First 3s): ${reelIdea.hook}\n`;
    breakdown += `CTA (Call to Action): ${reelIdea.cta}\n`;
    breakdown += `TOTAL DURATION: ${reelIdea.total_duration}s\n`;
    breakdown += `MUSIC SUGGESTION: ${reelIdea.music_suggestion}\n`;
    breakdown += `THUMBNAIL CONCEPT: ${reelIdea.thumbnail_idea}\n\n`;
    breakdown += `🎥 SHOT LIST & EDIT TIMINGS:\n`;
    breakdown += `----------------------------------------------\n`;
    
    let currentSecond = 0;
    reelIdea.scenes.forEach((scene) => {
      const endSecond = currentSecond + scene.duration_seconds;
      breakdown += `Scene #${scene.scene_number} [${currentSecond}s - ${endSecond}s] (${scene.duration_seconds}s)\n`;
      breakdown += `👉 WHAT TO FILM: ${scene.visual}\n`;
      breakdown += `💬 AUDIO/DIALOGUE: ${scene.audio}\n`;
      breakdown += `📝 TEXT OVERLAY: "${scene.text_overlay}"\n`;
      breakdown += `----------------------------------------------\n`;
      currentSecond = endSecond;
    });

    breakdown += `\n✍️ CAPTION & HASHTAGS:\n`;
    breakdown += `${reelIdea.caption}\n\n`;
    breakdown += `${reelIdea.hashtags.join(" ")}\n`;

    return breakdown;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCopyString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(reelIdea.music_suggestion)}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(reelIdea.music_suggestion + " trending audio")}`;

  return (
    <div className="bg-[#111116] border border-[#22222a] rounded-2xl p-6 mt-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px]" />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#22222a]">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/20">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-['Unbounded']">CapCut Creator Export</h3>
              <p className="text-xs text-slate-400">Structured layout for instant video editing</p>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-700 hover:to-blue-600 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-300 hover:scale-105 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300 animate-scale" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Clipboard className="w-4 h-4 text-cyan-100" />
                <span>Copy for CapCut</span>
              </>
            )}
          </button>
        </div>

        {/* Music Suggestions */}
        <div className="bg-[#1a1a24] border border-[#33333f] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg">
              <Music className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-0.5">Recommended Audio</span>
              <p className="text-white text-sm font-bold">{reelIdea.music_suggestion}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={spotifySearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial text-center px-3 py-1.5 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954] text-xs font-bold rounded-lg transition-colors"
            >
              Search Spotify
            </a>
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial text-center px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-500 text-xs font-bold rounded-lg transition-colors"
            >
              Search YouTube
            </a>
          </div>
        </div>

        {/* Timings Shot List Grid */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Shot List & Timings</span>
          <div className="space-y-3">
            {reelIdea.scenes.map((scene, idx) => (
              <div
                key={idx}
                className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start hover:border-slate-800 transition-colors"
              >
                <div className="md:col-span-2 flex items-center gap-2">
                  <div className="bg-cyan-500/10 text-cyan-400 text-xs font-bold px-2 py-1 rounded-md">
                    Scene #{scene.scene_number}
                  </div>
                  <div className="text-slate-400 text-xs font-bold">
                    ({scene.duration_seconds}s)
                  </div>
                </div>

                <div className="md:col-span-6 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Visual Action</span>
                  <p className="text-slate-200 text-xs leading-relaxed">{scene.visual}</p>
                </div>

                <div className="md:col-span-4 space-y-1.5 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CapCut Text Overlay</span>
                  </div>
                  <p className="text-[#0fd49a] text-xs font-mono font-bold">
                    {scene.text_overlay ? `"${scene.text_overlay}"` : "None"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thumbnail Guide */}
        <div className="bg-cyan-950/10 border border-cyan-500/20 p-4 rounded-xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">Cover/Thumbnail Idea</h5>
            <p className="text-slate-300 text-xs leading-relaxed">{reelIdea.thumbnail_idea}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
