"use client"

import React, { useState } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { useAccounting } from "@/lib/hooks/use-accounting"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { GSTService } from "@/lib/services/gst"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  TrendingUp, TrendingDown, DollarSign, Plus, Edit, Trash2, Printer, 
  MessageCircle, Mail, ShieldCheck, Palette, Truck, FileJson, Search, Filter 
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { AdaptiveTable } from "@/components/ui/adaptive-table"
import { InvoiceDesignStudio } from "@/components/accounting/invoice-design-studio"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { InvoiceShareButton } from "@/components/whatsapp/invoice-share-button"
import { OverdueReminders } from "@/components/accounting/overdue-reminders"
import type { Invoice, SalesOrder } from "@/lib/types"
import type { BrandingSettings } from "@/components/accounting/invoice-design-studio"
import { buildReceiptSearchParams, mergeBranding } from "@/lib/utils/receipt-branding"
import { GSTIN_REGEX, MAX_FILE_SIZE_MB } from "@/lib/constants"
import { getProducts } from "@/lib/api"
import { incrementProductStock } from "@/lib/api/sales"
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
import { Label } from "@/components/ui/label"

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

type BillLineItem = {
  id: string
  name: string
  sku: string
  quantity: string
  buying_price: string
  selling_price: string
}

function verifyFieldClass(value: string | null | undefined) {
  return !value?.trim() ? "border-amber-500 ring-1 ring-amber-500/50" : "border-slate-800"
}

function toExpenseDate(value: string): string {
  if (!value.trim()) return new Date().toISOString().split("T")[0]
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0]
  return new Date().toISOString().split("T")[0]
}

function mapScanItemsToBillLines(items: Array<Record<string, unknown>>): BillLineItem[] {
  return (items || []).map((item, index) => {
    const buying = Number.parseFloat(String(item.buying_price ?? "")) || 0
    const selling =
      Number.parseFloat(String(item.selling_price ?? "")) || (buying > 0 ? buying * 1.2 : 0)
    return {
      id: `bill-line-${index}-${Date.now()}`,
      name: String(item.name ?? ""),
      sku: String(item.sku ?? ""),
      quantity: String(Number.parseInt(String(item.quantity ?? "1"), 10) || 1),
      buying_price: buying > 0 ? String(buying) : "",
      selling_price: selling > 0 ? String(selling) : "",
    }
  })
}

function getInvoiceLineItems(invoice: Invoice, orders: SalesOrder[]) {
  const order = orders.find((o) => o.id === invoice.order_id)
  if (!order?.order_items?.length) return []
  return order.order_items.map((item) => ({
    name: item.products?.name || "Item",
    qty: item.quantity,
    amount: item.line_total ?? item.unit_price * item.quantity,
  }))
}

function invoiceSharePayload(
  invoice: Invoice,
  orders: SalesOrder[],
  profile: { company_name?: string; branding_settings?: { upi_id?: string } } | null
) {
  return {
    phone: invoice.customer_phone,
    businessName: profile?.company_name || "Our Business",
    invoiceNumber: invoice.invoice_number,
    date: new Date(invoice.issue_date || invoice.created_at).toLocaleDateString("en-IN"),
    items: getInvoiceLineItems(invoice, orders),
    subtotal: invoice.subtotal ?? invoice.total_amount - (invoice.gst_amount || 0),
    gstAmount: invoice.gst_amount || 0,
    total: invoice.total_amount,
    upiId: profile?.branding_settings?.upi_id ?? null,
  }
}

