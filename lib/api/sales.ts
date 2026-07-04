import { createClient } from "@/lib/supabase/client"
import type { SalesOrder, OrderItem } from "@/lib/types"

const supabase = () => createClient()

export async function getOrders(ownerId: string, locationId?: string) {
  let query = supabase()
    .from("sales_orders")
    .select("*, order_items(*, products(name))")
    .eq("owner_id", ownerId)

  if (locationId) {
    query = query.eq("location_id", locationId)
  }

  const { data, error } = await query.order("order_date", { ascending: false })

  if (error) throw error
  return (data || []) as SalesOrder[]
}

export async function createOrder(order: Partial<SalesOrder> & { owner_id: string; created_by: string; total_amount: number }) {
  const { data, error } = await supabase()
    .from("sales_orders")
    .insert(order)
    .select()
    .single()

  if (error) throw error

  if (data) {
    try {
      await supabase().from("invoices").insert({
        owner_id: data.owner_id,
        order_id: data.id,
        location_id: data.location_id,
        invoice_number: `INV-${data.id.slice(-6).toUpperCase()}`,
        customer_name: data.customer_name || "Walk-in Customer",
        customer_email: data.customer_email || null,
        customer_phone: data.customer_phone || null,
        issue_date: new Date().toISOString().split("T")[0],
        status: data.status === 'completed' ? 'paid' : 'pending',
        subtotal: data.total_amount - (data.gst_amount || 0),
        gst_rate: data.gst_amount > 0 ? 18 : 0,
        gst_amount: data.gst_amount || 0,
        total_amount: data.total_amount,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    } catch (_) { /* silent */ }
  }

  return data as SalesOrder
}

export async function updateOrder(id: string, updates: Partial<SalesOrder>) {
  const { data, error } = await supabase()
    .from("sales_orders")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as SalesOrder
}

export async function deleteOrders(ids: string[]) {
  const { error } = await supabase()
    .from("sales_orders")
    .delete()
    .in("id", ids)

  if (error) throw error
}

/** Adjust inventory via SECURITY DEFINER RPC (works when direct product UPDATE is blocked by RLS). */
async function adjustProductStock(productId: string, delta: number) {
  const client = supabase()

  let { error } = await client.rpc("increment_stock", {
    p_product_id: productId,
    p_amount: delta,
  })

  if (error) {
    const fallback = await client.rpc("increment_stock", {
      product_id: productId,
      amount: delta,
    })
    error = fallback.error
  }

  if (error) throw error
}

export async function incrementProductStock(productId: string, quantity: number) {
  await adjustProductStock(productId, Math.abs(quantity))
}

async function decrementProductStock(productId: string, quantity: number) {
  await adjustProductStock(productId, -Math.abs(quantity))
}

export async function createOrderItem(item: {
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  line_total: number
}) {
  const { data, error } = await supabase()
    .from("order_items")
    .insert(item)
    .select()
    .single()

  if (error) throw error

  await decrementProductStock(item.product_id, item.quantity)

  try {
    const { data: product } = await supabase()
      .from("products")
      .select("cost_price, name, owner_id")
      .eq("id", item.product_id)
      .single()

    if (product?.cost_price && product.cost_price > 0) {
      const totalCogs = product.cost_price * item.quantity
      await supabase().from("expenses").insert({
        owner_id: product.owner_id,
        category: "Cost of Goods Sold",
        amount: totalCogs,
        description: `COGS for ${item.quantity} units of ${product.name} (Order: ${item.order_id})`,
        expense_date: new Date().toISOString().split("T")[0],
        gst_applicable: false,
      })
    }
  } catch (cogsError) {
    console.warn("COGS entry skipped:", cogsError)
  }

  return data
}

/** Create a completed sale order with line item — updates Sales list and Inventory stock. */
export async function completeSale(params: {
  owner_id: string
  created_by: string
  customer_name?: string
  notes?: string | null
  product_id: string
  quantity: number
  unit_price: number
  line_total: number
  total_amount: number
  gst_amount: number
}) {
  const order = await createOrder({
    owner_id: params.owner_id,
    created_by: params.created_by,
    customer_name: params.customer_name || "Quick Entry",
    total_amount: params.total_amount,
    gst_amount: params.gst_amount,
    status: "completed",
    notes: params.notes ?? undefined,
  })

  await createOrderItem({
    order_id: order.id,
    product_id: params.product_id,
    quantity: params.quantity,
    unit_price: params.unit_price,
    line_total: params.line_total,
  })

  return order
}
