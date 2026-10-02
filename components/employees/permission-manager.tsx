'use client'

import { useState } from 'react'
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface PermissionManagerProps {
  employee: any
  ownerId: string
  branches: any[]
  isMultiBranch: boolean
  onClose: () => void
}

const PRESETS = {
  viewOnly: {
    can_access_sales: true,
    can_access_inventory: true,
    can_access_accounting: false,
    can_access_crm: false,
    can_access_employees: false,
    can_access_reports: false,
    can_access_ai_features: false,
    can_access_settings: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  },
  cashier: {
    can_access_sales: true,
    can_access_inventory: true,
    can_access_accounting: false,
    can_access_crm: false,
    can_access_employees: false,
    can_access_reports: false,
    can_access_ai_features: false,
    can_access_settings: false,
    can_create: true,
    can_edit: false,
    can_delete: false,
  },
  salesStaff: {
    can_access_sales: true,
    can_access_inventory: true,
    can_access_accounting: false,
    can_access_crm: true,
    can_access_employees: false,
    can_access_reports: false,
    can_access_ai_features: false,
    can_access_settings: false,
    can_create: true,
    can_edit: true,
    can_delete: false,
  },
  manager: {
    can_access_sales: true,
    can_access_inventory: true,
    can_access_accounting: true,
    can_access_crm: true,
    can_access_employees: false,
    can_access_reports: true,
    can_access_ai_features: true,
    can_access_settings: false,
    can_create: true,
    can_edit: true,
    can_delete: false,
  },
}

export function PermissionManager({
  employee, ownerId, branches,
  isMultiBranch, onClose
}: PermissionManagerProps) {
  const existingPerms = employee.employee_permissions?.[0]
  const [perms, setPerms] = useState(
    existingPerms || PRESETS.cashier
  )
  const [selectedBranch, setSelectedBranch] =
    useState(existingPerms?.branch_id || '')
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const toggle = (key: string) => {
    setPerms((p: any) => ({ ...p, [key]: !p[key] }))
  }

  const applyPreset = (preset: keyof typeof PRESETS) => {
    setPerms(PRESETS[preset])
  }

  const save = async () => {
    setIsSaving(true)
    try {
      const payload = {
        owner_id: ownerId,
        employee_id: employee.id,
        branch_id: selectedBranch || null,
        can_access_sales: !!perms.can_access_sales,
        can_access_inventory: !!perms.can_access_inventory,
        can_access_accounting: !!perms.can_access_accounting,
        can_access_crm: !!perms.can_access_crm,
        can_access_employees: !!perms.can_access_employees,
        can_access_reports: !!perms.can_access_reports,
        can_access_ai_features: !!perms.can_access_ai_features,
        can_access_settings: !!perms.can_access_settings,
        can_create: !!perms.can_create,
        can_edit: !!perms.can_edit,
        can_delete: !!perms.can_delete,
        is_active: true,
        updated_at: new Date().toISOString(),
      }

      if (existingPerms?.id) {
        const { error } = await supabase
          .from('employee_permissions')
          .update(payload)
          .eq('id', existingPerms.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('employee_permissions')
          .insert(payload)
        if (error) throw error
      }

      toast.success('Permissions updated ✅')
      onClose()
    } catch (err: any) {
      console.error("Save permissions error:", err)
      toast.error(err?.message || 'Failed to save permissions')
    } finally {
      setIsSaving(false)
    }
  }

  const modules = [
    { key: 'can_access_sales', label: '💰 Sales' },
    { key: 'can_access_inventory', label: '📦 Inventory' },
    { key: 'can_access_accounting', label: '🧾 Accounting' },
    { key: 'can_access_crm', label: '👥 CRM' },
    { key: 'can_access_employees', label: '👨‍💼 Employees' },
    { key: 'can_access_reports', label: '📊 Reports' },
    { key: 'can_access_ai_features', label: '🤖 AI Features' },
    { key: 'can_access_settings', label: '⚙️ Settings' },
  ]

  const actions = [
    { key: 'can_create', label: '➕ Can Create' },
    { key: 'can_edit', label: '✏️ Can Edit' },
    { key: 'can_delete', label: '🗑️ Can Delete' },
  ]

  return (
    <SheetContent side="right" 
      className="w-full max-w-md overflow-y-auto bg-slate-900 border-slate-800 text-white">
      <SheetHeader>
        <SheetTitle className="text-white">
          Permissions for {employee.full_name || employee.email}
        </SheetTitle>
      </SheetHeader>

      <div className="space-y-6 py-4">
        {/* Branch assignment */}
        {isMultiBranch && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">
              Assign to Branch
            </p>
            <select
              value={selectedBranch}
              onChange={(e) =>
                setSelectedBranch(e.target.value)
              }
              className="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800 text-white"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Quick presets */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'viewOnly', label: '👁️ View Only' },
              { key: 'cashier', label: '💼 Cashier' },
              { key: 'salesStaff', label: '🛒 Sales Staff' },
              { key: 'manager', label: '⭐ Manager' },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() =>
                  applyPreset(
                    preset.key as keyof typeof PRESETS
                  )
                }
                className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg bg-slate-800 hover:bg-slate-700 transition text-slate-200"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Module toggles */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-300">
            Module Access
          </p>
          {modules.map((mod) => (
            <div key={mod.key}
              className="flex items-center justify-between bg-slate-800/40 p-2 rounded-lg">
              <span className="text-sm text-slate-200">{mod.label}</span>
              <Switch
                checked={perms[mod.key] || false}
                onCheckedChange={() => toggle(mod.key)}
              />
            </div>
          ))}
        </div>

        {/* Action permissions */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-300">
            Action Permissions
          </p>
          {actions.map((action) => (
            <div key={action.key}
              className="flex items-center justify-between bg-slate-800/40 p-2 rounded-lg">
              <span className="text-sm text-slate-200">{action.label}</span>
              <Switch
                checked={perms[action.key] || false}
                onCheckedChange={() => toggle(action.key)}
              />
            </div>
          ))}
        </div>

        <Button
          onClick={save}
          disabled={isSaving}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? 'Saving...' : 'Save Permissions'}
        </Button>
      </div>
    </SheetContent>
  )
}
