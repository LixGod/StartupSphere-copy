'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { X, Shield, Plus, Trash2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface BranchAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  employee: {
    id: string
    email: string
  }
}

export function BranchAssignmentModal({ isOpen, onClose, employee }: BranchAssignmentModalProps) {
  const [locations, setLocations] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load all owner's locations
      const { data: locs, error: locError } = await supabase
        .from('locations')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (locError) throw locError
      setLocations(locs || [])

      // Load existing assignments for this employee
      const { data: assigns, error: assignError } = await supabase
        .from('employee_branch_assignments')
        .select('*')
        .eq('employee_id', employee.id)

      if (assignError) throw assignError
      setAssignments(assigns || [])

    } catch (err) {
      console.error('Failed to load assignments:', err)
      toast.error('Failed to load branch data')
    } finally {
      setLoading(false)
    }
  }, [employee.id, supabase])

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, loadData])

  const handleAddBranch = async (branchId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const newAssign = {
        owner_id: user.id,
        employee_id: employee.id,
        branch_id: branchId,
        can_view_sales: true,
        can_create_sales: true,
        can_delete_sales: false,
        can_view_inventory: true,
        can_edit_inventory: false,
        can_delete_inventory: false,
        can_view_customers: true,
        can_edit_customers: false,
        can_view_expenses: false,
        can_view_reports: false,
        can_view_employees: false,
        is_branch_manager: false,
        is_active: true
      }

      const { data, error } = await supabase
        .from('employee_branch_assignments')
        .insert(newAssign)
        .select()
        .single()

      if (error) throw error

      setAssignments(prev => [...prev, data])
      toast.success('Branch assigned successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to assign branch')
    }
  }

  const handleRemoveBranch = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('employee_branch_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
      toast.success('Branch removed from employee')
    } catch (err) {
      console.error(err)
      toast.error('Failed to remove branch')
    }
  }

  const handlePermissionToggle = async (assignmentId: string, field: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_branch_assignments')
        .update({ [field]: !currentValue, updated_at: new Date().toISOString() })
        .eq('id', assignmentId)

      if (error) throw error

      setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, [field]: !currentValue } : a))
    } catch (err) {
      console.error(err)
      toast.error('Failed to update permission')
    }
  }

  const applyPreset = async (assignmentId: string, preset: 'cashier' | 'staff' | 'manager' | 'view') => {
    let permissions = {}
    if (preset === 'cashier') {
      permissions = {
        can_view_sales: true,
        can_create_sales: true,
        can_delete_sales: false,
        can_view_inventory: false,
        can_edit_inventory: false,
        can_delete_inventory: false,
        can_view_customers: false,
        can_edit_customers: false,
        can_view_expenses: false,
        can_view_reports: false,
        can_view_employees: false,
      }
    } else if (preset === 'staff') {
      permissions = {
        can_view_sales: true,
        can_create_sales: true,
        can_delete_sales: false,
        can_view_inventory: true,
        can_edit_inventory: false,
        can_delete_inventory: false,
        can_view_customers: true,
        can_edit_customers: false,
        can_view_expenses: false,
        can_view_reports: false,
        can_view_employees: false,
      }
    } else if (preset === 'manager') {
      permissions = {
        can_view_sales: true,
        can_create_sales: true,
        can_delete_sales: false,
        can_view_inventory: true,
        can_edit_inventory: true,
        can_delete_inventory: false,
        can_view_customers: true,
        can_edit_customers: true,
        can_view_expenses: true,
        can_view_reports: true,
        can_view_employees: false,
        is_branch_manager: true
      }
    } else if (preset === 'view') {
      permissions = {
        can_view_sales: true,
        can_create_sales: false,
        can_delete_sales: false,
        can_view_inventory: true,
        can_edit_inventory: false,
        can_delete_inventory: false,
        can_view_customers: true,
        can_edit_customers: false,
        can_view_expenses: true,
        can_view_reports: true,
        can_view_employees: true,
      }
    }

    try {
      const { error } = await supabase
        .from('employee_branch_assignments')
        .update({ ...permissions, updated_at: new Date().toISOString() })
        .eq('id', assignmentId)

      if (error) throw error

      setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, ...permissions } : a))
      toast.success('Preset applied successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to apply preset')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div>
            <h3 className="text-xl font-bold text-white">Branch Access Control</h3>
            <p className="text-xs text-slate-400 mt-1">Configure permissions for {employee.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900">
          {loading ? (
            <div className="text-center text-slate-400 py-12">Loading branches & permissions...</div>
          ) : (
            <div className="space-y-6">
              {/* Assigned Branches */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Assigned Branches</h4>
                {assignments.length === 0 ? (
                  <div className="text-center py-8 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-sm">
                    No branches currently assigned. Select an available branch below.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map(a => {
                      const loc = locations.find(l => l.id === a.branch_id)
                      if (!loc) return null

                      return (
                        <div key={a.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-bold text-white text-base">{loc.name}</h5>
                              <p className="text-xs text-slate-400 mt-0.5">{loc.address}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              onClick={() => handleRemoveBranch(a.id)}
                              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Remove Branch
                            </Button>
                          </div>

                          {/* Preset Actions */}
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="text-xs font-semibold text-slate-500">Presets:</span>
                            <Button size="sm" variant="outline" className="text-[10px] h-7 border-slate-800" onClick={() => applyPreset(a.id, 'cashier')}>Cashier</Button>
                            <Button size="sm" variant="outline" className="text-[10px] h-7 border-slate-800" onClick={() => applyPreset(a.id, 'staff')}>Sales Staff</Button>
                            <Button size="sm" variant="outline" className="text-[10px] h-7 border-slate-800" onClick={() => applyPreset(a.id, 'manager')}>Manager</Button>
                            <Button size="sm" variant="outline" className="text-[10px] h-7 border-slate-800" onClick={() => applyPreset(a.id, 'view')}>View Only</Button>
                          </div>

                          {/* Permissions Checklist */}
                          <div className="border-t border-slate-800/80 pt-4 space-y-3">
                            <div className="flex items-center justify-between pb-1">
                              <span className="text-xs font-bold text-slate-400">Branch Manager Status</span>
                              <button
                                onClick={() => handlePermissionToggle(a.id, 'is_branch_manager', a.is_branch_manager)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                                  a.is_branch_manager 
                                    ? 'bg-blue-600/20 text-blue-400 border-blue-600/30' 
                                    : 'bg-slate-900 text-slate-500 border-slate-800'
                                }`}
                              >
                                {a.is_branch_manager ? 'Branch Manager' : 'Regular Staff'}
                              </button>
                            </div>

                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Detailed Permissions</span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {[
                                { key: 'can_view_sales', label: 'View Sales' },
                                { key: 'can_create_sales', label: 'Create Sales' },
                                { key: 'can_delete_sales', label: 'Delete Sales' },
                                { key: 'can_view_inventory', label: 'View Inventory' },
                                { key: 'can_edit_inventory', label: 'Edit/Add Inventory' },
                                { key: 'can_delete_inventory', label: 'Delete Inventory' },
                                { key: 'can_view_customers', label: 'View Customers' },
                                { key: 'can_edit_customers', label: 'Edit Customers' },
                                { key: 'can_view_expenses', label: 'View Expenses' },
                                { key: 'can_view_reports', label: 'View Reports' },
                                { key: 'can_view_employees', label: 'View Employees' }
                              ].map(p => (
                                <button
                                  key={p.key}
                                  onClick={() => handlePermissionToggle(a.id, p.key, a[p.key])}
                                  className={`flex items-center gap-2 px-3 py-2 text-left text-xs rounded-lg border transition-all ${
                                    a[p.key] 
                                      ? 'bg-blue-900/10 border-blue-600/30 text-blue-400' 
                                      : 'bg-slate-900/50 border-slate-800/80 text-slate-500 hover:border-slate-700'
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                    a[p.key] ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700'
                                  }`}>
                                    {a[p.key] && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span>{p.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Available Branches to Add */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Assign to New Branch</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {locations
                    .filter(loc => !assignments.some(a => a.branch_id === loc.id))
                    .map(loc => (
                      <div 
                        key={loc.id} 
                        className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition-all"
                      >
                        <div>
                          <p className="font-bold text-white text-sm">{loc.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{loc.type.toUpperCase()} · {loc.address}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddBranch(loc.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-xs shrink-0"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                    ))}
                  {locations.filter(loc => !assignments.some(a => a.branch_id === loc.id)).length === 0 && (
                    <div className="text-[11px] text-slate-600 italic">No other branches available for assignment</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <Button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white px-6">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
