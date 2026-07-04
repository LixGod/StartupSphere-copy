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

    for (const product of products) {
      const dailyAvg = Number(product.daily_sales_avg) || 0
      const currentStock = Number(product.current_stock) || 0

      const daysRemaining =
        dailyAvg > 0 ? currentStock / dailyAvg : 999

      const urgency = classifyUrgency(daysRemaining)
      if (urgency === "ok") continue

      const recommendedOrderQty = Math.max(Math.round(dailyAvg * 14), 10)

      alerts.push({
        product_id: product.id,
        product_name: product.name,
        current_stock: currentStock,
        daily_sales_avg: dailyAvg,
        days_remaining: daysRemaining,
        urgency,
        recommended_order_qty: recommendedOrderQty,
        supplier_name: product.supplier_name ?? null,
        supplier_phone: product.supplier_phone ?? null,
      })
    }

    alerts.sort((a, b) => a.days_remaining - b.days_remaining)

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error("Forecast error:", error)
    return NextResponse.json({ alerts: [] })
  }
}
