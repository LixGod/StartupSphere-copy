'use client'

import { useBranch } from '@/components/providers/branch-provider'
import { useAuth } from '@/components/providers/auth-provider'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBusinessContext } from '@/lib/hooks/use-business-context'

export function BranchSelector() {
  const { branches: ctxBranches, activeBranchId, setActiveBranch, isOwner } = useBranch()
  const { user } = useAuth()
  const { ownerId } = useBusinessContext()
  const [branches, setBranches] = useState<any[]>(ctxBranches || [])
  const supabase = createClient()

  useEffect(() => {
    const targetOwnerId = isOwner ? user?.id : ownerId
    if (targetOwnerId) {
      // Query business_locations first, fallback to locations
      supabase
        .from('business_locations')
        .select('id, name, address, is_active')
        .eq('owner_id', targetOwnerId)
        .eq('is_active', true)
        .order('name')
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setBranches(data)
          } else {
            supabase
              .from('locations')
              .select('id, name, address, is_active')
              .eq('owner_id', targetOwnerId)
              .eq('is_active', true)
              .order('name')
              .then(({ data: fallbackData }) => {
                setBranches(fallbackData || [])
              })
          }
        })
    }
  }, [isOwner, user?.id, ownerId, supabase])

  // If no branch created or only 1 branch exists, hide the branch selector completely
  if (branches.length <= 1) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branch:</span>
      <select
        value={activeBranchId || "global"}
        onChange={(e) => setActiveBranch(e.target.value === "global" ? null : e.target.value)}
        className="text-xs font-medium border border-slate-800 rounded-lg px-3 py-1.5 
          bg-slate-900 text-white outline-none focus:border-blue-600 transition-all max-w-[190px]"
      >
        <option value="global">All Branches</option>
        {branches.map((b: any) => (
          <option 
            key={b.id} 
            value={b.id}
          >
            {b.name}
          </option>
        ))}
      </select>
    </div>
  )
}
