"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Plus, Edit, Trash2, AlertTriangle, ShoppingCart, X, TrendingUp, BarChart3, CloudUpload, Scan, Camera, Search, Filter, Store } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { sendNotification } from "@/lib/notifications"
import { useInventory } from "@/lib/hooks/use-inventory"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { createExpense, createOrder, createOrderItem } from "@/lib/api"
import { toast } from "sonner"
import { MAX_FILE_SIZE_MB } from "@/lib/constants"
import { VoiceInputButton } from "@/components/ui/voice-input-button"
import { useVoiceFormFill } from "@/lib/hooks/use-voice-form-fill"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { useIsMobile } from "@/components/ui/use-mobile"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"

const ALLOWED_SCAN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

function validateScanImage(file: File): boolean {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    toast.error(`Image must be under ${MAX_FILE_SIZE_MB}MB`)
    return false
  }
  if (!ALLOWED_SCAN_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_SCAN_IMAGE_TYPES)[number])) {
    toast.error("Please upload a JPG, PNG, or WEBP image")
    return false
  }
  return true
}

type ScannedReviewRow = {
  id: string
  included: boolean
  name: string
  sku: string
  quantity: string
  buying_price: string
  selling_price: string
}

type ScanManufacturerMeta = {
  manufacturer_name: string
  manufacturer_address: string
  manufacturer_gstin: string
}

function mapApiItemsToReviewRows(items: Array<Record<string, unknown>>): ScannedReviewRow[] {
  return (items || []).map((item, index) => {
    const buying = Number.parseFloat(String(item.buying_price ?? "")) || 0
    const selling =
      Number.parseFloat(String(item.selling_price ?? "")) || (buying > 0 ? buying * 1.2 : 0)
    return {
      id: `scan-row-${index}-${Date.now()}`,
      included: true,
      name: String(item.name ?? ""),
      sku: String(item.sku ?? `SKU-${Math.random().toString(36).slice(-6).toUpperCase()}`),
      quantity: String(Number.parseInt(String(item.quantity ?? "1"), 10) || 1),
      buying_price: buying > 0 ? String(buying) : "",
      selling_price: selling > 0 ? String(selling) : "",
    }
  })
}

