"use client"

import { useState, useEffect } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import {
  getAIInsights,
  getOrders,
  getProducts,
  getExpenses,
  getContacts,
} from "@/lib/api"
import {
  computeIntelligenceMetrics,
  fetchStockAlertCount,
  type IntelligenceMetrics,
} from "@/lib/ai/compute-business-intelligence"
import { BusinessIntelligenceCards } from "@/components/ai-intelligence/business-intelligence-cards"
import { SalesInsightsTab } from "@/components/ai-intelligence/sales-insights-tab"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  BrainCircuit,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Send,
  MessageCircle,
  Zap,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { AIAnalyst } from "@/lib/services/ai-analyst"
import { toast } from "sonner"
import type { AIInsight } from "@/lib/types"

export default function AIIntelligencePage() {
  const { ownerId, loading: contextLoading } = useBusinessContext()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<IntelligenceMetrics | null>(null)
  const [insights, setInsights] = useState<AIInsight[]>([])

  const [query, setQuery] = useState("")
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string }[]>([])
  const [isAsking, setIsAsking] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (!ownerId) return

    let cancelled = false

    const loadAll = async () => {
      setLoading(true)
      try {
        const [orders, products, expenses, contacts, insightsData] = await Promise.all([
          getOrders(ownerId),
          getProducts(ownerId),
          getExpenses(ownerId),
          getContacts(ownerId),
          getAIInsights(ownerId),
        ])

        if (cancelled) return

        const base = computeIntelligenceMetrics(orders, products, expenses, contacts)
        const stock = await fetchStockAlertCount(products, orders)

        if (cancelled) return

        setMetrics({
          ...base,
          stockAlertCount: stock.count,
          stockCriticalCount: stock.critical,
        })

        setInsights(
          insightsData.filter(
            (row) => row.metadata?.insight_type !== "sales_analysis"
          )
        )
      } catch (error) {
        console.error("Error loading AI intelligence:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [ownerId])

  const refreshPageData = async () => {
    if (!ownerId) return
    setLoading(true)
    try {
      const [orders, products, expenses, contacts, insightsData] = await Promise.all([
        getOrders(ownerId),
        getProducts(ownerId),
        getExpenses(ownerId),
        getContacts(ownerId),
        getAIInsights(ownerId),
      ])
      const base = computeIntelligenceMetrics(orders, products, expenses, contacts)
      const stock = await fetchStockAlertCount(products, orders)
      setMetrics({
        ...base,
        stockAlertCount: stock.count,
        stockCriticalCount: stock.critical,
      })
      setInsights(
        insightsData.filter((row) => row.metadata?.insight_type !== "sales_analysis")
      )
    } catch (error) {
      console.error("Refresh failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const runFullAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const res = await fetch("/api/ai/insights", { method: "POST" })
      const result = await res.json()
      if (result.success) {
        toast.success("Intelligence updated successfully!")
        await refreshPageData()
      } else {
        throw new Error(result.error)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error"
      toast.error("Analysis failed: " + message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAskAI = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim() || !ownerId) return

    const userMsg = query
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg }])
    setQuery("")
    setIsAsking(true)

    try {
      const response = await AIAnalyst.askAI(userMsg)
      setChatHistory((prev) => [...prev, { role: "ai", content: response }])
    } catch {
      toast.error("AI was unable to answer. Please try again.")
    } finally {
      setIsAsking(false)
    }
  }

  if (contextLoading || loading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-64 bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl bg-slate-800" />
          ))}
        </div>
        <Skeleton className="h-64 w-full bg-slate-800" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-10 max-w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            AI Intelligence Suite
            <Badge className="bg-blue-600/20 text-blue-400 border-0">v2.0</Badge>
          </h1>
          <p className="text-slate-400">
            Executive predictions and natural language business analysis
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={isAnalyzing}
            onClick={runFullAnalysis}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isAnalyzing ? "Analyzing..." : "Run AI Analysis"}
          </Button>
          <Button
            variant="outline"
            className="border-slate-800 text-slate-400 hover:text-white"
            onClick={refreshPageData}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
          </Button>
        </div>
      </div>

      {/* Section 1 — Business Intelligence */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Business Intelligence</h2>
        {metrics ? <BusinessIntelligenceCards metrics={metrics} /> : null}
      </section>

      {/* Section 2 — Sales Insights (visible on main page) */}
      <section className="space-y-4 border-t border-slate-800 pt-8">
        {ownerId ? <SalesInsightsTab ownerId={ownerId} /> : null}
      </section>

      {/* Section 3 — Daily brief + AI chat */}
      <section className="space-y-4 border-t border-slate-800 pt-8">
        <h2 className="text-xl font-bold text-white">AI Assistant & Daily Brief</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-slate-900 border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-950/50 border-b border-slate-800 flex flex-row items-center justify-between py-4">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Daily AI Brief
                </CardTitle>
                <Badge className="bg-blue-600">
                  {insights.length > 0
                    ? `Updated ${Math.floor(
                        (Date.now() - new Date(insights[0].created_at).getTime()) / 60000
                      )}m ago`
                    : "Fresh Analysis Needed"}
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {insights.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 italic">
                      No insights available. Click &quot;Run AI Analysis&quot; to generate your
                      daily brief.
                    </div>
                  ) : (
                    insights.map((insight, idx) => (
                      <div
                        key={insight.id || idx}
                        className="flex gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50 hover:border-slate-700 transition-all"
                      >
                        <div
                          className={`p-2 h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                            insight.severity === "critical"
                              ? "bg-rose-500/10 text-rose-500"
                              : "bg-blue-500/10 text-blue-500"
                          }`}
                        >
                          {insight.severity === "critical" ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <Zap className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white mb-1">{insight.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {insight.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge
                              variant="outline"
                              className="text-[9px] uppercase border-slate-800 text-slate-500"
                            >
                              {insight.type}
                            </Badge>
                            {insight.impact_value && (
                              <span className="text-[9px] text-slate-600 font-bold uppercase">
                                {insight.impact_value}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 h-[calc(100vh-12rem)] min-h-[500px]">
            <Card className="bg-slate-900 border-slate-800 h-full flex flex-col shadow-2xl rounded-2xl overflow-hidden border-t-4 border-t-blue-600">
              <CardHeader className="bg-slate-950/50 border-b border-slate-800 py-4">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-blue-400" /> Ask your Business AI
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Natural language analytics on real data
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="p-4 bg-blue-600/10 rounded-3xl mb-4">
                      <BrainCircuit className="w-8 h-8 text-blue-400" />
                    </div>
                    <p className="text-sm text-white font-medium mb-2">
                      How can I help you today?
                    </p>
                    <p className="text-[10px] text-slate-500 max-w-[200px]">
                      Try: &quot;What is my predicted revenue for next month?&quot;
                    </p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none p-3 flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </CardContent>

              <div className="p-4 bg-slate-950/80 border-t border-slate-800">
                <form onSubmit={handleAskAI} className="relative">
                  <Input
                    placeholder="Ask a question..."
                    className="bg-slate-900 border-slate-800 text-white pr-12 h-12 rounded-xl focus:ring-blue-600"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isAsking}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-1 top-1 bottom-1 bg-blue-600 hover:bg-blue-700 rounded-lg h-10 w-10"
                    disabled={!query.trim() || isAsking}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
