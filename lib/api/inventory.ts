import { createClient } from "@/lib/supabase/client"
import type { Product } from "@/lib/types"
import { incrementProductStock } from "./sales"

const supabase = () => createClient()

function quickEntrySku(name: string): string {
  const slug = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase() || "ITEM"
  return `QE-${slug}-${Date.now().toString(36).slice(-4)}`
}

export async function getProducts(ownerId: string) {
  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data || []) as Product[]
}

export async function getInStockProducts(ownerId: string) {
  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .eq("owner_id", ownerId)
    .gt("stock_quantity", 0)

  if (error) throw error
  return (data || []) as Product[]
}

export async function getLowStockProducts(ownerId: string) {
  const { data, error } = await supabase()
    .from("products")
    .select("*")
    .eq("owner_id", ownerId)

  if (error) throw error
  return (data || []).filter(
    (p: Product) => p.stock_quantity <= p.min_stock_level
  ) as Product[]
}

export async function createProduct(product: Partial<Product> & { owner_id: string; name: string; sku: string; price: number; receipt_url?: string }) {
  const { receipt_url, ...productInsert } = product as any

  const { data, error } = await supabase()
    .from("products")
    .insert(productInsert)
    .select()
    .single()

  if (error) throw error
  
  if (data && data.cost_price && data.stock_quantity > 0) {
    try {
      const totalCost = data.cost_price * data.stock_quantity
      const purchaseGst = (productInsert.purchase_gst_rate || 0) / 100
      const gstAmount = totalCost * purchaseGst
      await supabase().from("expenses").insert({
        owner_id: data.owner_id,
        category: "Inventory Purchase",
        amount: totalCost,
        description: `Initial stock purchase for ${data.name} (${data.stock_quantity} units)`,
        expense_date: new Date().toISOString().split('T')[0],
        gst_applicable: purchaseGst > 0,
        gst_amount: gstAmount,
        itc_eligible: purchaseGst > 0,
        receipt_url: receipt_url || null
      })
    } catch (_) { /* silent */ }
  }

  return data as Product
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  const { data, error } = await supabase()
    .from("products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Product
}

export async function deleteProduct(id: string) {
  const { error } = await supabase().from("products").delete().eq("id", id)
  if (error) throw error
}

export async function deleteProducts(ids: string[]) {
  const { error } = await supabase()
    .from("products")
    .delete()
    .in("id", ids)

  if (error) throw error
}

/** Record a stock purchase: increase inventory and log expense (Quick Entry / purchases). */
export async function recordInventoryPurchase(params: {
  owner_id: string
  product_name: string
  quantity: number
  unit_cost: number
  notes?: string | null
  product_id?: string | null
}) {
  const qty = Math.max(1, Math.round(params.quantity))
  const unitCost = params.unit_cost
  const total = qty * unitCost
  const name = params.product_name.trim()

  let productId = params.product_id ?? null
  let previousStock = 0

  if (productId) {
    const { data: existing, error } = await supabase()
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("owner_id", params.owner_id)
      .single()
    if (error || !existing) throw new Error("Product not found")
    previousStock = existing.stock_quantity
    await supabase()
      .from("products")
      .update({
        cost_price: unitCost,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
  } else {
    const created = await createProduct({
      owner_id: params.owner_id,
      name,
      sku: quickEntrySku(name),
      price: Math.round(unitCost * 1.18 * 100) / 100,
      cost_price: unitCost,
      stock_quantity: 0,
      min_stock_level: 5,
    })
    productId = created.id
    previousStock = 0
  }

  await incrementProductStock(productId, qty)

  const { error: expenseError } = await supabase().from("expenses").insert({
    owner_id: params.owner_id,
    category: "purchase",
    description: params.notes || `Purchase: ${qty}× ${name} @ ₹${unitCost.toLocaleString("en-IN")}`,
    amount: total,
    expense_date: new Date().toISOString().slice(0, 10),
  })
  if (expenseError) throw expenseError

  const { data: updated, error: fetchError } = await supabase()
    .from("products")
    .select("*")
    .eq("id", productId)
    .single()

  if (fetchError || !updated) throw fetchError || new Error("Failed to load updated product")

  return { product: updated as Product, previousStock, quantityAdded: qty }
}