export default function InventoryPage() {
  const { profile: businessProfile, formatPrice, ownerId } = useBusinessContext()
  const { isOwner, activeBranchId, can } = usePermissions()
  const [selectedLocationId, setSelectedLocationId] = useState<string>("global")

  // Lock employees to their assigned branch
  useEffect(() => {
    if (!isOwner && activeBranchId) {
      setSelectedLocationId(activeBranchId)
    }
  }, [isOwner, activeBranchId])
  
  const { 
    loading, 
    products, 
    locations, 
    addProduct,
    updateProduct, 
    deleteProduct, 
    deleteProducts,
    refresh: loadData 
  } = useInventory(ownerId, selectedLocationId)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "",
    costPrice: "",
    stockQuantity: "",
    minStockLevel: "10",
    category: "",
    manufacturerName: "",
    manufacturerAddress: "",
    manufacturerGstin: "",
    purchaseGstRate: "18",
  })
  const [saleData, setSaleData] = useState({
    quantity: "1",
    customerName: "",
    gstRate: "18",
  })
  const [isScanning, setIsScanning] = useState(false)
  const [isIdentifyingProduct, setIsIdentifyingProduct] = useState(false)
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [scannedItems, setScannedItems] = useState<ScannedReviewRow[]>([])
  const [scanMeta, setScanMeta] = useState<ScanManufacturerMeta | null>(null)
  const [showScannedReview, setShowScannedReview] = useState(false)
  const [scannedReceiptBase64, setScannedReceiptBase64] = useState<string | null>(null)
  const [isImportingScanned, setIsImportingScanned] = useState(false)
  const [voiceFilledFields, setVoiceFilledFields] = useState<Set<string>>(new Set())
  const { isLoading: voiceFormLoading, fillForm } = useVoiceFormFill()
  const router = useRouter()
  const supabase = createClient()
  const profile = businessProfile

  useEffect(() => {
    const locId = new URLSearchParams(window.location.search).get("locationId")
    if (locId) setSelectedLocationId(locId)
  }, [])

  const getProductAnalytics = () => {
    const productStats = products.map((product) => {
      const productOrders = orderItems.filter((item) => item.product_id === product.id)
      const totalSold = productOrders.reduce((sum, item) => sum + item.quantity, 0)
      const revenue = productOrders.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
      const cost = totalSold * (product.cost_price || 0)
      const profit = revenue - cost

      return {
        ...product,
        totalSold,
        revenue,
        profit,
        profitMargin: revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0,
      }
    })

    const topByDemand = [...productStats].sort((a, b) => b.totalSold - a.totalSold).slice(0, 5)
    const topByProfit = [...productStats].sort((a, b) => b.profit - a.profit).slice(0, 5)
    const lowStock = products.filter((p) => p.stock_quantity <= p.min_stock_level)

    return { topByDemand, topByProfit, lowStock, allProducts: productStats }
  }

  const analytics = getProductAnalytics()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const ownerId = profile?.role === "owner" ? user.id : profile?.owner_id

      let receiptUrl = null
      if (invoiceFile) {
        const fileExt = invoiceFile.name.split('.').pop()
        const fileName = `${ownerId}/${Date.now()}-invoice.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, invoiceFile)
        
        if (uploadError) {
          console.error("Storage error:", uploadError)
        } else {
          const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(fileName)
          receiptUrl = publicUrl
        }
      }

      const productData = {
        owner_id: ownerId,
        name: formData.name,
        sku: formData.sku,
        price: Number.parseFloat(formData.price),
        cost_price: Number.parseFloat(formData.costPrice) || 0,
        stock_quantity: Number.parseInt(formData.stockQuantity, 10) || 0,
        min_stock_level: Number.parseInt(formData.minStockLevel, 10) || 10,
        category: formData.category?.trim() || null,
        manufacturer_name: formData.manufacturerName,
        manufacturer_address: formData.manufacturerAddress,
        manufacturer_gstin: formData.manufacturerGstin,
        purchase_gst_rate: Number.parseFloat(formData.purchaseGstRate) || 0,
        receipt_url: receiptUrl,
      }

      let productId: string
      if (editingId) {
        await updateProduct(editingId, productData)
        productId = editingId
        await sendNotification({
          actionType: "inventory_updated",
          entityType: "product",
          entityId: editingId,
          message: `${formData.name} inventory updated by ${profile?.email || "team member"}`,
          ownerId,
          userId: user.id,
        })
      } else {
        const newProduct = await addProduct(productData)
        productId = newProduct?.id || ""

        await sendNotification({
          actionType: "inventory_added",
          entityType: "product",
          entityId: productId,
          message: `${formData.name} added to inventory by ${profile?.email || "team member"}`,
          ownerId: ownerId,
          userId: user.id,
        })
      }

      setFormData({ 
        name: "", sku: "", price: "", costPrice: "", stockQuantity: "", minStockLevel: "10", category: "",
        manufacturerName: "", manufacturerAddress: "", manufacturerGstin: "", purchaseGstRate: "18"
      })
      setInvoiceFile(null)
      setShowForm(false)
      setEditingId(null)
      loadData()
      alert(editingId ? "Product updated successfully!" : "Product added successfully!")
    } catch (err: any) {
      console.error("Error submitting product:", err)
      alert("Error saving product: " + (err.message || "Unknown error"))
    }
  }

  const handleEdit = (product: any) => {
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.price.toString(),
      costPrice: product.cost_price?.toString() || "",
      stockQuantity: product.stock_quantity.toString(),
      minStockLevel: product.min_stock_level.toString(),
      category: product.category || "",
      manufacturerName: product.manufacturer_name || "",
      manufacturerAddress: product.manufacturer_address || "",
      manufacturerGstin: product.manufacturer_gstin || "",
      purchaseGstRate: product.purchase_gst_rate?.toString() || "18",
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return
    try {
      await deleteProduct(id)
      alert("Product deleted successfully")
    } catch (error: any) {
      alert("Error deleting product: " + error.message)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) return
    
    try {
      await deleteProducts(selectedIds)
      setSelectedIds([])
      alert("Selected products deleted successfully!")
      loadData()
    } catch (error: any) {
      alert("Error deleting products: " + error.message)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(products.map(p => p.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return
    await deleteProduct(id)
  }

  const openSaleModal = (product: any) => {
    setSelectedProduct(product)
    setSaleData({ quantity: "1", customerName: "", gstRate: "18" })
    setShowSaleModal(true)
  }

  const handleCreateSale = async () => {
    if (!selectedProduct) return

    const quantity = Number.parseInt(saleData.quantity)
    if (quantity <= 0 || quantity > selectedProduct.stock_quantity) {
      alert(`Invalid quantity. Available stock: ${selectedProduct.stock_quantity}`)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const ownerId = profile?.role === "owner" ? user.id : profile?.owner_id

    const subtotal = selectedProduct.price * quantity
    const gstRate = saleData.gstRate === "none" ? 0 : Number.parseFloat(saleData.gstRate) / 100
    const gstAmount = subtotal * gstRate
    const totalAmount = subtotal + gstAmount

    try {
      // Use automated API functions
      const order = await createOrder({
        owner_id: ownerId,
        created_by: user.id,
        customer_name: saleData.customerName || "Walk-in Customer",
        total_amount: totalAmount,
        gst_amount: gstAmount,
        status: "completed",
        location_id: selectedLocationId === "global" ? null : selectedLocationId
      })

      if (order) {
        await createOrderItem({
          order_id: order.id,
          product_id: selectedProduct.id,
          quantity: quantity,
          unit_price: selectedProduct.price,
          line_total: subtotal,
        })
      }

      await sendNotification({
        actionType: "sale_created",
        entityType: "order",
        entityId: order.id,
        message: `Sale of ${selectedProduct.name} (Qty: ${quantity}) created by ${profile?.email || "team member"}`,
        ownerId,
        userId: user.id,
      })

      setShowSaleModal(false)
      setSelectedProduct(null)
      setSaleData({ quantity: "1", customerName: "", gstRate: "18" })

      alert("Sale created successfully! Invoice generated and stock updated.")
      loadData()
    } catch (error: any) {
      alert("Error creating sale: " + error.message)
    }
  }

  const calculateSalePreview = () => {
    if (!selectedProduct) return { subtotal: 0, gst: 0, total: 0 }

    const quantity = Number.parseInt(saleData.quantity) || 0
    const subtotal = selectedProduct.price * quantity
    const gstRate = saleData.gstRate === "none" ? 0 : Number.parseFloat(saleData.gstRate) / 100
    const gst = subtotal * gstRate
    const total = subtotal + gst

    return { subtotal, gst, total }
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ownerId = profile?.role === "owner" ? user.id : profile?.owner_id

      let count = 0
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim())
        if (values.length < 5) continue

        await supabase.from("products").insert({
          owner_id: ownerId,
          name: values[0],
          sku: values[1],
          price: Number.parseFloat(values[2]) || 0,
          cost_price: Number.parseFloat(values[3]) || 0,
          stock_quantity: Number.parseInt(values[4]) || 0,
          manufacturer_name: values[5] || "",
        })
        count++
      }
      alert(`Successfully imported ${count} products!`)
      loadData()
    }
    reader.readAsText(file)
  }

  const handleVoiceProductFill = async (transcript: string) => {
    const filled = await fillForm(transcript, "inventory_product")
    if (filled.__authError) {
      toast.error("Please log in to use voice input")
      return
    }
    const voiceKeys = new Set<string>()
    setFormData((prev) => {
      const next = { ...prev }
      if (filled.name && typeof filled.name === "string") {
        next.name = filled.name
        voiceKeys.add("name")
      }
      if (filled.sku && typeof filled.sku === "string") {
        next.sku = filled.sku
        voiceKeys.add("sku")
      }
      if (filled.price != null && filled.price !== "") {
        next.price = String(filled.price)
        voiceKeys.add("price")
      }
      if (filled.cost_price != null && filled.cost_price !== "") {
        next.costPrice = String(filled.cost_price)
        voiceKeys.add("costPrice")
      }
      if (filled.stock_quantity != null && filled.stock_quantity !== "") {
        next.stockQuantity = String(filled.stock_quantity)
        voiceKeys.add("stockQuantity")
      }
      if (filled.category && typeof filled.category === "string") {
        next.category = filled.category
        voiceKeys.add("category")
      }
      return next
    })
    setVoiceFilledFields(voiceKeys)
    setShowForm(true)
    if (voiceKeys.size > 0) {
      toast.success(`Voice filled ${voiceKeys.size} field(s)`)
    } else {
      toast.info("Could not extract product details — try again")
    }
  }

  const voiceBadge = (field: string) =>
    voiceFilledFields.has(field) ? (
      <span className="text-[10px] text-blue-400 ml-1">🎤 Auto-filled</span>
    ) : null

  const resetScannedReview = () => {
    setScannedItems([])
    setScanMeta(null)
    setScannedReceiptBase64(null)
    setShowScannedReview(false)
  }

  const handleInvoiceScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!validateScanImage(file)) return

    setIsScanning(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string

      try {
        const res = await fetch("/api/ai/scan-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        })

        const data = await res.json()
        if (data.error) throw new Error(data.error)

        const rows = mapApiItemsToReviewRows(data.items || [])
        if (rows.length === 0) {
          toast.error("No line items found on this invoice. Try a clearer photo.")
          return
        }

        setScanMeta({
          manufacturer_name: data.manufacturer_name || "",
          manufacturer_address: data.manufacturer_address || "",
          manufacturer_gstin: data.manufacturer_gstin || "",
        })
        setScannedItems(rows)
        setScannedReceiptBase64(base64)
        setShowScannedReview(true)
        toast.success(`Found ${rows.length} items — review before importing`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "AI Scan failed"
        toast.error(`Error scanning invoice: ${msg}`)
      } finally {
        setIsScanning(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleConfirmScannedImport = async () => {
    const selected = scannedItems.filter((row) => row.included && row.name.trim())
    if (selected.length === 0) {
      toast.error("Select at least one product to import")
      return
    }

    setIsImportingScanned(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please log in to import products")
        return
      }
      const resolvedOwnerId = profile?.role === "owner" ? user.id : profile?.owner_id
      if (!resolvedOwnerId) {
        toast.error("Business owner not found")
        return
      }

      let scannedReceiptUrl: string | null = null
      if (scannedReceiptBase64) {
        try {
          const blob = await (await fetch(scannedReceiptBase64)).blob()
          const fileName = `${resolvedOwnerId}/${Date.now()}-ai-scan.png`
          await supabase.storage.from("receipts").upload(fileName, blob)
          const {
            data: { publicUrl },
          } = supabase.storage.from("receipts").getPublicUrl(fileName)
          scannedReceiptUrl = publicUrl
        } catch (uploadErr) {
          console.error("Failed to auto-save scanned invoice:", uploadErr)
        }
      }

      let totalCost = 0
      for (const row of selected) {
        const qty = Number.parseInt(row.quantity, 10) || 1
        const cost = Number.parseFloat(row.buying_price) || 0
        const sell = Number.parseFloat(row.selling_price) || cost * 1.2
        totalCost += cost * qty

        await addProduct({
          name: row.name.trim(),
          sku: row.sku.trim() || `SKU-${Math.random().toString(36).slice(-6).toUpperCase()}`,
          price: sell,
          cost_price: cost,
          stock_quantity: qty,
          manufacturer_name: scanMeta?.manufacturer_name || "Extracted Supplier",
          manufacturer_address: scanMeta?.manufacturer_address || "",
          manufacturer_gstin: scanMeta?.manufacturer_gstin || "",
          purchase_gst_rate: 18,
          receipt_url: scannedReceiptUrl,
        })
      }

      if (totalCost > 0) {
        await createExpense({
          owner_id: resolvedOwnerId,
          category: "Inventory Purchase",
          amount: totalCost,
          description: `Supplier invoice scan - ${scanMeta?.manufacturer_name || "Unknown Vendor"} - ${selected.length} products`,
          expense_date: new Date().toISOString().split("T")[0],
          gst_applicable: false,
        })
      }

      toast.success(
        `✅ ${selected.length} products imported + expense of ₹${totalCost.toLocaleString("en-IN")} recorded`
      )
      resetScannedReview()
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed"
      toast.error(`Error importing scanned invoice: ${msg}`)
    } finally {
      setIsImportingScanned(false)
    }
  }

  const handleIdentifyProduct = async (file: File) => {
    if (!validateScanImage(file)) return

    setIsIdentifyingProduct(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string

      try {
        const res = await fetch("/api/ai/identify-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        })

        const data = await res.json()
        if (data.error) throw new Error(data.error)

        const suggested = Number.parseFloat(String(data.suggested_price ?? "")) || 0
        const estimatedCost = suggested > 0 ? Math.round(suggested * 0.7 * 100) / 100 : ""

        setFormData({
          ...formData,
          name: data.name || "",
          category: data.category || "",
          sku: data.sku || `SKU-${Math.random().toString(36).slice(-6).toUpperCase()}`,
          price: suggested > 0 ? String(suggested) : "",
          costPrice: estimatedCost !== "" ? String(estimatedCost) : "",
          stockQuantity: "1",
        })

        setShowForm(true)
        toast.success(`Product identified: ${data.name || "Unknown"}. Details pre-filled.`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Identification failed"
        toast.error(`Error identifying product: ${msg}`)
      } finally {
        setIsIdentifyingProduct(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="p-8 relative">
      {isScanning && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-slate-900 border border-purple-500/30 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
             <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                <Scan className="absolute inset-0 m-auto w-6 h-6 text-purple-400 animate-pulse" />
             </div>
             <div className="text-center">
               <h3 className="text-xl font-bold text-white mb-2">AI Invoice Extraction</h3>
               <p className="text-slate-400 text-sm animate-pulse whitespace-pre-line">
                 Scanning Manufacturer details...
                 Reading Product items & Prices...
                 Syncing with Accounting...
               </p>
             </div>
          </div>
        </div>
      )}

      <Dialog
        open={showScannedReview}
        onOpenChange={(open) => {
          if (!open) resetScannedReview()
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review scanned invoice</DialogTitle>
            <DialogDescription className="text-slate-400">
              {scanMeta?.manufacturer_name
                ? `Supplier: ${scanMeta.manufacturer_name}`
                : "Edit items before importing to inventory"}
            </DialogDescription>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="w-10 text-slate-400">✓</TableHead>
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400 w-20">Qty</TableHead>
                <TableHead className="text-slate-400">Cost (₹)</TableHead>
                <TableHead className="text-slate-400">Selling (₹)</TableHead>
                <TableHead className="w-16 text-slate-400" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {scannedItems.map((row) => (
                <TableRow key={row.id} className="border-slate-800">
                  <TableCell>
                    <Checkbox
                      checked={row.included}
                      onCheckedChange={(checked) =>
                        setScannedItems((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, included: checked === true } : r
                          )
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.name}
                      onChange={(e) =>
                        setScannedItems((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r))
                        )
                      }
                      className="bg-slate-800 border-slate-700 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.sku}
                      onChange={(e) =>
                        setScannedItems((prev) =>
                          prev.map((r) => (r.id === row.id ? { ...r, sku: e.target.value } : r))
                        )
                      }
                      className="bg-slate-800 border-slate-700 h-8 font-mono text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) =>
                        setScannedItems((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, quantity: e.target.value } : r
                          )
                        )
                      }
                      className="bg-slate-800 border-slate-700 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.buying_price}
                      onChange={(e) =>
                        setScannedItems((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, buying_price: e.target.value } : r
                          )
                        )
                      }
                      className="bg-slate-800 border-slate-700 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.selling_price}
                      onChange={(e) =>
                        setScannedItems((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, selling_price: e.target.value } : r
                          )
                        )
                      }
                      className="bg-slate-800 border-slate-700 h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() =>
                        setScannedItems((prev) => prev.filter((r) => r.id !== row.id))
                      }
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300"
            onClick={() =>
              setScannedItems((prev) => [
                ...prev,
                {
                  id: `scan-row-new-${Date.now()}`,
                  included: true,
                  name: "",
                  sku: `SKU-${Math.random().toString(36).slice(-6).toUpperCase()}`,
                  quantity: "1",
                  buying_price: "",
                  selling_price: "",
                },
              ])
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Row
          </Button>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-slate-700"
              onClick={resetScannedReview}
              disabled={isImportingScanned}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleConfirmScannedImport}
              disabled={isImportingScanned}
            >
              {isImportingScanned
                ? "Importing..."
                : `✅ Import ${scannedItems.filter((r) => r.included).length} Products`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isIdentifyingProduct && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-slate-900 border border-blue-500/30 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
             <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <Camera className="absolute inset-0 m-auto w-6 h-6 text-blue-400 animate-pulse" />
             </div>
             <div className="text-center">
               <h3 className="text-xl font-bold text-white mb-2">AI Product Identification</h3>
               <p className="text-slate-400 text-sm animate-pulse whitespace-pre-line">
                 Analyzing visual features...
                 Searching product database...
                 Generating SKU & Pricing...
               </p>
             </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Inventory Management</h1>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Track your products, stock levels, and analytics</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 p-2 rounded-xl">
           <Store className="w-4 h-4 text-blue-400 ml-2" />
           <select 
             value={selectedLocationId} 
             onChange={(e) => setSelectedLocationId(e.target.value)}
             className="bg-transparent text-sm text-white font-bold outline-none pr-4"
           >
             <option value="global" className="bg-slate-900">Global Inventory</option>
             {locations.map(loc => (
               <option key={loc.id} value={loc.id} className="bg-slate-900">{loc.name}</option>
             ))}
           </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleIdentifyProduct(e.target.files[0])}
              className="absolute inset-0 opacity-0 cursor-pointer"
              title="Capture Photo or Upload from Gallery"
            />
            <Button variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-900/20">
              <Camera className="w-4 h-4 mr-2" />
              Scan Product
            </Button>
          </div>
          <label className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center shadow-lg border border-slate-700 transition-all hover:scale-105 active:scale-95 group">
             <CloudUpload className="w-4 h-4 mr-2 text-blue-400 group-hover:rotate-12 transition-transform" />
             Bulk CSV
             <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
          </label>
          <label className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center shadow-lg border border-slate-700 transition-all hover:scale-105 active:scale-95 group">
             <Scan className={`w-4 h-4 mr-2 text-purple-400 group-hover:scale-110 transition-transform ${isScanning ? 'animate-pulse' : ''}`} />
             {isScanning ? "AI Scanning..." : "AI Invoice Scan"}
             <input disabled={isScanning} type="file" accept="image/*" className="hidden" onChange={handleInvoiceScan} />
          </label>
          <Button
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              setFormData({
                name: "",
                sku: "",
                price: "",
                costPrice: "",
                stockQuantity: "",
                minStockLevel: "10",
                category: "",
                manufacturerName: "",
                manufacturerAddress: "",
                manufacturerGstin: "",
                purchaseGstRate: "18",
              })
            }}
            className="bg-blue-600 hover:bg-blue-700 shadow-lg border border-blue-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? "Cancel" : "Add Product"}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Top by Demand</h3>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className="space-y-3">
            {analytics.topByDemand.length === 0 ? (
              <p className="text-slate-500 text-sm">No sales data yet</p>
            ) : (
              analytics.topByDemand.map((product, idx) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm font-mono">#{idx + 1}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.totalSold} units sold</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Top by Profit</h3>
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <div className="space-y-3">
            {analytics.topByProfit.length === 0 ? (
              <p className="text-slate-500 text-sm">No profit data yet</p>
            ) : (
              analytics.topByProfit.map((product, idx) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm font-mono">#{idx + 1}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.profitMargin}% margin</p>
                    </div>
                  </div>
                  <span className="text-green-400 font-semibold text-sm">{formatPrice(product.profit)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Low Stock Alerts</h3>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="space-y-3">
            {analytics.lowStock.length === 0 ? (
              <p className="text-slate-500 text-sm">All products in stock</p>
            ) : (
              analytics.lowStock.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.sku}</p>
                  </div>
                  <span className="text-red-400 font-semibold text-sm">{product.stock_quantity} left</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-xl">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-white">
              {editingId ? "Edit Product" : "New Product"}
            </h3>
            <VoiceInputButton onTranscript={handleVoiceProductFill} size="sm" />
            {voiceFormLoading && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                🤖 Filling form...
              </span>
            )}
          </div>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Product Name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  setVoiceFilledFields((s) => {
                    const n = new Set(s)
                    n.delete("name")
                    return n
                  })
                }}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
              {voiceBadge("name")}
            </div>
            <div>
              <Input
                placeholder="SKU"
                value={formData.sku}
                onChange={(e) => {
                  setFormData({ ...formData, sku: e.target.value })
                  setVoiceFilledFields((s) => {
                    const n = new Set(s)
                    n.delete("sku")
                    return n
                  })
                }}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
              {voiceBadge("sku")}
            </div>
            <div>
              <Input
                placeholder="Selling Price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: e.target.value })
                  setVoiceFilledFields((s) => {
                    const n = new Set(s)
                    n.delete("price")
                    return n
                  })
                }}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
              {voiceBadge("price")}
            </div>
            <div>
              <Input
                placeholder="Cost Price"
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => {
                  setFormData({ ...formData, costPrice: e.target.value })
                  setVoiceFilledFields((s) => {
                    const n = new Set(s)
                    n.delete("costPrice")
                    return n
                  })
                }}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
              {voiceBadge("costPrice")}
            </div>
            <div>
              <Input
                placeholder="Stock Quantity"
                type="number"
                value={formData.stockQuantity}
                onChange={(e) => {
                  setFormData({ ...formData, stockQuantity: e.target.value })
                  setVoiceFilledFields((s) => {
                    const n = new Set(s)
                    n.delete("stockQuantity")
                    return n
                  })
                }}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
              {voiceBadge("stockQuantity")}
            </div>
            <Input
              placeholder="Min Stock Level"
              type="number"
              value={formData.minStockLevel}
              onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
            <div>
              <Input
                placeholder="Category (optional)"
                value={formData.category}
                onChange={(e) => {
                  setFormData({ ...formData, category: e.target.value })
                  setVoiceFilledFields((s) => {
                    const n = new Set(s)
                    n.delete("category")
                    return n
                  })
                }}
                className="bg-slate-800 border-slate-700 text-white md:col-span-2"
              />
              {voiceBadge("category")}
            </div>

            <div className="md:col-span-2 border-t border-slate-800 pt-4 mt-2">
              <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Manufacturer / Supplier Details</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <Input
                  placeholder="Manufacturer Name"
                  value={formData.manufacturerName}
                  onChange={(e) => setFormData({ ...formData, manufacturerName: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Input
                  placeholder="Manufacturer GSTIN"
                  value={formData.manufacturerGstin}
                  onChange={(e) => setFormData({ ...formData, manufacturerGstin: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Input
                  placeholder="Manufacturer Address"
                  value={formData.manufacturerAddress}
                  onChange={(e) => setFormData({ ...formData, manufacturerAddress: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <div className="md:col-span-3">
                   <label className="text-xs text-slate-500 mb-1 block">Purchase GST Paid (%)</label>
                   <Input
                    placeholder="18"
                    type="number"
                    value={formData.purchaseGstRate}
                    onChange={(e) => setFormData({ ...formData, purchaseGstRate: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="md:col-span-3">
                   <label className="text-xs text-slate-500 mb-1 block">Manufacturer Invoice (PDF or Image)</label>
                   <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-dashed border-slate-700 hover:border-blue-500/50 transition-colors cursor-pointer group relative">
                      <CloudUpload className="w-8 h-8 text-slate-600 group-hover:text-blue-500 transition-colors" />
                      <div>
                        <p className="text-sm font-medium text-slate-300">{invoiceFile ? invoiceFile.name : "Upload Manufacturer Invoice"}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{invoiceFile ? `${(invoiceFile.size / 1024 / 1024).toFixed(2)} MB` : "For accounting & tax records"}</p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                   </div>
                </div>
              </div>
            </div>

            <Button type="submit" className="md:col-span-2 bg-blue-600 hover:bg-blue-700 h-10 shadow-lg border border-blue-500/20">
              {editingId ? "Update Product" : "Add Product"}
            </Button>
          </form>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="bg-red-900/20 border border-red-900/30 p-4 rounded-xl mb-6 flex justify-between items-center animate-in slide-in-from-top duration-300">
           <p className="text-red-400 text-sm font-medium">
             {selectedIds.length} items selected for deletion
           </p>
           <Button 
            onClick={handleBulkDelete}
            variant="destructive" 
            size="sm"
            className="bg-red-600 hover:bg-red-700 h-8"
           >
             <Trash2 className="w-3 h-3 mr-2" />
             Delete Selected
           </Button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading inventory...</div>
        ) : products.length === 0 ? (
          <Empty className="py-12 bg-slate-900 border-none">
            <EmptyHeader>
              <EmptyTitle className="text-white">No products yet</EmptyTitle>
              <EmptyDescription className="text-slate-400">Add your first product to start tracking inventory</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => {
                setShowForm(true);
                setEditingId(null);
              }} className="bg-blue-600 hover:bg-blue-700 text-white border-none">Add Product</Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-800 bg-slate-950">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.length === products.length && products.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 accent-blue-500" 
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Product</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">SKU</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Stock</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {products.map((product) => (
                    <tr key={product.id} className={`hover:bg-slate-800/50 transition-colors ${selectedIds.includes(product.id) ? 'bg-blue-900/10' : ''}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-800 accent-blue-500" 
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{product.name}</p>
                          {product.category && <p className="text-xs text-slate-500 mt-0.5">{product.category}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-sm">{product.sku}</td>
                      <td className="px-6 py-4 text-white font-semibold">{formatPrice(product.price)}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${product.stock_quantity <= product.min_stock_level ? "text-red-400" : "text-green-400"}`}>
                          {product.stock_quantity}
                        </span>
                        <span className="text-slate-500 text-sm"> / {product.min_stock_level}</span>
                      </td>
                      <td className="px-6 py-4">
                        {product.stock_quantity <= product.min_stock_level ? (
                          <div className="flex items-center gap-1 text-red-400 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Low Stock</span>
                          </div>
                        ) : (
                          <span className="text-green-400 text-sm">In Stock</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => openSaleModal(product)} variant="outline" size="sm" className="border-green-900/50 text-green-400 hover:bg-green-950/50" disabled={product.stock_quantity === 0}>
                            <ShoppingCart className="w-3 h-3" />
                          </Button>
                          <Button onClick={() => handleEdit(product)} variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button onClick={() => handleDelete(product.id)} variant="outline" size="sm" className="border-red-900/50 text-red-400 hover:bg-red-950/50">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-3">
              {products.map((product) => (
                <div key={product.id} className={`bg-slate-800/40 border rounded-xl p-4 transition-colors ${selectedIds.includes(product.id) ? 'border-blue-500/50 bg-blue-900/10' : 'border-slate-800'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="w-5 h-5 mt-0.5 rounded border-slate-700 bg-slate-800 accent-blue-500 shrink-0" 
                      />
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{product.name}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-bold">{formatPrice(product.price)}</p>
                      {product.stock_quantity <= product.min_stock_level ? (
                        <span className="text-xs text-red-400 flex items-center gap-1 justify-end mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Low
                        </span>
                      ) : (
                        <span className="text-xs text-green-400 mt-0.5 block">In Stock</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${product.stock_quantity <= product.min_stock_level ? "text-red-400" : "text-green-400"}`}>
                        {product.stock_quantity}
                      </span>
                      <span className="text-xs text-slate-500">/ {product.min_stock_level} min</span>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => openSaleModal(product)} variant="outline" size="sm" className="h-9 w-9 p-0 border-green-900/50 text-green-400" disabled={product.stock_quantity === 0}>
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => handleEdit(product)} variant="outline" size="sm" className="h-9 w-9 p-0 border-slate-700">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => handleDelete(product.id)} variant="outline" size="sm" className="h-9 w-9 p-0 border-red-900/50 text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Drawer open={showSaleModal && !!selectedProduct} onOpenChange={(open) => !open && setShowSaleModal(false)}>
        <DrawerContent className="bg-slate-900 border-slate-800 text-white max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Create Sale</DrawerTitle>
            <DrawerDescription className="text-slate-400">
              {selectedProduct?.name} — {selectedProduct ? formatPrice(selectedProduct.price) : ''} per unit
            </DrawerDescription>
          </DrawerHeader>

          {selectedProduct && (
            <div className="px-4 pb-4 space-y-4 overflow-y-auto">
              <div className="p-3 bg-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-mono">{selectedProduct.sku}</p>
                  <p className="text-sm text-slate-400">Stock: {selectedProduct.stock_quantity}</p>
                </div>
                <p className="text-lg font-bold text-blue-400">{formatPrice(selectedProduct.price)}</p>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Customer Name (optional)</label>
                <Input
                  placeholder="Walk-in Customer"
                  value={saleData.customerName}
                  onChange={(e) => setSaleData({ ...saleData, customerName: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white h-11"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  max={selectedProduct.stock_quantity}
                  value={saleData.quantity}
                  onChange={(e) => setSaleData({ ...saleData, quantity: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white h-11"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1 block">GST Rate</label>
                <Select
                  value={saleData.gstRate}
                  onValueChange={(value) => setSaleData({ ...saleData, gstRate: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none" className="text-white hover:bg-slate-700">No GST</SelectItem>
                    <SelectItem value="12" className="text-white hover:bg-slate-700">12% GST</SelectItem>
                    <SelectItem value="18" className="text-white hover:bg-slate-700">18% GST</SelectItem>
                    <SelectItem value="28" className="text-white hover:bg-slate-700">28% GST</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t border-slate-700 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(calculateSalePreview().subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-400">
                  <span>GST ({saleData.gstRate === "none" ? "0" : saleData.gstRate}%)</span>
                  <span>{formatPrice(calculateSalePreview().gst)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-white border-t border-slate-700 pt-2">
                  <span>Total</span>
                  <span>{formatPrice(calculateSalePreview().total)}</span>
                </div>
              </div>

              <Button onClick={handleCreateSale} className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-bold">
                Create Sale
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}

