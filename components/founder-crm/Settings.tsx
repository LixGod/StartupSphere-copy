"use client";

import React, { useState, useEffect } from 'react';
import { Save, Shield, Zap, Mail, Phone, Loader2, CheckCircle2, XCircle, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

const Settings = () => {
  const [config, setConfig] = useState({
    resendKey: '',
    fromEmail: '',
    whatsappToken: '',
    whatsappPhoneId: '',
    linkedinToken: ''
  });
  const [loading, setLoading] = useState(false);
  const [configStatus, setConfigStatus] = useState<any>(null);

  useEffect(() => {
    checkConfigStatus();
  }, []);

  const checkConfigStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/config', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        setConfigStatus(await res.json());
      }
    } catch (e) {
      console.error('Config check failed:', e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      alert("Configuration saved securely!");
      setConfig({ resendKey: '', fromEmail: '', whatsappToken: '', whatsappPhoneId: '', linkedinToken: '' });
      checkConfigStatus();
    } catch(error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ active, label }: any) => (
    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${
      active ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-400 bg-slate-800 border-slate-800'
    }`}>
      {active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </div>
  );

  return (
    <div className="w-full p-8 overflow-y-auto h-full">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-slate-900 p-3 rounded-2xl">
          <Shield className="text-indigo-400 w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Security & API Configuration</h1>
          <p className="text-slate-400">Configure your messaging provider credentials and sender identities.</p>
        </div>
      </div>

      {/* Current Status */}
      {configStatus && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 mb-6">
          <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Service Status</h2>
          <div className="flex gap-3 flex-wrap">
            <StatusBadge active={true} label="AI Engine (Active)" />
            <StatusBadge active={configStatus.hasResendKey} label="Email (Resend)" />
            <StatusBadge active={configStatus.hasWhatsAppConfig} label="WhatsApp" />
            <StatusBadge active={configStatus.hasLinkedInKey} label="LinkedIn" />
          </div>
          <div className="mt-4 p-3 bg-slate-800 rounded-xl flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-600" />
            <p className="text-xs text-slate-300 font-medium">
              Current Sender: <span className="font-bold text-white">{configStatus.fromEmail || 'onboarding@resend.dev'}</span>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 pb-12">
        {/* Email Config */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="text-indigo-600 w-5 h-5" />
            <h2 className="font-bold text-white">Email Provider (Resend)</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resend API Key</label>
              <input type="password" value={config.resendKey}
                onChange={(e: any) => setConfig({...config, resendKey: e.target.value})}
                placeholder={configStatus?.hasResendKey ? '••••••••••• (already configured)' : 're_...'}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verified Sender Email</label>
              <input type="email" value={config.fromEmail}
                onChange={(e: any) => setConfig({...config, fromEmail: e.target.value})}
                placeholder={configStatus?.fromEmail || 'hello@yourdomain.com'}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" />
              <p className="text-[10px] text-slate-400 italic">Must be a domain verified in your Resend account. Defaults to onboarding@resend.dev</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Config */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Phone className="text-emerald-600 w-5 h-5" />
              <h2 className="font-bold text-white">WhatsApp (Meta Cloud API)</h2>
            </div>
            <a href="/whatsapp-setup" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full transition-colors">
              <Info className="w-3 h-3" /> Setup Guide
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Access Token</label>
              <input type="password" value={config.whatsappToken}
                onChange={(e: any) => setConfig({...config, whatsappToken: e.target.value})}
                placeholder={configStatus?.hasWhatsAppConfig ? '••••••••••• (configured)' : 'EAAB...'}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phone Number ID</label>
              <input type="text" value={config.whatsappPhoneId}
                onChange={(e: any) => setConfig({...config, whatsappPhoneId: e.target.value})}
                placeholder="123456789..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" />
            </div>
          </div>
        </div>

        {/* LinkedIn Config */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-blue-600 w-5 h-5" />
            <h2 className="font-bold text-white">LinkedIn Automation (Optional)</h2>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">LinkedIn Auth Token</label>
            <input type="password" value={config.linkedinToken}
              onChange={(e: any) => setConfig({...config, linkedinToken: e.target.value})}
              placeholder={configStatus?.hasLinkedInKey ? '••••••••••• (configured)' : 'AQ...'}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm" />
            <p className="text-[10px] text-slate-400 italic">Used for scraping and outreach if enabled. Use with caution.</p>
          </div>
        </div>

        <button disabled={loading}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Configuration</>}
        </button>
      </form>
    </div>
  );
};

export default Settings;

