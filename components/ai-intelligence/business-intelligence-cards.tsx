"use client"

import type { IntelligenceMetrics } from "@/lib/ai/compute-business-intelligence"
import { Card, CardContent } from "@/components/ui/card"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts"

function formatInr(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`
}

interface InsightCardProps {
  icon: string
  title: string
  value: React.ReactNode
  subtitle: string
  borderClass: string
  footer?: React.ReactNode
}

function InsightCard({ icon, title, value, subtitle, borderClass, footer }: InsightCardProps) {
  return (
    <Card className={`bg-slate-900 border-slate-800 rounded-2xl border-t-4 ${borderClass}`}>
      <CardContent className="p-6">
        <p className="text-sm text-slate-400 flex items-center gap-2 mb-3">
          <span className="text-2xl">{icon}</span>
          {title}
        </p>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <p className="text-sm text-slate-500">{subtitle}</p>
        {footer && <div className="mt-4 h-10">{footer}</div>}
      </CardContent>
    </Card>
  )
}

export function BusinessIntelligenceCards({ metrics }: { metrics: IntelligenceMetrics }) {
  const growthColor =
    metrics.revenueGrowthPositive === true
      ? "border-t-green-500"
      : metrics.revenueGrowthPositive === false
        ? "border-t-red-500"
        : "border-t-slate-600"

  const growthValueColor =
    metrics.revenueGrowthPositive === true
      ? "text-green-400"
      : metrics.revenueGrowthPositive === false
        ? "text-red-400"
        : "text-white"

  const margin = metrics.grossMarginPct
  const marginBorder =
    margin === null
      ? "border-t-slate-600"
      : margin > 30
        ? "border-t-green-500"
        : margin >= 10
          ? "border-t-yellow-500"
          : "border-t-red-500"

  const stockBorder =
    metrics.stockCriticalCount > 0
      ? "border-t-red-500"
      : metrics.stockAlertCount > 0
        ? "border-t-yellow-500"
        : "border-t-green-500"

  const customerBorder =
    metrics.atRiskCustomers > 0 ? "border-t-orange-500" : "border-t-green-500"

  const forecastProgress = Math.min(
    100,
    metrics.forecast30Days > 0
      ? Math.round((metrics.avgDailyRevenue * 7) / (metrics.forecast30Days / 30) * 10)
      : 0
  )

  const healthyStock = Math.max(0, 100 - metrics.stockAlertCount * 15)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <InsightCard
        icon="📈"
        title="Revenue Growth"
        value={<span className={growthValueColor}>{metrics.revenueGrowthLabel}</span>}
        subtitle="vs last month"
        borderClass={growthColor}
        footer={
          <ResponsiveContainer width="100%" height={40}>
            <LineChart data={metrics.last7DaysRevenue}>
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        }
      />

      <InsightCard
        icon="🏆"
        title="Top Product"
        value={
          <span className="text-xl md:text-2xl lg:text-3xl truncate block">
            {metrics.topProductName}
          </span>
        }
        subtitle={
          metrics.topProductUnits > 0
            ? `${metrics.topProductUnits.toLocaleString("en-IN")} units sold this month`
            : "No sales this month yet"
        }
        borderClass="border-t-blue-500"
      />

      <InsightCard
        icon="🔮"
        title="30-Day Forecast"
        value={formatInr(metrics.forecast30Days)}
        subtitle={`Based on ${formatInr(metrics.avgDailyRevenue)}/day average`}
        borderClass="border-t-purple-500"
        footer={
          <div className="space-y-1">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, forecastProgress)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-600">Weekly pace vs monthly target</p>
          </div>
        }
      />

      <InsightCard
        icon="👥"
        title="At-Risk Customers"
        value={
          <span className={metrics.atRiskCustomers > 0 ? "text-orange-400" : "text-green-400"}>
            {metrics.atRiskCustomers}{" "}
            <span className="text-lg font-normal text-slate-400">customers</span>
          </span>
        }
        subtitle={
          metrics.atRiskCustomers === 0
            ? "All customers active ✅"
            : "Haven't ordered in 30+ days"
        }
        borderClass={customerBorder}
      />

      <InsightCard
        icon="💰"
        title="Gross Margin"
        value={
          margin !== null ? (
            <span
              className={
                margin > 30
                  ? "text-green-400"
                  : margin >= 10
                    ? "text-yellow-400"
                    : "text-red-400"
              }
            >
              {margin.toFixed(1)}%
            </span>
          ) : (
            "—"
          )
        }
        subtitle="Revenue minus expenses (this month)"
        borderClass={marginBorder}
      />

      <InsightCard
        icon="📦"
        title="Stock Alerts"
        value={
          <span
            className={
              metrics.stockCriticalCount > 0
                ? "text-red-400"
                : metrics.stockAlertCount > 0
                  ? "text-yellow-400"
                  : "text-green-400"
            }
          >
            {metrics.stockAlertCount}{" "}
            <span className="text-lg font-normal text-slate-400">products low</span>
          </span>
        }
        subtitle={
          metrics.stockAlertCount === 0
            ? "All stocked ✅"
            : "Need reorder soon"
        }
        borderClass={stockBorder}
        footer={
          <div className="space-y-1">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-green-500"
                style={{ width: `${healthyStock}%` }}
              />
              <div
                className="h-full bg-red-500/80"
                style={{ width: `${100 - healthyStock}%` }}
              />
            </div>
            <ResponsiveContainer width="100%" height={24}>
              <BarChart
                data={[
                  { name: "OK", value: Math.max(0, 10 - metrics.stockAlertCount) },
                  { name: "Low", value: metrics.stockAlertCount },
                ]}
                layout="vertical"
              >
                <Bar dataKey="value" fill="#eab308" radius={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        }
      />
    </div>
  )
}
