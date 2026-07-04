export interface SalesAnalysisInsight {
  best_day_of_week: string | null
  worst_day_of_week: string | null
  monthly_trend: "growing" | "declining" | "stable"
  trend_percentage: number
  avg_daily_revenue: number
  festival_alerts: Array<{
    festival_name: string
    date: string
    days_away: number
    expected_impact: "high" | "medium" | "low"
    recommendation: string
  }>
  top_recommendations: string[]
  best_selling_period: string | null
  slow_period_tip: string | null
}

export function defaultSalesInsights(): SalesAnalysisInsight {
  return {
    best_day_of_week: null,
    worst_day_of_week: null,
    monthly_trend: "stable",
    trend_percentage: 0,
    avg_daily_revenue: 0,
    festival_alerts: [],
    top_recommendations: [],
    best_selling_period: null,
    slow_period_tip: null,
  }
}

export function parseGroqJson<T>(raw: string): T | null {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    return null
  }
}
