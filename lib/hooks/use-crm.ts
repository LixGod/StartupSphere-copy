"use client"

import { useState, useCallback, useEffect } from "react"
import { 
  getDeals, 
  getContacts, 
  getCompanies, 
  getPipelineStages, 
  updateDeal, 
  createDeal, 
  createContact, 
  updateContact,
  createPipelineStage,
  deleteContact,
  deleteContacts
} from "@/lib/api"
import type { Deal, Contact, Company, PipelineStage } from "@/lib/types"
import { useRealTime } from "./use-realtime"

export function useCRM(ownerId: string | null) {
  const [loading, setLoading] = useState(true)
  const [deals, setDeals] = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    if (!ownerId) return
    setLoading(true)
    try {
      const [dealsData, contactsData, companiesData, stagesData] = await Promise.all([
        getDeals(ownerId),
        getContacts(ownerId),
        getCompanies(ownerId),
        getPipelineStages(ownerId),
      ])
      setDeals(dealsData)
      setContacts(contactsData)
      setCompanies(companiesData)
      setStages(stagesData)
      setError(null)
    } catch (err: any) {
      console.error("Error loading CRM data:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [ownerId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time subscriptions
  useRealTime({
    table: "deals",
    filter: ownerId ? `owner_id=eq.${ownerId}` : undefined,
    callback: loadData,
    enabled: !!ownerId
  })

  useRealTime({
    table: "contacts",
    filter: ownerId ? `owner_id=eq.${ownerId}` : undefined,
    callback: loadData,
    enabled: !!ownerId
  })

  useRealTime({
    table: "pipeline_stages",
    filter: ownerId ? `owner_id=eq.${ownerId}` : undefined,
    callback: loadData,
    enabled: !!ownerId
  })

  const moveDeal = async (dealId: string, stageId: string) => {
    // Optimistic UI update
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_id: stageId } : d))
    try {
      await updateDeal(dealId, { stage_id: stageId })
    } catch (err) {
      loadData() // Revert on error
      throw err
    }
  }

  const addLead = async (contact: Partial<Contact> & { first_name: string }) => {
    if (!ownerId) return
    const newContact = await createContact({ ...contact, owner_id: ownerId })
    return newContact
  }

  const addDeal = async (deal: Partial<Deal> & { title: string }) => {
    if (!ownerId) return
    const newDeal = await createDeal({ ...deal, owner_id: ownerId })
    return newDeal
  }

  const bulkDeleteLeads = async (ids: string[]) => {
    try {
      await deleteContacts(ids)
    } catch (err) {
      console.error("Error deleting leads:", err)
      throw err
    }
  }

  const updateLead = async (id: string, updates: Partial<Contact>) => {
    try {
      await updateContact(id, updates)
    } catch (err) {
      console.error("Error updating lead:", err)
      throw err
    }
  }

  const addStage = async (name: string) => {
    if (!ownerId) return
    const newStage = await createPipelineStage({ 
      owner_id: ownerId, 
      name, 
      order_index: stages.length,
      is_default: false,
      probability: 100 
    })
    return newStage
  }

  return {
    loading,
    deals,
    contacts,
    companies,
    stages,
    error,
    refresh: loadData,
    moveDeal,
    addLead,
    updateLead,
    addDeal,
    bulkDeleteLeads,
    addStage
  }
}
