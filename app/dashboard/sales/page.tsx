"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { 
  Plus, Search, ShoppingCart, Trash2, X, ChevronDown,
  CreditCard, User, Printer, Share2, AlertCircle, Package, RefreshCw,
  Receipt, ShoppingBag, ShieldCheck, Edit, Mail, Truck, MessageCircle
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { INDIAN_PHONE_REGEX } from "@/lib/constants"
import { Badge } from "@/components/ui/badge"
import { sendNotification } from "@/lib/notifications"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Store } from "lucide-react"
import { toast } from "sonner"
import { createOrder, createOrderItem } from "@/lib/api"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { InvoiceShareButton } from "@/components/whatsapp/invoice-share-button"
import { VoiceInputButton } from "@/components/ui/voice-input-button"
import { useVoiceFormFill } from "@/lib/hooks/use-voice-form-fill"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer"

export default function SalesPage() {
  const { profile: businessProfile, formatPrice } = useBusinessContext()
  const { isOwner, activeBranchId, can } = usePermissions()
  const [selectedLocationId, setSelectedLocationId] = useState<string>("global")
  const [locations, setLocations] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateSale, setShowCreateSale] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [saleFormData, setSaleFormData] = useState({
    quantity: "1",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    gstRate: "18",
  })
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [showPOS, setShowPOS] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<{ product: any; quantity: number; customPrice: number }[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const { isLoading: voiceFormLoading, fillForm } = useVoiceFormFill()
  const supabase = createClient()
  const router = useRouter()

  const resolveCheckoutLocationId = (): string | null | undefined => {
    if (selectedLocationId !== "global") return selectedLocationId
    if (locations.length === 1) return locations[0].id
    if (locations.length === 0) return null
    return undefined
  }

  // Lock employees to their assigned branch
  useEffect(() => {
    if (!isOwner && activeBranchId) {
      setSelectedLocationId(activeBranchId)
    }
  }, [isOwner, activeBranchId])

  useEffect(() => {
    const locId = new URLSearchParams(window.location.search).get("locationId")
    if (locId) setSelectedLocationId(locId)
    
    loadData()
    fetchLocations()

    const channel = supabase
      .channel("sales-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_orders" }, (payload: any) => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, selectedLocationId])

  const fetchLocations = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    const ownerId = profileData?.role === "owner" ? user.id : profileData?.owner_id
    const { data } = await supabase.from("locations").select("*").eq("owner_id", ownerId)
    const locs = data || []
    setLocations(locs)
    if (locs.length === 1) {
      setSelectedLocationId((current) => (current === "global" ? locs[0].id : current))
    }
  }

  const loadData = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    setProfile(profileData)

    const ownerId = profileData?.role === "owner" ? user.id : profileData?.owner_id

    let ordersQuery = supabase
      .from("sales_orders")
      .select("*, order_items(*, products(name))")
      .eq("owner_id", ownerId)
      .order("order_date", { ascending: false })
    
    if (selectedLocationId !== "global") {
      ordersQuery = ordersQuery.eq("location_id", selectedLocationId)
    }

    let productsQuery = supabase.from("products").select("*").eq("owner_id", ownerId).gt("stock_quantity", 0)

    const [ordersRes, productsRes] = await Promise.all([
      ordersQuery,
      productsQuery
    ])

    setOrders(ordersRes.data || [])
    setProducts(productsRes.data || [])
    setLoading(false)
  }

  const addToCart = (product: any) => {
    const existing = cart.find((item) => item.product.id === product.id)
    if (existing) {
      setCart(cart.map((item) => (item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCart([...cart, { product, quantity: 1, customPrice: product.price }])
    }
  }

  const updatePrice = (productId: string, newPrice: number) => {
    setCart(cart.map((item) => (item.product.id === productId ? { ...item, customPrice: newPrice } : item)))
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(cart.map((item) => (item.product.id === productId ? { ...item, quantity } : item)))
  }

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.customPrice * item.quantity, 0)
  }

  const handleVoiceSalesFill = async (transcript: string) => {
    const filled = await fillForm(transcript, "sales_order")
    if (filled.__authError) {
      toast.error("Please log in to use voice input")
      return
    }

    setSaleFormData((prev) => ({
      ...prev,
      ...(filled.customer_name && typeof filled.customer_name === "string"
        ? { customerName: filled.customer_name }
        : {}),
      ...(filled.customer_phone
        ? {
            customerPhone: String(filled.customer_phone).replace(/\D/g, "").slice(-10),
          }
        : {}),
      ...(filled.quantity != null && filled.quantity !== ""
        ? { quantity: String(filled.quantity) }
        : {}),
      ...(filled.notes && typeof filled.notes === "string"
        ? { customerAddress: filled.notes }
        : {}),
    }))

    if (filled.customer_name || filled.customer_phone) {
      setCustomerDetailsOpen(true)
    }

    if (filled.product_name && typeof filled.product_name === "string") {
      const search = filled.product_name.toLowerCase()
      const match = products.find(
        (p) =>
          p.name.toLowerCase().includes(search) || search.includes(p.name.toLowerCase())
      )
      if (match) {
        setSelectedProductId(match.id)
      }
    }

    toast.success("Voice details applied — review before submitting")
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return

    const locationId = resolveCheckoutLocationId()
    if (locationId === undefined) {
      toast.error("Please select a branch before checkout")
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Please sign in to complete checkout")
      return
    }

    const ownerId = profile?.role === "owner" ? user.id : profile?.owner_id
    if (!ownerId) {
      toast.error("Could not resolve business account. Refresh and try again.")
      return
    }

    const total = calculateTotal()
    const gstRate = saleFormData.gstRate === "none" ? 0 : Number.parseFloat(saleFormData.gstRate) / 100
    const gstAmount = total * gstRate

    setCheckoutLoading(true)
    try {
      // 1. Create the main order (Automation: will create invoice)
      const noteParts: string[] = []
      if (saleFormData.customerAddress.trim()) {
        noteParts.push(`Address: ${saleFormData.customerAddress.trim()}`)
      }

      const order = await createOrder({
        owner_id: ownerId,
        location_id: locationId ?? undefined,
        created_by: user.id,
        customer_name: saleFormData.customerName || "Walk-in Customer",
        customer_phone: saleFormData.customerPhone.trim() || "",
        customer_email: saleFormData.customerEmail.trim() || "",
        notes: noteParts.length > 0 ? noteParts.join("\n") : undefined,
        total_amount: total + gstAmount,
        gst_amount: gstAmount,
        status: "completed",
      })

      if (order) {
        // 2. Insert items (Automation: will update stock and record COGS)
        for (const item of cart) {
          await createOrderItem({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.customPrice,
            line_total: item.customPrice * item.quantity,
          })
        }
      }

      await sendNotification({
        actionType: "sale_created",
        entityType: "order",
        entityId: order.id,
        message: `Order for ${saleFormData.customerName || "Walk-in Customer"} (${formatPrice(total + gstAmount)}) created by ${profile?.email || "team member"}`,
        ownerId,
        userId: user.id,
      })

      // Trigger High-Value Sale Alert
      if (total + gstAmount >= 50000) {
        await sendNotification({
          actionType: "high_value_sale",
          entityType: "order",
          entityId: order.id,
          message: `🎉 HIGH VALUE SALE: A massive order of ${formatPrice(total + gstAmount)} was just closed!`,
          ownerId,
          userId: user.id,
        })
      }

      setCart([])
      setSaleFormData({
        quantity: "1",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        gstRate: "18",
      })
      setCustomerDetailsOpen(false)
      setShowPOS(false)
      loadData()
      toast.success("Order completed! Invoice generated and stock updated.")
    } catch (error: any) {
      console.error("Checkout error:", error)
      toast.error(error?.message || "Failed to complete checkout")
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleCreateSaleFromInventory = async (e: React.FormEvent) => {
    e.preventDefault()

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    const quantity = Number.parseInt(saleFormData.quantity)
    if (quantity <= 0 || quantity > product.stock_quantity) {
      alert(`Invalid quantity. Available stock: ${product.stock_quantity}`)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const ownerId = profile?.role === "owner" ? user.id : profile?.owner_id

    const locationId = resolveCheckoutLocationId()
    if (locationId === undefined) {
      alert("Please select a branch before creating a sale")
      return
    }

    const subtotal = product.price * quantity
    const gstRate = saleFormData.gstRate === "none" ? 0 : Number.parseFloat(saleFormData.gstRate) / 100
    const gstAmount = subtotal * gstRate
    const totalAmount = subtotal + gstAmount

    try {
      const order = await createOrder({
        owner_id: ownerId,
        location_id: locationId ?? undefined,
        created_by: user.id,
        customer_name: saleFormData.customerName || "Walk-in Customer",
        customer_phone: saleFormData.customerPhone || "",
        customer_email: saleFormData.customerEmail || "",
        total_amount: totalAmount,
        gst_amount: gstAmount,
        status: "completed",
      })

      if (order) {
        await createOrderItem({
          order_id: order.id,
          product_id: product.id,
          quantity: quantity,
          unit_price: product.price,
          line_total: subtotal,
        })
      }

      await sendNotification({
        actionType: "sale_created",
        entityType: "order",
        entityId: order.id,
        message: `Sale of ${product.name} created by ${profile?.email || "team member"}`,
        ownerId,
        userId: user.id,
      })

      setSaleFormData({
        quantity: "1",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        gstRate: "18",
      })
      setSelectedProductId("")
      setShowCreateSale(false)
      alert("Sale created successfully! Invoice and COGS recorded.")
      loadData()
    } catch (error: any) {
      alert("Error creating sale: " + error.message)
    }
  }

  const handleGenerateEwayBill = async (orderId: string) => {
    alert("Simulating E-Way Bill registration with the Government Portal...")
    setTimeout(() => {
      alert("Success! E-Way Bill generated. EBN: " + Math.floor(100000000000 + Math.random() * 900000000000))
    }, 1500)
  }

  const handleEditOrder = async () => {
    if (!editingOrder) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const ownerId = profile?.role === "owner" ? user.id : profile?.owner_id

      // 1. Fetch original items to reconcile stock
      const { data: originalItems } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", editingOrder.id)

      // 2. Update each item and reconcile stock
      if (editingOrder.order_items) {
        for (const item of editingOrder.order_items) {
          const original = originalItems?.find((oi: any) => oi.id === item.id)
          
          if (original) {
            // Reconcile stock: Add back original qty, subtract new qty
            const qtyDiff = original.quantity - item.quantity;
            if (qtyDiff !== 0) {
              const { data: currentProduct } = await supabase
                .from('products')
                .select('stock_quantity')
                .eq('id', item.product_id)
                .single()
              if (currentProduct) {
                await supabase
                  .from('products')
                  .update({ stock_quantity: (currentProduct.stock_quantity || 0) + qtyDiff })
                  .eq('id', item.product_id)
              }
            }
            
            await supabase
              .from("order_items")
              .update({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.line_total
              })
              .eq("id", item.id)
          }
        }
      }

      // 3. Update the main order
      const { error } = await supabase
        .from("sales_orders")
        .update({
          customer_name: editingOrder.customer_name,
          customer_phone: editingOrder.customer_phone,
          customer_email: editingOrder.customer_email,
          total_amount: editingOrder.total_amount,
          gst_amount: editingOrder.gst_amount,
          status: editingOrder.status,
        })
        .eq("id", editingOrder.id)

      if (error) throw error

      await sendNotification({
        actionType: "sale_updated",
        entityType: "order",
        entityId: editingOrder.id,
        message: `Order #${editingOrder.id.slice(-8)} updated by ${profile?.email || "team member"}`,
        ownerId,
        userId: user.id,
      })

      setEditingOrder(null)
      loadData()
      alert("Order updated successfully!")
    } catch (error: any) {
      alert("Error updating order: " + error.message)
    }
  }

  const handleBulkDeleteOrders = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedOrderIds.length} orders?`)) return
    
    try {
      const { error } = await supabase.from("sales_orders").delete().in("id", selectedOrderIds)
      if (error) throw error
      setSelectedOrderIds([])
      alert("Selected orders deleted successfully!")
      loadData()
    } catch (error: any) {
      alert("Error deleting orders: " + error.message)
    }
  }

  const toggleSelectAllOrders = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(orders.map(o => o.id))
    }
  }

  const toggleSelectOrder = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter(i => i !== id))
    } else {
      setSelectedOrderIds([...selectedOrderIds, id])
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return

    try {
      const { error } = await supabase.from("sales_orders").delete().eq("id", orderId)

      if (error) throw error

      // Real-time subscription will automatically reload data
    } catch (error: any) {
      alert("Error deleting order: " + error.message)
    }
  }
  const orderSharePayload = (order: any) => {
    const subtotal = (order.total_amount || 0) - (order.gst_amount || 0)
    const items = (order.order_items || []).map((item: any) => ({
      name: item.products?.name || "Item",
      qty: item.quantity,
      amount: item.line_total ?? item.unit_price * item.quantity,
    }))
    return {
      phone: order.customer_phone,
      businessName: profile?.company_name || "Our Store",
      invoiceNumber: `INV-${order.id.slice(-6).toUpperCase()}`,
      date: new Date(order.order_date).toLocaleDateString("en-IN"),
      items,
      subtotal,
      gstAmount: order.gst_amount || 0,
      total: order.total_amount || 0,
      upiId: profile?.branding_settings?.upi_id ?? null,
    }
  }

  const shareViaEmail = (order: any) => {
    const bizName = profile?.company_name || 'StartupSphere Business'
    const invoiceNo = `INV-${order.id.slice(-6).toUpperCase()}`
    
    const subject = `Invoice ${invoiceNo} from ${bizName}`
    const body = `Dear ${order.customer_name || 'Valued Customer'},\n\n` +
      `We are pleased to share the invoice for your recent purchase at ${bizName}.\n\n` +
      `INVOICE SUMMARY:\n` +
      `--------------------------------\n` +
      `Invoice Number: ${invoiceNo}\n` +
      `Order Date: ${new Date(order.order_date).toLocaleDateString('en-IN')}\n` +
      `Total Payable: ${formatPrice(order.total_amount)}\n` +
      `Payment Status: ${order.status?.toUpperCase()}\n` +
      `--------------------------------\n\n` +
      `You can view and download your full digital receipt here:\n` +
      `${window.location.origin}/receipt/${order.id}\n\n` +
      `Thank you for your business! If you have any questions, feel free to reach out to us.\n\n` +
      `Best Regards,\n` +
      `${bizName} Team\n` +
      `${profile?.address || ''}`

    const email = order.customer_email || ''
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(url, '_blank')
  }

  const [customerName, setCustomerName] = useState("")

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 animate-pulse">Syncing sales data...</p>
        </div>
      </div>
    )
  }

  if (!profile?.can_manage_sales) {
    return (
      <div className="p-4 sm:p-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-16 text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-slate-400 text-base max-w-md mx-auto">You don't have permission to manage sales. Please contact your administrator to request access.</p>
          <Button variant="outline" className="mt-8 border-slate-800 text-slate-400 hover:text-white" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const salePreview = selectedProduct
    ? {
        subtotal: selectedProduct.price * (Number.parseInt(saleFormData.quantity) || 0),
        gst:
          selectedProduct.price *
          (Number.parseInt(saleFormData.quantity) || 0) *
          (saleFormData.gstRate === "none" ? 0 : Number.parseFloat(saleFormData.gstRate) / 100),
        get total() {
          return this.subtotal + this.gst
        },
      }
    : { subtotal: 0, gst: 0, total: 0 }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${showPOS ? 'bg-blue-600 shadow-lg shadow-blue-900/40' : 'bg-slate-900 border border-slate-800'}`}>
            {showPOS ? <ShoppingCart className="w-6 h-6 text-white" /> : <Receipt className="w-6 h-6 text-blue-400" />}
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {showPOS ? "Point of Sale" : "Sales Management"}
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              {showPOS ? "Fast checkout for walk-in customers" : "Track orders, invoices and customer records"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOwner && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl">
               <Store className="w-4 h-4 text-blue-400" />
               <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                 <SelectTrigger className="w-[160px] h-8 border-0 bg-transparent text-white focus:ring-0 shadow-none">
                   <SelectValue placeholder="Branch" />
                 </SelectTrigger>
                 <SelectContent className="bg-slate-900 border-slate-800 text-white">
                   <SelectItem value="global">All Branches</SelectItem>
                   {locations.map((loc: any) => (
                     <SelectItem key={loc.id} value={loc.id}>
                       {loc.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
          )}
          <Button 
            onClick={() => setShowPOS(!showPOS)} 
            variant={showPOS ? "outline" : "default"}
            className={showPOS ? "border-slate-800 text-slate-300" : "bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/20"}
          >
            {showPOS ? (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                View All Orders
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                POS Mode
              </>
            )}
          </Button>
        </div>
      </div>

      {showPOS ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* POS Product Grid */}
          <div className="xl:col-span-8 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input 
                placeholder="Search products by name or SKU..." 
                className="pl-12 h-14 bg-slate-900/50 border-slate-800 text-white text-lg rounded-2xl focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
              {filteredProducts.map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => addToCart(p)}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="aspect-square bg-slate-800 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                    <Package className="w-10 h-10 text-slate-700 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-bold text-white text-sm truncate">{p.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-blue-400 font-bold">{formatPrice(p.price)}</p>
                    <p className="text-[10px] text-slate-500">Qty: {p.stock_quantity}</p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-blue-600 p-1.5 rounded-full">
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* POS Cart Sidebar */}
          <div className="xl:col-span-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh]">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-400" />
                  Current Cart
                </h2>
                <Badge className="bg-blue-600/20 text-blue-400 border-0">{cart.length} items</Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                    <ShoppingBag className="w-16 h-16 mb-4" />
                    <p className="text-lg font-medium">Your cart is empty</p>
                    <p className="text-sm">Add some products to get started</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-4 bg-slate-800/30 p-3 rounded-2xl border border-slate-800/50">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{item.product.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Input 
                            type="number"
                            value={item.customPrice}
                            onChange={(e) => updatePrice(item.product.id, Number(e.target.value))}
                            className="h-6 w-20 text-xs bg-slate-900 border-slate-700 text-blue-400"
                          />
                          <p className="text-xs text-slate-500 font-medium">x {item.quantity} = {formatPrice(item.customPrice * item.quantity)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1">
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-slate-950 border-t border-slate-800 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Subtotal</span>
                    <span>{formatPrice(calculateTotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>GST ({saleFormData.gstRate === "none" ? "0" : saleFormData.gstRate}%)</span>
                    <span>{formatPrice(calculateTotal() * (saleFormData.gstRate === "none" ? 0 : Number.parseFloat(saleFormData.gstRate) / 100))}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-black text-white pt-2 border-t border-slate-800">
                    <span>Total</span>
                    <span>{formatPrice(calculateTotal() * (1 + (saleFormData.gstRate === "none" ? 0 : Number.parseFloat(saleFormData.gstRate) / 100)))}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {isOwner && locations.length > 0 && (
                    <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                      <SelectTrigger className="w-full bg-slate-900 border-slate-800 text-white h-10">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {locations.length > 1 && (
                          <SelectItem value="global">Select a branch…</SelectItem>
                        )}
                        {locations.map((loc: { id: string; name: string }) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-end gap-2">
                      <VoiceInputButton onTranscript={handleVoiceSalesFill} size="sm" />
                      {voiceFormLoading && (
                        <span className="text-[10px] text-slate-500">🤖 Filling...</span>
                      )}
                    </div>
                    <Collapsible open={customerDetailsOpen} onOpenChange={setCustomerDetailsOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <span className="flex items-center gap-2 flex-wrap">
                          <User className="w-4 h-4 text-blue-400" />
                          Customer details
                          {(saleFormData.customerName ||
                            saleFormData.customerPhone ||
                            saleFormData.customerEmail ||
                            saleFormData.customerAddress) && (
                            <span className="text-[10px] bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded">
                              filled
                            </span>
                          )}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-500 transition-transform ${customerDetailsOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3 space-y-3">
                      <div>
                        <Label className="text-xs text-slate-500 mb-1 block">Customer name</Label>
                        <Input
                          placeholder="Walk-in or customer name"
                          className="bg-slate-950 border-slate-800 h-10 text-sm"
                          value={saleFormData.customerName}
                          onChange={(e) =>
                            setSaleFormData({ ...saleFormData, customerName: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-green-500" />
                          WhatsApp / mobile
                        </Label>
                        <Input
                          type="tel"
                          placeholder="10-digit mobile (e.g. 9876543210)"
                          className="bg-slate-950 border-slate-800 h-10 text-sm"
                          value={saleFormData.customerPhone}
                          onChange={(e) =>
                            setSaleFormData({
                              ...saleFormData,
                              customerPhone: e.target.value.replace(/\D/g, "").slice(0, 12),
                            })
                          }
                        />
                        {saleFormData.customerPhone &&
                          !INDIAN_PHONE_REGEX.test(saleFormData.customerPhone.replace(/\D/g, "").slice(-10)) && (
                            <p className="text-[10px] text-amber-500 mt-1">
                              Enter a valid 10-digit Indian mobile for WhatsApp share
                            </p>
                          )}
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                          <Mail className="w-3 h-3 text-blue-400" />
                          Email
                        </Label>
                        <Input
                          type="email"
                          placeholder="customer@email.com"
                          className="bg-slate-950 border-slate-800 h-10 text-sm"
                          value={saleFormData.customerEmail}
                          onChange={(e) =>
                            setSaleFormData({ ...saleFormData, customerEmail: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 mb-1 block">Address (optional)</Label>
                        <Input
                          placeholder="Delivery / billing address"
                          className="bg-slate-950 border-slate-800 h-10 text-sm"
                          value={saleFormData.customerAddress}
                          onChange={(e) =>
                            setSaleFormData({ ...saleFormData, customerAddress: e.target.value })
                          }
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={saleFormData.gstRate}
                      onChange={(e) => setSaleFormData({ ...saleFormData, gstRate: e.target.value })}
                      className="bg-slate-900 border border-slate-800 rounded-lg text-xs px-3 h-10 text-white"
                    >
                      <option value="none">No GST</option>
                      <option value="12">12% GST</option>
                      <option value="18">18% GST</option>
                      <option value="28">28% GST</option>
                    </select>
                    <Button 
                      type="button"
                      disabled={cart.length === 0 || checkoutLoading}
                      onClick={handleCheckout}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 shadow-lg shadow-blue-900/40"
                    >
                      {checkoutLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      {checkoutLoading ? "Processing…" : "Checkout"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          {showCreateSale && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 flex-wrap">
                <Plus className="w-5 h-5 text-blue-400" />
                Quick Sale (Inventory)
                <VoiceInputButton onTranscript={handleVoiceSalesFill} size="sm" />
                {voiceFormLoading && (
                  <span className="text-xs text-slate-400 font-normal flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    🤖 Filling form...
                  </span>
                )}
              </h3>
              <form onSubmit={handleCreateSaleFromInventory} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                <div className="lg:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 h-12 focus:border-blue-500 transition-colors"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.stock_quantity}) - {formatPrice(p.price)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={saleFormData.quantity}
                    onChange={(e) => setSaleFormData({ ...saleFormData, quantity: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-12 rounded-xl"
                  />
                </div>
                <div>
                  <Button type="submit" disabled={!selectedProductId} className="w-full h-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20 rounded-xl font-bold">
                    Create Sale
                  </Button>
                </div>
              </form>
            </div>
          )}

          {selectedOrderIds.length > 0 && (
            <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-2xl flex justify-between items-center animate-in slide-in-from-top-2 duration-300">
               <p className="text-red-400 text-sm font-bold flex items-center gap-2">
                 <AlertCircle className="w-4 h-4" />
                 {selectedOrderIds.length} orders selected
               </p>
               <Button 
                onClick={handleBulkDeleteOrders}
                variant="destructive" 
                size="sm"
                className="bg-red-600 hover:bg-red-700"
               >
                 <Trash2 className="w-4 h-4 mr-2" />
                 Delete Permanently
               </Button>
            </div>
          )}

          <Card className="bg-slate-900 border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-white">Order History</h2>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input 
                    placeholder="Filter orders..." 
                    className="pl-10 bg-slate-950 border-slate-800 h-10 w-full md:w-64 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            {orders.length === 0 ? (
              <Empty className="py-12 bg-slate-900 border-none">
                <EmptyHeader>
                  <EmptyTitle className="text-white">No orders yet</EmptyTitle>
                  <EmptyDescription className="text-slate-400">Switch to POS mode to create your first sale</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => setShowPOS(true)} className="bg-blue-600 hover:bg-blue-700 text-white border-none">Open POS</Button>
                </EmptyContent>
              </Empty>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800">
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">
                          <input type="checkbox" checked={selectedOrderIds.length === orders.length && orders.length > 0} onChange={toggleSelectAllOrders} className="w-5 h-5 rounded-lg border-slate-800 bg-slate-950 accent-blue-600" />
                        </th>
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Customer</th>
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="p-6">
                            <input type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={() => toggleSelectOrder(order.id)} className="w-5 h-5 rounded-lg border-slate-800 bg-slate-950 accent-blue-600" />
                          </td>
                          <td className="p-6">
                            <p className="text-white font-bold text-sm">{new Date(order.order_date).toLocaleDateString("en-IN")}</p>
                            <p className="text-[10px] text-slate-500 mt-1">{new Date(order.order_date).toLocaleTimeString("en-IN", {timeStyle: 'short'})}</p>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-blue-400">{order.customer_name?.[0] || "W"}</div>
                              <div>
                                <p className="text-sm font-bold text-white">{order.customer_name || "Walk-in Customer"}</p>
                                <p className="text-[10px] text-slate-500">{order.customer_phone || "No contact"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <p className="text-white font-black text-sm">{formatPrice(order.total_amount)}</p>
                            <p className="text-[10px] text-emerald-500/80 font-bold">GST: {formatPrice(order.gst_amount)}</p>
                          </td>
                          <td className="p-6">
                            <span className="inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{order.status}</span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <InvoiceShareButton payload={orderSharePayload(order)} size="icon" className="flex items-center justify-center text-green-500 hover:text-green-400 p-0 w-9 h-9" />
                              <Button variant="ghost" size="icon" onClick={() => shareViaEmail(order)} className="w-9 h-9 text-blue-400 hover:bg-blue-400/10 rounded-xl"><Mail className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => setEditingOrder(order)} className="w-9 h-9 text-slate-400 hover:bg-slate-800 rounded-xl"><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteOrder(order.id)} className="w-9 h-9 text-red-400 hover:bg-red-500/10 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Order Cards */}
                <div className="md:hidden space-y-3 p-3">
                  {orders.map((order) => (
                    <div key={order.id} className={`bg-slate-800/40 border rounded-xl p-4 transition-colors ${selectedOrderIds.includes(order.id) ? 'border-blue-500/50 bg-blue-900/10' : 'border-slate-800'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={() => toggleSelectOrder(order.id)} className="w-5 h-5 mt-0.5 rounded border-slate-700 bg-slate-800 accent-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{order.customer_name || "Walk-in Customer"}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{new Date(order.order_date).toLocaleDateString("en-IN")} · {new Date(order.order_date).toLocaleTimeString("en-IN", {timeStyle: 'short'})}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-white font-bold">{formatPrice(order.total_amount)}</p>
                          <span className="inline-flex px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-emerald-500/10 text-emerald-500 mt-0.5">{order.status}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-700/50">
                        <InvoiceShareButton payload={orderSharePayload(order)} size="icon" className="flex items-center justify-center text-green-500 p-0 w-9 h-9" />
                        <Button variant="ghost" size="icon" onClick={() => shareViaEmail(order)} className="w-9 h-9 text-blue-400"><Mail className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingOrder(order)} className="w-9 h-9 text-slate-400"><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteOrder(order.id)} className="w-9 h-9 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* Editing Modal Upgrade */}
      <Drawer open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DrawerContent className="bg-slate-900 border-slate-800 text-white max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Edit Order</DrawerTitle>
            <DrawerDescription className="text-slate-400">
              {editingOrder ? `Order ID: #${editingOrder.id.slice(-8).toUpperCase()}` : ''}
            </DrawerDescription>
          </DrawerHeader>

          {editingOrder && (
            <div className="px-4 pb-4 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Customer Details</label>
                  <Input
                    value={editingOrder.customer_name}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customer_name: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-12 rounded-xl"
                    placeholder="Customer Name"
                  />
                </div>
                <div>
                  <Input
                    value={editingOrder.customer_phone || ""}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customer_phone: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-12 rounded-xl"
                    placeholder="WhatsApp Number"
                  />
                </div>
                <div>
                  <Input
                    value={editingOrder.customer_email || ""}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customer_email: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-12 rounded-xl"
                    placeholder="Email Address"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Order Items</label>
                <div className="space-y-3">
                  {editingOrder.order_items?.map((item: any, idx: number) => (
                    <div key={item.id || idx} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <select
                          value={item.product_id}
                          onChange={(e) => {
                            const newProdId = e.target.value
                            const newProd = products.find(p => p.id === newProdId)
                            if (!newProd) return
                            const newItems = [...editingOrder.order_items]
                            newItems[idx] = { ...item, product_id: newProdId, unit_price: newProd.price, line_total: newProd.price * item.quantity, products: { name: newProd.name } }
                            const subtotal = newItems.reduce((sum: number, i: any) => sum + i.line_total, 0)
                            const gst = subtotal * 0.18
                            setEditingOrder({ ...editingOrder, order_items: newItems, total_amount: subtotal + gst, gst_amount: gst })
                          }}
                          className="bg-transparent text-sm font-bold text-white focus:outline-none flex-1"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                          ))}
                        </select>
                        <p className="text-xs font-bold text-blue-400 shrink-0 ml-2">{formatPrice(item.line_total)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1">
                          <button 
                            onClick={() => {
                              const newQty = Math.max(1, item.quantity - 1)
                              const newItems = [...editingOrder.order_items]
                              newItems[idx] = { ...item, quantity: newQty, line_total: item.unit_price * newQty }
                              const subtotal = newItems.reduce((sum: number, i: any) => sum + i.line_total, 0)
                              const gst = subtotal * 0.18
                              setEditingOrder({ ...editingOrder, order_items: newItems, total_amount: subtotal + gst, gst_amount: gst })
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400"
                          >-</button>
                          <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => {
                              const newQty = item.quantity + 1
                              const newItems = [...editingOrder.order_items]
                              newItems[idx] = { ...item, quantity: newQty, line_total: item.unit_price * newQty }
                              const subtotal = newItems.reduce((sum: number, i: any) => sum + i.line_total, 0)
                              const gst = subtotal * 0.18
                              setEditingOrder({ ...editingOrder, order_items: newItems, total_amount: subtotal + gst, gst_amount: gst })
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded-lg text-slate-400"
                          >+</button>
                        </div>
                        <p className="text-[10px] text-slate-500">Unit: {formatPrice(item.unit_price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Order Status</label>
                <select
                  value={editingOrder.status}
                  onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 h-12"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">New Total</p>
                  <p className="text-2xl font-black text-white">{formatPrice(editingOrder.total_amount)}</p>
                </div>
                <Button onClick={handleEditOrder} className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-2xl font-bold shadow-xl shadow-blue-900/20 w-full sm:w-auto">
                  Update Order
                </Button>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}


