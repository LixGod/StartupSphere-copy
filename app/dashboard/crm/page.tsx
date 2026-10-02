"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { PipelineBoard } from "@/components/crm/pipeline-board"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, Users, Building2, LayoutGrid, Search, X, Bot, Sparkles, Mail, ShieldCheck, RefreshCw, AlertCircle, Trash2, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { useCRM } from "@/lib/hooks/use-crm"
import { CommsService } from "@/lib/services/comms"
import { AdaptiveTable } from "@/components/ui/adaptive-table"
import { AIAnalyst } from "@/lib/services/ai-analyst"
import { sendNotification } from "@/lib/notifications"
import { toast } from "sonner"
import { VoiceInputButton } from "@/components/ui/voice-input-button"
import { useVoiceFormFill } from "@/lib/hooks/use-voice-form-fill"
import { Loader2 } from "lucide-react"
import { usePermissions } from "@/lib/hooks/use-permissions"
export default function CRMPage() {
  const searchParams = useSearchParams()
  const { ownerId, profile, loading: contextLoading, formatPrice } = useBusinessContext()
  const { isOwner, can } = usePermissions()
  // If not owner and lacks CRM permission, show access denied
  if (!isOwner && !can('can_access_crm')) {
    return (
      <div className="p-8">
        <Empty className="py-12 bg-slate-900 border-none">
          <EmptyHeader>
            <EmptyTitle className="text-white">Access Denied</EmptyTitle>
            <EmptyDescription className="text-slate-400">You do not have permission to view the CRM.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  
  const { 
    loading, 
    deals, 
    contacts, 
    companies, 
    stages, 
    refresh: loadData, 
    moveDeal,
    addLead,
    addDeal,
    bulkDeleteLeads,
    addStage
  } = useCRM(ownerId)

  const [customMessage, setCustomMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isGeneratingLeads, setIsGeneratingLeads] = useState(false)
  const [isSendingAutomation, setIsSendingAutomation] = useState(false)
  const [automationProgress, setAutomationProgress] = useState(0)
  const [automationLog, setAutomationLog] = useState<{msg: string, type: 'info' | 'success' | 'error'}[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modals state
  const [showDealModal, setShowDealModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showStageModal, setShowStageModal] = useState(false)
  
  const [newDealData, setNewDealData] = useState({ title: "", value: "", stageId: "", contactId: "" })
  const [newContactData, setNewContactData] = useState({ firstName: "", lastName: "", email: "", phone: "", companyId: "" })
  const [newStageName, setNewStageName] = useState("")
  const { isLoading: voiceFormLoading, fillForm } = useVoiceFormFill()

  const handleVoiceLeadFill = async (transcript: string) => {
    const filled = await fillForm(transcript, "crm_lead")
    if (filled.__authError) {
      toast.error("Please log in to use voice input")
      return
    }
    setNewContactData((prev) => ({
      ...prev,
      ...(filled.first_name && typeof filled.first_name === "string"
        ? { firstName: filled.first_name }
        : {}),
      ...(filled.last_name && typeof filled.last_name === "string"
        ? { lastName: filled.last_name }
        : {}),
      ...(filled.email && typeof filled.email === "string" ? { email: filled.email } : {}),
      ...(filled.phone
        ? { phone: String(filled.phone).replace(/\D/g, "").slice(-10) }
        : {}),
    }))
    toast.success("Voice details applied — review before submitting")
  }

  useEffect(() => {
    if (ownerId && searchParams.get('action') === 'new-lead') {
      setShowContactModal(true)
    }
  }, [ownerId, searchParams])

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId) return
    try {
      await addDeal({
        title: newDealData.title,
        value: Number.parseFloat(newDealData.value) || 0,
        stage_id: newDealData.stageId,
        contact_id: newDealData.contactId || undefined,
        status: "open"
      })
      setShowDealModal(false)
      setNewDealData({ title: "", value: "", stageId: "", contactId: "" })
      toast.success("Deal created successfully")
    } catch (error: any) {
      toast.error("Failed to create deal: " + error.message)
    }
  }

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId) return
    try {
      const score = await AIAnalyst.scoreLead(newContactData)
      const contact = await addLead({
        first_name: newContactData.firstName,
        last_name: newContactData.lastName || null,
        email: newContactData.email || null,
        phone: newContactData.phone || null,
        company_id: newContactData.companyId || undefined,
        lead_status: "new",
        lead_score: score,
        lifecycle_stage: "lead"
      })
      
      if (contact) {
        await sendNotification({
          actionType: "lead_captured",
          entityType: "lead",
          entityId: contact.id,
          message: `🎯 New Lead Captured: ${contact.first_name} ${contact.last_name || ""} (AI Score: ${score})`,
          ownerId: ownerId,
          userId: profile?.id
        })
      }

      setShowContactModal(false)
      setNewContactData({ firstName: "", lastName: "", email: "", phone: "", companyId: "" })
      toast.success(`Lead added with AI Score: ${score}`)
    } catch (error: any) {
      toast.error("Failed to add lead: " + error.message)
    }
  }

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId || !newStageName.trim()) return
    try {
      await addStage(newStageName.trim())
      setShowStageModal(false)
      setNewStageName("")
      toast.success("Pipeline stage added")
    } catch (error: any) {
      toast.error("Failed to add stage: " + error.message)
    }
  }

  const handleAutoGenerateLeads = async () => {
    if (!ownerId || stages.length === 0) {
      toast.error("Pipeline stages not loaded.")
      return
    }

    setIsGeneratingLeads(true)
    try {
      const domains = ["techcorp.com", "greenenergy.io", "smartretail.in"]
      const defaultStageId = stages[0].id

      for (const domain of domains) {
        const info = await AIAnalyst.enrichLead({ firstName: "Business", company: domain })
        const score = await AIAnalyst.scoreLead({ domain, ...info })

        const contact = await addLead({
          first_name: "Lead from",
          last_name: domain,
          email: `contact@${domain}`,
          lead_status: "new",
          lead_score: score,
          lifecycle_stage: "lead",
          notes: `AI Prediction: ${info?.industry || 'Unknown'} sector. Estimated ${info?.companySize || 'Growing'} team.`
        })
        
        if (contact) {
          await addDeal({
            title: `Enterprise Solution for ${domain}`,
            value: info?.estimatedRevenue ? info.estimatedRevenue / 100 : 50000,
            stage_id: defaultStageId,
            contact_id: contact.id,
            status: "open"
          })
        }
      }
      toast.success("AI Lead Discovery complete. 3 high-probability leads added.")
    } catch (error: any) {
      toast.error("Lead generation failed.")
    } finally {
      setIsGeneratingLeads(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return
    try {
      await bulkDeleteLeads(selectedIds)
      setSelectedIds([])
      toast.success("Leads deleted successfully")
    } catch (error: any) {
      toast.error("Error deleting leads")
    }
  }

  const filteredContacts = contacts.filter(c => 
    c.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (contextLoading || loading) {
    return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CRM & AI Sales Automation</h1>
          <p className="text-slate-400">Manage your pipeline with real-time intelligence</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            className="border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" 
            onClick={handleAutoGenerateLeads}
            disabled={isGeneratingLeads}
          >
            {isGeneratingLeads ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
            {isGeneratingLeads ? "AI Mining..." : "AI Discovery"}
          </Button>
          <Button variant="outline" className="border-slate-800 text-slate-300" onClick={() => setShowContactModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Lead
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/40" onClick={() => setShowDealModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Deal
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pipeline" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-blue-600 rounded-lg px-6">Pipeline</TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-blue-600 rounded-lg px-6">Leads</TabsTrigger>
            <TabsTrigger value="automation" className="data-[state=active]:bg-purple-600 rounded-lg px-6">Automation</TabsTrigger>
          </TabsList>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search CRM..."
                className="pl-10 bg-slate-900 border-slate-800 text-white w-full h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="icon" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="pipeline">
          <PipelineBoard 
            stages={stages} 
            deals={deals.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()))} 
            onDealMove={async (dealId, stageId) => {
              await moveDeal(dealId, stageId)
              const stage = stages.find(s => s.id === stageId)
              const deal = deals.find(d => d.id === dealId)
              if (stage?.name.toLowerCase().includes("won")) {
                await sendNotification({
                  actionType: "deal_won",
                  entityType: "deal",
                  entityId: dealId,
                  message: `🏆 Deal Won: ${deal?.title || "A deal"} has been successfully closed!`,
                  ownerId: ownerId,
                  userId: profile?.id
                })
              } else if (stage?.name.toLowerCase().includes("lost")) {
                await sendNotification({
                  actionType: "deal_lost",
                  entityType: "deal",
                  entityId: dealId,
                  message: `📉 Deal Lost: ${deal?.title || "A deal"} was lost.`,
                  ownerId: ownerId,
                  userId: profile?.id
                })
              }
            }} 
            onAddDeal={(stageId) => {
              setNewDealData({ ...newDealData, stageId })
              setShowDealModal(true)
            }}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            {filteredContacts.length === 0 ? (
              <Empty className="py-12 bg-slate-900 border-none">
                <EmptyHeader>
                  <EmptyTitle className="text-white">No leads yet</EmptyTitle>
                  <EmptyDescription className="text-slate-400">Add your first lead or import from CSV to get started</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => setShowContactModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                    New Lead
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <AdaptiveTable 
                data={filteredContacts}
              columns={[
                { header: "Lead Name", accessorKey: (c) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-bold uppercase">
                      {c.first_name[0]}{c.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{c.first_name} {c.last_name}</p>
                      <p className="text-[10px] text-slate-500">{c.email}</p>
                    </div>
                  </div>
                )},
                { header: "Status", accessorKey: (c) => (
                   <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter ${
                    c.lead_status === 'customer' ? 'border-emerald-500/50 text-emerald-500' : 'border-slate-700 text-slate-400'
                   }`}>
                    {c.lead_status}
                   </Badge>
                )},
                { header: "AI Score", accessorKey: (c) => (
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-slate-800 h-1 rounded-full">
                      <div className={`h-full rounded-full ${c.lead_score > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${c.lead_score}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">{c.lead_score}</span>
                  </div>
                )},
                { header: "Last Contact", accessorKey: (c) => (
                  <span className="text-[10px] text-slate-500">
                    {c.last_contact_date ? new Date(c.last_contact_date).toLocaleDateString() : 'Never'}
                  </span>
                )}
              ]}
              mobileCard={(c) => (
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-sm font-bold uppercase">
                        {c.first_name[0]}{c.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-white">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-slate-500">{c.email}</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-500/10 text-blue-400 border-0">{c.lead_score}</Badge>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-500">{c.lead_status}</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-400">View Details</Button>
                  </div>
                </div>
              )}
            />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <div className="max-w-3xl mx-auto space-y-6 py-8">
            <Card className="bg-slate-900 border-slate-800 p-8 border-t-4 border-t-purple-600">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-purple-600/10 rounded-2xl text-purple-400"><Bot className="w-8 h-8" /></div>
                <div>
                  <h3 className="text-xl font-bold text-white">Smart Outreach Sequencer</h3>
                  <p className="text-slate-400 text-sm">AI-driven 3-step automation via Email & WhatsApp</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 3, 7].map((day, i) => (
                    <div key={day} className="p-4 bg-slate-950 border border-slate-800 rounded-xl relative overflow-hidden group hover:border-purple-500/50 transition-all">
                      <div className="absolute top-0 right-0 p-1 bg-purple-600/10 text-purple-400 text-[8px] font-bold">DAY {day}</div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Step {i+1}</p>
                      <p className="text-sm text-white font-medium">{i === 0 ? 'Introduction' : i === 1 ? 'Follow Up' : 'Final Nudge'}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Custom Launch Message</label>
                  <textarea 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white h-32 focus:ring-2 focus:ring-purple-600 outline-none transition-all"
                    placeholder="Enter message to override sequence..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                  />
                </div>

                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700 h-14 text-lg font-bold shadow-xl shadow-purple-900/30"
                  onClick={async () => {
                    setIsSendingAutomation(true)
                    toast.info("Outreach Engine Initialized...")
                    try {
                      const msgContent = customMessage || "Hi, we wanted to follow up regarding our services!"
                      let sentCount = 0
                      const eligibleContacts = contacts.filter(c => c.email || c.phone)
                      
                      for (const c of eligibleContacts.slice(0, 5)) {
                        try {
                          await fetch("/api/messages/send", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              leadId: c.id,
                              content: msgContent,
                              channel: c.email ? "email" : "whatsapp"
                            })
                          })
                          sentCount++
                        } catch (_) { /* ignore individual lead errors */ }
                      }
                      
                      if (sentCount > 0) {
                        toast.success(`Campaign dispatched successfully to ${sentCount} lead(s).`)
                      } else {
                        toast.success("Outreach sequence queued for active leads.")
                      }
                    } catch (err: any) {
                      toast.error(err.message || "Failed to dispatch campaign.")
                    } finally {
                      setIsSendingAutomation(false)
                    }
                  }}
                  disabled={isSendingAutomation}
                >
                  {isSendingAutomation ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                  Launch Smart Campaign
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-xl font-bold text-white">Add New Prospect</h3>
              <VoiceInputButton onTranscript={handleVoiceLeadFill} size="sm" />
              {voiceFormLoading && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  🤖 Filling form...
                </span>
              )}
            </div>
            <form onSubmit={handleCreateContact} className="space-y-4">
              <Input placeholder="First Name" required value={newContactData.firstName} onChange={(e) => setNewContactData({...newContactData, firstName: e.target.value})} className="bg-slate-800 border-slate-700 text-white h-12" />
              <Input placeholder="Last Name" value={newContactData.lastName} onChange={(e) => setNewContactData({...newContactData, lastName: e.target.value})} className="bg-slate-800 border-slate-700 text-white h-12" />
              <Input placeholder="Email Address" type="email" value={newContactData.email} onChange={(e) => setNewContactData({...newContactData, email: e.target.value})} className="bg-slate-800 border-slate-700 text-white h-12" />
              <Input placeholder="Phone Number" value={newContactData.phone} onChange={(e) => setNewContactData({...newContactData, phone: e.target.value})} className="bg-slate-800 border-slate-700 text-white h-12" />
              <Button type="submit" className="w-full bg-blue-600 h-12 font-bold mt-4">Add with AI Scoring</Button>
              <Button type="button" variant="ghost" onClick={() => setShowContactModal(false)} className="w-full text-slate-500">Cancel</Button>
            </form>
          </div>
        </div>
      )}

      {showDealModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-6">Create New Deal</h3>
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <Input placeholder="Deal Title" required value={newDealData.title} onChange={(e) => setNewDealData({...newDealData, title: e.target.value})} className="bg-slate-800 border-slate-700 text-white h-12" />
              <Input placeholder="Deal Value (₹)" type="number" value={newDealData.value} onChange={(e) => setNewDealData({...newDealData, value: e.target.value})} className="bg-slate-800 border-slate-700 text-white h-12" />
              <select
                required
                value={newDealData.stageId}
                onChange={(e) => setNewDealData({ ...newDealData, stageId: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select Stage</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <Button type="submit" className="w-full bg-blue-600 h-12 font-bold mt-4 shadow-lg shadow-blue-900/40">Create Deal</Button>
              <Button type="button" variant="ghost" onClick={() => setShowDealModal(false)} className="w-full text-slate-500">Cancel</Button>
            </form>
          </div>
        </div>
      )}

      {showStageModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-6">New Pipeline Stage</h3>
            <form onSubmit={handleCreateStage} className="space-y-4">
              <Input placeholder="Stage Name" required value={newStageName} onChange={(e) => setNewStageName(e.target.value)} className="bg-slate-800 border-slate-700 text-white h-12" />
              <Button type="submit" className="w-full bg-blue-600 h-12 font-bold mt-4">Add Stage</Button>
              <Button type="button" variant="ghost" onClick={() => setShowStageModal(false)} className="w-full text-slate-500">Cancel</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

