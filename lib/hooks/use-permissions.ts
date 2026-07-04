'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useBusinessContext } from '@/lib/hooks/use-business-context'

export interface BranchPermissions {
  branch_id: string
  branch_name: string
  can_view_sales: boolean
  can_create_sales: boolean
  can_delete_sales: boolean
  can_view_inventory: boolean
  can_edit_inventory: boolean
  can_delete_inventory: boolean
  can_view_customers: boolean
  can_edit_customers: boolean
  can_view_expenses: boolean
  can_view_reports: boolean
  can_view_employees: boolean
  is_branch_manager: boolean
}

interface UsePermissionsReturn {
  isOwner: boolean
  activeBranchId: string | null
  assignedBranches: BranchPermissions[]
  currentPermissions: BranchPermissions | null
  isLoading: boolean
  setActiveBranch: (branchId: string) => Promise<void>
  can: (permission: keyof BranchPermissions) => boolean
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth()
  const { profile } = useBusinessContext()
  const [assignedBranches, setAssignedBranches] = useState<BranchPermissions[]>([])
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const isOwner = profile?.role === 'owner' || profile?.is_super_admin === true

  const loadPermissions = useCallback(async () => {
    if (!user || !profile) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      if (isOwner) {
        // Owners have all permissions on all branches
        // Fetch active branch from profile if it exists
        if (profile.active_branch_id) {
          setActiveBranchId(profile.active_branch_id)
        }
        setIsLoading(false)
        return
      }

      // Load employee branch assignments
      const { data, error } = await supabase
        .from('employee_branch_assignments')
        .select(`
          *,
          locations:branch_id (id, name)
        `)
        .eq('employee_id', user.id)
        .eq('is_active', true)

      if (error) throw error

      const branches: BranchPermissions[] = (data || []).map((a: any) => ({
        branch_id: a.branch_id,
        branch_name: a.locations?.name || 'Unknown Branch',
        can_view_sales: a.can_view_sales,
        can_create_sales: a.can_create_sales,
        can_delete_sales: a.can_delete_sales,
        can_view_inventory: a.can_view_inventory,
        can_edit_inventory: a.can_edit_inventory,
        can_delete_inventory: a.can_delete_inventory,
        can_view_customers: a.can_view_customers,
        can_edit_customers: a.can_edit_customers,
        can_view_expenses: a.can_view_expenses,
        can_view_reports: a.can_view_reports,
        can_view_employees: a.can_view_employees,
        is_branch_manager: a.is_branch_manager,
      }))

      setAssignedBranches(branches)

      // Set active branch from profile or first assignment
      const savedBranch = profile?.active_branch_id
      if (savedBranch && branches.find(b => b.branch_id === savedBranch)) {
        setActiveBranchId(savedBranch)
      } else if (branches.length > 0) {
        setActiveBranchId(branches[0].branch_id)
      } else {
        setActiveBranchId(null)
      }

    } catch (err) {
      console.error('Failed to load permissions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user, profile, isOwner, supabase])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  const setActiveBranch = async (branchId: string) => {
    setActiveBranchId(branchId || null)
    // Save to profile so it persists
    if (user) {
      await supabase
        .from('profiles')
        .update({ active_branch_id: branchId || null })
        .eq('id', user.id)
    }
  }

  const currentPermissions = activeBranchId
    ? assignedBranches.find(b => b.branch_id === activeBranchId) || null
    : null

  // Permission checker
  const can = useCallback((permission: keyof BranchPermissions): boolean => {
    if (isOwner) return true // owners can do everything
    if (!currentPermissions) return false
    const val = currentPermissions[permission]
    return typeof val === 'boolean' ? val : false
  }, [isOwner, currentPermissions])

  return {
    isOwner,
    activeBranchId,
    assignedBranches,
    currentPermissions,
    isLoading,
    setActiveBranch,
    can,
  }
}
