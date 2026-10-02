'use client'
import { createContext, useContext, useEffect,
  useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'

interface Branch {
  id: string
  name: string
  city: string
}

interface Permissions {
  can_access_sales: boolean
  can_access_inventory: boolean
  can_access_accounting: boolean
  can_access_crm: boolean
  can_access_employees: boolean
  can_access_reports: boolean
  can_access_ai_features: boolean
  can_access_settings: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

const ALL_TRUE: Permissions = {
  can_access_sales: true,
  can_access_inventory: true,
  can_access_accounting: true,
  can_access_crm: true,
  can_access_employees: true,
  can_access_reports: true,
  can_access_ai_features: true,
  can_access_settings: true,
  can_create: true,
  can_edit: true,
  can_delete: true,
}

interface BranchContextType {
  branches: Branch[]
  activeBranchId: string | null
  setActiveBranch: (id: string | null) => void
  isMultiBranch: boolean
  permissions: Permissions
  isOwner: boolean
  isLoading: boolean
  can: (key: keyof Permissions) => boolean
  hasPermissions: boolean
}

const BranchContext = createContext<BranchContextType>({
  branches: [],
  activeBranchId: null,
  setActiveBranch: () => {},
  isMultiBranch: false,
  permissions: ALL_TRUE,
  isOwner: false,
  isLoading: false,
  can: () => true,
  hasPermissions: true,
})

export function BranchProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [activeBranchId, setActiveBranchId] =
    useState<string | null>(null)
  const [permissions, setPermissions] =
    useState<Permissions>(ALL_TRUE)
  const [hasPermissions, setHasPermissions] =
    useState(true)
  const [isLoading, setIsLoading] = useState(false)
  
  // Use ref to prevent re-creating client on render
  const supabaseRef = useRef(createClient())
  const loadedRef = useRef(false)

  const isOwner =
    profile?.role === 'owner' ||
    profile?.role === 'admin'

  useEffect(() => {
    // Only load once per user session
    if (!user?.id || !profile?.role) return
    if (loadedRef.current) return
    
    loadedRef.current = true
    load()
  }, [user?.id, profile?.role])

  const load = async () => {
    setIsLoading(true)
    try {
      const ownerId = isOwner
        ? user!.id
        : profile?.owner_id

      if (!ownerId) {
        // No owner = new employee with no link yet
        setHasPermissions(false)
        return
      }

      // Load branches for this business (business_locations with locations fallback)
      let loadedBranches: Branch[] = []
      const { data: bLocs } = await supabaseRef.current
        .from('business_locations')
        .select('id, name, address')
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('name')

      if (bLocs && bLocs.length > 0) {
        loadedBranches = bLocs.map(b => ({ id: b.id, name: b.name, city: b.address || '' }))
      } else {
        const { data: locs } = await supabaseRef.current
          .from('locations')
          .select('id, name, city')
          .eq('owner_id', ownerId)
          .order('name')
        loadedBranches = (locs || []).map(b => ({ id: b.id, name: b.name, city: b.city || '' }))
      }

      setBranches(loadedBranches)

      if (isOwner) {
        // Owners always have full permissions
        setPermissions(ALL_TRUE)
        setHasPermissions(true)

        // Restore saved branch selection
        try {
          const saved = localStorage.getItem(
            `branch_${user!.id}`
          )
          if (
            saved &&
            loadedBranches.find((b) => b.id === saved)
          ) {
            setActiveBranchId(saved)
          }
        } catch {
          // localStorage unavailable — ignore
        }
      } else {
        // Load employee permissions
        const { data: perm } =
          await supabaseRef.current
            .from('employee_permissions')
            .select('*')
            .eq('employee_id', user!.id)
            .eq('is_active', true)
            .maybeSingle()

        if (perm) {
          setHasPermissions(true)
          setPermissions({
            can_access_sales: perm.can_access_sales,
            can_access_inventory:
              perm.can_access_inventory,
            can_access_accounting:
              perm.can_access_accounting,
            can_access_crm: perm.can_access_crm,
            can_access_employees:
              perm.can_access_employees,
            can_access_reports: perm.can_access_reports,
            can_access_ai_features:
              perm.can_access_ai_features,
            can_access_settings:
              perm.can_access_settings,
            can_create: perm.can_create,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
          })
          if (perm.branch_id) {
            setActiveBranchId(perm.branch_id)
          }
        } else {
          // Employee exists but no permissions set yet
          setHasPermissions(false)
          setPermissions({
            can_access_sales: false,
            can_access_inventory: false,
            can_access_accounting: false,
            can_access_crm: false,
            can_access_employees: false,
            can_access_reports: false,
            can_access_ai_features: false,
            can_access_settings: false,
            can_create: false,
            can_edit: false,
            can_delete: false,
          })
        }
      }
    } catch (err) {
      console.error('BranchProvider error:', err)
      // On error: default to safe state
      // Owners still get access, employees don't
      if (isOwner) {
        setHasPermissions(true)
        setPermissions(ALL_TRUE)
      } else {
        setHasPermissions(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const setActiveBranch = useCallback(
    (id: string | null) => {
      setActiveBranchId(id)
      try {
        if (user) {
          if (id) {
            localStorage.setItem(
              `branch_${user.id}`,
              id
            )
          } else {
            localStorage.removeItem(
              `branch_${user.id}`
            )
          }
          // Notify any components listening via DOM event
          window.dispatchEvent(new Event('branch-change'))
        }
      } catch {
        // localStorage unavailable — ignore
      }
    },
    [user]
  )

  const can = useCallback(
    (key: keyof Permissions): boolean => {
      if (isOwner) return true
      return permissions[key] === true
    },
    [isOwner, permissions]
  )

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranchId,
        setActiveBranch,
        isMultiBranch: branches.length > 1,
        permissions,
        isOwner,
        isLoading,
        can,
        hasPermissions,
      }}
    >
      {children}
    </BranchContext.Provider>
  )
}

export const useBranch = () =>
  useContext(BranchContext)
