"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { useCurrency } from "@/components/providers/currency-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, RotateCcw, FileText, Search, RefreshCw, Package, TrendingDown, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

export default function SystemTrashBinPage() {
  const { ownerId, loading: contextLoading } = useBusinessContext()
  const { format } = useCurrency()
  const [trashedItems, setTrashedItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [actionId, setActionId] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (ownerId) {
      loadTrash()
    }
  }, [ownerId])

  const loadTrash = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseRef.current
        .from("bill_trash")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("is_restored", false)
        .order("trashed_at", { ascending: false })

      if (error) {
        console.warn("bill_trash table query info:", error.message)
        setTrashedItems([])
      } else {
        setTrashedItems(data || [])
      }
    } catch (err: any) {
      console.warn("Failed to load trash:", err)
      setTrashedItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (item: any) => {
    setActionId(item.id)
    try {
      const original = item.original_data
      const cat = item.category || "sales"

      if (cat === "sales" || !item.category) {
        if (original && original.id) {
          const { data: existing } = await supabaseRef.current
            .from("sales_orders")
            .select("id")
            .eq("id", original.id)
            .maybeSingle()

          if (existing) {
            await supabaseRef.current
              .from("sales_orders")
              .update({ status: "completed" })
              .eq("id", original.id)
          } else {
            await supabaseRef.current
              .from("sales_orders")
              .insert({
                id: original.id,
                owner_id: original.owner_id || ownerId,
                location_id: original.location_id,
                customer_name: original.customer_name,
                customer_phone: original.customer_phone,
                customer_email: original.customer_email,
                total_amount: original.total_amount,
                gst_amount: original.gst_amount,
                status: "completed",
                created_at: original.created_at || new Date().toISOString()
              })

            if (original.order_items && Array.isArray(original.order_items) && original.order_items.length > 0) {
              const itemsToRestore = original.order_items.map((oi: any) => ({
                id: oi.id,
                order_id: original.id,
                product_id: oi.product_id,
                quantity: oi.quantity,
                unit_price: oi.unit_price,
                line_total: oi.line_total,
                created_at: oi.created_at || new Date().toISOString()
              }))
              await supabaseRef.current.from("order_items").upsert(itemsToRestore)
            }
          }
        }
      } else if (cat === "inventory") {
        if (original) {
          const prodData: any = {
            owner_id: original.owner_id || ownerId,
            name: original.name,
            sku: original.sku,
            price: original.price || 0,
            cost_price: original.cost_price || 0,
            stock_quantity: original.stock_quantity || 0,
            min_stock_level: original.min_stock_level || 10,
            category: original.category || null,
            manufacturer_name: original.manufacturer_name || null,
            manufacturer_address: original.manufacturer_address || null,
            manufacturer_gstin: original.manufacturer_gstin || null,
          }
          if (original.id) prodData.id = original.id
          await supabaseRef.current.from("products").upsert(prodData)
        }
      } else if (cat === "accounting") {
        if (original) {
          if (original.invoice_number) {
            const invData: any = {
              owner_id: original.owner_id || ownerId,
              invoice_number: original.invoice_number,
              customer_name: original.customer_name,
              total_amount: original.total_amount || 0,
              gst_amount: original.gst_amount || 0,
            }
            if (original.id) invData.id = original.id
            await supabaseRef.current.from("invoices").upsert(invData)
          } else {
            const expData: any = {
              owner_id: original.owner_id || ownerId,
              category: original.category || "General Expense",
              amount: original.amount || 0,
              amount_paid: original.amount_paid || 0,
              balance_due: original.balance_due || 0,
              payment_status: original.payment_status || "unpaid",
              description: original.description || "Restored expense",
              expense_date: original.expense_date || new Date().toISOString().split("T")[0],
              vendor_name: original.vendor_name || null,
              manufacturer_id: original.manufacturer_id || null,
            }
            if (original.id) expData.id = original.id
            await supabaseRef.current.from("expenses").upsert(expData)
          }
        }
      }

      await supabaseRef.current
        .from("bill_trash")
        .update({ is_restored: true })
        .eq("id", item.id)

      toast.success(`Restored successfully!`)
      loadTrash()
    } catch (err: any) {
      toast.error("Failed to restore item: " + err.message)
    } finally {
      setActionId(null)
    }
  }

  const handlePermanentDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to permanently delete this item? This cannot be undone.`)) return

    setActionId(id)
    try {
      const { error } = await supabaseRef.current
        .from("bill_trash")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast.success("Item permanently deleted.")
      loadTrash()
    } catch (err: any) {
      toast.error("Failed to delete item: " + err.message)
    } finally {
      setActionId(null)
    }
  }

  const handleEmptyTrash = async () => {
    if (!confirm("Are you sure you want to permanently delete ALL items in trash?")) return

    setLoading(true)
    try {
      const { error } = await supabaseRef.current
        .from("bill_trash")
        .delete()
        .eq("owner_id", ownerId)

      if (error) throw error
      toast.success("Trash emptied.")
      loadTrash()
    } catch (err: any) {
      toast.error("Failed to empty trash: " + err.message)
      setLoading(false)
    }
  }

  const salesTrash = trashedItems.filter(i => (i.category === "sales" || !i.category) && (
    (i.invoice_number && i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.customer_name && i.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.reason && i.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  ))

  const inventoryTrash = trashedItems.filter(i => i.category === "inventory" && (
    (i.invoice_number && i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.customer_name && i.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.reason && i.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  ))

  const accountingTrash = trashedItems.filter(i => i.category === "accounting" && (
    (i.invoice_number && i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.customer_name && i.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.reason && i.reason.toLowerCase().includes(searchQuery.toLowerCase()))
  ))

  if (contextLoading || loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  const renderTable = (items: any[], emptyLabel: string) => (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden rounded-2xl">
      {items.length === 0 ? (
        <Empty className="py-16">
          <EmptyHeader>
            <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-slate-500" />
            </div>
            <EmptyTitle className="text-white">No trashed items</EmptyTitle>
            <EmptyDescription className="text-slate-400">{emptyLabel}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800">
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Identifier / Item</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Details / Vendor</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Value / Amount</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Reason Trashed</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Trashed Date</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-5">
                    <p className="font-bold text-white text-sm">{item.invoice_number || `ITEM-${item.id.slice(0, 6)}`}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.order_date ? new Date(item.order_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </td>
                  <td className="p-5">
                    <p className="text-sm font-semibold text-white">{item.customer_name || "N/A"}</p>
                    <p className="text-xs text-slate-500">{item.customer_phone || ""}</p>
                  </td>
                  <td className="p-5">
                    <p className="text-sm font-black text-white">{format(Number(item.total_amount) || 0)}</p>
                  </td>
                  <td className="p-5">
                    <Badge className={
                      item.reason?.includes("deleted")
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : item.reason?.includes("refunded")
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }>
                      {item.reason || "Trashed"}
                    </Badge>
                  </td>
                  <td className="p-5 text-xs text-slate-400">
                    {item.trashed_at ? new Date(item.trashed_at).toLocaleString() : 'N/A'}
                  </td>
                  <td className="p-5 text-right space-x-2">
                    <Button
                      size="sm"
                      disabled={actionId === item.id}
                      onClick={() => handleRestore(item)}
                      className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={actionId === item.id}
                      onClick={() => handlePermanentDelete(item.id)}
                      className="text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Trash2 className="w-8 h-8 text-rose-400" />
            System Trash Bin
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Restore misclicked deletions across Sales, Inventory, and Accounting Expenses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadTrash} className="border-slate-800 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {trashedItems.length > 0 && (
            <Button onClick={handleEmptyTrash} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
              <Trash2 className="w-4 h-4 mr-2" />
              Empty Trash
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {trashedItems.length > 0 && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search trash records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* Category Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 mb-6">
          <TabsTrigger value="sales" className="data-[state=active]:bg-blue-600 px-6 gap-2">
            <ShoppingCart className="w-4 h-4" />
            Sales & Bills ({salesTrash.length})
          </TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-emerald-600 px-6 gap-2">
            <Package className="w-4 h-4" />
            Inventory ({inventoryTrash.length})
          </TabsTrigger>
          <TabsTrigger value="accounting" className="data-[state=active]:bg-amber-600 px-6 gap-2">
            <TrendingDown className="w-4 h-4" />
            Accounting Expenses ({accountingTrash.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          {renderTable(salesTrash, "No trashed sales orders or bills found.")}
        </TabsContent>
        <TabsContent value="inventory">
          {renderTable(inventoryTrash, "No trashed inventory products found.")}
        </TabsContent>
        <TabsContent value="accounting">
          {renderTable(accountingTrash, "No trashed accounting expenses or invoices found.")}
        </TabsContent>
      </Tabs>
    </div>
  )
}