export default function AccountingPage() {
  const { profile, formatPrice, ownerId } = useBusinessContext()
  const { isOwner, activeBranchId } = usePermissions()
  const router = useRouter()
  const [selectedLocationId, setSelectedLocationId] = useState<string>("global")
  
  React.useEffect(() => {
    const locId = new URLSearchParams(window.location.search).get("locationId")
    if (locId) setSelectedLocationId(locId)
  }, [])

  // Lock employees to their assigned branch
  React.useEffect(() => {
    if (!isOwner && activeBranchId) {
      setSelectedLocationId(activeBranchId)
    }
  }, [isOwner, activeBranchId])
  
  const { 
    loading, 
    invoices, 
    expenses, 
    orders,
    locations,
    refresh: loadData,
    addInvoice,
    addExpense,
    removeInvoice,
    removeExpense,
    deleteInvoices,
    deleteExpenses
  } = useAccounting(ownerId, selectedLocationId)

  const [invoiceTheme, setInvoiceTheme] = useState(profile?.branding_settings?.theme || "standard")
  const [printBranding, setPrintBranding] = useState<BrandingSettings>(
    () => (profile?.branding_settings as BrandingSettings) || {}
  )
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])

  React.useEffect(() => {
    if (profile?.branding_settings) {
      const saved = profile.branding_settings as BrandingSettings
      if (saved.theme) setInvoiceTheme(saved.theme)
      setPrintBranding(saved)
    }
  }, [profile?.branding_settings])
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isScanningBill, setIsScanningBill] = useState(false)
  const [showBillReview, setShowBillReview] = useState(false)
  const [isSavingBill, setIsSavingBill] = useState(false)
  const [billVendor, setBillVendor] = useState("")
  const [billInvoiceNumber, setBillInvoiceNumber] = useState("")
  const [billInvoiceDate, setBillInvoiceDate] = useState("")
  const [billGstin, setBillGstin] = useState("")
  const [billGstPercent, setBillGstPercent] = useState("18")
  const [billLineItems, setBillLineItems] = useState<BillLineItem[]>([])
  const [billUpdateInventory, setBillUpdateInventory] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    category: "",
    amount: "",
    description: "",
    vendor_name: "",
  })
  const [savingManualExpense, setSavingManualExpense] = useState(false)
  const { isLoading: voiceFormLoading, fillForm } = useVoiceFormFill()

  const handleVoiceExpenseFill = async (transcript: string) => {
    const filled = await fillForm(transcript, "expense")
    if (filled.__authError) {
      toast.error("Please log in to use voice input")
      return
    }
    setExpenseForm((prev) => ({
      ...prev,
      ...(filled.category && typeof filled.category === "string"
        ? { category: filled.category }
        : {}),
      ...(filled.amount != null && filled.amount !== ""
        ? { amount: String(filled.amount) }
        : {}),
      ...(filled.description && typeof filled.description === "string"
        ? { description: filled.description }
        : {}),
      ...(filled.vendor_name && typeof filled.vendor_name === "string"
        ? { vendor_name: filled.vendor_name }
        : {}),
    }))
    setShowAddExpense(true)
    toast.success("Voice details applied — review before saving")
  }

  const handleSaveManualExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId) {
      toast.error("Business account not loaded")
      return
    }
    const amount = Number.parseFloat(expenseForm.amount)
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount")
      return
    }
    setSavingManualExpense(true)
    try {
      const vendor = expenseForm.vendor_name.trim()
      const desc =
        expenseForm.description.trim() ||
        (vendor ? `Expense — ${vendor}` : "Manual expense entry")
      await addExpense({
        owner_id: ownerId,
        category: expenseForm.category.trim() || "general",
        amount,
        description: desc,
        expense_date: new Date().toISOString().split("T")[0],
        gst_applicable: false,
      })
      toast.success("Expense saved")
      setExpenseForm({ category: "", amount: "", description: "", vendor_name: "" })
      setShowAddExpense(false)
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save expense")
    } finally {
      setSavingManualExpense(false)
    }
  }

  const billSubtotal = React.useMemo(
    () =>
      billLineItems.reduce((sum, row) => {
        const qty = Number.parseFloat(row.quantity) || 0
        const cost = Number.parseFloat(row.buying_price) || 0
        return sum + qty * cost
      }, 0),
    [billLineItems]
  )

  const billGstAmount = React.useMemo(() => {
    const rate = Number.parseFloat(billGstPercent) || 0
    return billSubtotal * (rate / 100)
  }, [billSubtotal, billGstPercent])

  const billGrandTotal = billSubtotal + billGstAmount

  const resetBillReview = () => {
    setShowBillReview(false)
    setBillVendor("")
    setBillInvoiceNumber("")
    setBillInvoiceDate("")
    setBillGstin("")
    setBillGstPercent("18")
    setBillLineItems([])
    setBillUpdateInventory(false)
  }

  const handleBillScanFile = (file: File) => {
    if (!validateScanImage(file)) return

    setIsScanningBill(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string

      try {
        const res = await fetch("/api/ai/scan-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        const lines = mapScanItemsToBillLines(data.items || [])
        if (lines.length === 0) {
          toast.error("No line items found on this bill")
          return
        }

        setBillVendor(data.manufacturer_name || "")
        setBillGstin(data.manufacturer_gstin || "")
        setBillInvoiceNumber("")
        setBillInvoiceDate(new Date().toISOString().split("T")[0])
        setBillLineItems(lines)
        setShowBillReview(true)
        toast.success("Bill read — verify fields before saving")
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Scan failed"
        toast.error(`Error scanning bill: ${msg}`)
      } finally {
        setIsScanningBill(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveScannedBill = async () => {
    if (!ownerId) {
      toast.error("Business account not loaded")
      return
    }
    if (billGstin.trim() && !GSTIN_REGEX.test(billGstin.trim().toUpperCase())) {
      toast.error("Invalid GSTIN format — please verify")
      return
    }
    if (billGrandTotal <= 0) {
      toast.error("Grand total must be greater than zero")
      return
    }

    setIsSavingBill(true)
    try {
      const vendor = billVendor.trim() || "Unknown Vendor"
      const invoiceNo = billInvoiceNumber.trim() || "N/A"

      await addExpense({
        owner_id: ownerId,
        category: "Supplier Purchase",
        amount: billGrandTotal,
        description: `Purchase from ${vendor} - Invoice #${invoiceNo}`,
        expense_date: toExpenseDate(billInvoiceDate),
        gst_applicable: billGstAmount > 0,
        gst_amount: billGstAmount,
      })

      if (billUpdateInventory && billLineItems.length > 0) {
        const catalog = await getProducts(ownerId)
        for (const row of billLineItems) {
          if (!row.name.trim()) continue
          const qty = Number.parseInt(row.quantity, 10) || 0
          if (qty <= 0) continue
          const match = catalog.find(
            (p) => p.name.toLowerCase() === row.name.trim().toLowerCase()
          )
          if (match) {
            await incrementProductStock(match.id, qty)
          }
        }
        toast.success("✅ Expense saved from scanned bill — stock updated for matching products")
      } else {
        toast.success("✅ Expense saved from scanned bill")
      }

      resetBillReview()
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed"
      toast.error(msg)
    } finally {
      setIsSavingBill(false)
    }
  }

  const stats = {
    revenue: invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
    expenses: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
    gstPayable: invoices.reduce((sum, inv) => sum + (inv.gst_amount || 0), 0) - 
                expenses.reduce((sum, exp) => sum + (exp.gst_amount || 0), 0)
  }

  const handleBulkDeleteInvoices = async () => {
    if (!selectedInvoiceIds.length) return
    try {
      await deleteInvoices(selectedInvoiceIds)
      setSelectedInvoiceIds([])
      toast.success("Invoices deleted")
    } catch (error) {
      toast.error("Failed to delete")
    }
  }

  const handleBrandingChange = React.useCallback((settings: BrandingSettings, theme: string) => {
    setPrintBranding(settings)
    setInvoiceTheme(theme)
  }, [])

  const printInvoice = (invoice: Invoice) => {
    const orderId = invoice.order_id
    if (!orderId) {
      toast.error("This invoice has no linked sale — open it from Sales or complete checkout first.")
      return
    }
    const branding = mergeBranding(printBranding, { ...printBranding, theme: invoiceTheme })
    const query = buildReceiptSearchParams(branding)
    window.open(`/receipt/${orderId}?${query}`, "_blank")
  }

  const printExpense = (expense: any) => {
    // For expenses, we can generate a simple voucher or just open the receipt if it exists
    if (expense.receipt_url) {
      window.open(expense.receipt_url, '_blank')
    } else {
      toast.info("No receipt attached. Printing expense voucher...")
      // In a real app, you'd have a /receipt/expense/[id] route
      window.print() 
    }
  }

  if (loading) return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-full animate-in fade-in duration-500 relative">
      {isScanningBill && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-white font-semibold">🤖 Reading your bill...</p>
          </div>
        </div>
      )}

      <Dialog open={showBillReview} onOpenChange={(open) => !open && resetBillReview()}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review scanned bill</DialogTitle>
            <DialogDescription className="text-slate-400">
              Fields with a yellow border need verification
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400 text-xs">Vendor Name</Label>
              <Input
                value={billVendor}
                onChange={(e) => setBillVendor(e.target.value)}
                className={`mt-1 bg-slate-950 text-white ${verifyFieldClass(billVendor)}`}
                placeholder="Supplier name"
              />
              {!billVendor.trim() && (
                <p className="text-[10px] text-amber-400 mt-1">⚠️ Verify</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Invoice Number</Label>
              <Input
                value={billInvoiceNumber}
                onChange={(e) => setBillInvoiceNumber(e.target.value)}
                className={`mt-1 bg-slate-950 text-white ${verifyFieldClass(billInvoiceNumber)}`}
                placeholder="Invoice #"
              />
              {!billInvoiceNumber.trim() && (
                <p className="text-[10px] text-amber-400 mt-1">⚠️ Verify</p>
              )}
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Invoice Date</Label>
              <Input
                type="date"
                value={billInvoiceDate}
                onChange={(e) => setBillInvoiceDate(e.target.value)}
                className={`mt-1 bg-slate-950 text-white ${verifyFieldClass(billInvoiceDate)}`}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">GSTIN</Label>
              <Input
                value={billGstin}
                onChange={(e) => setBillGstin(e.target.value.toUpperCase())}
                className={`mt-1 bg-slate-950 text-white ${verifyFieldClass(billGstin)}`}
                placeholder="22AAAAA0000A1Z5"
              />
              {!billGstin.trim() && (
                <p className="text-[10px] text-amber-400 mt-1">⚠️ Verify</p>
              )}
            </div>
          </div>

          <Table className="mt-4">
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Item</TableHead>
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400 w-20">Qty</TableHead>
                <TableHead className="text-slate-400">Unit cost (₹)</TableHead>
                <TableHead className="text-slate-400">Line total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billLineItems.map((row) => {
                const qty = Number.parseFloat(row.quantity) || 0
                const cost = Number.parseFloat(row.buying_price) || 0
                const lineTotal = qty * cost
                return (
                  <TableRow key={row.id} className="border-slate-800">
                    <TableCell>
                      <Input
                        value={row.name}
                        onChange={(e) =>
                          setBillLineItems((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, name: e.target.value } : r
                            )
                          )
                        }
                        className={`bg-slate-950 h-8 ${verifyFieldClass(row.name)}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.sku}
                        onChange={(e) =>
                          setBillLineItems((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, sku: e.target.value } : r
                            )
                          )
                        }
                        className="bg-slate-950 border-slate-800 h-8 font-mono text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.quantity}
                        onChange={(e) =>
                          setBillLineItems((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, quantity: e.target.value } : r
                            )
                          )
                        }
                        className="bg-slate-950 border-slate-800 h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={row.buying_price}
                        onChange={(e) =>
                          setBillLineItems((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, buying_price: e.target.value } : r
                            )
                          )
                        }
                        className={`bg-slate-950 h-8 ${verifyFieldClass(row.buying_price)}`}
                      />
                    </TableCell>
                    <TableCell className="text-slate-300 font-medium">
                      ₹{lineTotal.toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div className="grid sm:grid-cols-3 gap-3 mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800">
            <div>
              <p className="text-xs text-slate-500 uppercase">Subtotal</p>
              <p className="text-lg font-bold text-white">
                {formatPrice(billSubtotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">GST (%)</p>
              <Input
                type="number"
                value={billGstPercent}
                onChange={(e) => setBillGstPercent(e.target.value)}
                className="mt-1 bg-slate-900 border-slate-800 h-8 text-white"
              />
              <p className="text-sm text-slate-400 mt-1">{formatPrice(billGstAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Grand Total</p>
              <p className="text-lg font-bold text-emerald-400">
                {formatPrice(billGrandTotal)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Checkbox
              id="bill-update-inventory"
              checked={billUpdateInventory}
              onCheckedChange={(checked) => setBillUpdateInventory(checked === true)}
            />
            <Label htmlFor="bill-update-inventory" className="text-sm text-slate-300 cursor-pointer">
              Also update inventory stock (match products by name)
            </Label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-700" onClick={resetBillReview}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSaveScannedBill}
              disabled={isSavingBill}
            >
              {isSavingBill ? "Saving..." : "💾 Save as Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle>Add Expense</DialogTitle>
              <VoiceInputButton onTranscript={handleVoiceExpenseFill} size="sm" />
              {voiceFormLoading && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  🤖 Filling...
                </span>
              )}
            </div>
            <DialogDescription className="text-slate-400">
              Speak or type expense details — nothing is saved until you confirm
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveManualExpense} className="space-y-4">
            <Input
              placeholder="Category (e.g. electricity)"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              className="bg-slate-950 border-slate-800 text-white"
            />
            <Input
              placeholder="Amount (₹)"
              type="number"
              step="0.01"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="bg-slate-950 border-slate-800 text-white"
              required
            />
            <Input
              placeholder="Vendor name (optional)"
              value={expenseForm.vendor_name}
              onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
              className="bg-slate-950 border-slate-800 text-white"
            />
            <Input
              placeholder="Description"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              className="bg-slate-950 border-slate-800 text-white"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-slate-700"
                onClick={() => setShowAddExpense(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700"
                disabled={savingManualExpense}
              >
                {savingManualExpense ? "Saving..." : "Save Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Accounting & GST</h1>
          <p className="text-slate-400">Financial operations, multi-branch tax tracking, and compliance</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white">
              <SelectItem value="global">All Branches</SelectItem>
              {locations.map(loc => (
                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => router.push("/dashboard/sales")} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-600/10 text-emerald-500 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Total Revenue</p>
            <p className="text-2xl font-bold text-white">{formatPrice(stats.revenue)}</p>
          </div>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
          <div className="p-3 bg-rose-600/10 text-rose-500 rounded-xl"><TrendingDown className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Total Expenses</p>
            <p className="text-2xl font-bold text-white">{formatPrice(stats.expenses)}</p>
          </div>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-600/10 text-blue-500 rounded-xl"><ShieldCheck className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Net GST Payable</p>
            <p className="text-2xl font-bold text-white">{formatPrice(stats.gstPayable)}</p>
          </div>
        </Card>
      </div>

      <OverdueReminders
        invoices={invoices}
        businessName={profile?.company_name || "Our Business"}
        upiId={profile?.branding_settings?.upi_id}
      />

      <Tabs defaultValue="invoices" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger value="invoices" className="data-[state=active]:bg-blue-600 px-6">Invoices</TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-blue-600 px-6">Expenses</TabsTrigger>
            <TabsTrigger value="design" className="data-[state=active]:bg-indigo-600 px-6">Design Studio</TabsTrigger>
          </TabsList>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search financial records..."
                className="pl-10 bg-slate-900 border-slate-800 text-white w-full h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <TabsContent value="invoices">
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sales Invoices</span>
               {selectedInvoiceIds.length > 0 && (
                 <Button variant="destructive" size="sm" onClick={handleBulkDeleteInvoices}>
                   <Trash2 className="w-4 h-4 mr-2" /> Delete {selectedInvoiceIds.length}
                 </Button>
               )}
            </div>
            {invoices.length === 0 ? (
              <Empty className="py-12 bg-slate-900 border-none">
                <EmptyHeader>
                  <EmptyTitle className="text-white">No invoices yet</EmptyTitle>
                  <EmptyDescription className="text-slate-400">Create a sale to automatically generate your first invoice</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => router.push("/dashboard/sales")} className="bg-blue-600 hover:bg-blue-700 text-white border-none">Create Sale</Button>
                </EmptyContent>
              </Empty>
            ) : (
            <AdaptiveTable 
              data={invoices.filter(i => i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) || i.customer_name.toLowerCase().includes(searchQuery.toLowerCase()))}
              selectedIds={selectedInvoiceIds}
              onSelectionChange={setSelectedInvoiceIds}
              columns={[
                { header: "Invoice #", accessorKey: "invoice_number", className: "font-bold text-white" },
                { header: "Customer", accessorKey: "customer_name" },
                { header: "Date", accessorKey: (i) => new Date(i.created_at).toLocaleDateString() },
                { header: "Amount", accessorKey: (i) => <span className="font-bold text-emerald-500">{formatPrice(i.total_amount)}</span> },
                { header: "Actions", accessorKey: (i) => (
                  <div className="flex gap-2 items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400" onClick={() => printInvoice(i)}><Printer className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500"><Mail className="w-4 h-4" /></Button>
                    <InvoiceShareButton payload={invoiceSharePayload(i, orders, profile)} />
                  </div>
                )}
              ]}
              mobileCard={(i) => (
                <div className="space-y-3">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-sm font-bold text-white">{i.invoice_number}</p>
                       <p className="text-xs text-slate-500">{i.customer_name}</p>
                     </div>
                     <span className="font-bold text-emerald-500">{formatPrice(i.total_amount)}</span>
                   </div>
                   <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                     <span className="text-[10px] text-slate-500">{new Date(i.created_at).toLocaleDateString()}</span>
                     <div className="flex gap-2 items-center">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-400" onClick={() => printInvoice(i)}><Printer className="w-3.5 h-3.5 mr-1" /> Print</Button>
                        <InvoiceShareButton payload={invoiceSharePayload(i, orders, profile)} className="flex items-center gap-1 text-green-600 hover:text-green-700 text-xs" />
                     </div>
                   </div>
                </div>
              )}
            />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <Card className="bg-slate-900 border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2 bg-slate-900/50">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expense Ledger</span>
               <div className="flex flex-wrap items-center gap-2">
               {selectedExpenseIds.length > 0 && (
                 <Button variant="destructive" size="sm">
                   <Trash2 className="w-4 h-4 mr-2" /> Delete {selectedExpenseIds.length}
                 </Button>
               )}
               <Button
                 type="button"
                 variant="outline"
                 size="sm"
                 className="border-slate-700 text-slate-300"
                 onClick={() => setShowAddExpense(true)}
               >
                 <Plus className="w-4 h-4 mr-2" /> Add Expense
               </Button>
               <label className="relative cursor-pointer">
                 <input
                   type="file"
                   accept="image/*"
                   capture="environment"
                   className="absolute inset-0 opacity-0 cursor-pointer"
                   disabled={isScanningBill}
                   onChange={(e) => {
                     const file = e.target.files?.[0]
                     e.target.value = ""
                     if (file) handleBillScanFile(file)
                   }}
                 />
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   className="border-emerald-600/50 text-emerald-400 pointer-events-none"
                   disabled={isScanningBill}
                 >
                   📄 Scan Bill
                 </Button>
               </label>
               </div>
            </div>
            {expenses.length === 0 ? (
              <Empty className="py-12 bg-slate-900 border-none">
                <EmptyHeader>
                  <EmptyTitle className="text-white">No expenses recorded</EmptyTitle>
                  <EmptyDescription className="text-slate-400">Expenses from inventory purchases will appear here automatically</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
            <AdaptiveTable 
              data={expenses}
              selectedIds={selectedExpenseIds}
              onSelectionChange={setSelectedExpenseIds}
              columns={[
                { header: "Category", accessorKey: "category", className: "font-bold text-white" },
                { header: "Description", accessorKey: "description" },
                { header: "Date", accessorKey: "expense_date" },
                { header: "Amount", accessorKey: (e) => <span className="font-bold text-rose-500">{formatPrice(e.amount)}</span> },
                { header: "GST ITC", accessorKey: (e) => e.itc_eligible ? <Badge className="bg-emerald-500/10 text-emerald-500">YES</Badge> : <Badge className="bg-slate-800 text-slate-500">NO</Badge> },
                { header: "Actions", accessorKey: (e) => (
                  <div className="flex gap-2">
                    {e.receipt_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400" onClick={() => window.open(e.receipt_url, '_blank')}>
                        <Search className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => printExpense(e)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              ]}
              mobileCard={(e) => (
                <div className="space-y-3">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-sm font-bold text-white">{e.category}</p>
                       <p className="text-xs text-slate-500">{e.description}</p>
                     </div>
                     <span className="font-bold text-rose-500">{formatPrice(e.amount)}</span>
                   </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-500">{e.expense_date}</span>
                      <div className="flex items-center gap-2">
                        {e.receipt_url && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-400" onClick={() => window.open(e.receipt_url, '_blank')}>
                            <Search className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400" onClick={() => printExpense(e)}>
                          <Printer className="w-3.5 h-3.5 mr-1" /> Print
                        </Button>
                        <Badge className="text-[9px] bg-slate-800 text-slate-400 uppercase ml-2">ITC {e.itc_eligible ? 'Eligible' : 'N/A'}</Badge>
                      </div>
                    </div>
                </div>
              )}
            />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="design">
          <InvoiceDesignStudio
            currentTheme={invoiceTheme}
            onThemeChange={setInvoiceTheme}
            onBrandingChange={handleBrandingChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

