"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { getDashboardStats, getProducts, getOrders } from "@/lib/api"
import { useRouter } from "next/navigation"
import { DashboardOverview } from "@/components/dashboard-overview"
import { AlertCenter } from "@/components/alerts/alert-center"
import { QuickEntryCard } from "@/components/dashboard/quick-entry"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatIndianPhone } from "@/lib/utils/whatsapp"
import Link from "next/link"

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

const CACHE_DURATION = 5 * 60 * 1000

export default function OverviewPage() {
  const { user } = useAuth()
  const { ownerId, loading: contextLoading } = useBusinessContext()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsLastUpdated, setAlertsLastUpdated] = useState<Date | null>(null)
  const alertsCacheRef = useRef<{ data: StockAlert[] | null; timestamp: number }>({
    data: null,
    timestamp: 0,
  })
  const router = useRouter()

  const loadStockAlerts = useCallback(async (resolvedOwnerId: string) => {
    if (
      alertsCacheRef.current.data &&
      Date.now() - alertsCacheRef.current.timestamp < CACHE_DURATION
    ) {
      setStockAlerts(alertsCacheRef.current.data)
      return
    }

    setAlertsLoading(true)
    try {
      const products = await getProducts(resolvedOwnerId)

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const orders = await getOrders(resolvedOwnerId)
      const recentOrders = orders.filter(
        (o) => new Date(o.order_date) >= thirtyDaysAgo
      )

      const salesMap: Record<string, number> = {}
      recentOrders.forEach((order) => {
        order.order_items?.forEach((item) => {
          if (!item.product_id) return
          salesMap[item.product_id] =
            (salesMap[item.product_id] || 0) + item.quantity
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

      if (!res.ok) throw new Error("Forecast failed")
      const { alerts } = await res.json()

      alertsCacheRef.current = { data: alerts, timestamp: Date.now() }
      setStockAlerts(alerts)
      setAlertsLastUpdated(new Date())
    } catch (err) {
      console.error("Stock alerts error:", err)
    } finally {
      setAlertsLoading(false)
    }
  }, [])

  const loadStats = async () => {
    if (!ownerId) return
    try {
      const data = await getDashboardStats(ownerId)
      setStats(data)
      await loadStockAlerts(ownerId)
    } catch (error) {
      console.error("Error loading stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ownerId) {
      loadStats()
    }
  }, [ownerId])

  if (!user) return null

  if (contextLoading || loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <header>
            <h1 className="text-3xl font-bold text-white tracking-tight">Business Overview</h1>
            <p className="text-slate-400">Real-time performance and operational insights</p>
          </header>

          <DashboardOverview stats={stats} />

          {alertsLoading && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  ⚠️ Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full bg-slate-800" />
                <Skeleton className="h-16 w-full bg-slate-800" />
              </CardContent>
            </Card>
          )}

          {!alertsLoading && stockAlerts.length === 0 && (
            <Card className="border-green-800/50 bg-green-950/20">
              <CardContent className="py-4">
                <p className="text-green-400 text-sm font-medium">
                  ✅ All stock levels are healthy
                </p>
              </CardContent>
            </Card>
          )}

          {!alertsLoading && stockAlerts.length > 0 && (
            <Card className="bg-slate-900 border-orange-800/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    ⚠️ Stock Alerts
                    <Badge variant="destructive">{stockAlerts.length}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {alertsLastUpdated && (
                      <span className="text-xs text-slate-500">
                        Updated{" "}
                        {Math.max(
                          0,
                          Math.round(
                            (Date.now() - alertsLastUpdated.getTime()) / 60000
                          )
                        )}{" "}
                        mins ago
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!ownerId) return
                        alertsCacheRef.current = { data: null, timestamp: 0 }
                        loadStockAlerts(ownerId)
                      }}
                      className="text-xs text-slate-500 hover:text-white"
                      title="Refresh alerts"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {stockAlerts.map((alert) => (
                  <div
                    key={alert.product_id}
                    className={`rounded-lg border p-3 ${
                      alert.urgency === "critical"
                        ? "border-red-800/60 bg-red-950/30"
                        : "border-yellow-800/60 bg-yellow-950/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm text-white flex items-center gap-1">
                          {alert.urgency === "critical" ? "🔴" : "🟡"}
                          {alert.product_name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Stock: {alert.current_stock} units · ~
                          {alert.days_remaining === 999
                            ? "No sales data"
                            : `${Math.round(alert.days_remaining)} day(s) remaining`}
                        </p>
                        <p className="text-xs text-slate-400">
                          Recommended order: {alert.recommended_order_qty} units
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (!alert.supplier_phone) return
                            const phone = formatIndianPhone(alert.supplier_phone).replace(
                              "+",
                              ""
                            )
                            const msg = `Hi, I need to reorder ${alert.product_name}. Please send ${alert.recommended_order_qty} units at the earliest.`
                            window.open(
                              `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
                              "_blank"
                            )
                          }}
                          disabled={!alert.supplier_phone}
                          title={
                            !alert.supplier_phone
                              ? "Add supplier phone in product settings"
                              : "Message supplier on WhatsApp"
                          }
                          className="text-xs px-2 py-1 rounded bg-green-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-700"
                        >
                          📱 Supplier
                        </button>
                        <Link
                          href={`/dashboard/inventory?highlight=${alert.product_id}`}
                          className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 text-center hover:bg-slate-800"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <QuickEntryCard />
        </div>

        <aside className="w-full xl:w-80 space-y-6">
          <AlertCenter />

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push("/dashboard/sales")}
                className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 text-center transition-colors"
              >
                New Sale
              </button>
              <button
                onClick={() => router.push("/dashboard/accounting")}
                className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 text-center transition-colors"
              >
                Add Expense
              </button>
              <button
                onClick={() => router.push("/dashboard/inventory")}
                className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 text-center transition-colors"
              >
                Add Stock
              </button>
              <button
                onClick={() => router.push("/dashboard/crm?action=new-lead")}
                className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 text-center transition-colors"
              >
                New Lead
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
