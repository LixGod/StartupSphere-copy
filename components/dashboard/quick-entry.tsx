"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { getProducts, completeSale, createExpense, recordInventoryPurchase } from "@/lib/api"
import type { Product } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { sendNotification } from "@/lib/notifications"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Zap, Loader2, Package, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

const EXAMPLES = [
  "sold 10 units at ₹50",
  "bought goods for ₹1000",
  "expense: electricity ₹500",
]

const PARSER_SYSTEM_PROMPT =
  "You are a business transaction parser for an Indian SMB. Parse the user's text and return ONLY a JSON object with no markdown: { transaction_type: 'sale' | 'purchase' | 'expense', product_name: string | null, quantity: number | null, unit_price: number | null, total_amount: number | null, notes: string | null }. Rules: 'sold' = sale; 'bought' or 'purchased' with a product = purchase (inventory in); plain bills without product = expense. For 'X each' or 'per unit', unit_price is per-item cost/price and total_amount = quantity * unit_price. If unsure about a field set it to null."

export interface ParsedTransaction {
  transaction_type: "sale" | "purchase" | "expense"
  product_name: string | null
  quantity: number | null
  unit_price: number | null
  total_amount: number | null
  notes: string | null
}

function tokenizeName(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter((w) => w.length > 1)
}

/** Case-insensitive match on product name (substring + token overlap). */
function findMatchingProduct(products: Product[], productName: string | null): Product | null {
  if (!productName?.trim()) return null
  const search = productName.trim().toLowerCase()
  const searchTokens = tokenizeName(search)

  const direct =
    products.find((p) => {
      const name = p.name.toLowerCase()
      return name === search || name.includes(search) || search.includes(name)
    }) ?? null
  if (direct) return direct

  if (searchTokens.length >= 2) {
    const allTokens = products.find((p) => {
      const name = p.name.toLowerCase()
      return searchTokens.every((t) => name.includes(t))
    })
    if (allTokens) return allTokens

    let best: { product: Product; score: number } | null = null
    for (const p of products) {
      const nameTokens = tokenizeName(p.name)
      const score = searchTokens.filter((t) =>
        nameTokens.some((nt) => nt.includes(t) || t.includes(nt))
      ).length
      if (score >= Math.ceil(searchTokens.length * 0.6)) {
        if (!best || score > best.score) best = { product: p, score }
      }
    }
    if (best) return best.product
  }

  return null
}

function resetFormState(
  setInput: (v: string) => void,
  setParsed: (v: ParsedTransaction | null) => void,
  setParseError: (v: string | null) => void,
  setMatchedProduct: (v: Product | null) => void
) {
  setInput("")
  setParsed(null)
  setParseError(null)
  setMatchedProduct(null)
}

