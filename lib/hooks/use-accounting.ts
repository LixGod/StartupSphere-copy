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
  const [error, setError] = useState<Error | null>(null);
  console.log('useAccounting hook - selectedLocationId:', selectedLocationId);

  const loadData = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const [invoicesData, expensesData, ordersData, locationsData] = await Promise.all([
        getInvoices(ownerId),
        getExpenses(ownerId),
        getOrders(ownerId),
        getLocations(ownerId)
      ]);

      // Filter by location if not global
      const filteredInvoices = selectedLocationId === "global" ? invoicesData : invoicesData.filter(inv => inv.location_id === selectedLocationId);
      const filteredExpenses = selectedLocationId === "global" ? expensesData : expensesData.filter(exp => exp.location_id === selectedLocationId);
      const filteredOrders = selectedLocationId === "global" ? ordersData : ordersData.filter(ord => ord.location_id === selectedLocationId);

      setInvoices(filteredInvoices);
      setExpenses(filteredExpenses);
      setOrders(filteredOrders);
      setLocations(locationsData);
      setError(null);
    } catch (err: any) {
      console.error("Error loading accounting data:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [ownerId, selectedLocationId]);

  // Reload when selected location changes
  useEffect(() => {
    loadData();
  }, [loadData]);

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
