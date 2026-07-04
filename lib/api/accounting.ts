import { createClient } from "@/lib/supabase/client"
import type { Expense } from "@/lib/types"
import { getProducts } from "./inventory"
import { getOrders } from "./sales"

const supabase = () => createClient()

export async function getExpenses(ownerId: string, locationId?: string) {
  let query = supabase()
    .from("expenses")
    .select("*")
    .eq("owner_id", ownerId)

  if (locationId) {
    query = query.eq("location_id", locationId)
  }

  const { data, error } = await query.order("expense_date", { ascending: false })

  if (error) throw error
  return (data || []) as Expense[]
}

export async function createExpense(expense: Partial<Expense> & { owner_id: string; category: string; amount: number; expense_date: string }) {
  const { data, error } = await supabase()
    .from("expenses")
    .insert(expense)
    .select()
    .single()

  if (error) throw error
  return data as Expense
}

export async function deleteExpense(id: string) {
  const { error } = await supabase().from("expenses").delete().eq("id", id)
  if (error) throw error
}

export async function deleteExpenses(ids: string[]) {
  const { error } = await supabase()
    .from("expenses")
    .delete()
    .in("id", ids)

  if (error) throw error
}

export async function getDashboardStats(ownerId: string, locationId?: string) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [products, orders, expenses] = await Promise.all([
    getProducts(ownerId),
    getOrders(ownerId, locationId),
    getExpenses(ownerId, locationId),
  ])

  const lowStockProducts = products.filter(
    (p) => p.stock_quantity <= p.min_stock_level
  )

  const totalRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.total_amount, 0)

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  const monthlyOrders = orders.filter(
    (o) => o.order_date >= monthStart && o.status === "completed"
  )

  const monthlyExpenses = expenses.filter(
    (e) => e.expense_date >= monthStart.split("T")[0]
  )

  return {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalRevenue,
    totalExpenses,
    monthlyOrders: monthlyOrders.length,
    monthlyRevenue: monthlyOrders.reduce((sum, o) => sum + o.total_amount, 0),
    monthlyExpenses: monthlyExpenses.reduce((sum, e) => sum + e.amount, 0),
    lowStockProducts,
  }
}

export async function getExchangeRates(baseCurrency: string) {
  const { data, error } = await supabase()
    .from("exchange_rates")
    .select("*")
    .eq("base_currency", baseCurrency)

  if (error) throw error
  return (data || []) as any[]
}