export function QuickEntryCard() {
  const router = useRouter()
  const { ownerId } = useBusinessContext()
  const [input, setInput] = useState("")
  const [parsing, setParsing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>([])
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null)

  const purchaseQty = useMemo(() => {
    if (!parsed || parsed.transaction_type !== "purchase") return 1
    return parsed.quantity != null && parsed.quantity > 0 ? parsed.quantity : 1
  }, [parsed])

  useEffect(() => {
    if (!parsed || !ownerId || !["sale", "purchase"].includes(parsed.transaction_type)) {
      setInventoryProducts([])
      setMatchedProduct(null)
      return
    }
    let cancelled = false
    getProducts(ownerId)
      .then((products) => {
        if (cancelled) return
        setInventoryProducts(products)
        setMatchedProduct(findMatchingProduct(products, parsed.product_name))
      })
      .catch(() => {
        if (!cancelled) {
          setInventoryProducts([])
          setMatchedProduct(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [parsed, ownerId])

  const saleQty = useMemo(() => {
    if (!parsed || parsed.transaction_type !== "sale") return 1
    return parsed.quantity != null && parsed.quantity > 0 ? parsed.quantity : 1
  }, [parsed])

  const handleParse = async () => {
    if (!input.trim()) return
    setParsing(true)
    setParseError(null)
    setParsed(null)
    setMatchedProduct(null)

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          systemPrompt: PARSER_SYSTEM_PROMPT,
        }),
      })

      if (res.status === 401) {
        setParseError("Please log in to use Quick Entry")
        return
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Parse failed")
      }

      const data = await res.json()
      const raw = data.response || data.parsed || ""
      const jsonMatch = String(raw).match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        setParseError("Could not parse. Please try again or log manually.")
        return
      }

      const result = JSON.parse(jsonMatch[0]) as ParsedTransaction
      if (!["sale", "purchase", "expense"].includes(result.transaction_type)) {
        setParseError("Could not parse. Please try again or log manually.")
        return
      }
      setParsed(result)
    } catch {
      setParseError("Could not parse. Please try again or log manually.")
    } finally {
      setParsing(false)
    }
  }

  const handleConfirmSale = async () => {
    if (!parsed || !ownerId) return

    const total =
      parsed.total_amount ??
      (parsed.quantity && parsed.unit_price ? parsed.quantity * parsed.unit_price : null)
    if (!total || total <= 0) {
      toast.error("Could not determine sale amount")
      return
    }

    const qty = saleQty
    const products = inventoryProducts.length > 0 ? inventoryProducts : await getProducts(ownerId)
    const matched = findMatchingProduct(products, parsed.product_name)

    if (!matched) {
      toast.error(
        parsed.product_name
          ? `Product "${parsed.product_name}" not found in inventory. Add it first or fix the name.`
          : "Could not identify a product name. Include the product in your entry (e.g. sold 2 Maggi at ₹50)."
      )
      return
    }

    if (matched.stock_quantity < qty) {
      toast.error(`Only ${matched.stock_quantity} units in stock for "${matched.name}"`)
      return
    }

    setLogging(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please log in to use Quick Entry")
        return
      }

      const gstRate = 0.18
      const subtotal = total / (1 + gstRate)
      const gstAmount = total - subtotal
      const unitPrice = parsed.unit_price ?? (qty > 0 ? subtotal / qty : subtotal)
      const lineTotal = parsed.unit_price != null ? unitPrice * qty : total

      const order = await completeSale({
        owner_id: ownerId,
        created_by: user.id,
        customer_name: "Quick Entry",
        notes: parsed.notes || `Quick Entry: ${input.trim()}`,
        product_id: matched.id,
        quantity: qty,
        unit_price: unitPrice,
        line_total: lineTotal,
        total_amount: total,
        gst_amount: gstAmount,
      })

      await sendNotification({
        actionType: "sale_created",
        entityType: "order",
        entityId: order.id,
        message: `Quick Entry: sold ${qty}× ${matched.name} for ₹${total.toLocaleString("en-IN")}`,
        ownerId,
        userId: user.id,
      })

      toast.success("✅ Sale added to Sales & Inventory updated!", {
        description: `${matched.name}: stock ${matched.stock_quantity} → ${matched.stock_quantity - qty}`,
      })

      resetFormState(setInput, setParsed, setParseError, setMatchedProduct)
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to log sale"
      toast.error(msg)
    } finally {
      setLogging(false)
    }
  }

  const handleConfirmPurchase = async () => {
    if (!parsed || !ownerId) return

    const productLabel = parsed.product_name?.trim()
    if (!productLabel) {
      toast.error("Include a product name (e.g. bought 10 Galaxy Fold 5 for ₹160000 each)")
      return
    }

    const qty = purchaseQty
    const unitCost =
      parsed.unit_price ??
      (parsed.total_amount && qty > 0 ? parsed.total_amount / qty : null)
    if (!unitCost || unitCost <= 0) {
      toast.error("Could not determine unit cost. Try: bought 10 items for ₹50000 each")
      return
    }

    setLogging(true)
    try {
      const products = inventoryProducts.length > 0 ? inventoryProducts : await getProducts(ownerId)
      const matched = findMatchingProduct(products, parsed.product_name)

      const { product, previousStock, quantityAdded } = await recordInventoryPurchase({
        owner_id: ownerId,
        product_name: productLabel,
        quantity: qty,
        unit_cost: unitCost,
        notes: parsed.notes || `Quick Entry: ${input.trim()}`,
        product_id: matched?.id ?? null,
      })

      toast.success("✅ Purchase logged — Inventory updated!", {
        description: `${product.name}: stock ${previousStock} → ${previousStock + quantityAdded}`,
      })
      resetFormState(setInput, setParsed, setParseError, setMatchedProduct)
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to log purchase"
      toast.error(msg)
    } finally {
      setLogging(false)
    }
  }

  const handleConfirm = async () => {
    if (!parsed || !ownerId) return

    if (parsed.transaction_type === "sale") {
      await handleConfirmSale()
      return
    }

    if (parsed.transaction_type === "purchase") {
      await handleConfirmPurchase()
      return
    }

    setLogging(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please log in to use Quick Entry")
        return
      }

      const amount =
        parsed.total_amount ??
        (parsed.quantity && parsed.unit_price ? parsed.quantity * parsed.unit_price : null)
      if (!amount || amount <= 0) {
        toast.error("Could not determine expense amount")
        return
      }
      await createExpense({
        owner_id: ownerId,
        category: parsed.product_name || "general",
        description: parsed.notes || parsed.product_name || input.trim(),
        amount,
        expense_date: new Date().toISOString().slice(0, 10),
      })
      toast.success("✅ Expense logged successfully")
      resetFormState(setInput, setParsed, setParseError, setMatchedProduct)
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to log transaction"
      toast.error(msg)
    } finally {
      setLogging(false)
    }
  }

  const handleEditManually = () => {
    if (!parsed) return
    const params = new URLSearchParams()
    if (parsed.product_name) params.set("product", parsed.product_name)
    if (parsed.quantity != null) params.set("qty", String(parsed.quantity))
    if (parsed.unit_price != null) params.set("price", String(parsed.unit_price))
    if (parsed.total_amount != null) params.set("total", String(parsed.total_amount))
    if (parsed.notes) params.set("notes", parsed.notes)

    if (parsed.transaction_type === "expense" || parsed.transaction_type === "purchase") {
      router.push(`/dashboard/accounting?${params.toString()}`)
    } else {
      router.push(`/dashboard/sales?${params.toString()}`)
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-amber-400" />
          Quick Entry
        </CardTitle>
        <CardDescription className="text-slate-400">
          Log sales, purchases (stock in), or expenses in plain language
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="e.g. sold 5 Parle-G at ₹10, or bought 100 pens for ₹500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !parsing && handleParse()}
          className="bg-slate-950 border-slate-800 text-white"
          disabled={parsing || logging}
        />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setInput(ex)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
        <Button
          type="button"
          onClick={handleParse}
          disabled={!input.trim() || parsing || logging}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        >
          {parsing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              🤖 Parsing your entry...
            </>
          ) : (
            "Parse & Log"
          )}
        </Button>

        {parseError && <p className="text-sm text-red-400">{parseError}</p>}

        {parsed && (
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Parsed result</p>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-slate-400">Transaction Type:</span>
              <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30 capitalize">
                {parsed.transaction_type}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Product</span>
                <p className="text-white">{parsed.product_name ?? "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Quantity</span>
                <p className="text-white">{parsed.quantity ?? "—"}</p>
              </div>
              <div>
                <span className="text-slate-500">Unit Price</span>
                <p className="text-white">
                  {parsed.unit_price != null ? `₹${parsed.unit_price.toLocaleString("en-IN")}` : "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Total</span>
                <p className="text-white font-semibold">
                  {parsed.total_amount != null
                    ? `₹${parsed.total_amount.toLocaleString("en-IN")}`
                    : parsed.quantity && parsed.unit_price
                      ? `₹${(parsed.quantity * parsed.unit_price).toLocaleString("en-IN")}`
                      : "—"}
                </p>
              </div>
            </div>
            {parsed.notes && <p className="text-xs text-slate-400">Notes: {parsed.notes}</p>}

            {(parsed.transaction_type === "sale" || parsed.transaction_type === "purchase") && (
              <div
                className={`rounded-lg border p-3 text-sm flex gap-2 ${
                  parsed.transaction_type === "purchase"
                    ? matchedProduct
                      ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-300"
                      : parsed.product_name
                        ? "border-blue-600/40 bg-blue-600/10 text-blue-300"
                        : "border-slate-700 bg-slate-900/50 text-slate-400"
                    : matchedProduct
                      ? "border-emerald-600/40 bg-emerald-600/10 text-emerald-300"
                      : parsed.product_name
                        ? "border-amber-600/40 bg-amber-600/10 text-amber-300"
                        : "border-slate-700 bg-slate-900/50 text-slate-400"
                }`}
              >
                {parsed.transaction_type === "purchase" ? (
                  matchedProduct ? (
                    <>
                      <Package className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>
                        Adding stock to <strong>{matchedProduct.name}</strong> (Stock:{" "}
                        {matchedProduct.stock_quantity}
                        {purchaseQty > 0
                          ? ` → ${matchedProduct.stock_quantity + purchaseQty} after purchase`
                          : ""}
                        )
                      </p>
                    </>
                  ) : parsed.product_name ? (
                    <>
                      <Package className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>
                        New product <strong>{parsed.product_name}</strong> will be created in Inventory with{" "}
                        {purchaseQty} units.
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>Include a product name to update inventory (e.g. bought 10 Galaxy Fold 5).</p>
                    </>
                  )
                ) : matchedProduct ? (
                  <>
                    <Package className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                      Product matched: <strong>{matchedProduct.name}</strong> (Stock:{" "}
                      {matchedProduct.stock_quantity} units
                      {saleQty > 1 ? ` → ${matchedProduct.stock_quantity - saleQty} after sale` : ""})
                    </p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                      {parsed.product_name
                        ? `Product "${parsed.product_name}" not found — add it to Inventory or rephrase before confirming.`
                        : "No product name detected — include a product name to update Sales and Inventory together."}
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={
                  logging ||
                  (parsed.transaction_type === "sale" && !!parsed.product_name && !matchedProduct) ||
                  (parsed.transaction_type === "purchase" && !parsed.product_name?.trim())
                }
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : "✅ Confirm & Log"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleEditManually}
                className="flex-1 border-slate-700 text-slate-300"
              >
                ✏️ Edit Manually
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
