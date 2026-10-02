import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface ForecastProductInput {
  id: string
  name: string
  current_stock: number
  min_stock_level: number
  daily_sales_avg: number
  supplier_name?: string | null
  supplier_phone?: string | null
}

interface StockAlert {
  product_id: string
  product_name: string
  current_stock: number
  daily_sales_avg: number
  days_remaining: number
  urgency: "critical" | "low"
  recommended_order_qty: number
  supplier_name: string | null
  supplier_phone: string | null
}

function classifyUrgency(daysRemaining: number): "critical" | "low" | "ok" {
  if (daysRemaining < 2) return "critical"
  if (daysRemaining < 5) return "low"
  return "ok"
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user || authError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const products: ForecastProductInput[] = body?.products ?? []

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ alerts: [] })
    }

    const alerts: StockAlert[] = []
    const draftPOsCreated: any[] = []

    // Fetch full product details including manufacturer_id and buying_price
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, owner_id")
      .eq("id", user.id)
      .single()

    const ownerId = profile?.role === "owner" ? user.id : profile?.owner_id

    for (const product of products) {
      const dailyAvg = Number(product.daily_sales_avg) || 0
      const currentStock = Number(product.current_stock) || 0
      const minStock = Number(product.min_stock_level) || 5

      const daysRemaining = dailyAvg > 0 ? currentStock / dailyAvg : 999
      const urgency = classifyUrgency(daysRemaining)
      const isLowStock = currentStock <= minStock || urgency !== "ok"

      if (!isLowStock) continue

      const recommendedOrderQty = Math.max(Math.round(dailyAvg * 14), Math.max(minStock * 2 - currentStock, 10))

      alerts.push({
        product_id: product.id,
        product_name: product.name,
        current_stock: currentStock,
        daily_sales_avg: dailyAvg,
        days_remaining: daysRemaining,
        urgency: urgency === "ok" ? "low" : urgency,
        recommended_order_qty: recommendedOrderQty,
        supplier_name: product.supplier_name ?? null,
        supplier_phone: product.supplier_phone ?? null,
      })

      // Auto PO Generation Logic (Feature 5)
      if (ownerId && isLowStock) {
        try {
          // Fetch product DB info for manufacturer & cost
          const { data: dbProd } = await supabase
            .from("products")
            .select("id, name, manufacturer_id, manufacturer_name, buying_price, stock_quantity, min_stock_level")
            .eq("id", product.id)
            .single()

          if (dbProd) {
            const unitCost = Number(dbProd.buying_price) || 0
            const poTotal = unitCost * recommendedOrderQty

            // Check if draft PO exists for this owner and product
            const { data: existingDraft } = await supabase
              .from("purchase_orders")
              .select("id, po_number")
              .eq("owner_id", ownerId)
              .eq("status", "draft")
              .ilike("notes", `%${dbProd.name}%`)
              .maybeSingle()

            if (!existingDraft) {
              const poNum = `PO-${Date.now().toString().slice(-6)}`
              const { data: newPo } = await supabase
                .from("purchase_orders")
                .insert({
                  owner_id: ownerId,
                  manufacturer_id: dbProd.manufacturer_id || null,
                  po_number: poNum,
                  status: "draft",
                  total_amount: poTotal,
                  notes: `Auto-generated draft PO for low stock item: ${dbProd.name} (Stock: ${dbProd.stock_quantity}, Min: ${dbProd.min_stock_level})`,
                })
                .select()
                .single()

              if (newPo) {
                await supabase.from("purchase_order_items").insert({
                  purchase_order_id: newPo.id,
                  product_id: dbProd.id,
                  quantity: recommendedOrderQty,
                  unit_cost: unitCost,
                  total_cost: poTotal,
                })

                draftPOsCreated.push({
                  po_number: poNum,
                  product_name: dbProd.name,
                  qty: recommendedOrderQty,
                  total: poTotal,
                })

                await supabase.from("notifications").insert({
                  owner_id: ownerId,
                  user_id: user.id,
                  action_type: "draft_po_generated",
                  entity_type: "purchase_order",
                  entity_id: newPo.id,
                  message: `📋 Auto-generated draft Purchase Order ${poNum} for ${dbProd.name} (${recommendedOrderQty} units)`,
                })
              }
            }
          }
        } catch (poErr) {
          console.error("Auto PO error:", poErr)
        }
      }
    }

    alerts.sort((a, b) => a.days_remaining - b.days_remaining)

    return NextResponse.json({ alerts, draftPOsCreated, draftCount: draftPOsCreated.length })
  } catch (error) {
    console.error("Forecast error:", error)
    return NextResponse.json({ alerts: [], draftPOsCreated: [], draftCount: 0 })
  }
}
