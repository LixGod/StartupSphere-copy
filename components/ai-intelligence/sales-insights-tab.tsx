"use client"

import { useCallback, useEffect, useState } from "react"
import { getOrders } from "@/lib/api"
import type { SalesAnalysisInsight } from "@/lib/ai/sales-insights-defaults"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, TrendingDown, TrendingUp, Minus } from "lucide-react"

interface SalesInsightsTabProps {
  ownerId: string
}

type SalesInsightsResponse = SalesAnalysisInsight & {
  cached?: boolean
  cached_at?: string
}

export function SalesInsightsTab({ ownerId }: SalesInsightsTabProps) {
  const [insights, setInsights] = useState<SalesInsightsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notEnoughData, setNotEnoughData] = useState(false)

  const buildSalesData = useCallback(async () => {
    const orders = await getOrders(ownerId)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const salesData: Record<
      string,
      { date: string; revenue: number; orders: number }
    > = {}

    orders.forEach((order) => {
      const date = order.order_date?.split("T")[0]
      if (!date || new Date(order.order_date) < ninetyDaysAgo) return
      if (!salesData[date]) {
        salesData[date] = { date, revenue: 0, orders: 0 }
      }
      if (order.status === "completed") {
        salesData[date].revenue += order.total_amount || 0
        salesData[date].orders += 1
      }
    })

    return Object.values(salesData).sort((a, b) => a.date.localeCompare(b.date))
  }, [ownerId])

  const loadInsights = useCallback(
    async (forceRefresh = false) => {
      setLoading(true)
      setError(null)
      setNotEnoughData(false)

      try {
        const formattedData = await buildSalesData()

        if (formattedData.length < 7) {
          setNotEnoughData(true)
          setInsights(null)
          return
        }

        const res = await fetch("/api/ai/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sales_data: formattedData,
            owner_id: ownerId,
            force_refresh: forceRefresh,
          }),
        })

        if (!res.ok) throw new Error("Failed to load sales insights")

        const data = (await res.json()) as SalesInsightsResponse
        setInsights(data)
      } catch (err) {
        console.error("Sales insights error:", err)
        setError("Could not load sales insights. Try again later.")
      } finally {
        setLoading(false)
      }
    },
    [buildSalesData, ownerId]
  )

  useEffect(() => {
    if (ownerId) loadInsights()
  }, [ownerId, loadInsights])

  const cacheHoursRemaining = insights?.cached_at
    ? Math.max(
        0,
        24 -
          Math.floor(
            (Date.now() - new Date(insights.cached_at).getTime()) / (1000 * 60 * 60)
          )
      )
    : null

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full bg-slate-800" />
        <Skeleton className="h-24 w-full bg-slate-800" />
        <p className="text-center text-sm text-slate-400">
          🤖 Analyzing your sales data...
        </p>
      </div>
    )
  }

  if (notEnoughData) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">📊</p>
        <h3 className="font-semibold text-white">Not enough data yet</h3>
        <p className="text-sm text-slate-400 mt-1">
          Record at least 7 days of sales to unlock AI insights
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-400">{error}</p>
        <Button
          variant="outline"
          className="mt-4 border-slate-700"
          onClick={() => loadInsights(true)}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!insights) return null

  const upcomingFestivals = (insights.festival_alerts || []).filter(
    (f) => f.days_away > 0 && f.days_away <= 60
  )

  const trendIcon =
    insights.monthly_trend === "growing" ? (
      <TrendingUp className="w-4 h-4 text-emerald-500" />
    ) : insights.monthly_trend === "declining" ? (
      <TrendingDown className="w-4 h-4 text-red-500" />
    ) : (
      <Minus className="w-4 h-4 text-slate-400" />
    )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Sales Insights</h2>
          <p className="text-sm text-slate-400">
            AI-powered patterns from your last 90 days of sales
          </p>
        </div>
        <div className="flex items-center gap-2">
          {insights.cached && cacheHoursRemaining !== null && (
            <Badge variant="outline" className="border-slate-700 text-slate-400">
              ⚡ Cached · Refreshes in {cacheHoursRemaining}h
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300"
            onClick={() => loadInsights(true)}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Best Day</p>
            <p className="text-lg font-bold text-white mt-1">
              {insights.best_day_of_week || "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Worst Day</p>
            <p className="text-lg font-bold text-white mt-1">
              {insights.worst_day_of_week || "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Monthly Trend</p>
            <p className="text-lg font-bold text-white mt-1 flex items-center gap-2 capitalize">
              {trendIcon}
              {insights.monthly_trend}
              <span
                className={
                  insights.monthly_trend === "growing"
                    ? "text-emerald-500 text-sm"
                    : insights.monthly_trend === "declining"
                      ? "text-red-500 text-sm"
                      : "text-slate-400 text-sm"
                }
              >
                {insights.trend_percentage}%
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase text-slate-500 font-bold">
              Avg Daily Revenue
            </p>
            <p className="text-lg font-bold text-white mt-1">
              ₹{(insights.avg_daily_revenue || 0).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>

      {upcomingFestivals.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            🎉 Upcoming Festival Opportunities
          </h3>
          <div className="space-y-3">
            {upcomingFestivals.map((festival) => (
              <div
                key={`${festival.festival_name}-${festival.date}`}
                className={`rounded-lg border p-4 ${
                  festival.expected_impact === "high"
                    ? "border-orange-800/60 bg-orange-950/20"
                    : festival.expected_impact === "medium"
                      ? "border-blue-800/60 bg-blue-950/20"
                      : "border-slate-700 bg-slate-900/50"
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-semibold text-white">{festival.festival_name}</p>
                    <p className="text-sm text-slate-400">
                      {festival.date} · {festival.days_away} days away
                    </p>
                    <p className="text-sm text-slate-300 mt-1">{festival.recommendation}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      festival.expected_impact === "high"
                        ? "border-orange-600 text-orange-400"
                        : festival.expected_impact === "medium"
                          ? "border-blue-600 text-blue-400"
                          : "border-slate-600 text-slate-400"
                    }
                  >
                    {festival.expected_impact.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(insights.top_recommendations?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">💡 AI Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.top_recommendations.map((rec, i) => (
              <Card key={i} className="bg-slate-900 border-slate-800">
                <CardContent className="pt-4">
                  <p className="text-2xl mb-2">💡</p>
                  <p className="text-sm text-slate-300">{rec}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-sm font-semibold text-white mb-2">🌟 Best Period</p>
            <p className="text-sm text-slate-400">
              {insights.best_selling_period || "Not enough data to determine"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-sm font-semibold text-white mb-2">💤 Slow Period Tip</p>
            <p className="text-sm text-slate-400">
              {insights.slow_period_tip || "Keep recording sales for personalized tips"}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
