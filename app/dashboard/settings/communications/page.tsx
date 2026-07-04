"use client"

import { useState, useEffect } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { TenantCommsService } from "@/lib/services/tenant-comms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Mail, Shield, CheckCircle2, AlertTriangle, ExternalLink, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

export default function CommunicationsSettingsPage() {
  const { ownerId, profile } = useBusinessContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // WhatsApp State
  const [whatsappCreds, setWhatsappCreds] = useState({ accessToken: "", phoneId: "", wabaId: "" })
  const [whatsappSettings, setWhatsappSettings] = useState({ phoneNumber: "" })
  
  // Email State
  const [emailCreds, setEmailCreds] = useState({ provider: "resend", apiKey: "", fromEmail: "", fromName: "" })

  useEffect(() => {
    if (ownerId) {
      loadSettings()
    }
  }, [ownerId])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const [waCreds, waSettings, eCreds] = await Promise.all([
        TenantCommsService.getCredentials(ownerId!, "whatsapp"),
        TenantCommsService.getSettings(ownerId!),
        TenantCommsService.getCredentials(ownerId!, "email")
      ])
      
      if (waCreds) setWhatsappCreds(waCreds)
      if (waSettings) setWhatsappSettings({ phoneNumber: waSettings.whatsapp_phone_number || "" })
      if (eCreds) setEmailCreds(eCreds)
    } catch (error) {
      console.error("Error loading comms settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveWhatsApp = async () => {
    setSaving(true)
    try {
      await TenantCommsService.saveCredentials(ownerId!, "whatsapp", whatsappCreds)
      await TenantCommsService.saveSettings(ownerId!, { whatsapp_phone_number: whatsappSettings.phoneNumber, whatsapp_phone_id: whatsappCreds.phoneId, whatsapp_waba_id: whatsappCreds.wabaId })
      toast.success("WhatsApp credentials saved successfully")
    } catch (error: any) {
      toast.error("Failed to save WhatsApp credentials: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEmail = async () => {
    setSaving(true)
    try {
      await TenantCommsService.saveCredentials(ownerId!, "email", emailCreds)
      toast.success("Email credentials saved successfully")
    } catch (error: any) {
      toast.error("Failed to save Email credentials: " + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Configuration...</div>

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Communication Channels</h1>
          <p className="text-slate-400 mt-1">Manage your own API credentials and customer engagement channels.</p>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1">
          <Shield className="w-3 h-3 mr-2" /> Multi-Tenant Secured
        </Badge>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-xl mb-8">
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 transition-all">
            <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp Cloud API
          </TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg px-6 py-2.5 transition-all">
            <Mail className="w-4 h-4 mr-2" /> Email Delivery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-2xl overflow-hidden border-t-4 border-t-green-500">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl font-bold text-white">WhatsApp Business Cloud API</CardTitle>
                  <CardDescription className="text-slate-400 mt-1">Connect your Meta for Developers app to send official WhatsApp messages.</CardDescription>
                </div>
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  Official Meta Integration
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Phone Number ID</label>
                  <Input 
                    placeholder="e.g. 104592837..."
                    value={whatsappCreds.phoneId}
                    onChange={(e) => setWhatsappCreds({ ...whatsappCreds, phoneId: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white h-12 focus:border-blue-500 transition-colors"
                  />
                  <p className="text-[10px] text-slate-500">Find this in your Meta App Dashboard under WhatsApp &gt; Getting Started.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">WhatsApp Business Account ID</label>
                  <Input 
                    placeholder="e.g. 29384756..."
                    value={whatsappCreds.wabaId}
                    onChange={(e) => setWhatsappCreds({ ...whatsappCreds, wabaId: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white h-12"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-slate-300">System User Access Token (Permanent)</label>
                  <Input 
                    type="password"
                    placeholder="EAAG..."
                    value={whatsappCreds.accessToken}
                    onChange={(e) => setWhatsappCreds({ ...whatsappCreds, accessToken: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white h-12 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Display Phone Number</label>
                  <Input 
                    placeholder="+91 98765 43210"
                    value={whatsappSettings.phoneNumber}
                    onChange={(e) => setWhatsappSettings({ ...whatsappSettings, phoneNumber: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-white h-12"
                  />
                </div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex items-start gap-4">
                <RefreshCcw className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-xs text-slate-400 leading-relaxed">
                  <p className="text-blue-300 font-semibold mb-1">Webhook Configuration Required</p>
                  Set your Webhook URL to <code className="bg-slate-950 px-1.5 py-0.5 rounded text-blue-400">https://startupsphere.io/api/webhooks/whatsapp</code> in Meta Dashboard to receive incoming messages and delivery receipts.
                </div>
              </div>

              <Button 
                onClick={handleSaveWhatsApp} 
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-green-900/20 transition-all"
              >
                {saving ? "Securing Credentials..." : "Connect WhatsApp Channel"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-2xl overflow-hidden border-t-4 border-t-blue-500">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold text-white">Email Provider Configuration</CardTitle>
              <CardDescription className="text-slate-400 mt-1">Use your own domain and infrastructure to send customer communications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Provider</label>
                    <select 
                      value={emailCreds.provider}
                      onChange={(e) => setEmailCreds({ ...emailCreds, provider: e.target.value })}
                      className="w-full bg-slate-950 border-slate-800 text-white h-12 rounded-lg px-3 outline-none focus:ring-2 ring-blue-500/20"
                    >
                      <option value="resend">Resend (Recommended)</option>
                      <option value="sendgrid">SendGrid</option>
                      <option value="smtp">Custom SMTP</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">API Key</label>
                    <Input 
                      type="password"
                      placeholder="re_..."
                      value={emailCreds.apiKey}
                      onChange={(e) => setEmailCreds({ ...emailCreds, apiKey: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white h-12 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">From Name</label>
                    <Input 
                      placeholder="e.g. Sales Team"
                      value={emailCreds.fromName}
                      onChange={(e) => setEmailCreds({ ...emailCreds, fromName: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">From Email Address</label>
                    <Input 
                      placeholder="e.g. hello@yourdomain.com"
                      value={emailCreds.fromEmail}
                      onChange={(e) => setEmailCreds({ ...emailCreds, fromEmail: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white h-12"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <p className="text-xs text-slate-400">
                  Ensure your domain is verified in your provider dashboard (SPF/DKIM/DMARC) before sending.
                </p>
              </div>

              <Button 
                onClick={handleSaveEmail} 
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/20 transition-all"
              >
                {saving ? "Saving..." : "Verify & Save Email Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/40 border-slate-800 p-6 flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-blue-500/10 rounded-full">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="font-bold text-white">Encrypted Storage</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Your credentials are encrypted using AES-256-GCM before being stored. Even we cannot read them.</p>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800 p-6 flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-purple-500/10 rounded-full">
            <CheckCircle2 className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="font-bold text-white">Delivery Tracking</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Automatic tracking of delivery, read status, and bounces across all connected channels.</p>
        </Card>
        <Card className="bg-slate-900/40 border-slate-800 p-6 flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-cyan-500/10 rounded-full">
            <RefreshCcw className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="font-bold text-white">Unified Webhooks</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Incoming messages from all providers are automatically routed to your centralized Unified Inbox.</p>
        </Card>
      </div>
    </div>
  )
}

