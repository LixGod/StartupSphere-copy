import React, { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  Flame, 
  Video, 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  ChevronRight, 
  Grid, 
  List, 
  FileDown, 
  Copy, 
  X, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Loader2
} from "lucide-react";

export interface CalendarItem {
  date: string;
  content_type: "Reel" | "Story" | "Post" | "WhatsApp Broadcast" | string;
  topic: string;
  description: string;
  is_festival: boolean;
  festival_name: string | null;
  priority: "high" | "medium" | "low" | string;
  trendUsed?: string;
  hook?: string;
  middle?: string;
  cta?: string;
  caption?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | string;
  product?: string;
  // enriched fields from AI
  format?: string;
  day_name?: string;
  best_time?: string;
}

interface ContentCalendarProps {
  calendar: CalendarItem[];
  /** Called when user wants to generate a reel script from a calendar idea */
  onGenerateScript?: (topic: string, details: string, format?: string) => void;
  isLoading?: boolean;
  onUpdateCalendarItem?: (updatedItem: CalendarItem) => void;
  eventDescription?: string;
}

// Map products to unique visual colors
const PRODUCT_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  1: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  2: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  3: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" },
  4: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
  5: { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30" },
};

export function ContentCalendar({ 
  calendar, 
  onGenerateScript, 
  isLoading = false,
  onUpdateCalendarItem,
  eventDescription = "" 
}: ContentCalendarProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [regeneratingDate, setRegeneratingDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CalendarItem>>({});

  // Quick Caption Generator States
  const [quickCaptionItem, setQuickCaptionItem] = useState<CalendarItem | null>(null);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [quickCaptionText, setQuickCaptionText] = useState("");
  const [quickCaptionCopied, setQuickCaptionCopied] = useState(false);

  const handleGenerateQuickCaption = async (item: CalendarItem) => {
    setQuickCaptionItem(item);
    setIsGeneratingCaption(true);
    setQuickCaptionText("");
    setQuickCaptionCopied(false);
    try {
      const res = await fetch("/api/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "caption",
          topic: item.topic,
          description: item.description,
          product: item.product
        })
      });
      if (!res.ok) throw new Error("Caption generation failed");
      const data = await res.json();
      setQuickCaptionText(data.caption || "");
    } catch (err) {
      console.error(err);
      setQuickCaptionText("Failed to generate caption. Please try again.");
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const openItemDetails = (item: CalendarItem) => {
    setSelectedItem(item);
    setIsEditing(false);
    setEditForm({
      topic: item.topic || "",
      hook: item.hook || "",
      middle: item.middle || "",
      cta: item.cta || "",
      caption: item.caption || item.description || "",
      difficulty: item.difficulty || "Medium"
    });
  };

  if (isLoading) {
    return (
      <div className="w-full bg-[#111116] border border-[#22222a] rounded-xl p-8 flex flex-col items-center justify-center py-16">
        <Loader />
        <h3 className="text-lg font-bold text-white font-['Unbounded'] mt-4 mb-1">
          Generating 30-Day Content Calendar
        </h3>
        <p className="text-slate-400 text-xs text-center max-w-sm">
          Analyzing your inventory, upcoming festivals, and active trends to assemble an optimized multi-platform schedule...
        </p>
      </div>
    );
  }

  if (!calendar || calendar.length === 0) {
    return (
      <div className="w-full bg-[#111116] border border-[#22222a] rounded-xl p-8 text-center text-slate-500 py-12">
        <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
        <p>No calendar plan generated yet. Fill in the parameters above and click generate.</p>
      </div>
    );
  }

  // Get unique products to assign stable colors
  const uniqueProducts = Array.from(new Set(calendar.map(item => item.product).filter(Boolean)));
  const getProductColor = (productName?: string) => {
    if (!productName) return PRODUCT_COLORS[0];
    const idx = uniqueProducts.indexOf(productName);
    return PRODUCT_COLORS[idx % Object.keys(PRODUCT_COLORS).length] || PRODUCT_COLORS[0];
  };

  // Setup monthly grid structure
  const [year, month] = calendar[0].date.split("-").map(Number);
  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const totalDays = new Date(year, month, 0).getDate();

  const gridDays: Array<{ day: number; dateStr: string; item: CalendarItem | null } | null> = [];
  // Empty slots at start of month grid
  for (let i = 0; i < firstDayIndex; i++) {
    gridDays.push(null);
  }
  // Days of the month
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const item = calendar.find(i => i.date === dateStr) || null;
    gridDays.push({ day: d, dateStr, item });
  }

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
    } catch {
      return dateStr;
    }
  };

  // Check if date is weekend
  const isWeekend = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDay();
      return day === 0 || day === 6;
    } catch {
      return false;
    }
  };

  const getDifficultyDot = (difficulty?: string) => {
    const diff = difficulty?.toLowerCase();
    if (diff === "easy") return "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]";
    if (diff === "hard") return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
    return "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]";
  };

  const handleCopyAll = () => {
    const text = calendar.map((item, idx) => {
      return `DAY ${idx + 1} (${item.date})\n` +
        `Product Focus: ${item.product || "General"}\n` +
        `Content Type: ${item.content_type}\n` +
        `Topic: ${item.topic}\n` +
        `Trend Used: ${item.trendUsed || "N/A"}\n` +
        `Hook: ${item.hook || item.description}\n` +
        `Middle: ${item.middle || ""}\n` +
        `CTA: ${item.cta || ""}\n` +
        `Caption: ${item.caption || ""}\n` +
        `----------------------------------------`;
    }).join("\n\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportPDF = (groupByProduct = false) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let html = `
      <html>
        <head>
          <title>AI Marketing Calendar</title>
          <style>
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
            h1 { text-align: center; color: #1e1b4b; font-size: 28px; margin-bottom: 5px; }
            h2 { color: #312e81; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px; font-size: 20px; }
            .meta { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 40px; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; page-break-inside: avoid; }
            .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px; }
            .date { font-weight: bold; color: #1e1b4b; font-size: 16px; }
            .badge { padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .field { margin-bottom: 12px; }
            .field-label { font-weight: bold; color: #475569; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
            .field-value { color: #0f172a; font-size: 14px; }
            .difficulty { display: inline-flex; align-items: center; gap: 5px; }
            .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
            .dot-easy { background-color: #22c55e; }
            .dot-medium { background-color: #eab308; }
            .dot-hard { background-color: #ef4444; }
            @media print {
              body { padding: 20px; }
              .card { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>AI Content Strategy Calendar</h1>
          <div class="meta">Generated on ${new Date().toLocaleDateString('en-IN')}</div>
    `;

    if (groupByProduct) {
      const productsMap = new Map<string, CalendarItem[]>();
      calendar.forEach(item => {
        const p = item.product || "General / Brand";
        if (!productsMap.has(p)) productsMap.set(p, []);
        productsMap.get(p)!.push(item);
      });

      for (const [product, items] of Array.from(productsMap.entries())) {
        html += `<h2>Product Focus: ${product}</h2>`;
        items.forEach(item => {
          html += renderPrintCard(item);
        });
      }
    } else {
      const sortedItems = [...calendar].sort((a, b) => a.date.localeCompare(b.date));
      sortedItems.forEach(item => {
        html += renderPrintCard(item);
      });
    }

    html += `
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const renderPrintCard = (item: CalendarItem): string => {
    const diffClass = item.difficulty?.toLowerCase() === "easy" ? "easy" : item.difficulty?.toLowerCase() === "hard" ? "hard" : "medium";
    return `
      <div class="card">
        <div class="card-header">
          <div class="date">${item.date} (${new Date(item.date).toLocaleDateString('en-IN', { weekday: 'long' })})</div>
          <div style="display: flex; gap: 8px;">
            ${item.is_festival && item.festival_name ? `<span class="badge" style="background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a;">🎉 ${item.festival_name}</span>` : ""}
            <span class="badge" style="background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">📦 ${item.product || "General"}</span>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Content Type</div>
          <div class="field-value">${item.content_type}</div>
        </div>
        <div class="field">
          <div class="field-label">Topic</div>
          <div class="field-value">${item.topic}</div>
        </div>
        <div class="field">
          <div class="field-label">Trend Used</div>
          <div class="field-value">${item.trendUsed || "N/A"}</div>
        </div>
        <div class="field">
          <div class="field-label">Hook</div>
          <div class="field-value">${item.hook || "N/A"}</div>
        </div>
        <div class="field">
          <div class="field-label">Script Middle</div>
          <div class="field-value">${item.middle || "N/A"}</div>
        </div>
        <div class="field">
          <div class="field-label">CTA</div>
          <div class="field-value">${item.cta || "N/A"}</div>
        </div>
        <div class="field">
          <div class="field-label">Caption & Hashtags</div>
          <div class="field-value" style="white-space: pre-wrap;">${item.caption || item.description || "N/A"}</div>
        </div>
        <div class="field">
          <div class="field-label">Difficulty</div>
          <div class="field-value difficulty">
            <span class="dot dot-${diffClass}"></span>
            ${item.difficulty || "Medium"}
          </div>
        </div>
      </div>
    `;
  };

  const handleRegenerate = async (item: CalendarItem) => {
    setRegeneratingDate(item.date);
    try {
      const res = await fetch("/api/ai/content-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regenerateDate: item.date,
          regenerateProduct: item.product,
          regenerateFestival: item.festival_name,
          event: eventDescription
        })
      });

      if (!res.ok) throw new Error("Regeneration failed");
      const data = await res.json();
      if (data.item) {
        if (onUpdateCalendarItem) {
          onUpdateCalendarItem(data.item);
        }
        openItemDetails(data.item);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to regenerate this concept. Please try again.");
    } finally {
      setRegeneratingDate(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Toolbar Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0b0b0e] border border-slate-900 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
            <CalendarIcon className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-xl font-black font-['Unbounded'] text-white">30-Day Marketing Roadmap</h3>
            <p className="text-xs text-slate-400">Custom tailored plan with live Indian festival triggers</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle View */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid" ? "bg-amber-500 text-black font-bold" : "text-slate-400 hover:text-white"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list" ? "bg-amber-500 text-black font-bold" : "text-slate-400 hover:text-white"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-4 h-10 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-850 rounded-xl text-xs font-bold transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied!" : "Copy All"}</span>
          </button>

          <button
            onClick={() => exportPDF(false)}
            className="flex items-center gap-1.5 px-4 h-10 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-850 rounded-xl text-xs font-bold transition-all"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Full Calendar</span>
          </button>

          <button
            onClick={() => exportPDF(true)}
            className="flex items-center gap-1.5 px-4 h-10 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-850 rounded-xl text-xs font-bold transition-all"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export by Product</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="bg-[#0b0b0e] border border-slate-900 rounded-3xl p-6 overflow-x-auto">
          <div className="min-w-[768px]">
            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-2 mb-4 text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-xs uppercase tracking-wider font-bold text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 gap-2">
              {gridDays.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="aspect-square bg-slate-950/20 border border-transparent rounded-2xl" />;
                }

                const { day, dateStr, item } = cell;
                const weekend = isWeekend(dateStr);
                const hasItem = !!item;

                let cellStyle = "border-slate-900 bg-slate-950/40 hover:bg-slate-950/70";
                if (hasItem) {
                  if (item.is_festival) {
                    cellStyle = "border-amber-500/30 bg-amber-950/15 shadow-[0_0_15px_rgba(245,158,11,0.03)] hover:border-amber-400/50 hover:bg-amber-950/25 cursor-pointer";
                  } else {
                    cellStyle = "border-slate-850 bg-slate-900/60 hover:border-slate-750 hover:bg-slate-900 cursor-pointer";
                  }
                }

                const colors = hasItem ? getProductColor(item.product) : null;

                return (
                  <div
                    key={dateStr}
                    onClick={() => hasItem && openItemDetails(item)}
                    className={`aspect-square border rounded-2xl p-3 flex flex-col justify-between transition-all duration-300 relative group ${cellStyle}`}
                  >
                    {/* Day number & Festival badge indicator */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${hasItem ? 'text-slate-200' : 'text-slate-600'} ${weekend ? 'text-amber-500/60' : ''}`}>
                        {day}
                      </span>

                      {hasItem && item.is_festival && (
                        <span className="flex items-center gap-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/25 px-1 py-0.25 rounded text-[8px] font-black uppercase tracking-tight scale-90">
                          🎉 Fest
                        </span>
                      )}
                    </div>

                    {/* Content Preview */}
                    {hasItem && (
                      <div className="space-y-1.5 mt-2">
                        {/* Product Tag */}
                        {item.product && colors && (
                          <div className={`px-1.5 py-0.5 border rounded-md text-[9px] font-black truncate max-w-full inline-block ${colors.bg} ${colors.text} ${colors.border}`}>
                            {item.product}
                          </div>
                        )}

                        {/* Hook preview */}
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug group-hover:text-slate-350 transition-colors">
                          {item.hook || item.topic}
                        </p>
                      </div>
                    )}

                    {/* Bottom row: Type Icon + Difficulty Dot */}
                    {hasItem && (
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-950/80">
                        <div className="text-[9px] font-black text-slate-500 flex items-center gap-1">
                          {item.content_type.includes("WhatsApp") ? (
                            <Send className="w-2.5 h-2.5 text-emerald-400" />
                          ) : item.content_type.includes("Story") ? (
                            <MessageCircle className="w-2.5 h-2.5 text-blue-400" />
                          ) : item.content_type.includes("Post") ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" />
                          ) : (
                            <Video className="w-2.5 h-2.5 text-rose-400" />
                          )}
                          <span className="truncate max-w-[50px]">{item.content_type}</span>
                        </div>

                        <div 
                          className={`w-2 h-2 rounded-full ${getDifficultyDot(item.difficulty)}`} 
                          title={`Difficulty: ${item.difficulty || "Medium"}`} 
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-8">
          {(() => {
            // Group items into weeks (7 days per week chunk)
            const weeksList: CalendarItem[][] = [];
            for (let i = 0; i < calendar.length; i += 7) {
              weeksList.push(calendar.slice(i, i + 7));
            }

            return weeksList.map((weekItems, weekIdx) => (
              <div key={weekIdx} className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 font-['Unbounded'] uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-full inline-block" />
                  WEEK {weekIdx + 1}
                </h4>
                
                <div className="space-y-3 border-l border-slate-800 pl-4 ml-2">
                  {weekItems.map((item, itemIdx) => {
                    const weekend = isWeekend(item.date);
                    const isFestival = item.is_festival;
                    const isHighPriority = item.priority?.toLowerCase() === "high";
                    
                    const itemStyle = `p-4 rounded-xl border transition-all hover:bg-slate-900/40 relative ${
                      isFestival 
                        ? "border-orange-500/30 bg-orange-950/5 shadow-[0_0_15px_rgba(245,158,11,0.03)] border-l-4 border-l-orange-500"
                        : isHighPriority
                        ? "border-purple-500/30 bg-purple-950/5 border-l-4 border-l-purple-500"
                        : weekend
                        ? "border-slate-800/80 bg-slate-900/30"
                        : "border-slate-900 bg-slate-950/40"
                    }`;

                    return (
                      <div
                        key={item.date + "-" + itemIdx}
                        className={itemStyle}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1" onClick={() => openItemDetails(item)}>
                            {/* Date line */}
                            <div className="text-xs text-slate-400 flex items-center gap-1.5">
                              <span>📅 {item.day_name || "Day"} {item.date.split("-").reverse().slice(0, 2).join("/")}</span>
                              <span className="text-slate-600">•</span>
                              <span>⏱️ {item.best_time || "7 PM IST"}</span>
                              {isFestival && item.festival_name && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
                                  🎉 {item.festival_name}
                                </span>
                              )}
                            </div>

                            {/* Title line */}
                            <h5 className={`text-sm text-white flex items-center gap-1.5 ${isHighPriority ? 'font-extrabold text-purple-300' : 'font-bold'}`}>
                              {item.content_type === 'Reel' ? '🎬' : item.content_type === 'Post' ? '📸' : item.content_type === 'Story' ? '📱' : '✉️'}
                              {item.content_type} {item.format ? `— "${item.format}" format` : ''}
                              {isHighPriority && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ml-1.5 inline-block" />}
                            </h5>

                            {/* Topic & Description */}
                            <p className="text-xs text-slate-350 leading-relaxed font-['DM_Sans']">
                              <span className="font-bold text-white mr-1">{item.topic}</span>
                              — {item.description}
                            </p>

                            {/* Priority Info */}
                            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold uppercase">
                              Priority: 
                              <span className={isHighPriority ? 'text-red-400' : item.priority === 'medium' ? 'text-yellow-400' : 'text-slate-400'}>
                                {isHighPriority ? '🔴 HIGH' : item.priority === 'medium' ? '🟡 MEDIUM' : '🟢 LOW'}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 self-start md:self-center">
                            {item.content_type === "Reel" ? (
                              <button
                                onClick={() => {
                                  if (onGenerateScript) {
                                    onGenerateScript(item.topic, item.description, item.format || "");
                                  }
                                }}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95"
                              >
                                Generate Script →
                              </button>
                            ) : (
                              <button
                                onClick={() => handleGenerateQuickCaption(item)}
                                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg border border-slate-700 transition-all active:scale-95"
                              >
                                Generate Caption →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Concept Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0c0c10] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-900 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Concept Details • {formatDate(selectedItem.date)}
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.topic}
                    onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                    className="bg-slate-900 border border-slate-800 text-white px-3 py-1.5 rounded-lg text-lg font-bold w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <h3 className="text-xl font-bold text-white font-['Unbounded'] leading-snug">
                    {selectedItem.topic}
                  </h3>
                )}
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6 custom-scrollbar text-sm">
              {/* Top Details Badges */}
              <div className="flex flex-wrap gap-2">
                {selectedItem.product && (
                  <span className={`px-3 py-1.5 border rounded-xl font-bold text-xs ${getProductColor(selectedItem.product).bg} ${getProductColor(selectedItem.product).text} ${getProductColor(selectedItem.product).border}`}>
                    📦 Product: {selectedItem.product}
                  </span>
                )}
                
                {selectedItem.is_festival && selectedItem.festival_name && (
                  <span className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl font-bold text-xs flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    {selectedItem.festival_name}
                  </span>
                )}

                <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-bold text-xs text-slate-300">
                  {selectedItem.content_type}
                </span>

                {isEditing ? (
                  <select
                    value={editForm.difficulty}
                    onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                    className="bg-slate-900 border border-slate-800 text-white px-3 py-1 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                ) : (
                  <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-bold text-xs text-slate-300 flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${getDifficultyDot(selectedItem.difficulty)}`} />
                    Difficulty: {selectedItem.difficulty || "Medium"}
                  </span>
                )}
              </div>

              {/* Trend Used */}
              {selectedItem.trendUsed && (
                <div className="bg-[#111116] border border-[#22222a] p-4 rounded-2xl">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1">
                    🔥 Trend Used
                  </span>
                  <p className="text-white text-sm leading-relaxed">{selectedItem.trendUsed}</p>
                </div>
              )}

              {/* Script segments */}
              <div className="space-y-4">
                {/* Hook */}
                <div className="bg-slate-900/60 p-4 border border-slate-900 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                    🎬 The Hook (0-3s)
                  </span>
                  {isEditing ? (
                    <textarea
                      value={editForm.hook}
                      onChange={(e) => setEditForm({ ...editForm, hook: e.target.value })}
                      className="bg-slate-950 border border-slate-800 text-white p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[60px]"
                    />
                  ) : (
                    <p className="text-white font-medium">{selectedItem.hook}</p>
                  )}
                </div>

                {/* Middle */}
                <div className="bg-slate-900/60 p-4 border border-slate-900 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                    📹 The Video Middle (4-20s)
                  </span>
                  {isEditing ? (
                    <textarea
                      value={editForm.middle}
                      onChange={(e) => setEditForm({ ...editForm, middle: e.target.value })}
                      className="bg-slate-950 border border-slate-800 text-white p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]"
                    />
                  ) : (
                    <p className="text-slate-350 leading-relaxed">{selectedItem.middle}</p>
                  )}
                </div>

                {/* CTA */}
                <div className="bg-slate-900/60 p-4 border border-slate-900 rounded-2xl">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                    🎯 Call To Action (last 3s)
                  </span>
                  {isEditing ? (
                    <textarea
                      value={editForm.cta}
                      onChange={(e) => setEditForm({ ...editForm, cta: e.target.value })}
                      className="bg-slate-950 border border-slate-800 text-white p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[60px]"
                    />
                  ) : (
                    <p className="text-amber-400 font-bold">{selectedItem.cta}</p>
                  )}
                </div>

                {/* Caption / Broadcast */}
                <div className="bg-[#121118] p-4 border border-purple-500/10 rounded-2xl">
                  <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider block mb-1">
                    ✍️ Copywriting Caption & Broadcast Text
                  </span>
                  {isEditing ? (
                    <textarea
                      value={editForm.caption}
                      onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                      className="bg-slate-950 border border-slate-800 text-white p-2.5 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px]"
                    />
                  ) : (
                    <p className="text-white whitespace-pre-wrap leading-relaxed">{selectedItem.caption || selectedItem.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-6 border-t border-slate-900 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const textToCopy = selectedItem.caption || selectedItem.description || selectedItem.topic;
                    navigator.clipboard.writeText(textToCopy);
                    alert("Broadcast text copied!");
                  }}
                  className="flex items-center gap-1.5 px-3 h-11 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Broadcast</span>
                </button>

                <button
                  onClick={() => {
                    const text = selectedItem.caption || selectedItem.description || selectedItem.topic;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="flex items-center gap-1.5 px-3 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp Share</span>
                </button>
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 h-11 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const updated = {
                          ...selectedItem,
                          topic: editForm.topic || "",
                          hook: editForm.hook || "",
                          middle: editForm.middle || "",
                          cta: editForm.cta || "",
                          caption: editForm.caption || "",
                          description: editForm.caption || "",
                          difficulty: editForm.difficulty || "Medium"
                        };
                        if (onUpdateCalendarItem) {
                          onUpdateCalendarItem(updated);
                        }
                        setSelectedItem(updated);
                        setIsEditing(false);
                      }}
                      className="px-4 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 h-11 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleRegenerate(selectedItem)}
                      disabled={!!regeneratingDate}
                      className="flex items-center gap-1.5 px-4 h-11 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-black rounded-xl text-xs font-black transition-all"
                    >
                      <RefreshCw className={`w-4 h-4 ${regeneratingDate ? "animate-spin" : ""}`} />
                      <span>{regeneratingDate ? "Regenerating..." : "Regenerate Concept"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Caption Generator Modal */}
      {quickCaptionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0c0c10] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-900 flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  AI Caption Generator
                </span>
                <h3 className="text-base font-bold text-white font-['Unbounded'] leading-snug">
                  {quickCaptionItem.topic}
                </h3>
              </div>
              <button
                onClick={() => setQuickCaptionItem(null)}
                className="p-1.5 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {isGeneratingCaption ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-xs text-slate-400">Crafting engaging copy with Indian cultural flair...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    readOnly
                    value={quickCaptionText}
                    className="w-full min-h-[180px] bg-slate-950 border border-slate-900 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed resize-y font-mono whitespace-pre-wrap"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Characters: {quickCaptionText.length}</span>
                    <span>Words: {quickCaptionText.split(/\s+/).filter(Boolean).length}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-900 bg-slate-950/40 flex justify-end gap-2">
              <button
                onClick={() => setQuickCaptionItem(null)}
                className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-all"
              >
                Close
              </button>
              {!isGeneratingCaption && quickCaptionText && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(quickCaptionText);
                    setQuickCaptionCopied(true);
                    setTimeout(() => setQuickCaptionCopied(false), 2000);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                >
                  {quickCaptionCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{quickCaptionCopied ? "Copied!" : "Copy Caption"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Loader() {
  return (
    <div className="h-12 w-12 relative flex items-center justify-center mb-4">
      <div className="absolute inset-0 rounded-full border-t-2 border-amber-500 animate-spin"></div>
      <CalendarIcon className="text-amber-500 w-5 h-5 animate-pulse" />
    </div>
  );
}
