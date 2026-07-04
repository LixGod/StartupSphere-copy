"use client"

import { useState, useCallback, useEffect } from "react"
import { 
  getWorkflows, 
  createWorkflow, 
  updateWorkflow, 
  deleteWorkflow 
} from "@/lib/api"
import { useRealTime } from "./use-realtime"

export function useWorkflows(ownerId: string | null) {
  const [loading, setLoading] = useState(true)
  const [workflows, setWorkflows] = useState<any[]>([])
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    if (!ownerId) return
    setLoading(true)
    try {
      const data = await getWorkflows(ownerId)
      setWorkflows(data)
      setError(null)
    } catch (err: any) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealTime({
    table: "workflows",
    filter: ownerId ? `owner_id=eq.${ownerId}` : undefined,
    callback: loadData,
    enabled: !!ownerId
  })

  const addWorkflow = async (workflow: any) => {
    if (!ownerId) return
    const data = await createWorkflow({ ...workflow, owner_id: ownerId })
    return data
  }

  const toggleWorkflow = async (id: string, isActive: boolean) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, is_active: isActive } : w))
    try {
      await updateWorkflow(id, { is_active: isActive })
    } catch (err) {
      loadData()
      throw err
    }
  }

  return {
    loading,
    workflows,
    error,
    refresh: loadData,
    addWorkflow,
    toggleWorkflow,
    removeWorkflow: deleteWorkflow,
    editWorkflow: updateWorkflow
  }
}
