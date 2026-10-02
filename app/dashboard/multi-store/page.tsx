"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { getLocations, getBulkOrders, getWholesaleTiers, createLocation, createWholesaleTier, getProducts as getInventory } from "@/lib/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Store, Warehouse, Truck, Plus, Building2, BarChart3, 
  ArrowLeftRight, PackageCheck, FileText, Settings, Search, RefreshCw, X
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { AdaptiveTable } from "@/components/ui/adaptive-table"
import { StockTransferService } from "@/lib/services/stock-transfer"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function MultiStorePage() {
  const { ownerId, formatPrice, loading: contextLoading } = useBusinessContext()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [locations, setLocations] = useState<any[]>([])
  const [bulkOrders, setBulkOrders] = useState<any[]>([])
  const [tiers, setTiers] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])

  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<BusinessLocation | null>(null)
  const [transferData, setTransferData] = useState({
    productId: "",
    fromLoc: "",
    toLoc: "",
    qty: 1
  })
  const [newLocationData, setNewLocationData] = useState({ name: "", address: "", type: "retail" as "retail" | "warehouse" })
  const router = useRouter()

  useEffect(() => {
    if (ownerId) loadData()
  }, [ownerId])

  const handleToggleDeactivate = async (location: BusinessLocation) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('business_locations')
        .update({ is_active: !location.is_active })
        .eq('id', location.id)
      
      if (error) throw error
      toast.success(`Location ${location.is_active ? 'deactivated' : 'activated'} successfully`)
      setDeactivateTarget(null)
      loadData()
    } catch (err: any) {
      toast.error("Failed to update location status: " + err.message)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [locationsData, invData] = await Promise.all([
        getLocations(ownerId!),
        getInventory(ownerId!)
      ])
      setLocations(locationsData)
      setInventory(invData)
    } catch (error) {
      toast.error("Failed to load multi-store data")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId) return

    // Check limits
    const profile = await (async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient()
      const { data } = await supabase.from("profiles").select("max_locations").eq("id", ownerId).single()
      return data
    })()

    if (profile && locations.length >= profile.max_locations) {
      toast.error(`Location limit reached (${profile.max_locations}). Please request an upgrade.`)
      return
    }

    try {
      await createLocation({
        ...newLocationData,
        owner_id: ownerId,
        is_active: true
      })
      toast.success("Location created successfully")
      setShowLocationModal(false)
      loadData()
    } catch (error) {
      toast.error("Failed to create location")
    }
  }

  const handleTransfer = async () => {
    if (!transferData.productId || !transferData.fromLoc || !transferData.toLoc) return
    try {
      await StockTransferService.transferStock({
        productId: transferData.productId,
        fromLocationId: transferData.fromLoc,
        toLocationId: transferData.toLoc,
        quantity: transferData.qty,
        ownerId: ownerId!
      })
      toast.success("Stock transfer successful")
      setShowTransferModal(false)
      loadData()
    } catch (error) {
      toast.error("Transfer failed. Check stock availability.")
    }
  }

  if (contextLoading || loading) return <div className="p-8 space-y-8"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Multi-Store Management</h1>
          <p className="text-slate-400">Enterprise distribution and inter-branch logistics</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-slate-800 text-slate-400" onClick={() => setShowTransferModal(true)}>
             <ArrowLeftRight className="w-4 h-4 mr-2" /> Stock Transfer
           </Button>
           <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowLocationModal(true)}>
             <Plus className="w-4 h-4 mr-2" /> New Location
           </Button>
        </div>
      </div>

      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 mb-8">
          <TabsTrigger value="locations" className="data-[state=active]:bg-blue-600 px-6">Active Locations</TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-blue-600 px-6">Global Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="locations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((loc) => (
              <Card key={loc.id} className="bg-slate-900 border-slate-800 p-6 hover:border-blue-600/50 transition-all group flex flex-col">
                 <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-slate-800 text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                       {loc.type === 'warehouse' ? <Warehouse className="w-6 h-6" /> : <Store className="w-6 h-6" />}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeactivateTarget(loc)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <Badge className={loc.is_active ? "bg-emerald-500/10 text-emerald-500 border-0" : "bg-red-500/10 text-red-500 border-0"}>
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                 </div>
                 <h3 className="text-xl font-bold text-white mb-1">{loc.name}</h3>
                 <p className="text-xs text-slate-500 mb-6 flex items-center gap-2"><Truck className="w-3 h-3" /> {loc.address}</p>
                 
                 <div className="space-y-3 mt-auto">
                    <div className="grid grid-cols-3 gap-2">
                       <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-[10px] h-8 border-slate-800 hover:bg-blue-600/10 hover:text-blue-400"
                        onClick={() => router.push(`/dashboard/inventory?locationId=${loc.id}`)}
                       >
                         <PackageCheck className="w-3 h-3 mr-1" /> Inventory
                       </Button>
                       <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-[10px] h-8 border-slate-800 hover:bg-emerald-600/10 hover:text-emerald-400"
                        onClick={() => router.push(`/dashboard/sales?locationId=${loc.id}`)}
                       >
                         <BarChart3 className="w-3 h-3 mr-1" /> Sales
                       </Button>
                       <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-[10px] h-8 border-slate-800 hover:bg-amber-600/10 hover:text-amber-400"
                        onClick={() => router.push(`/dashboard/accounting?locationId=${loc.id}`)}
                       >
                         <FileText className="w-3 h-3 mr-1" /> Accounts
                       </Button>
                    </div>
                 </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="inventory">
           <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                 <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input placeholder="Filter global stock..." className="pl-10 bg-slate-950 border-slate-800 text-white" />
                 </div>
              </div>
              <AdaptiveTable 
                data={inventory}
                columns={[
                  { header: "Product", accessorKey: "name", className: "font-bold text-white" },
                  { header: "Category", accessorKey: "category" },
                  { header: "Total Stock", accessorKey: (i) => <span className="font-bold text-blue-400">{i.current_stock} units</span> },
                  { header: "Branches", accessorKey: (i: any) => <Badge className="bg-slate-800 text-slate-400">{i.products_locations?.length || 0} Locations</Badge> }
                ]}
                mobileCard={(i: any) => (
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="font-bold text-white">{i.name}</p>
                        <p className="text-[10px] text-slate-500">{i.category}</p>
                     </div>
                     <p className="font-bold text-blue-400">{i.current_stock} Units</p>
                  </div>
                )}
              />
           </Card>
        </TabsContent>
      </Tabs>

      {/* New Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-6">Create New Location</h3>
            <form onSubmit={handleCreateLocation} className="space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Location Name</label>
                  <Input 
                    required 
                    placeholder="e.g. Mumbai Retail Center" 
                    className="bg-slate-800 border-slate-700 text-white"
                    value={newLocationData.name}
                    onChange={e => setNewLocationData({...newLocationData, name: e.target.value})}
                  />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Address / City</label>
                  <Input 
                    required 
                    placeholder="Full address or city" 
                    className="bg-slate-800 border-slate-700 text-white"
                    value={newLocationData.address}
                    onChange={e => setNewLocationData({...newLocationData, address: e.target.value})}
                  />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Type</label>
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg outline-none"
                    value={newLocationData.type}
                    onChange={e => setNewLocationData({...newLocationData, type: e.target.value as any})}
                  >
                     <option value="retail">Retail Store</option>
                     <option value="warehouse">Warehouse</option>
                  </select>
               </div>
               <div className="pt-4 space-y-3">
                  <Button type="submit" className="w-full bg-blue-600 h-12 font-bold">Register Branch</Button>
                  <Button variant="ghost" type="button" className="w-full text-slate-500" onClick={() => setShowLocationModal(false)}>Cancel</Button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-6">Inter-Branch Transfer</h3>
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Source Location</label>
                  <select className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg outline-none" value={transferData.fromLoc} onChange={e => setTransferData({...transferData, fromLoc: e.target.value})}>
                     <option value="">Select Source</option>
                     {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Destination Location</label>
                  <select className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg outline-none" value={transferData.toLoc} onChange={e => setTransferData({...transferData, toLoc: e.target.value})}>
                     <option value="">Select Destination</option>
                     {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Product</label>
                    <select className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg outline-none" value={transferData.productId} onChange={e => setTransferData({...transferData, productId: e.target.value})}>
                       <option value="">Select Item</option>
                       {inventory.slice(0, 10).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Quantity</label>
                    <Input type="number" className="bg-slate-800 border-slate-700 h-12" value={transferData.qty} onChange={e => setTransferData({...transferData, qty: parseInt(e.target.value)})} />
                  </div>
               </div>
               <Button className="w-full bg-blue-600 h-14 font-bold mt-6 shadow-xl shadow-blue-900/40" onClick={handleTransfer}>Authorize Transfer</Button>
               <Button variant="ghost" className="w-full text-slate-500" onClick={() => setShowTransferModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
      {/* Deactivation Confirmation Modal */}
      {deactivateTarget && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              {deactivateTarget.is_active ? "Deactivate Branch?" : "Activate Branch?"}
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Are you sure you want to {deactivateTarget.is_active ? "deactivate" : "reactivate"}{" "}
              <strong className="text-white">{deactivateTarget.name}</strong>?
              {deactivateTarget.is_active && " Employees assigned to this branch will lose access to its localized inventory."}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300"
                onClick={() => setDeactivateTarget(null)}
              >
                Cancel
              </Button>
              <Button
                className={deactivateTarget.is_active ? "flex-1 bg-red-600 hover:bg-red-700 text-white" : "flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"}
                onClick={() => handleToggleDeactivate(deactivateTarget)}
              >
                Confirm {deactivateTarget.is_active ? "Deactivation" : "Activation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

