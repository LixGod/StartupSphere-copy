"use client"

import { useState, useEffect, useRef } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { getEmployeeRequests, updateProfile } from "@/lib/api"
import type { EmployeeRequest, Profile as ProfileType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Globe, 
  Coins, 
  CreditCard, 
  ShieldCheck, 
  ChevronRight, 
  Star,
  Zap,
  Gift,
  ArrowRight,
  Settings as SettingsIcon,
  Palette,
  Bell,
  Users,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  UserPlus,
  Share2
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { useCurrency } from "@/components/providers/currency-provider"
import { toast } from "sonner"

export default function SettingsPage() {
  const { profile, ownerId, loading: contextLoading } = useBusinessContext()
  const { currency, setCurrency: setCurrencyLive } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("general")
  const [baseCurrency, setBaseCurrency] = useState("INR")
  const [employees, setEmployees] = useState<ProfileType[]>([])
  const [requests, setRequests] = useState<EmployeeRequest[]>([])
  const [selectedPacks, setSelectedPacks] = useState<string[]>([])
  const [requesting, setRequesting] = useState(false)
  const [autoPaymentReminders, setAutoPaymentReminders] = useState(true)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (ownerId && profile) {
      loadData()
    }
  }, [ownerId, profile])

  const loadData = async () => {
    setLoading(true)
    try {
      // Sync to the live currency from the CurrencyProvider
      const activeCurrency = (profile as any)?.currency || profile?.base_currency
      if (activeCurrency) {
        setBaseCurrency(activeCurrency)
      }
      
      const requestsData = profile?.role === 'owner' && ownerId ? await getEmployeeRequests(ownerId) : []
      
      if (profile?.role === 'owner') {
        const { data: empData } = await supabaseRef.current
          .from("profiles")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("role", "employee")
        setEmployees(empData || [])
      }

      if (ownerId) {
        const { data: cfg } = await supabaseRef.current
          .from("user_configs")
          .select("auto_payment_reminders")
          .eq("user_id", ownerId)
          .maybeSingle()
        if (cfg) {
          setAutoPaymentReminders(cfg.auto_payment_reminders !== false)
        }
      }

      setRequests(((requestsData || []) as EmployeeRequest[]).filter((r: any) => r.status === 'pending'))
    } catch (error: any) {
      console.warn("Non-critical error loading some settings data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async (request: EmployeeRequest) => {
    try {
      const response = await fetch('/api/approve-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.employee_email,
          password: request.employee_password_hash,
          companyName: profile?.company_name,
          ownerId: profile?.id,
          requestId: request.id,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error)
      }

      await loadData()
      toast.success(`Employee ${request.employee_email} approved!`)
    } catch (error: any) {
      toast.error("Failed to approve: " + error.message)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabaseRef.current.from("employee_requests").delete().eq("id", requestId)
      if (error) throw error
      toast.success("Request rejected")
      await loadData()
    } catch (error: any) {
      toast.error("Failed to reject: " + error.message)
    }
  }

  const handleTogglePermission = async (employeeId: string, permission: string, currentValue: boolean) => {
    try {
      await supabaseRef.current
        .from("profiles")
        .update({ [permission]: !currentValue })
        .eq("id", employeeId)

      loadData()
    } catch (error: any) {
      alert("Error updating permission: " + error.message)
    }
  }

  const handleCurrencyChange = async (value: string) => {
    setBaseCurrency(value)
    if (!profile) return
    try {
      // setCurrencyLive fetches the live rate, updates the DB,
      // and broadcasts via Supabase Realtime to all connected sessions.
      await setCurrencyLive(value)
      toast.success(`Currency updated to ${value} — all sessions synced in real-time!`)
    } catch (error: any) {
      toast.error("Failed to update currency: " + error.message)
    }
  }

  const handleRequestUpgrade = async () => {
    if (selectedPacks.length === 0) {
      alert("Please select at least one pack to request.")
      return
    }
    setRequesting(true)
    try {
      const { data: existing } = await supabaseRef.current
        .from("membership_requests")
        .select("id")
        .eq("owner_id", profile?.id)
        .eq("status", "pending")
        .maybeSingle()

      if (existing) {
        alert("You already have a pending upgrade request. Please wait for admin approval.")
        return
      }

      const { error } = await supabaseRef.current
        .from("membership_requests")
        .insert({
          owner_id: profile?.id,
          requested_packs: selectedPacks,
          status: 'pending'
        })
      
      if (error) throw error
      alert("Upgrade request submitted! Our admin will review and approve it shortly.")
      setSelectedPacks([])
    } catch (error: any) {
      alert("Failed to submit request: " + error.message)
    } finally {
      setRequesting(false)
    }
  }

  if (contextLoading || loading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Enterprise Settings</h1>
        <p className="text-slate-400">Global configuration and premium feature management</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 flex-1 overflow-hidden">
        {/* Left Panel Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <button 
            onClick={() => setActiveTab("general")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <SettingsIcon className="w-4 h-4" /> General Settings
          </button>
          <button 
            onClick={() => setActiveTab("localization")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'localization' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Globe className="w-4 h-4" /> Localization & Currency
          </button>
          <button 
            onClick={() => setActiveTab("billing")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'billing' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <CreditCard className="w-4 h-4" /> Billing & Plans
          </button>
          {profile?.role === 'owner' && (
            <button 
              onClick={() => setActiveTab("team")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'team' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              <Users className="w-4 h-4" /> Team Management
            </button>
          )}
          <button 
            onClick={() => setActiveTab("integrations")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'integrations' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <Share2 className="w-4 h-4" /> Integrations & API
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 pb-20 md:pb-0">
          
          {activeTab === "general" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-blue-400" />
                    Workspace Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-400 mb-1 block">Company Name</Label>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium">
                      {profile?.company_name || 'My Business'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-400 mb-1 block">Owner Email</Label>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium">
                      {profile?.email || 'admin@startupsphere.com'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-400" />
                    Automated Payment Reminders
                  </CardTitle>
                  <CardDescription>
                    Automatically generate WhatsApp payment reminders & notifications for overdue sales orders (&gt; 3 days unpaid).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Enable Auto Reminders</p>
                      <p className="text-xs text-slate-400">
                        Daily cron checks orders older than 3 days with pending balances and alerts owner with WhatsApp links.
                      </p>
                    </div>
                    <Switch
                      checked={autoPaymentReminders}
                      onCheckedChange={async (checked) => {
                        setAutoPaymentReminders(checked)
                        if (!ownerId) return
                        try {
                          const { error } = await supabaseRef.current
                            .from("user_configs")
                            .upsert({ user_id: ownerId, auto_payment_reminders: checked }, { onConflict: "user_id" })
                          if (error) throw error
                          toast.success(`Auto payment reminders ${checked ? "enabled" : "disabled"}`)
                        } catch (err: any) {
                          toast.error("Failed to update reminder settings: " + err.message)
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "localization" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" />
                    Currency & Region
                  </CardTitle>
                  <CardDescription>Set how monetary values appear across your dashboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-slate-200 font-bold">Base Currency</Label>
                    <Select value={baseCurrency} onValueChange={handleCurrencyChange}>
                      <SelectTrigger className="w-full bg-slate-950 border-slate-700 text-white h-12">
                        <SelectValue placeholder="Select Currency" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white">
                        <SelectItem value="INR">₹ INR - Indian Rupee</SelectItem>
                        <SelectItem value="USD">$ USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">€ EUR - Euro</SelectItem>
                        <SelectItem value="GBP">£ GBP - British Pound</SelectItem>
                        <SelectItem value="AED">د.إ AED - UAE Dirham</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Changing this will reload the dashboard and format all financial data in the selected currency.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <Label className="text-slate-200 font-bold">Default Timezone</Label>
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-slate-300">
                      Asia/Kolkata (IST)
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-400" />
                    Feature Packs & Membership
                  </CardTitle>
                  <CardDescription>Select and request additional capabilities for your workspace</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: "Multi-Tenancy Pack", label: "Multi-Tenancy Pack", desc: "Multi-Store & Branch Support", active: profile?.has_multi_tenancy_pack },
                        { id: "Core Modules Pack", label: "Core Modules Pack", desc: "Inventory, Sales, Accounting, AI Marketing", active: profile?.has_core_modules_pack },
                        { id: "AI Analysis Pack", label: "AI Analysis Pack", desc: "Natural Language Analytics & Forecasts", active: profile?.has_ai_analysis_pack },
                        { id: "CRM Pack", label: "CRM Pack", desc: "Advanced Lead Management & Automation", active: profile?.has_crm_pack }].map((pack) => (
                        <div 
                          key={pack.id}
                          onClick={() => !pack.active && setSelectedPacks(prev => prev.includes(pack.id) ? prev.filter(p => p !== pack.id) : [...prev, pack.id])}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            pack.active 
                              ? 'bg-blue-600/10 border-blue-600/40 opacity-80 cursor-default' 
                              : selectedPacks.includes(pack.id)
                                ? 'bg-blue-600/20 border-blue-600'
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                           <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-white text-sm">{pack.label}</h4>
                              {pack.active ? (
                                <Badge className="bg-emerald-500/20 text-emerald-500 border-0 text-[10px]">ACTIVE</Badge>
                              ) : (
                                <div className={`w-4 h-4 rounded-full border ${selectedPacks.includes(pack.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-700'}`} />
                              )}
                           </div>
                           <p className="text-[10px] text-slate-500">{pack.desc}</p>
                        </div>
                      ))}
                   </div>

                   <div className="pt-6 border-t border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                         <div>
                            <p className="text-sm font-bold text-white">Employee Limit</p>
                            <p className="text-xs text-slate-500">Maximum registered staff members</p>
                         </div>
                         <Badge variant="outline" className="text-lg py-1 px-4 border-slate-700 text-blue-400">
                            {profile?.max_employees || 2}
                         </Badge>
                      </div>
                   </div>
                </CardContent>
                <CardFooter>
                   <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-6 disabled:opacity-50"
                    disabled={selectedPacks.length === 0 || requesting}
                    onClick={handleRequestUpgrade}
                   >
                     {requesting ? "Submitting Request..." : "Request Selected Upgrades"}
                   </Button>
                </CardFooter>
              </Card>

              <div className="bg-blue-900/20 border border-blue-600/30 p-6 rounded-2xl flex gap-4">
                 <ShieldCheck className="w-8 h-8 text-blue-400 shrink-0" />
                 <div>
                    <h4 className="text-sm font-bold text-white mb-1">Admin Controlled Memberships</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                       StartupSphere operates on an approval-based upgrade model. Your request will be sent to the system administrator for review. Once approved, the new features and limits will be instantly applied to your workspace.
                    </p>
                 </div>
              </div>
            </div>
          )}


          {activeTab === "team" && profile?.role === "owner" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Requests */}
              {requests.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    Pending Requests
                  </h3>
                  {requests.map(req => (
                    <div key={req.id} className="bg-slate-900 border border-amber-600/30 rounded-xl p-6 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{req.employee_email}</p>
                        <p className="text-xs text-slate-500">Requested {new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApproveRequest(req)} className="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-950/40" onClick={() => handleRejectRequest(req.id)}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Team */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-400" />
                    Active Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-slate-800">
                    {employees.length === 0 ? (
                      <p className="text-center py-8 text-slate-500 italic">No employees yet</p>
                    ) : (
                      employees.map(emp => (
                        <div key={emp.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-white">{emp.email}</p>
                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{emp.id.slice(0, 8)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTogglePermission(emp.id, "can_manage_inventory", emp.can_manage_inventory)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${emp.can_manage_inventory ? 'bg-blue-600/20 text-blue-400 border-blue-600/40' : 'bg-slate-800 text-slate-600 border-slate-700'}`}
                            >
                              Inventory
                            </button>
                            <button
                              onClick={() => handleTogglePermission(emp.id, "can_manage_sales", emp.can_manage_sales)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${emp.can_manage_sales ? 'bg-green-600/20 text-green-400 border-green-600/40' : 'bg-slate-800 text-slate-600 border-slate-700'}`}
                            >
                              Sales
                            </button>
                            <button
                              onClick={() => handleTogglePermission(emp.id, "can_manage_accounting", emp.can_manage_accounting)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${emp.can_manage_accounting ? 'bg-amber-600/20 text-amber-400 border-amber-600/40' : 'bg-slate-800 text-slate-600 border-slate-700'}`}
                            >
                              Accounting
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-blue-400" />
                    Messaging Integrations
                  </CardTitle>
                  <CardDescription>Connect your communication channels for real-time automation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-green-600/10 rounded-lg"><Zap className="w-5 h-5 text-green-500" /></div>
                         <div>
                            <p className="text-sm font-bold text-white">WhatsApp Business API</p>
                            <p className="text-xs text-slate-500">Enable direct sending from the Inbox</p>
                         </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">READY</Badge>
                    </div>
                    <Input 
                      type="password" 
                      placeholder="Enter WhatsApp API Key / Token"
                      className="bg-slate-950 border-slate-800 text-white"
                      defaultValue="••••••••••••••••"
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-600/10 rounded-lg"><Bell className="w-5 h-5 text-blue-500" /></div>
                         <div>
                            <p className="text-sm font-bold text-white">Email (SendGrid / SMTP)</p>
                            <p className="text-xs text-slate-500">Power your CRM automation sequences</p>
                         </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">READY</Badge>
                    </div>
                    <Input 
                      type="password" 
                      placeholder="Enter SendGrid API Key"
                      className="bg-slate-950 border-slate-800 text-white"
                      defaultValue="••••••••••••••••"
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-800">
                     <div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-xl flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                           <p className="text-xs text-slate-300 font-bold mb-1">Enterprise Grade Security</p>
                           <p className="text-[10px] text-slate-500 leading-relaxed">
                             API keys are encrypted using AES-256 before being stored in our vault. Only your workspace has access to use these keys for messaging protocols.
                           </p>
                        </div>
                     </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-6">
                    Save Integration Settings
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

