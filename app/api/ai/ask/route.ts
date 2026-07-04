import { NextResponse } from "next/server"
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const query = body.message || body.query
    const customSystemPrompt = body.systemPrompt as string | undefined

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "message or query is required" }, { status: 400 })
    }

    const supabaseAuth = await createClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 500 })
    }

    // Quick Entry / custom parser mode — no business context fetch
    if (customSystemPrompt) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: customSystemPrompt },
            { role: "user", content: query },
          ],
          temperature: 0,
        }),
      })

      const data = await response.json()
      if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 })

      return NextResponse.json({
        response: data.choices?.[0]?.message?.content || "",
      })
    }

    const supabase = await createClient();
    const ownerId = user.id

    // 1. Fetch THE UNIVERSE of business data for the chatbot
    const [
      profileRes, 
      productsRes, 
      ordersRes, 
      expensesRes, 
      contactsRes, 
      dealsRes,
      // Aggregates for REAL data
      allOrdersCount,
      allExpensesSum,
      allRevenueSum
    ] = await Promise.all([
      supabase.from('profiles').select('base_currency, company_name').eq('id', ownerId).single(),
      supabase.from('products').select('*').eq('owner_id', ownerId),
      supabase.from('sales_orders').select('*, order_items(*, products(name))').eq('owner_id', ownerId).order('order_date', { ascending: false }).limit(20),
      supabase.from('expenses').select('*').eq('owner_id', ownerId).order('expense_date', { ascending: false }).limit(20),
      supabase.from('contacts').select('*').eq('owner_id', ownerId).limit(20),
      supabase.from('deals').select('*').eq('owner_id', ownerId).limit(20),
      // Real Aggregates
      supabase.from('sales_orders').select('*', { count: 'exact', head: true }).eq('owner_id', ownerId),
      supabase.from('expenses').select('amount').eq('owner_id', ownerId),
      supabase.from('sales_orders').select('total_amount').eq('owner_id', ownerId).eq('status', 'completed')
    ]);

    const profile = profileRes.data || { company_name: 'StartupSphere Business' };
    const products = productsRes.data || [];
    const recentOrders = ordersRes.data || [];
    const recentExpenses = expensesRes.data || [];
    const contacts = contactsRes.data || [];
    const deals = dealsRes.data || [];

    // Calculate real totals
    const totalOrdersCount = allOrdersCount.count || 0;
    const totalExpensesValue = (allExpensesSum.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalRevenueValue = (allRevenueSum.data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Fetch Top Products across all orders for "What is my best seller?"
    const { data: topProductsData } = await supabase
      .from('order_items')
      .select('quantity, products(name)')
      .in('order_id', (allRevenueSum.data || []).map(o => o.id)); // Only completed orders

    const productSales = {};
    (topProductsData || []).forEach(item => {
      const name = item.products?.name || 'Unknown Product';
      productSales[name] = (productSales[name] || 0) + item.quantity;
    });

    const topProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    const businessContext = {
      company: profile.company_name,
      currency: profile.base_currency,
      aggregates: {
        total_revenue: totalRevenueValue,
        total_expenses: totalExpensesValue,
        net_profit: totalRevenueValue - totalExpensesValue,
        total_orders: totalOrdersCount,
        total_products: products.length,
        total_leads: contacts.length
      },
      inventory: products.map(p => ({ name: p.name, stock: p.stock_quantity, price: p.price, sku: p.sku })),
      sales_performance: {
        top_products: topProducts,
        recent_sales: recentOrders.slice(0, 10).map(o => ({
          customer: o.customer_name,
          date: o.order_date,
          total: o.total_amount,
          items: o.order_items?.map(i => `${i.quantity}x ${i.products?.name}`).join(', ')
        }))
      },
      recent_expenses: recentExpenses.map(e => ({ category: e.category, amount: e.amount, date: e.expense_date })),
      crm_preview: contacts.slice(0, 10).map(c => ({ name: `${c.first_name} ${c.last_name || ''}`, email: c.email })),
      deals_preview: deals.slice(0, 10).map(d => ({ title: d.title, value: d.value }))
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are the StartupSphere Business AI for ${profile.company_name}. 
            You have full access to the company's real-time data. 
            
            BUSINESS UNIVERSE:
            ${JSON.stringify(businessContext, null, 1)}
            
            RULES:
            1. ONLY answer based on the provided BUSINESS UNIVERSE data.
            2. If someone asks for "best seller", look at the sales_performance.top_products.
            3. If they ask about "stock", look at the inventory.
            4. Use professional markdown. Be concise. 
            5. If data is missing for a specific question, tell the user exactly what's missing.`
          },
          { role: "user", content: query }
        ],
        temperature: 0
      })
    })

    const data = await response.json()
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 })

    return NextResponse.json({ response: data.choices?.[0]?.message?.content || "No response." })
  } catch (error: any) {
    console.error("AI Ask Error:", error)
    return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 })
  }
}
