'use client'

import { usePermissions } from '@/lib/hooks/use-permissions'
import { useAuth } from '@/components/providers/auth-provider'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function BranchSelector() {
  const { isOwner, assignedBranches, activeBranchId, setActiveBranch } = usePermissions()
  const { user } = useAuth()
  const [ownerBranches, setOwnerBranches] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (isOwner && user) {
      // Owner sees all their active branches
      supabase
        .from('locations')
        .select('id, name, type, city:address') // city:address fallback
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .then(({ data }: { data: any[] | null }) => setOwnerBranches(data || []))
    }
  }, [isOwner, user, supabase])

  const branches = isOwner ? ownerBranches : assignedBranches
  
  // If not owner and has no branches, display nothing (will be handled by page-level check)
  if (!isOwner && branches.length === 0) return null

  // If there's only 1 branch, no need to select, unless it's the owner who can toggle "All Branches"
  if (!isOwner && branches.length <= 1) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch:</span>
      <select
        value={activeBranchId || ''}
        onChange={(e) => setActiveBranch(e.target.value)}
        className="text-xs font-medium border border-slate-800 rounded-lg px-3 py-1.5 
          bg-slate-900 text-white outline-none focus:border-blue-600 transition-all max-w-[180px]"
      >
        {isOwner && (
          <option value="">All Branches</option>
        )}
        {branches.map((b: any) => (
          <option 
            key={b.branch_id || b.id} 
            value={b.branch_id || b.id}
          >
            {b.branch_name || b.name}
          </option>
        ))}
      </select>
    </div>
  )
}
