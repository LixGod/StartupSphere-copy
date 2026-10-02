"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useBranch } from "@/components/providers/branch-provider"
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
import { PaymentSheet } from "@/components/ui/payment-sheet"
import { CustomerSearch } from "@/components/ui/customer-search"
import { upsertCustomer } from "@/lib/api/customers"
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
  const { isOwner, can } = usePermissions()
  const { activeBranchId } = useBranch()
  const canViewSales = isOwner || can('can_view_sales')
  const canCreateSales = isOwner || can('can_create_sales')
  const [selectedLocationId, setSelectedLocationId] = useState<string>("global")
  const [locations, setLocations] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateSale, setShowCreateSale] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [paymentSheetState, setPaymentSheetState] = useState<{ open: boolean; order: any | null }>({
    open: false,
    order: null,
  })
  const [saleFormData, setSaleFormData] = useState({
    quantity: "1",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    gstRate: "18",
  })
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [showPOS, setShowPOS] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<{ product: any; quantity: number; customPrice: number }[]>([])
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const { isLoading: voiceFormLoading, fillForm } = useVoiceFormFill()
  const supabaseRef = useRef(createClient())
  const router = useRouter()

  const resolveCheckoutLocationId = (): string | null | undefined => {
    if (selectedLocationId !== "global") return selectedLocationId
    if (locations.length === 1) return locations[0].id
    if (locations.length === 0) return null
    return undefined
  }

  useEffect(() => {
    const urlLocId = new URLSearchParams(window.location.search).get("locationId")
    let targetLocation = selectedLocationId

    if (urlLocId && urlLocId !== selectedLocationId) {
      targetLocation = urlLocId
      setSelectedLocationId(urlLocId)
    } else if (activeBranchId && selectedLocationId !== activeBranchId && selectedLocationId !== "global") {
      targetLocation = activeBranchId
      setSelectedLocationId(activeBranchId)
    }

    loadData(targetLocation)
    fetchLocations()

    const channel = supabaseRef.current
      .channel("sales-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales_orders" }, () => {
        loadData(targetLocation)
      })
      .subscribe()

    return () => {
      supabaseRef.current.removeChannel(channel)
    }
  }, [activeBranchId, selectedLocationId])

  const fetchLocations = async () => {
    const {
      data: { user },
    } = await supabaseRef.current.auth.getUser()
    if (!user) return
    const { data: profileData } = await supabaseRef.current.from("profiles").select("*").eq("id", user.id).single()
    const ownerId = profileData?.role === "owner" ? user.id : profileData?.owner_id
    const { data } = await supabaseRef.current.from("locations").select("*").eq("owner_id", ownerId)
    const locs = data || []
    setLocations(locs)
    if (locs.length === 1) {
      setSelectedLocationId((current) => (current === "global" ? locs[0].id : current))
    }
  }

  const loadData = async (branchFilter?: string) => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabaseRef.current.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profileData } = await supabaseRef.current.from("profiles").select("*").eq("id", user.id).single()
      setProfile(profileData)

      const ownerId = profileData?.role === "owner" ? user.id : profileData?.owner_id
      if (!ownerId) {
        setLoading(false)
        return
      }

      const filterToUse = branchFilter ?? selectedLocationId

      let ordersQuery = supabaseRef.current
        .from("sales_orders")
        .select("*, order_items(*, products(name))")
        .eq("owner_id", ownerId)
        .order("order_date", { ascending: false })
      
      if (filterToUse && filterToUse !== "global") {
        ordersQuery = ordersQuery.eq("location_id", filterToUse)
      }

      let productsQuery = supabaseRef.current.from("products").select("*").eq("owner_id", ownerId).gt("stock_quantity", 0)
      if (filterToUse && filterToUse !== "global") {
        // Show products assigned to this branch OR global products (no branch set).
        // Products assigned to a DIFFERENT branch will NOT appear here.
        productsQuery = productsQuery.or(`location_id.eq.${filterToUse},location_id.is.null`)
      }

      const [ordersRes, productsRes] = await Promise.all([
        ordersQuery,
        productsQuery
      ])

      setOrders(ordersRes.data || [])
      setProducts(productsRes.data || [])
    } catch (err) {
      console.error("Sales load error:", err)
      toast.error("Failed to load sales data")
    } finally {
      setLoading(false)
    }
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
    return cart.reduce((sum, item) => {
      const itemPrice = item.customPrice ?? item.product?.price ?? 0
      return sum + itemPrice * item.quantity
    }, 0)
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
    } = await supabaseRef.current.auth.getUser()
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
      // Auto-save or update customer contact profile
      let savedCustId: string | undefined = undefined
      if (saleFormData.customerName && saleFormData.customerName !== "Walk-in Customer") {
        try {
          const savedCust = await upsertCustomer({
            owner_id: ownerId,
            name: saleFormData.customerName,
            phone: saleFormData.customerPhone,
            email: saleFormData.customerEmail,
            address: saleFormData.customerAddress,
            amountToAdd: total + gstAmount,
          })
          if (savedCust?.id) savedCustId = savedCust.id
        } catch (cErr) {
          console.error("Auto customer save error:", cErr)
        }
      }

      // 1. Create the main order (Automation: will create invoice)
      const noteParts: string[] = []
      if (saleFormData.customerAddress.trim()) {
        noteParts.push(`Address: ${saleFormData.customerAddress.trim()}`)
      }

      const order = await createOrder({
        owner_id: ownerId,
        customer_id: savedCustId,
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
            location_id: locationId ?? null,
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
    } = await supabaseRef.current.auth.getUser()
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
          location_id: locationId ?? null,
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

  const moveToTrash = async (order: any, reason: string) => {
    try {
      const ownerId = profile?.role === "owner" ? profile?.id : profile?.owner_id
      await supabaseRef.current.from("bill_trash").insert({
        owner_id: ownerId,
        category: "sales",
        order_id: order.id,
        invoice_number: `INV-${order.id.slice(-6).toUpperCase()}`,
        customer_name: order.customer_name || "Walk-in Customer",
        customer_phone: order.customer_phone || "",
        total_amount: order.total_amount,
        order_date: order.order_date,
        reason,
        original_data: order,
        trashed_at: new Date().toISOString()
      })
    } catch (err) {
      console.warn("Could not save bill to trash:", err)
    }
  }

  const handleEditOrder = async () => {
    if (!editingOrder) return

    try {
      const {
        data: { user },
      } = await supabaseRef.current.auth.getUser()
      if (!user) return

      const ownerId = profile?.role === "owner" ? user.id : profile?.owner_id

      // 1. Fetch original items to reconcile stock
      const { data: originalItems } = await supabaseRef.current
        .from("order_items")
        .select("*")
        .eq("order_id", editingOrder.id)

      // Check if status is transitioning to cancelled or refunded from an active status, or vice-versa
      const wasAlreadyCancelledOrRefunded = editingOrder.originalStatus === "cancelled" || editingOrder.originalStatus === "refunded"
      const isBecomingCancelledOrRefunded = (editingOrder.status === "cancelled" || editingOrder.status === "refunded") && !wasAlreadyCancelledOrRefunded
      const isReactivatingFromCancelled = wasAlreadyCancelledOrRefunded && (editingOrder.status === "completed" || editingOrder.status === "pending")
      
      if (isBecomingCancelledOrRefunded) {
        // Restore stock for all items ONCE on transition to cancelled/refunded
        if (originalItems && originalItems.length > 0) {
          for (const item of originalItems) {
            try {
              await supabaseRef.current.rpc("reconcile_order_item_stock", {
                p_product_id: item.product_id,
                p_delta: item.quantity,
              })
            } catch (stockErr) {
              console.warn("Stock restoration failed for refunded/cancelled item:", stockErr)
            }
          }
        }
        // Move to trash
        await moveToTrash(editingOrder, `Order ${editingOrder.status}`)
      } else if (isReactivatingFromCancelled) {
        // Transition from cancelled/refunded -> completed/pending: re-deduct product stock (-qty)
        if (originalItems && originalItems.length > 0) {
          for (const item of originalItems) {
            try {
              await supabaseRef.current.rpc("reconcile_order_item_stock", {
                p_product_id: item.product_id,
                p_delta: -item.quantity,
              })
            } catch (stockErr) {
              console.warn("Stock re-deduction failed on reactivating order:", stockErr)
            }
          }
        }
      }

      // 2. Update each item and reconcile stock via SECURITY DEFINER RPC
      if (editingOrder.order_items && !isBecomingCancelledOrRefunded && !wasAlreadyCancelledOrRefunded) {
        for (const item of editingOrder.order_items) {
          const original = originalItems?.find((oi: any) => oi.id === item.id)
          
          if (original) {
            // Reconcile stock: Add back original qty, subtract new qty
            const qtyDiff = original.quantity - item.quantity
            if (qtyDiff !== 0) {
              try {
                await supabaseRef.current.rpc("reconcile_order_item_stock", {
                  p_product_id: item.product_id,
                  p_delta: qtyDiff,
                })
              } catch (stockErr) {
                console.warn("Stock reconciliation warning:", stockErr)
              }
            }
            
            await supabaseRef.current
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

      // 3. Upsert customer and update main order
      let updatedCustomerId = editingOrder.customer_id
      if (editingOrder.customer_name && editingOrder.customer_name !== "Walk-in Customer") {
        try {
          const cust = await upsertCustomer({
            owner_id: ownerId,
            name: editingOrder.customer_name,
            phone: editingOrder.customer_phone,
            email: editingOrder.customer_email,
            address: editingOrder.customer_address,
          })
          if (cust?.id) updatedCustomerId = cust.id
        } catch (cErr) {
          console.error("Customer update error on edit order:", cErr)
        }
      }

      const { error } = await supabaseRef.current
        .from("sales_orders")
        .update({
          customer_id: updatedCustomerId,
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
        message: `Order #${editingOrder.id.slice(-8)} updated to ${editingOrder.status} by ${profile?.email || "team member"}`,
        ownerId,
        userId: user.id,
      })

      setEditingOrder(null)
      loadData()
      toast.success(isNowCancelledOrRefunded ? `Order status updated to ${editingOrder.status}, stock restored & moved to Trash.` : "Order updated successfully!")
    } catch (error: any) {
      toast.error("Error updating order: " + error.message)
    }
  }

  const handleBulkDeleteOrders = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedOrderIds.length} orders?`)) return
    
    try {
      for (const id of selectedOrderIds) {
        const targetOrder = orders.find((o) => o.id === id)
        if (targetOrder) {
          await moveToTrash(targetOrder, "Order deleted")
        }
      }

      const { error } = await supabaseRef.current.from("sales_orders").delete().in("id", selectedOrderIds)
      if (error) throw error
      setSelectedOrderIds([])
      toast.success("Selected orders deleted, moved to Trash, and stock restored.")
      loadData()
    } catch (error: any) {
      toast.error("Error deleting orders: " + error.message)
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
      const targetOrder = orders.find((o) => o.id === orderId)
      if (targetOrder) {
        await moveToTrash(targetOrder, "Order deleted")
      }

      const { error } = await supabaseRef.current.from("sales_orders").delete().eq("id", orderId)

      if (error) throw error
      toast.success("Order deleted, moved to Trash, and stock restored.")
      loadData()
    } catch (error: any) {
      toast.error("Error deleting order: " + error.message)
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

  if (!canViewSales) {
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
            disabled={!canCreateSales && !showPOS}
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
                        <Label className="text-xs text-slate-500 mb-1 block">Customer name (Auto-search saved contacts)</Label>
                        <CustomerSearch
                          ownerId={profile?.role === "owner" ? profile?.id : profile?.owner_id}
                          value={saleFormData.customerName}
                          onChange={(val) => {
                            setSaleFormData({ ...saleFormData, customerName: val })
                            if (!val) setSelectedCustomer(null)
                          }}
                          onSelect={(c) => {
                            setSelectedCustomer(c)
                            setSaleFormData({
                              ...saleFormData,
                              customerName: c.name,
                              customerPhone: c.phone || "",
                              customerEmail: c.email || "",
                              customerAddress: c.address || "",
                            })
                          }}
                        />
                      </div>
                      {selectedCustomer && selectedCustomer.outstanding_balance > 0 && (
                        <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-2.5 text-xs text-red-300 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-red-200">Customer Ledger Alert:</span>
                            <p className="mt-0.5">
                              Has unpaid balance: <strong className="text-red-400 font-bold">₹{Number(selectedCustomer.outstanding_balance).toLocaleString('en-IN')}</strong>.
                            </p>
                          </div>
                        </div>
                      )}
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

          {/* Payment Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Sales</p>
              <p className="text-2xl font-black text-white mt-1">
                {formatPrice(orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0))}
              </p>
            </div>
            <div className="bg-slate-900 border border-emerald-900/40 p-5 rounded-2xl">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Collected</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {formatPrice(orders.reduce((sum, o) => sum + (Number(o.amount_paid) || 0), 0))}
              </p>
            </div>
            <div className="bg-slate-900 border border-amber-900/40 p-5 rounded-2xl">
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-black text-amber-500 mt-1">
                {formatPrice(orders.reduce((sum, o) => sum + (Number(o.balance_due) ?? Math.max(0, Number(o.total_amount) - (Number(o.amount_paid) || 0))), 0))}
              </p>
            </div>
            <div className="bg-slate-900 border border-rose-900/40 p-5 rounded-2xl">
              <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Overdue</p>
              <p className="text-2xl font-black text-rose-500 mt-1">
                {orders.filter((o) => {
                  const isPaid = o.payment_status === "paid" || (o.balance_due <= 0 && o.amount_paid > 0)
                  const orderDate = new Date(o.order_date).getTime()
                  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
                  return !isPaid && orderDate < thirtyDaysAgo
                }).length} orders
              </p>
            </div>
          </div>

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
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Items</th>
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Payment</th>
                        <th className="p-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {orders.map((order) => {
                        const amountPaid = Number(order.amount_paid) || 0
                        const totalAmt = Number(order.total_amount) || 0
                        const balDue = order.balance_due !== undefined && order.balance_due !== null ? Number(order.balance_due) : Math.max(0, totalAmt - amountPaid)
                        const isFullyPaid = order.payment_status === 'paid' || (balDue <= 0 && amountPaid > 0)
                        const isPartial = order.payment_status === 'partial' || (amountPaid > 0 && balDue > 0)

                        return (
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
                            <td className="p-6 max-w-[180px]">
                              {(order.order_items || []).length === 0 ? (
                                <p className="text-xs text-slate-600 italic">—</p>
                              ) : (
                                <div className="space-y-1">
                                  {(order.order_items || []).slice(0, 3).map((item: any, i: number) => (
                                    <p key={i} className="text-xs text-slate-300 truncate">
                                      <span className="font-bold text-white">{item.quantity}×</span>{" "}
                                      {item.product_name || item.products?.name || "Deleted item"}
                                    </p>
                                  ))}
                                  {(order.order_items || []).length > 3 && (
                                    <p className="text-[10px] text-slate-500">+{(order.order_items || []).length - 3} more</p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-6">
                              <p className="text-white font-black text-sm">{formatPrice(order.total_amount)}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Paid: {formatPrice(amountPaid)} | Due: {formatPrice(balDue)}</p>
                            </td>
                            <td className="p-6">
                              {order.status === "completed" || !order.status ? (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold">Completed</Badge>
                              ) : order.status === "cancelled" ? (
                                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold">Cancelled</Badge>
                              ) : order.status === "refunded" ? (
                                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-bold">Refunded</Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold">Pending</Badge>
                              )}
                            </td>
                            <td className="p-6">
                              {isFullyPaid ? (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold">Paid ✓</Badge>
                              ) : isPartial ? (
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold">Partial {formatPrice(amountPaid)} paid</Badge>
                              ) : (
                                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold">Unpaid</Badge>
                              )}
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-2">
                                {!isFullyPaid && order.status !== 'cancelled' && order.status !== 'refunded' && (
                                  <Button
                                    size="sm"
                                    onClick={() => setPaymentSheetState({ open: true, order })}
                                    className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 h-8 text-xs font-bold px-2.5 transition-all"
                                  >
                                    💰 Record Payment
                                  </Button>
                                )}
                                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                  <InvoiceShareButton payload={orderSharePayload(order)} size="icon" className="flex items-center justify-center text-green-500 hover:text-green-400 p-0 w-9 h-9" />
                                  <Button variant="ghost" size="icon" onClick={() => shareViaEmail(order)} className="w-9 h-9 text-blue-400 hover:bg-blue-400/10 rounded-xl"><Mail className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => setEditingOrder({ ...order, originalStatus: order.status })} className="w-9 h-9 text-slate-400 hover:bg-slate-800 rounded-xl"><Edit className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteOrder(order.id)} className="w-9 h-9 text-red-400 hover:bg-red-500/10 rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Order Cards */}
                <div className="md:hidden space-y-3 p-3">
                  {orders.map((order) => {
                    const amountPaid = Number(order.amount_paid) || 0
                    const totalAmt = Number(order.total_amount) || 0
                    const balDue = order.balance_due !== undefined && order.balance_due !== null ? Number(order.balance_due) : Math.max(0, totalAmt - amountPaid)
                    const isFullyPaid = order.payment_status === 'paid' || (balDue <= 0 && amountPaid > 0)
                    const isPartial = order.payment_status === 'partial' || (amountPaid > 0 && balDue > 0)

                    return (
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
                            <div className="mt-1">
                              {isFullyPaid ? (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-bold">Paid ✓</Badge>
                              ) : isPartial ? (
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] font-bold">Partial {formatPrice(amountPaid)} paid</Badge>
                              ) : (
                                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px] font-bold">Unpaid</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-700/50">
                          <div>
                            {!isFullyPaid && order.status !== 'cancelled' && order.status !== 'refunded' && (
                              <Button
                                size="sm"
                                onClick={() => setPaymentSheetState({ open: true, order })}
                                className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 h-8 text-xs font-bold px-2.5"
                              >
                                💰 Record Payment
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <InvoiceShareButton payload={orderSharePayload(order)} size="icon" className="flex items-center justify-center text-green-500 p-0 w-9 h-9" />
                            <Button variant="ghost" size="icon" onClick={() => shareViaEmail(order)} className="w-9 h-9 text-blue-400"><Mail className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditingOrder({ ...order, originalStatus: order.status })} className="w-9 h-9 text-slate-400"><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteOrder(order.id)} className="w-9 h-9 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
              {/* Customer Details */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Customer Details</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="col-span-1 md:col-span-2">
                    <Input value={editingOrder.customer_name || ""} onChange={(e) => setEditingOrder({ ...editingOrder, customer_name: e.target.value })} className="bg-slate-950 border-slate-800 h-11 rounded-xl" placeholder="Customer Name" />
                  </div>
                  <Input value={editingOrder.customer_phone || ""} onChange={(e) => setEditingOrder({ ...editingOrder, customer_phone: e.target.value })} className="bg-slate-950 border-slate-800 h-11 rounded-xl" placeholder="Phone / WhatsApp" />
                  <Input value={editingOrder.customer_email || ""} onChange={(e) => setEditingOrder({ ...editingOrder, customer_email: e.target.value })} className="bg-slate-950 border-slate-800 h-11 rounded-xl" placeholder="Email Address" />
                  <div className="col-span-1 md:col-span-2">
                    <Input value={editingOrder.notes || ""} onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })} className="bg-slate-950 border-slate-800 h-11 rounded-xl" placeholder="Delivery address / Notes" />
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Items</label>
                  <button
                    onClick={() => {
                      const firstProd = products[0]
                      if (!firstProd) return
                      const newItem = { id: null, product_id: firstProd.id, product_name: firstProd.name, products: { name: firstProd.name }, quantity: 1, unit_price: firstProd.price, line_total: firstProd.price, _new: true }
                      const newItems = [...(editingOrder.order_items || []), newItem]
                      const sub = newItems.reduce((s: number, i: any) => s + i.line_total, 0)
                      const gr = editingOrder._gstRate ?? 0.18
                      setEditingOrder({ ...editingOrder, order_items: newItems, total_amount: sub + sub * gr, gst_amount: sub * gr })
                    }}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-all"
                  >+ Add Item</button>
                </div>
                <div className="space-y-3">
                  {(editingOrder.order_items || []).map((item: any, idx: number) => (
                    <div key={item.id || idx} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={item.product_id || ""}
                          onChange={(e) => {
                            const newProd = products.find(p => p.id === e.target.value)
                            if (!newProd) return
                            const newItems = [...editingOrder.order_items]
                            newItems[idx] = { ...item, product_id: newProd.id, product_name: newProd.name, unit_price: newProd.price, line_total: newProd.price * item.quantity, products: { name: newProd.name } }
                            const sub = newItems.reduce((s: number, i: any) => s + i.line_total, 0)
                            const gr = editingOrder._gstRate ?? 0.18
                            setEditingOrder({ ...editingOrder, order_items: newItems, total_amount: sub + sub * gr, gst_amount: sub * gr })
                          }}
                          className="bg-slate-900 border border-slate-700 text-sm font-bold text-white rounded-lg px-3 h-9 flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {!item.product_id && <option value="" className="bg-slate-900 text-slate-400">{item.product_name || "Deleted product"}</option>}
                          {products.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                        </select>
                        <button
                          onClick={() => {
                            const newItems = editingOrder.order_items.filter((_: any, i: number) => i !== idx)
                            const sub = newItems.reduce((s: number, i: any) => s + i.line_total, 0)
                            const gr = editingOrder._gstRate ?? 0.18
                            setEditingOrder({ ...editingOrder, order_items: newItems, total_amount: sub + sub * gr, gst_amount: sub * gr })
                          }}
                          className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                        >✕</button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-900 rounded-lg px-1 py-1 shrink-0">
                          <button onClick={() => { const q = Math.max(1, item.quantity - 1); const ni = [...editingOrder.order_items]; ni[idx] = { ...item, quantity: q, line_total: item.unit_price * q }; const sub = ni.reduce((s: number, i: any) => s + i.line_total, 0); const gr = editingOrder._gstRate ?? 0.18; setEditingOrder({ ...editingOrder, order_items: ni, total_amount: sub + sub * gr, gst_amount: sub * gr }) }} className="w-8 h-7 flex items-center justify-center hover:bg-slate-800 rounded-md text-slate-400 font-bold">−</button>
                          <span className="text-sm font-bold w-8 text-center text-white">{item.quantity}</span>
                          <button onClick={() => { const q = item.quantity + 1; const ni = [...editingOrder.order_items]; ni[idx] = { ...item, quantity: q, line_total: item.unit_price * q }; const sub = ni.reduce((s: number, i: any) => s + i.line_total, 0); const gr = editingOrder._gstRate ?? 0.18; setEditingOrder({ ...editingOrder, order_items: ni, total_amount: sub + sub * gr, gst_amount: sub * gr }) }} className="w-8 h-7 flex items-center justify-center hover:bg-slate-800 rounded-md text-slate-400 font-bold">+</button>
                        </div>
                        <div className="flex items-center gap-1.5 flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 h-9">
                          <span className="text-xs text-slate-500">₹</span>
                          <input type="number" min="0" step="0.01" value={item.unit_price}
                            onChange={(e) => { const p2 = parseFloat(e.target.value) || 0; const ni = [...editingOrder.order_items]; ni[idx] = { ...item, unit_price: p2, line_total: p2 * item.quantity }; const sub = ni.reduce((s: number, i: any) => s + i.line_total, 0); const gr = editingOrder._gstRate ?? 0.18; setEditingOrder({ ...editingOrder, order_items: ni, total_amount: sub + sub * gr, gst_amount: sub * gr }) }}
                            className="bg-transparent text-sm text-white w-full focus:outline-none" placeholder="Unit price" />
                        </div>
                        <p className="text-sm font-bold text-blue-400 shrink-0 w-20 text-right">{formatPrice(item.line_total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GST + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">GST Rate</label>
                  <select value={String(editingOrder._gstRate ?? 0.18)} onChange={(e) => { const gr = parseFloat(e.target.value); const sub = (editingOrder.order_items || []).reduce((s: number, i: any) => s + i.line_total, 0); setEditingOrder({ ...editingOrder, _gstRate: gr, gst_amount: sub * gr, total_amount: sub + sub * gr }) }} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 h-11 text-sm">
                    <option value="0">No GST (0%)</option>
                    <option value="0.05">5% GST</option>
                    <option value="0.12">12% GST</option>
                    <option value="0.18">18% GST</option>
                    <option value="0.28">28% GST</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
                  <select value={editingOrder.status} onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 h-11 text-sm">
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>

              {/* Total + Save */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Subtotal: {formatPrice((editingOrder.order_items || []).reduce((s: number, i: any) => s + i.line_total, 0))}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">GST: {formatPrice(editingOrder.gst_amount || 0)}</p>
                  <p className="text-2xl font-black text-white">Total: {formatPrice(editingOrder.total_amount)}</p>
                </div>
                <Button onClick={handleEditOrder} className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-2xl font-bold shadow-xl shadow-blue-900/20 w-full sm:w-auto">
                  Update Order
                </Button>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
      {/* Payment Sheet */}
      {paymentSheetState.order && (
        <PaymentSheet
          open={paymentSheetState.open}
          onOpenChange={(open) => setPaymentSheetState((prev) => ({ ...prev, open }))}
          referenceType="sale"
          referenceId={paymentSheetState.order.id}
          title={`Order #${paymentSheetState.order.id.slice(-6).toUpperCase()}`}
          customerOrVendorName={paymentSheetState.order.customer_name || 'Walk-in Customer'}
          totalAmount={Number(paymentSheetState.order.total_amount) || 0}
          amountPaid={Number(paymentSheetState.order.amount_paid) || 0}
          balanceDue={paymentSheetState.order.balance_due !== undefined && paymentSheetState.order.balance_due !== null ? Number(paymentSheetState.order.balance_due) : Math.max(0, (Number(paymentSheetState.order.total_amount) || 0) - (Number(paymentSheetState.order.amount_paid) || 0))}
          ownerId={paymentSheetState.order.owner_id}
          onPaymentRecorded={() => loadData()}
        />
      )}
    </div>
  )
}


