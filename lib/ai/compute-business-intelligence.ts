import type { Contact, Expense, Product, SalesOrder } from "@/lib/types"

export interface StockAlertSummary {
  product_id: string
  urgency: "critical" | "low"
}

export interface IntelligenceMetrics {
  revenueGrowth: number | null
  revenueGrowthLabel: string
  revenueGrowthPositive: boolean | null
  last7DaysRevenue: { day: string; revenue: number }[]
  topProductName: string
  topProductUnits: number
  forecast30Days: number
  avgDailyRevenue: number
  atRiskCustomers: number
  grossMarginPct: number | null
  stockAlertCount: number
  stockCriticalCount: number
}

function isCompleted(order: SalesOrder) {
  return order.status === "completed"
}

function orderDate(order: SalesOrder) {
  return new Date(order.order_date)
}

function customerKey(order: SalesOrder): string | null {
  const phone = order.customer_phone?.replace(/\D/g, "").slice(-10)
  if (phone && phone.length >= 10) return `phone:${phone}`
  const name = order.customer_name?.trim().toLowerCase()
  if (name && name !== "walk-in customer") return `name:${name}`
  return null
}

function monthBounds(offsetMonths: number) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59)
  return { start, end }
}

function revenueInRange(orders: SalesOrder[], start: Date, end: Date) {
  return orders
    .filter((o) => {
      if (!isCompleted(o)) return false
      const d = orderDate(o)
      return d >= start && d <= end
    })
    .reduce((sum, o) => sum + (o.total_amount || 0), 0)
}

export function computeIntelligenceMetrics(
  orders: SalesOrder[],
  products: Product[],
  expenses: Expense[],
  _contacts: Contact[]
): IntelligenceMetrics {
  const { start: thisStart, end: thisEnd } = monthBounds(0)
  const { start: lastStart, end: lastEnd } = monthBounds(-1)

  const thisMonthRevenue = revenueInRange(orders, thisStart, thisEnd)
  const lastMonthRevenue = revenueInRange(orders, lastStart, lastEnd)

  let revenueGrowth: number | null = null
  let revenueGrowthLabel = "—"
  let revenueGrowthPositive: boolean | null = null

  if (lastMonthRevenue === 0 && thisMonthRevenue > 0) {
    revenueGrowthLabel = "New"
    revenueGrowthPositive = true
  } else if (lastMonthRevenue > 0) {
    revenueGrowth = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    revenueGrowthLabel = `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%`
    revenueGrowthPositive = revenueGrowth >= 0
  } else {
    revenueGrowthLabel = "0.0%"
    revenueGrowthPositive = null
  }

  const last7DaysRevenue: { day: string; revenue: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const end = new Date(d)
    end.setHours(23, 59, 59, 999)
    const label = d.toLocaleDateString("en-IN", { weekday: "short" })
    const revenue = revenueInRange(orders, d, end)
    last7DaysRevenue.push({ day: label, revenue })
  }

  const productUnits: Record<string, { name: string; qty: number }> = {}
  orders
    .filter((o) => {
      if (!isCompleted(o)) return false
      const d = orderDate(o)
      return d >= thisStart && d <= thisEnd
    })
    .forEach((o) => {
      o.order_items?.forEach((item) => {
        const name = item.products?.name || products.find((p) => p.id === item.product_id)?.name || "Unknown"
        if (!productUnits[item.product_id]) {
          productUnits[item.product_id] = { name, qty: 0 }
        }
        productUnits[item.product_id].qty += item.quantity
      })
    })

  const top = Object.values(productUnits).sort((a, b) => b.qty - a.qty)[0]
  const topProductName = top?.name || "—"
  const topProductUnits = top?.qty || 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const last30Revenue = orders
    .filter((o) => isCompleted(o) && orderDate(o) >= thirtyDaysAgo)
    .reduce((sum, o) => sum + (o.total_amount || 0), 0)
  const avgDailyRevenue = last30Revenue / 30
  const forecast30Days = avgDailyRevenue * 30

  const thirtyDaysAgoCustomers = new Date()
  thirtyDaysAgoCustomers.setDate(thirtyDaysAgoCustomers.getDate() - 30)
  const lastOrderByCustomer = new Map<string, Date>()

  orders.filter(isCompleted).forEach((o) => {
    const key = customerKey(o)
    if (!key) return
    const d = orderDate(o)
    const prev = lastOrderByCustomer.get(key)
    if (!prev || d > prev) lastOrderByCustomer.set(key, d)
  })

  let atRiskCustomers = 0
  lastOrderByCustomer.forEach((lastDate) => {
    if (lastDate < thirtyDaysAgoCustomers) atRiskCustomers++
  })

  const monthExpenses = expenses
    .filter((e) => {
      const d = new Date(e.expense_date)
      return d >= thisStart && d <= thisEnd
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0)

  const grossMarginPct =
    thisMonthRevenue > 0
      ? ((thisMonthRevenue - monthExpenses) / thisMonthRevenue) * 100
      : null

  return {
    revenueGrowth,
    revenueGrowthLabel,
    revenueGrowthPositive,
    last7DaysRevenue,
    topProductName,
    topProductUnits,
    forecast30Days,
    avgDailyRevenue,
    atRiskCustomers,
    grossMarginPct,
    stockAlertCount: 0,
    stockCriticalCount: 0,
  }
}

export async function fetchStockAlertCount(
  products: Product[],
  orders: SalesOrder[]
): Promise<{ count: number; critical: number }> {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentOrders = orders.filter((o) => orderDate(o) >= thirtyDaysAgo)

    const salesMap: Record<string, number> = {}
    recentOrders.forEach((order) => {
      order.order_items?.forEach((item) => {
        if (!item.product_id) return
        salesMap[item.product_id] = (salesMap[item.product_id] || 0) + item.quantity
      })
    })

    const forecastInput = products.map((p) => ({
      id: p.id,
      name: p.name,
      current_stock: p.stock_quantity || 0,
      min_stock_level: p.min_stock_level || 0,
      daily_sales_avg: parseFloat(((salesMap[p.id] || 0) / 30).toFixed(2)),
      supplier_name: p.manufacturer || null,
      supplier_phone: null,
    }))

    const res = await fetch("/api/ai/forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: forecastInput }),
    })

    if (!res.ok) return { count: 0, critical: 0 }
    const { alerts } = await res.json()
    const list = alerts || []
    return {
      count: list.length,
      critical: list.filter((a: StockAlertSummary) => a.urgency === "critical").length,
    }
  } catch {
    return { count: 0, critical: 0 }
  }
}
