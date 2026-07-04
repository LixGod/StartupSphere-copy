import { createClient } from "@/lib/supabase/client"
import type {
  AIInsight, PerformanceForecast, DemandProjection, ChurnAnalysis, BusinessSnapshot
} from "@/lib/types"

const supabase = () => createClient()

export async function getAIInsights(ownerId: string, limit = 10) {
  try {
    const { data, error } = await supabase()
      .from("ai_insights")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.warn("AI Insights table error:", error.message)
      return []
    }
    return (data || []) as AIInsight[]
  } catch (err) {
    console.warn("AI Insights fetch failed:", err)
    return []
  }
}

export async function getPerformanceForecasts(ownerId: string) {
  try {
    const { data, error } = await supabase()
      .from("performance_forecasts")
      .select("*")
      .eq("owner_id", ownerId)
      .order("target_date", { ascending: true })

    if (error) {
      console.warn("Performance Forecasts table error:", error.message)
      return []
    }
    return (data || []) as PerformanceForecast[]
  } catch (err) {
    return []
  }
}

export async function getDemandProjections(ownerId: string) {
  try {
    const { data, error } = await supabase()
      .from("demand_projections")
      .select("*, products(name, sku)")
      .eq("owner_id", ownerId)
      .order("projected_out_of_stock_date", { ascending: true })

    if (error) {
      console.warn("Demand Projections table error:", error.message)
      return []
    }
    return (data || []) as (DemandProjection & { products: { name: string; sku: string } })[]
  } catch (err) {
    return []
  }
}

export async function getChurnAnalysis(ownerId: string) {
  try {
    const { data, error } = await supabase()
      .from("churn_analysis")
      .select("*, contacts(first_name, last_name, email)")
      .eq("owner_id", ownerId)
      .order("risk_score", { ascending: false })

    if (error) {
      console.warn("Churn Analysis table error:", error.message)
      return []
    }
    return (data || []) as (ChurnAnalysis & { contacts: { first_name: string; last_name: string; email: string } })[]
  } catch (err) {
    return []
  }
}

export async function getBusinessSnapshots(ownerId: string) {
  const { data, error } = await supabase()
    .from("business_snapshots")
    .select("*")
    .eq("owner_id", ownerId)
    .order("snapshot_date", { ascending: true })

  if (error) throw error
  return (data || []) as BusinessSnapshot[]
}
