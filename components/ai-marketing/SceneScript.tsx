import React from "react";
import { ScriptSection, SkitSceneLine } from "@/lib/ai-marketing/types";
import { Camera, Mic, Clapperboard } from "lucide-react";

interface SceneScriptProps {
  script: ScriptSection;
}

export function SceneScript({ script }: SceneScriptProps) {
  if (script.format_used === "SKIT" && script.skit) {
    return (
      <div className="bg-[#111116] border border-[#22222a] rounded-xl p-6 font-['DM_Sans']">
        <div className="flex items-center gap-2 text-[#f0c040] mb-4">
          <Clapperboard className="w-5 h-5" />
          <h3 className="font-bold text-lg uppercase tracking-wider">Scene Script</h3>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-[#1a1a24] p-3 rounded-lg border border-[#33333f]">
            <span className="text-[#888894] block mb-1">Setting</span>
            <span className="text-white">{script.skit.setting_detail}</span>
          </div>
          <div className="bg-[#1a1a24] p-3 rounded-lg border border-[#33333f]">
            <span className="text-[#888894] block mb-1">Emotional Arc</span>
            <span className="text-white">{script.skit.emotional_arc}</span>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-xs font-bold text-[#888894] uppercase tracking-wider mb-2">Characters</h4>
          <div className="flex flex-wrap gap-2">
            {script.skit.characters.map((char, idx) => (
              <div key={idx} className="bg-[#22222a] px-3 py-1.5 rounded-full text-xs text-[#d0d0d8]">
                <span className="font-bold text-white mr-1">{char.name}:</span>
                {char.role} <span className="opacity-50">({char.vibe})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {script.skit.scene.map((line: SkitSceneLine, idx: number) => {
            if (line.type === "DIRECTION") {
              return (
                <div key={idx} className="flex gap-4">
                  <div className="w-16 flex-shrink-0"></div>
                  <p className="text-[#f0c040] italic font-mono text-sm border-l-2 border-[#f0c040]/30 pl-3 py-1">
                    [ {line.text} ]
                  </p>
                </div>
              );
            }

            return (
              <div key={idx} className="flex flex-col md:flex-row gap-4 border-b border-[#22222a] pb-4 last:border-0">
                <div className="md:w-32 flex-shrink-0 text-right md:pr-4 pt-1">
                  <span className="font-bold text-white block">{line.character}</span>
                  {line.action && (
                    <span className="text-xs text-[#888894] italic block">({line.action})</span>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#e8365d] text-sm mb-1">Hindi/Hinglish</p>
                    <p className="text-white text-lg">"{line.hindi}"</p>
                  </div>
                  <div>
                    <p className="text-[#0fd49a] text-sm mb-1">English</p>
                    <p className="text-[#a0a0ab] italic text-md">"{line.english}"</p>
                  </div>
                </div>
                {line.overlay && (
                  <div className="md:w-48 flex-shrink-0 bg-[#e8365d]/10 border border-[#e8365d]/20 rounded p-2 self-start mt-2 md:mt-0">
                    <span className="text-[10px] uppercase text-[#e8365d] font-bold block mb-1">Text Overlay</span>
                    <p className="text-xs text-white font-bold">{line.overlay}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-[#f0c040]/10 border border-[#f0c040]/30 p-4 rounded-lg">
          <p className="text-sm">
            <span className="font-bold text-[#f0c040] mr-2">Director's Note:</span>
            <span className="text-white">{script.skit.director_note}</span>
          </p>
        </div>
      </div>
    );
  }

  if (script.format_used === "VOICEOVER" && script.voiceover) {
    const { hook, beats, payoff, delivery_notes } = script.voiceover;
    
    return (
      <div className="bg-[#111116] border border-[#22222a] rounded-xl p-6 font-['DM_Sans']">
        <div className="flex items-center gap-2 text-[#0fd49a] mb-4">
          <Mic className="w-5 h-5" />
          <h3 className="font-bold text-lg uppercase tracking-wider">Voiceover Script</h3>
        </div>

        <div className="mb-6 bg-[#1a1a24] p-4 rounded-lg border border-[#33333f]">
          <span className="text-xs font-bold text-[#888894] uppercase tracking-wider block mb-2">Delivery Notes</span>
          <p className="text-white text-sm italic">{delivery_notes}</p>
        </div>

        <div className="space-y-4">
          {/* Hook */}
          <div className="border border-[#e8365d]/30 bg-[#e8365d]/5 rounded-lg p-4 relative">
            <div className="absolute top-0 left-0 bg-[#e8365d] text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg uppercase">
              The Hook
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
              <div className="md:col-span-4 flex items-start gap-2">
                <Camera className="w-4 h-4 text-[#888894] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#d0d0d8]">{hook.what_camera_sees}</p>
              </div>
              <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <p className="text-[#e8365d] text-xs font-bold mb-1">Hindi</p>
                    <p className="text-white font-bold">"{hook.hindi}"</p>
                  </div>
                  <div>
                    <p className="text-[#0fd49a] text-xs font-bold mb-1">English</p>
                    <p className="text-[#a0a0ab] italic">"{hook.english}"</p>
                  </div>
              </div>
              {hook.overlay_text && (
                 <div className="md:col-span-12 mt-2 bg-black/40 rounded p-2 text-center border border-white/10">
                    <span className="text-[#f0c040] text-xs font-bold mr-2">OVERLAY:</span>
                    <span className="text-white font-bold text-sm tracking-wide">{hook.overlay_text}</span>
                 </div>
              )}
            </div>
          </div>

          {/* Beats */}
          {beats.map((beat, idx) => (
             <div key={idx} className="border border-[#33333f] bg-[#1a1a24] rounded-lg p-4 relative">
              <div className="absolute top-0 left-0 bg-[#33333f] text-[#a0a0ab] text-[10px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg uppercase">
                Beat {beat.beat_number} • {beat.pacing_note}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
                <div className="md:col-span-4 flex items-start gap-2">
                  <Camera className="w-4 h-4 text-[#888894] mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-[#d0d0d8]">{beat.what_camera_sees}</p>
                </div>
                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <p className="text-white">"{beat.hindi}"</p>
                    </div>
                    <div>
                      <p className="text-[#a0a0ab] italic">"{beat.english}"</p>
                    </div>
                </div>
                {beat.overlay_text && (
                   <div className="md:col-span-12 mt-2 bg-black/40 rounded p-2 text-center border border-white/10">
                      <span className="text-[#f0c040] text-xs font-bold mr-2">OVERLAY:</span>
                      <span className="text-white font-bold text-sm tracking-wide">{beat.overlay_text}</span>
                   </div>
                )}
              </div>
            </div>
          ))}

          {/* Payoff */}
          <div className="border border-[#0fd49a]/30 bg-[#0fd49a]/5 rounded-lg p-4 relative">
            <div className="absolute top-0 left-0 bg-[#0fd49a] text-black text-[10px] font-bold px-2 py-0.5 rounded-br-lg rounded-tl-lg uppercase">
              The Payoff
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
              <div className="md:col-span-4 flex items-start gap-2">
                <Camera className="w-4 h-4 text-[#888894] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#d0d0d8]">{payoff.what_camera_sees}</p>
              </div>
              <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <p className="text-[#0fd49a] text-xs font-bold mb-1">Hindi</p>
                    <p className="text-white font-bold">"{payoff.hindi}"</p>
                  </div>
                  <div>
                    <p className="text-[#0fd49a] text-xs font-bold mb-1">English</p>
                    <p className="text-[#a0a0ab] italic">"{payoff.english}"</p>
                  </div>
              </div>
              {payoff.overlay_text && (
                 <div className="md:col-span-12 mt-2 bg-black/40 rounded p-2 text-center border border-white/10">
                    <span className="text-[#f0c040] text-xs font-bold mr-2">FINAL OVERLAY:</span>
                    <span className="text-white font-bold text-sm tracking-wide">{payoff.overlay_text}</span>
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
