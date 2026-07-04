import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GROQ_MODEL_DEFAULT } from "@/lib/constants"
import {
  defaultSalesInsights,
  parseGroqJson,
  type SalesAnalysisInsight,
} from "@/lib/ai/sales-insights-defaults"

export const maxDuration = 60

interface SalesDataPoint {
  date: string
  revenue: number
  orders: number
}

async function resolveOwnerAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  requestedOwnerId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, owner_id")
    .eq("id", userId)
    .single()

  if (!profile) return false
  const effectiveOwnerId =
    profile.role === "owner" ? profile.id : profile.owner_id
  return requestedOwnerId === effectiveOwnerId || requestedOwnerId === userId
}

async function handleSalesAnalysis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  salesData: SalesDataPoint[],
  forceRefresh: boolean
) {
  if (!forceRefresh) {
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const { data: cached } = await supabase
      .from("ai_insights")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("category", "sales")
      .gte("created_at", yesterday.toISOString())
      .order("created_at", { ascending: false })
      .limit(20)

    const salesRow = (cached || []).find(
      (row) => row.metadata?.insight_type === "sales_analysis"
    )

    if (salesRow?.metadata?.insight_data) {
      return NextResponse.json({
        ...(salesRow.metadata.insight_data as SalesAnalysisInsight),
        cached: true,
        cached_at: salesRow.created_at,
      })
    }
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 }
    )
  }

  const today = new Date().toISOString().split("T")[0]
  const userPrompt = `Analyze this daily sales data for a Mumbai business:
${JSON.stringify(salesData.slice(-90))}

Today: ${today}

Upcoming Indian festivals in next 60 days:
Eid ul-Adha (2026-06-27), Independence Day (2026-08-15),
Raksha Bandhan (2026-08-30), Janmashtami (2026-09-07),
Ganesh Chaturthi (2026-09-16), Navratri (2026-10-08),
Dussehra (2026-10-18), Diwali (2026-11-07),
Christmas (2026-12-25), New Year Eve (2026-12-31)

Return ONLY valid JSON, no markdown:
{
  "best_day_of_week": "string",
  "worst_day_of_week": "string",
  "monthly_trend": "growing|declining|stable",
  "trend_percentage": number,
  "avg_daily_revenue": number,
  "festival_alerts": [
    {
      "festival_name": "string",
      "date": "string",
      "days_away": number,
      "expected_impact": "high|medium|low",
      "recommendation": "string"
    }
  ],
  "top_recommendations": ["string","string","string"],
  "best_selling_period": "string",
  "slow_period_tip": "string"
}`

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL_DEFAULT,
      messages: [
        {
          role: "system",
          content:
            "You are a business analyst for Indian SMBs. Analyze sales data and return practical insights. Always think in context of Indian market, festivals, and business culture. Be specific and actionable.",
        },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  })

  const groqData = await groqRes.json()
  if (groqData.error) throw new Error(groqData.error.message)

  const rawContent = groqData.choices?.[0]?.message?.content || "{}"
  const parsed =
    parseGroqJson<SalesAnalysisInsight>(rawContent) ?? defaultSalesInsights()

  const insightData: SalesAnalysisInsight = {
    ...defaultSalesInsights(),
    ...parsed,
    festival_alerts: Array.isArray(parsed.festival_alerts)
      ? parsed.festival_alerts
      : [],
    top_recommendations: Array.isArray(parsed.top_recommendations)
      ? parsed.top_recommendations
      : [],
  }

  await supabase.from("ai_insights").insert({
    owner_id: ownerId,
    type: "insight",
    severity: "info",
    category: "sales",
    title: "Sales Analysis",
    description: "AI-generated sales insights",
    impact_value: null,
    metadata: {
      insight_type: "sales_analysis",
      insight_data: insightData,
    },
  })

  return NextResponse.json({ ...insightData, cached: false })
}

