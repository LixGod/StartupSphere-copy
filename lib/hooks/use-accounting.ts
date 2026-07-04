"use client"

import { useState, useCallback, useEffect } from "react"
import { 
  getInvoices, 
  getExpenses, 
  getOrders,
  getLocations,
  createInvoice,
  createExpense,
  deleteInvoice,
  deleteExpense,
  deleteInvoices,
  deleteExpenses
} from "@/lib/api"
import type { Invoice, Expense, SalesOrder, BusinessLocation } from "@/lib/types"
import { useRealTime } from "./use-realtime"

export function useAccounting(ownerId: string | null, selectedLocationId: string = "global") {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [locations, setLocations] = useState<BusinessLocation[]>([])
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    if (!ownerId) return
    setLoading(true)
    try {
      const [invoicesData, expensesData, ordersData, locationsData] = await Promise.all([
        getInvoices(ownerId),
        getExpenses(ownerId),
        getOrders(ownerId),
        getLocations(ownerId)
      ])

      setInvoices(invoicesData)
      setExpenses(expensesData)
      setOrders(ordersData)
      setLocations(locationsData)
      setError(null)
    } catch (err: any) {
      console.error("Error loading accounting data:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time
  useRealTime({
    table: "invoices",
    filter: ownerId ? `owner_id=eq.${ownerId}` : undefined,
    callback: loadData,
    enabled: !!ownerId
  })

  useRealTime({
    table: "expenses",
    filter: ownerId ? `owner_id=eq.${ownerId}` : undefined,
    callback: loadData,
    enabled: !!ownerId
  })

  return {
    loading,
    invoices,
    expenses,
    orders,
    locations,
    error,
    refresh: loadData,
    addInvoice: createInvoice,
    addExpense: createExpense,
    removeInvoice: deleteInvoice,
    removeExpense: deleteExpense,
    deleteInvoices,
    deleteExpenses
  }
}
