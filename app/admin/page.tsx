"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Trash2, Plus, Users, Mail, Phone, Calendar, ShieldAlert, CheckCircle, Zap, Package, BarChart3, Bot, Layout, X, ShieldCheck, Building2, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { sendNotification } from "@/lib/notifications"

import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { useRouter } from "next/navigation"

export default function SuperAdminPage() {
  const router = useRouter()
  const { impersonateOwner } = useBusinessContext()
  const [leads, setLeads] = useState<any[]>([])
  const [approvedOwners, setApprovedOwners] = useState<any[]>([])
  const [allOwners, setAllOwners] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [membershipRequests, setMembershipRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [newOwnerEmail, setNewOwnerEmail] = useState("")
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [showPacksModal, setShowPacksModal] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState<any>(null)
  const [newBranchData, setNewBranchData] = useState({
    name: "",
    type: "retail",
    address: ""
  })
  
  const supabase = createClient()

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  async function checkAdminAndLoad() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
       window.location.href = "/auth/login"
       return
    }

    const { data: profile } = await supabase.from("profiles").select("is_super_admin").eq("id", user.id).single()
    
    if (!profile?.is_super_admin) {
        setIsSuperAdmin(false)
        setLoading(false)
        return
    }

    setIsSuperAdmin(true)
    
    const [leadsRes, approvedRes, ownersRes, locationsRes, requestsRes] = await Promise.all([
      supabase.from("owner_leads").select("*").order("created_at", { ascending: false }),
      supabase.from("approved_owners").select("*").order("approved_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("role", "owner"),
      supabase.from("business_locations").select("*, profiles!owner_id(company_name, email)"),
      supabase.from("membership_requests").select("*, profiles(*)").order("created_at", { ascending: false })
    ])
 
    setLeads(leadsRes.data || [])
    setApprovedOwners(approvedRes.data || [])
    setAllOwners(ownersRes.data || [])
    setLocations(locationsRes.data || [])
    setMembershipRequests(requestsRes.data || [])
    setLoading(false)

    // Realtime for membership requests
    const requestsChannel = supabase
      .channel('admin_membership_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'membership_requests' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the full request with profile data
            const { data: fullReq } = await supabase
              .from("membership_requests")
              .select("*, profiles(*)")
              .eq("id", payload.new.id)
              .single()
            
            if (fullReq) {
              setMembershipRequests(prev => [fullReq, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            setMembershipRequests(prev => prev.map(r => 
              r.id === payload.new.id ? { ...r, ...payload.new } : r
            ))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(requestsChannel)
    }
  }

  const handleApprove = async (email: string) => {
    try {
      await supabase.from("approved_owners").insert({ email })
      await supabase.from("owner_leads").update({ status: 'closed' }).eq("email", email)
      checkAdminAndLoad()
      alert(`Owner Approved: ${email}`)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteApproved = async (email: string) => {
    if(!confirm("Remove access for this owner?")) return
    await supabase.from("approved_owners").delete().eq("email", email)
    checkAdminAndLoad()
  }

  const handleAddManualOwner = async () => {
    if(!newOwnerEmail) return
    await supabase.from("approved_owners").insert({ email: newOwnerEmail })
    setNewOwnerEmail("")
    checkAdminAndLoad()
  }

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOwner || !newBranchData.name) return

    try {
      const { error } = await supabase.from("business_locations").insert({
        owner_id: selectedOwner.id,
        name: newBranchData.name,
        type: newBranchData.type,
        address: newBranchData.address,
        is_active: true
      })

      if (error) throw error

      setShowBranchModal(false)
      setNewBranchData({ name: "", type: "retail", address: "" })
      checkAdminAndLoad()
      alert("Branch registered successfully for " + selectedOwner.company_name)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleApproveMembership = async (request: any) => {
    try {
      // Update request
      await supabase.from("membership_requests").update({ status: 'approved' }).eq("id", request.id)
      
      // Update profile
      const updates: any = {}
      if (request.requested_packs.includes("Sales Pack")) updates.has_sales_pack = true
      if (request.requested_packs.includes("Multi-Tenancy Pack")) updates.has_multi_tenancy_pack = true
      if (request.requested_packs.includes("Core Modules Pack")) updates.has_core_modules_pack = true
      if (request.requested_packs.includes("AI Analysis Pack")) updates.has_ai_analysis_pack = true
      if (request.requested_packs.includes("CRM Pack")) updates.has_crm_pack = true

      await supabase.from("profiles").update(updates).eq("id", request.owner_id)
      
      // Update local state for immediate feedback in admin UI
      setMembershipRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'approved' } : r
      ))
      
      setAllOwners(prev => prev.map(owner => 
        owner.id === request.owner_id ? { ...owner, ...updates } : owner
      ))

      if (selectedOwner && selectedOwner.id === request.owner_id) {
        setSelectedOwner({ ...selectedOwner, ...updates })
      }

      await sendNotification({
        actionType: "membership_approved",
        entityType: "membership",
        entityId: request.id,
        message: `🚀 Membership Upgraded! Your request for ${request.requested_packs.join(', ')} has been approved by the Admin.`,
        ownerId: request.owner_id,
        userId: request.owner_id // owner gets the notification
      })

      alert("Membership upgrade approved!")
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleUpdatePacks = async (ownerId: string, updates: any) => {
    try {
      await supabase.from("profiles").update(updates).eq("id", ownerId)
      
      // Update local state for immediate feedback
      if (selectedOwner && selectedOwner.id === ownerId) {
        setSelectedOwner({ ...selectedOwner, ...updates })
      }
      
      setAllOwners(prev => prev.map(owner => 
        owner.id === ownerId ? { ...owner, ...updates } : owner
      ))

      alert("Owner packs updated successfully!")
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) return <div className="p-8 text-white">Verifying Admin Access...</div>

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-4xl font-black mb-4">ACCESS DENIED</h1>
        <p className="text-slate-400 max-w-md">You do not have permission to access the Super Admin Dashboard. Only the developer of StartupSphere can manage business invitations.</p>
        <Button onClick={() => window.location.href = "/"} className="mt-8 bg-white text-black hover:bg-slate-200">Go Home</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black flex items-center gap-4">
              <Users className="text-blue-500 w-10 h-10" />
              Super Admin Control
            </h1>
            <p className="text-slate-400 mt-2 text-lg">Manage business access and view incoming leads.</p>
          </div>
          <Button 
            variant="ghost" 
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = "/"
            }}
            className="text-slate-500 hover:text-white hover:bg-red-500/10 flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            Logout
          </Button>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Membership Requests */}
          <div className="lg:col-span-3">
            <Card className="bg-slate-900 border-slate-800 border-t-4 border-t-blue-600">
               <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                       <Zap className="w-6 h-6 text-blue-400" />
                       Membership Upgrade Requests
                    </CardTitle>
                    <CardDescription>Review and approve feature pack requests from business owners</CardDescription>
                  </div>
                  <Badge className="bg-blue-600">{membershipRequests.filter(r => r.status === 'pending').length} PENDING</Badge>
               </CardHeader>
               <CardContent>
                  {membershipRequests.filter(r => r.status === 'pending').length === 0 ? (
                    <div className="py-12 text-center text-slate-500 italic bg-slate-950/50 rounded-xl border border-slate-800">
                       No pending membership requests.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {membershipRequests.filter(r => r.status === 'pending').map(req => (
                         <div key={req.id} className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4">
                            <div className="flex justify-between items-start">
                               <div>
                                  <p className="font-bold text-white">{req.profiles?.company_name}</p>
                                  <p className="text-[10px] text-slate-500">{req.profiles?.email}</p>
                               </div>
                               <Badge variant="outline" className="text-[9px] border-amber-500/50 text-amber-500">PENDING</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                               {req.requested_packs.map((p: string) => (
                                 <Badge key={p} className="bg-blue-600/10 text-blue-400 border-blue-600/20 text-[9px]">{p}</Badge>
                               ))}
                            </div>
                            <div className="pt-4 flex gap-2">
                               <Button size="sm" onClick={() => handleApproveMembership(req)} className="flex-1 bg-blue-600 hover:bg-blue-700">Approve</Button>
                               <Button size="sm" variant="ghost" className="flex-1 text-red-500">Decline</Button>
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </CardContent>
            </Card>
          </div>

          {/* Approved Owners List */}
          <div className="lg:col-span-1 space-y-6">
             <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-xl">Authorize New Owner</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input 
                        placeholder="owner@business.com" 
                        value={newOwnerEmail}
                        onChange={(e) => setNewOwnerEmail(e.target.value)}
                        className="bg-slate-800 border-slate-700"
                    />
                    <Button onClick={handleAddManualOwner} className="bg-blue-600 hover:bg-blue-700">
                       <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
             </Card>

             <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                   <CardTitle className="text-xl">Approved Emails ({approvedOwners.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                   {approvedOwners.map(owner => (
                     <div key={owner.email} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700 group">
                        <span className="text-sm font-medium">{owner.email}</span>
                        <Button 
                            onClick={() => handleDeleteApproved(owner.email)}
                            variant="ghost" 
                            className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                           <Trash2 className="w-4 h-4" />
                        </Button>
                     </div>
                   ))}
                </CardContent>
             </Card>
          </div>

          {/* Incoming Leads Table */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Interested Leads ({leads.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {leads.length === 0 ? (
                  <p className="text-slate-500 py-8 text-center italic">No new leads. Your marketing is quiet!</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="border-b border-slate-800">
                        <tr className="text-slate-400 text-sm uppercase">
                          <th className="pb-4 font-semibold">Business / Owner</th>
                          <th className="pb-4 font-semibold">Contact Info</th>
                          <th className="pb-4 font-semibold">Date</th>
                          <th className="pb-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {leads.map(lead => (
                          <tr key={lead.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="py-6">
                               <div className="font-bold text-white mb-1">{lead.business_name}</div>
                               <div className="flex items-center text-xs text-slate-500">
                                  <Mail className="w-3 h-3 mr-1" /> {lead.email}
                                </div>
                            </td>
                            <td className="py-6">
                               <div className="flex items-center text-sm font-medium text-blue-400">
                                  <Phone className="w-3 h-3 mr-1" /> {lead.phone}
                                </div>
                            </td>
                            <td className="py-6">
                               <div className="flex items-center text-xs text-slate-500">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {new Date(lead.created_at).toLocaleDateString()}
                               </div>
                            </td>
                            <td className="py-6 text-right">
                              <Button 
                                onClick={() => handleApprove(lead.email)}
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1 ml-[-2px]" />
                                Approve
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-12">
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                 <Building2 className="w-6 h-6 text-blue-400" />
                 Global Network & Pack Control ({allOwners.length})
              </h2>
           </div>
           
           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allOwners.map(owner => (
                <Card key={owner.id} className="bg-slate-900 border-slate-800 hover:border-blue-500/50 transition-all group">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                       <div>
                          <CardTitle className="text-lg font-bold text-white">{owner.company_name}</CardTitle>
                          <p className="text-xs text-slate-500">{owner.email}</p>
                       </div>
                       <div className="flex gap-1">
                          <Button 
                            onClick={() => {
                              setSelectedOwner(owner)
                              setShowPacksModal(true)
                            }}
                            size="icon" 
                            variant="ghost" 
                            className="text-blue-400 hover:bg-blue-900/20"
                            title="Manage Packs"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => {
                              impersonateOwner(owner.id)
                              router.push("/dashboard/overview")
                            }}
                            size="icon" 
                            variant="ghost" 
                            className="text-emerald-400 hover:bg-emerald-900/20"
                            title="Enter Dashboard"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => {
                              setSelectedOwner(owner)
                              setShowBranchModal(true)
                            }}
                            size="icon" 
                            variant="ghost" 
                            className="text-slate-400 hover:bg-slate-800"
                            title="Register Branch"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                       </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                       {owner.has_sales_pack && <Badge className="bg-blue-600/10 text-blue-400 border-blue-600/20 text-[8px]">SALES</Badge>}
                       {owner.has_multi_tenancy_pack && <Badge className="bg-purple-600/10 text-purple-400 border-purple-600/20 text-[8px]">MULTI-TENANT</Badge>}
                       {owner.has_core_modules_pack && <Badge className="bg-emerald-600/10 text-emerald-400 border-emerald-600/20 text-[8px]">CORE</Badge>}
                       {owner.has_ai_analysis_pack && <Badge className="bg-amber-600/10 text-amber-400 border-amber-600/20 text-[8px]">AI ANALYSIS</Badge>}
                       {owner.has_crm_pack && <Badge className="bg-cyan-600/10 text-cyan-400 border-cyan-600/20 text-[8px]">CRM</Badge>}
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex justify-between text-[10px]">
                         <span className="text-slate-500 uppercase font-bold tracking-widest">Active Branches</span>
                         <span className="text-blue-400">{locations.filter(l => l.owner_id === owner.id).length}</span>
                      </div>
                      <div className="max-h-24 overflow-y-auto custom-scrollbar pr-1">
                        {locations.filter(l => l.owner_id === owner.id).map(loc => (
                          <div key={loc.id} className="text-[10px] bg-slate-800/30 p-1.5 rounded mb-1 border border-slate-800 flex justify-between">
                             <span className="text-slate-300">{loc.name}</span>
                             <span className="text-slate-500 uppercase">{loc.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
           </div>
        </div>
      </div>

      {/* Register Branch Modal */}
      {showBranchModal && selectedOwner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full animate-in zoom-in-95 shadow-2xl">
            <h3 className="text-xl font-bold mb-1">Register New Branch</h3>
            <p className="text-slate-400 text-sm mb-6">Assigning to: <span className="text-blue-400 font-bold">{selectedOwner.company_name}</span></p>
            
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Branch Name</label>
                <Input 
                  value={newBranchData.name}
                  onChange={e => setNewBranchData({...newBranchData, name: e.target.value})}
                  placeholder="e.g. South Mumbai Retail Hub"
                  className="bg-slate-800 border-slate-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Branch Type</label>
                <select 
                  value={newBranchData.type}
                  onChange={e => setNewBranchData({...newBranchData, type: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"
                >
                  <option value="retail">Retail Store</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="hybrid">Distribution Center</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Location Address</label>
                <Input 
                  value={newBranchData.address}
                  onChange={e => setNewBranchData({...newBranchData, address: e.target.value})}
                  placeholder="Full Address"
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" onClick={() => setShowBranchModal(false)} variant="outline" className="flex-1 border-slate-800">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Confirm Registration
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Pack Management Modal */}
      {showPacksModal && selectedOwner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-lg w-full animate-in zoom-in-95 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Manage Workspace Packs</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPacksModal(false)}><X className="w-5 h-5" /></Button>
            </div>
            
            <p className="text-slate-400 text-sm mb-6">Configuring: <span className="text-blue-400 font-bold">{selectedOwner.company_name}</span></p>
            
            <div className="space-y-4 mb-8">
               {[
                 { id: 'has_sales_pack', label: 'Sales Pack', icon: Package },
                 { id: 'has_multi_tenancy_pack', label: 'Multi-Tenancy Pack', icon: Layout },
                 { id: 'has_core_modules_pack', label: 'Core Modules Pack', icon: Zap },
                 { id: 'has_ai_analysis_pack', label: 'AI Analysis Pack', icon: Bot },
                 { id: 'has_crm_pack', label: 'CRM Pack', icon: Users },
               ].map(pack => (
                 <div key={pack.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-3">
                       <pack.icon className="w-4 h-4 text-blue-400" />
                       <span className="text-sm text-slate-200">{pack.label}</span>
                    </div>
                    <button 
                      onClick={() => handleUpdatePacks(selectedOwner.id, { [pack.id]: !selectedOwner[pack.id] })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${selectedOwner[pack.id] ? 'bg-blue-600' : 'bg-slate-800'}`}
                    >
                       <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${selectedOwner[pack.id] ? 'left-7' : 'left-1'}`} />
                    </button>
                 </div>
               ))}

               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Staff Limit</label>
                    <Input 
                        type="number" 
                        value={selectedOwner.max_employees} 
                        onChange={e => handleUpdatePacks(selectedOwner.id, { max_employees: parseInt(e.target.value) })}
                        className="bg-slate-800 border-slate-700 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Branch Limit</label>
                    <Input 
                        type="number" 
                        value={selectedOwner.max_locations} 
                        onChange={e => handleUpdatePacks(selectedOwner.id, { max_locations: parseInt(e.target.value) })}
                        className="bg-slate-800 border-slate-700 w-full"
                    />
                  </div>
               </div>
            </div>

            <Button onClick={() => setShowPacksModal(false)} className="w-full bg-slate-800 hover:bg-slate-700">Close Manager</Button>
          </div>
        </div>
      )}
    </div>
  )
}

