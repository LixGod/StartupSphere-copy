"use client";

import React, { useState, useEffect } from 'react';
import { Search, Globe, Plus, Loader2, Zap, Phone, Mail, Linkedin, X, Info, Target, Download, Instagram, Briefcase, Navigation, CheckCircle2, AlertTriangle, BrainCircuit, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

const loadingStates = [
  "Stage 1: Discovering businesses via Google Maps...",
  "Stage 2: Scraping websites with Stealth Proxies...",
  "Stage 3: Hunting for verified emails (Snov/Hunter)...",
  "Stage 4: Enriching owner data from LinkedIn/Apollo...",
  "Stage 5: Verifying phone numbers via Numverify...",
  "Stage 6: Scoring leads with llama-3.3-70b AI...",
  "Stage 7: Finalizing deep-intel reports...",
  "Stage 8: Synchronizing with Founder CRM..."
];

const LeadScraper = ({ onLeadsFound, stages }: any) => {
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Initializing Pipeline...");
  const [results, setResults] = useState<any>(null);
  const [researchingId, setResearchingId] = useState<any>(null);
  
  // Form fields
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [decisionMaker, setDecisionMaker] = useState('');
  const [leadCount, setLeadCount] = useState(10);
  const [autoSync, setAutoSync] = useState(true);

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!niche || !location) return;
    setLoading(true);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated. Please log in again.');

      const response = await fetch('/api/leadgen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ niche, location, decisionMaker, leadCount, autoSync })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim().startsWith("STAGE:")) {
            const rawStatus = line.replace("STAGE:", "").trim();
            // Extract only the [Stage X] part if it exists
            const stageMatch = rawStatus.match(/\[Stage \d+\.?\d*\]/);
            setLoadingStatus(stageMatch ? stageMatch[0] : rawStatus);
          } else if (line.trim().startsWith("RESULT:")) {
            try {
              const data = JSON.parse(line.replace("RESULT:", "").trim());
              setResults(data);
              if (onLeadsFound && autoSync) {
                onLeadsFound();
              }
            } catch(err: any) {
              console.error("Failed to parse RESULT:", err);
            }
          } else if (line.trim().startsWith("ERROR:")) {
            throw new Error(line.replace("ERROR:", "").trim());
          }
        }
      }

    } catch(error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingStatus("Initializing Pipeline...");
    }
  };

  const importLead = async (lead) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      let stageId = stages?.[0]?.id;
      if (!stageId) {
        const { data: defaultStages } = await supabase.from('pipeline_stages').select('id').order('order_index').limit(1);
        stageId = defaultStages?.[0]?.id;
      }
      if (!stageId) throw new Error("No pipeline stages found.");

      const { data, error } = await supabase
        .from('leads')
        .insert([{
          name: lead.owner?.name || lead.business_name || 'Unknown Contact',
          email: lead.owner?.personal_email || lead.business_email || null,
          phone: lead.business_phone || null,
          linkedin_url: lead.owner?.linkedin_url || lead.company_linkedin || null,
          company: lead.business_name,
          stage_id: stageId,
          owner_id: user.id,
          source_channel: 'ai_scraper',
          context: { 
            notes: `Extracted via AI.\nQuality: ${lead.lead_quality}\nOutreach Intel: ${lead.outreach_note}`,
            original_data: lead
          }
        }])
        .select();

      if (error) throw error;
      alert(`Lead ${lead.business_name} imported!`);
      if (onLeadsFound) onLeadsFound(data[0]);
    } catch(error: any) {
      alert('Error importing: ' + error.message);
    }
  };

  const runDeepResearch = async (lead, idx) => {
    setResearchingId(idx);
    try {
      const response = await fetch('/api/deep-lead-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyName: lead.business_name, 
          website: lead.website 
        })
      });

      const refinedLead = await response.json();
      if (!response.ok) throw new Error(refinedLead.error || 'Research failed');

      // Update results in place
      const newLeads = [...results.leads];
      newLeads[idx] = {
        ...newLeads[idx],
        ...refinedLead,
        isRefined: true
      };
      setResults({ ...results, leads: newLeads });
      alert(`Deep Research complete for ${lead.business_name}! Found ${refinedLead.contacts?.emails?.length || 0} emails.`);
    } catch(error: any) {
      alert('Research Error: ' + error.message);
    } finally {
      setResearchingId(null);
    }
  };

  const exportToCSV = () => {
    if (!results || !results.leads) return;
    const leads = results.leads;
    const headers = ["Business Name", "Website", "Owner Name", "Owner Title", "Email", "Phone", "LinkedIn", "Instagram", "Location", "Quality", "Outreach Note"];
    
    const csvContent = [
      headers.join(','),
      ...leads.map(l => [
        `"${l.business_name || ''}"`,
        `"${l.website || ''}"`,
        `"${l.owner?.name || ''}"`,
        `"${l.owner?.title || ''}"`,
        `"${l.owner?.personal_email || l.business_email || ''}"`,
        `"${l.business_phone || ''}"`,
        `"${l.owner?.linkedin_url || l.company_linkedin || ''}"`,
        `"${l.instagram_handle || ''}"`,
        `"${l.location_detail || ''}"`,
        `"${l.lead_quality || ''}"`,
        `"${(l.outreach_note || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_${niche.replace(/\s+/g, '_')}_${location.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text) => {
    if (text && text !== 'null') {
      navigator.clipboard.writeText(text);
      alert('Copied to clipboard: ' + text);
    }
  };

  return (
    <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden mb-6 shadow-2xl">
      <div className="p-8 border-b border-slate-800 bg-gradient-to-r from-indigo-900/40 to-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 blur-3xl pointer-events-none">
          <div className="w-64 h-64 bg-indigo-500 rounded-full" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-indigo-600/20 p-3 rounded-2xl border border-indigo-500/30">
            <Target className="text-indigo-400 w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              StartupSphere AI LeadGen Pipeline <span className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-black shadow-lg shadow-indigo-600/20">8-Stage Deep Scan</span>
            </h2>
            <p className="text-slate-400 font-medium mt-1">Multi-stage autonomous research via SerpAPI, Apollo, Snov.io, and Llama 3.3 Intelligence.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleScrape} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Niche / Industry <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Cold brew café, D2C skincare..." required
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Target Location <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bandra Mumbai, Dubai..." required
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Decision Maker Title</label>
            <div className="relative">
              <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="text" value={decisionMaker} onChange={(e) => setDecisionMaker(e.target.value)}
                placeholder="e.g. Founder, Marketing Head (optional)"
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600" />
            </div>
          </div>
          <div className="space-y-2 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Number of Leads</label>
              <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-lg text-sm">{leadCount}</span>
            </div>
            <input type="range" min="5" max="20" step="5" value={leadCount} onChange={(e) => setLeadCount(parseInt(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer" />
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-2 px-1">
              <span>5</span><span>10</span><span>15</span><span>20</span>
            </div>
          </div>
          <div className="space-y-2 flex items-center gap-4">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex-1 flex items-center justify-between group hover:border-indigo-500/50 transition-all cursor-pointer" onClick={() => setAutoSync(!autoSync)}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${autoSync ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                  <RefreshCw className={`w-4 h-4 ${autoSync ? 'animate-spin-slow' : ''}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Auto-Sync to CRM</p>
                  <p className="text-[10px] text-slate-500">Automatically save hot leads</p>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-all ${autoSync ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${autoSync ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
          </div>
        </div>

        <button disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-600/20">
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="truncate max-w-[250px]">{loadingStatus}</span>
            </>
          ) : (
            <>
              <Search className="w-6 h-6" /> Start Deep Web Scan
            </>
          )}
        </button>
      </form>

      {results && results.leads && (
        <div className="border-t border-slate-800 bg-slate-950 relative">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div>
              <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                <CheckCircle2 className="text-emerald-400 w-5 h-5" /> 
                Found {results.leads.length} Verified Leads
              </h3>
              {results.search_metadata?.scrape_notes && (
                <p className="text-xs text-slate-400 mt-1 max-w-2xl bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-indigo-400 font-bold">AI Notes:</span> {results.search_metadata.scrape_notes}
                </p>
              )}
            </div>
            <button onClick={exportToCSV} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <th className="p-4 pl-6">Business</th>
                  <th className="p-4">Owner / Decision Maker</th>
                  <th className="p-4">Contact Signals</th>
                  <th className="p-4">Quality & Score</th>
                  <th className="p-4 max-w-xs">Outreach Angle</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {results.leads.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-white text-sm">{lead.business_name}</p>
                      {lead.website && lead.website !== 'null' ? (
                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-1">
                          <Globe className="w-3 h-3" /> Website
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 italic mt-1 block">No website</span>
                      )}
                      <div className="flex gap-1 mt-2">
                        {lead.niche_tags?.slice(0,2).map((tag: any) => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-medium">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      {lead.owner?.name && lead.owner?.name !== 'null' ? (
                        <div>
                          <p className="font-bold text-slate-200 text-sm flex items-center gap-2">
                            {lead.owner.name}
                            {lead.owner.linkedin_url && lead.owner.linkedin_url !== 'null' && (
                              <a href={lead.owner.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-400">
                                <Linkedin className="w-4 h-4" />
                              </a>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{lead.owner.title || 'Decision Maker'}</p>
                          {lead.owner.source_of_name && lead.owner.source_of_name !== 'null' && (
                            <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-1">Source: {lead.owner.source_of_name}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Not found</span>
                      )}
                    </td>
                    <td className="p-4 space-y-2">
                      {(lead.owner?.personal_email || lead.business_email) && (lead.owner?.personal_email !== 'null' || lead.business_email !== 'null') ? (
                        <div onClick={() => copyToClipboard(lead.owner?.personal_email || lead.business_email)} 
                             className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer bg-slate-800/50 w-fit px-2 py-1 rounded-lg border border-slate-700/50 hover:border-indigo-500/50 transition-all">
                          <Mail className="w-3.5 h-3.5 text-indigo-400" /> 
                          <span className="truncate max-w-[150px]">{lead.owner?.personal_email || lead.business_email}</span>
                        </div>
                      ) : null}
                      {lead.business_phone && lead.business_phone !== 'null' ? (
                        <div onClick={() => copyToClipboard(lead.business_phone)}
                             className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer bg-slate-800/50 w-fit px-2 py-1 rounded-lg border border-slate-700/50 hover:border-emerald-500/50 transition-all">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" /> 
                          <span>{lead.business_phone}</span>
                        </div>
                      ) : null}
                      {lead.instagram_handle && lead.instagram_handle !== 'null' ? (
                        <a href={`https://instagram.com/${lead.instagram_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" 
                           className="flex items-center gap-2 text-xs text-slate-300 hover:text-white w-fit px-2 py-1 rounded-lg border border-slate-700/50 hover:border-pink-500/50 transition-all">
                          <Instagram className="w-3.5 h-3.5 text-pink-400" /> 
                          <span>{lead.instagram_handle}</span>
                        </a>
                      ) : null}
                      {(!lead.owner?.personal_email && !lead.business_email && !lead.business_phone && !lead.instagram_handle) && (
                        <span className="text-xs text-slate-600 italic">No direct contacts</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border w-fit ${
                          lead.lead_quality === 'HIGH' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          lead.lead_quality === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {lead.lead_quality || 'UNKNOWN'}
                        </span>
                        {lead.lead_score !== undefined && (
                          <div className="flex items-center gap-2 px-1">
                            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${lead.lead_score}%` }}></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{lead.lead_score}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="text-xs text-slate-400 line-clamp-3 group-hover:line-clamp-none transition-all">{lead.outreach_note}</p>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => importLead(lead)} className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 p-2 rounded-xl transition-all">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {results.outreach_intel && (
            <div className="p-6 bg-indigo-950/30 border-t border-indigo-500/20">
              <h4 className="text-sm font-bold text-indigo-300 mb-3 flex items-center gap-2"><Zap className="w-4 h-4" /> AI Outreach Strategy for {location}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-indigo-500/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mb-1">Common Pain Points</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{results.outreach_intel.common_pain_points}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-indigo-500/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mb-1">Icebreaker Angle</p>
                  <p className="text-xs text-slate-300 leading-relaxed">"{results.outreach_intel.icebreaker_angle}"</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-indigo-500/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mb-1">Best Approach</p>
                  <p className="text-xs text-slate-300 leading-relaxed">Channel: <span className="text-white font-bold">{results.outreach_intel.best_outreach_channel}</span></p>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">Time: <span className="text-white font-bold">{results.outreach_intel.best_time_to_reach}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeadScraper;