export async function POST(req: Request) {
  const supabaseAuth = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const body = await req.json().catch(() => ({}))

  if (body.sales_data && body.owner_id) {
    const allowed = await resolveOwnerAccess(supabase, user.id, body.owner_id)
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
      return await handleSalesAnalysis(
        supabase,
        body.owner_id,
        body.sales_data as SalesDataPoint[],
        Boolean(body.force_refresh)
      )
    } catch (error) {
      console.error("[Sales Insights Error]", error)
      return NextResponse.json(defaultSalesInsights())
    }
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 }
    )
  }

  try {
    const ownerId = user.id

    const [
      profileRes,
      productsRes,
      ordersRes,
      expensesRes,
      contactsRes,
      dealsRes,
      feedbackRes,
      allOrdersCount,
      allExpensesSum,
      allRevenueSum,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("base_currency, company_name")
        .eq("id", ownerId)
        .single(),
      supabase.from("products").select("*").eq("owner_id", ownerId),
      supabase
        .from("sales_orders")
        .select("*, order_items(*, products(name))")
        .eq("owner_id", ownerId)
        .order("order_date", { ascending: false })
        .limit(20),
      supabase
        .from("expenses")
        .select("*")
        .eq("owner_id", ownerId)
        .order("expense_date", { ascending: false })
        .limit(20),
      supabase.from("contacts").select("*").eq("owner_id", ownerId).limit(20),
      supabase.from("deals").select("*").eq("owner_id", ownerId).limit(20),
      supabase
        .from("customer_feedback")
        .select("*")
        .eq("owner_id", ownerId)
        .limit(20),
      supabase
        .from("sales_orders")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ownerId),
      supabase.from("expenses").select("amount").eq("owner_id", ownerId),
      supabase
        .from("sales_orders")
        .select("total_amount")
        .eq("owner_id", ownerId)
        .eq("status", "completed"),
    ])

    const profile = profileRes.data || {
      base_currency: "INR",
      company_name: "StartupSphere Business",
    }
    const currencySymbol =
      profile.base_currency === "USD"
        ? "$"
        : profile.base_currency === "EUR"
          ? "€"
          : "₹"

    const products = productsRes.data || []
    const recentOrders = ordersRes.data || []
    const recentExpenses = expensesRes.data || []
    const contacts = contactsRes.data || []
    const deals = dealsRes.data || []
    const feedback = feedbackRes.data || []

    const totalOrdersCount = allOrdersCount.count || 0
    const totalExpensesValue = (allExpensesSum.data || []).reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    )
    const totalRevenueValue = (allRevenueSum.data || []).reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    )

    const { data: topProductsData } = await supabase
      .from("order_items")
      .select("quantity, products(name)")
      .in(
        "order_id",
        (allRevenueSum.data || []).map((o: { id?: string }) => o.id).filter(Boolean)
      )

    const productSales: Record<string, number> = {}
    ;(topProductsData || []).forEach((item: { quantity: number; products?: { name?: string } }) => {
      const name = item.products?.name || "Unknown Product"
      productSales[name] = (productSales[name] || 0) + item.quantity
    })

    const topProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }))

    const businessContext = {
      company: profile.company_name,
      currency: profile.base_currency,
      summary: {
        totalRevenue: totalRevenueValue,
        totalExpenses: totalExpensesValue,
        netProfit: totalRevenueValue - totalExpensesValue,
        orderCount: totalOrdersCount,
        customerCount: contacts.length,
        dealCount: deals.length,
      },
      topSellingProducts: topProducts,
      recentOrders: recentOrders.slice(0, 5).map((o) => ({
        date: o.order_date,
        customer: o.customer_name,
        total: o.total_amount,
        items: o.order_items
          ?.map((i: { quantity: number; products?: { name?: string } }) =>
            `${i.quantity}x ${i.products?.name}`
          )
          .join(", "),
      })),
      inventoryStatus: {
        totalProducts: products.length,
        lowStock: products
          .filter((p) => p.stock_quantity <= p.min_stock_level)
          .map((p) => ({ name: p.name, stock: p.stock_quantity })),
      },
      recentExpenses: recentExpenses
        .slice(0, 5)
        .map((e) => ({
          category: e.category,
          amount: e.amount,
          date: e.expense_date,
        })),
      feedbackSummary: feedback.map((f) => f.comment).slice(0, 5),
    }

    const prompt = `You are the StartupSphere Business Intelligence Engine for ${profile.company_name}.
    Analyze this FULL business universe and provide a 100% accurate, non-hallucinated report.
    
    CURRENCY: ${currencySymbol}

    BUSINESS UNIVERSE:
    ${JSON.stringify(businessContext, null, 2)}
    
    TASK:
    1. Identify the absolute top-selling product.
    2. Highlight any inventory risks (low stock).
    3. Analyze profit margins if cost data is available.
    4. Provide 3 high-impact recommendations.

    Return a JSON object:
    {
      "insights": [
        {
          "type": "anomaly|trend|recommendation|insight",
          "severity": "info|warning|critical",
          "category": "sales|inventory|finance|crm",
          "title": "...",
          "description": "...",
          "impact_value": "+${currencySymbol}X or -Y%"
        }
      ],
      "forecasts": [
        {
          "target_date": "YYYY-MM-DD",
          "forecast_type": "revenue",
          "predicted_value": number,
          "confidence_score": 0-100
        }
      ],
      "churn": [
        {
          "contact_name": "...",
          "risk_score": 0-100,
          "risk_level": "low|medium|high",
          "factors": []
        }
      ]
    }`

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL_DEFAULT,
        messages: [
          {
            role: "system",
            content:
              "You are an elite business analyst. Be precise. Use real names from data. No generic advice.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    })

    const groqData = await groqRes.json()
    if (groqData.error) throw new Error(groqData.error.message)

    const aiResult = JSON.parse(groqData.choices[0]?.message?.content || "{}")

    if (aiResult.insights?.length > 0) {
      await supabase.from("ai_insights").delete().eq("owner_id", ownerId)
      await supabase
        .from("ai_insights")
        .insert(aiResult.insights.map((i: Record<string, unknown>) => ({ owner_id: ownerId, ...i })))
    }

    if (aiResult.forecasts?.length > 0) {
      await supabase.from("performance_forecasts").delete().eq("owner_id", ownerId)
      await supabase
        .from("performance_forecasts")
        .insert(
          aiResult.forecasts.map((f: Record<string, unknown>) => ({ owner_id: ownerId, ...f }))
        )
    }

    if (aiResult.churn?.length > 0) {
      const churnToSave = aiResult.churn
        .map((c: { contact_name: string; risk_score: number; risk_level: string; factors: string[] }) => {
          const contact = contacts.find(
            (con) =>
              `${con.first_name} ${con.last_name || ""}`.trim() === c.contact_name
          )
          return contact
            ? {
                owner_id: ownerId,
                contact_id: contact.id,
                risk_score: c.risk_score,
                risk_level: c.risk_level,
                risk_factors: c.factors,
              }
            : null
        })
        .filter(Boolean)

      if (churnToSave.length > 0) {
        await supabase.from("churn_analysis").delete().eq("owner_id", ownerId)
        await supabase.from("churn_analysis").insert(churnToSave)
      }
    }

    return NextResponse.json({ success: true, data: aiResult })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[AI Insights Error]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
