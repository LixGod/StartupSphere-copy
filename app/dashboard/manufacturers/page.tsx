'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBusinessContext } from '@/lib/hooks/use-business-context'
import { getManufacturers, createManufacturer, deleteManufacturer } from '@/lib/api/manufacturers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Search, Plus, Building, ChevronRight, Phone, Mail, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ManufacturersPage() {
  const { formatPrice, ownerId } = useBusinessContext()
  const router = useRouter()
  const [manufacturers, setManufacturers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'clear'>('all')

  // Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    gstin: '',
    paymentTerms: '30',
    notes: '',
  })

  useEffect(() => {
    if (ownerId) {
      loadManufacturers()
    }
  }, [ownerId])

  const loadManufacturers = async () => {
    setLoading(true)
    try {
      const data = await getManufacturers(ownerId)
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: expData } = await supabase
        .from('expenses')
        .select('id, manufacturer_id, vendor_name, description, amount, amount_paid, balance_due, payment_status')
        .eq('owner_id', ownerId)

      const { data: payData } = await supabase
        .from('payment_transactions')
        .select('reference_id, amount')
        .eq('reference_type', 'purchase')
        .eq('owner_id', ownerId)

      const expenses = expData || []
      const payments = payData || []

      const enriched = data.map((m: any) => {
        const matchingExpenses = expenses.filter((e: any) =>
          (e.manufacturer_id && e.manufacturer_id === m.id) ||
          (e.vendor_name && m.name && e.vendor_name.toLowerCase().includes(m.name.toLowerCase())) ||
          (e.description && m.name && e.description.toLowerCase().includes(m.name.toLowerCase()))
        )

        const matchingExpIds = new Set(matchingExpenses.map((e: any) => e.id))
        const matchingPayments = payments.filter((p: any) => matchingExpIds.has(p.reference_id))

        const calculatedPurchased = matchingExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
        const calculatedPaidFromTx = matchingPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
        const calculatedPaidFromExp = matchingExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount_paid) || 0), 0)
        const totalPaid = Math.max(Number(m.total_paid) || 0, calculatedPaidFromTx, calculatedPaidFromExp)
        const totalPurchased = Math.max(Number(m.total_purchased) || 0, calculatedPurchased)
        const outstanding = Math.max(0, totalPurchased - totalPaid)

        return {
          ...m,
          total_purchased: totalPurchased,
          total_paid: totalPaid,
          outstanding_balance: outstanding,
        }
      })

      setManufacturers(enriched)
    } catch (err: any) {
      console.error('Failed to load manufacturers:', err)
      toast.error('Failed to load suppliers/manufacturers')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateManufacturer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Manufacturer name is required')
      return
    }

    setSaving(true)
    try {
      await createManufacturer({
        owner_id: ownerId,
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        gstin: formData.gstin.trim() || null,
        payment_terms: parseInt(formData.paymentTerms) || 30,
        notes: formData.notes.trim() || null,
      })

      toast.success('Manufacturer profile saved successfully!')
      setShowAddModal(false)
      setFormData({
        name: '', phone: '', email: '', address: '', city: '', gstin: '', paymentTerms: '30', notes: ''
      })
      loadManufacturers()
    } catch (err: any) {
      console.error('Create manufacturer error:', err)
      toast.error(err.message || 'Failed to save manufacturer')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteManufacturer = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete manufacturer "${name}"?`)) return
    try {
      await deleteManufacturer(id)
      toast.success(`Manufacturer "${name}" deleted`)
      loadManufacturers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete manufacturer')
    }
  }

  const filteredManufacturers = manufacturers.filter((m) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      m.name.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))

    if (!matchesSearch) return false

    if (filter === 'outstanding') return (m.outstanding_balance || 0) > 0
    if (filter === 'clear') return (m.outstanding_balance || 0) <= 0
    return true
  })

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-600/20 text-amber-400 rounded-2xl border border-amber-500/20">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Manufacturers & Suppliers</h1>
            <p className="text-slate-400 text-sm">Track vendor profiles, purchase orders, products, and payables</p>
          </div>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 px-5 shadow-lg shadow-amber-950/40 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Manufacturer
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Manufacturers' },
            { id: 'outstanding', label: 'With Outstanding Payable' },
            { id: 'clear', label: 'Paid Up (Clear)' },
          ].map((item) => (
            <Button
              key={item.id}
              variant={filter === item.id ? 'default' : 'outline'}
              onClick={() => setFilter(item.id as any)}
              className={
                filter === item.id
                  ? 'bg-amber-600 text-white font-bold border-amber-500'
                  : 'border-slate-800 text-slate-400 hover:text-white bg-slate-900'
              }
              size="sm"
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search vendor name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-800 text-white h-10 rounded-xl"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Loading manufacturer profiles...</div>
        ) : filteredManufacturers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No manufacturers found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 pl-6">Manufacturer Name</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4">Payment Terms</th>
                  <th className="p-4">Total Purchased</th>
                  <th className="p-4">Total Paid</th>
                  <th className="p-4">Outstanding Balance</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredManufacturers.map((m) => {
                  const outstanding = Number(m.outstanding_balance) || 0
                  return (
                    <tr
                      key={m.id}
                      onClick={() => router.push(`/dashboard/manufacturers/${m.id}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
                            {m.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                              {m.name}
                            </p>
                            {m.city && <p className="text-xs text-slate-500">{m.city}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-300">
                        <div>{m.phone || 'No Phone'}</div>
                        {m.email && <div className="text-xs text-slate-500">{m.email}</div>}
                      </td>
                      <td className="p-4 text-sm text-slate-300">
                        <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                          {m.payment_terms || 30} Days
                        </Badge>
                      </td>
                      <td className="p-4 font-bold text-slate-200">
                        {formatPrice(m.total_purchased || 0)}
                      </td>
                      <td className="p-4 font-bold text-emerald-400">
                        {formatPrice(m.total_paid || 0)}
                      </td>
                      <td className="p-4">
                        {outstanding > 0 ? (
                          <span className="font-bold text-rose-500 bg-rose-950/40 border border-rose-800/50 px-2.5 py-1 rounded-lg text-sm inline-flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {formatPrice(outstanding)}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-400 text-sm">₹0 (Clear)</span>
                        )}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 group-hover:text-white group-hover:bg-amber-600"
                          >
                            View Ledger <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            onClick={(e) => handleDeleteManufacturer(e, m.id, m.name)}
                            title="Delete Manufacturer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Manufacturer Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building className="w-5 h-5 text-amber-400" />
              Add Saved Manufacturer Profile
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a supplier profile for purchase orders, inventory linkage & payables
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateManufacturer} className="space-y-4">
            <div>
              <Label className="text-xs text-slate-300">Manufacturer / Vendor Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Company or Supplier Name"
                className="bg-slate-950 border-slate-800 text-white mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Contact phone"
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="supplier@email.com"
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Surat"
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">GSTIN (Optional)</Label>
                <Input
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  placeholder="22AAAAA0000A1Z5"
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Factory / Office address"
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Payment Terms (Days)</Label>
                <Input
                  type="number"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="30"
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-300">Notes / Product Types</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Textiles, Electronics, Primary raw materials supplier"
                className="bg-slate-950 border-slate-800 text-white mt-1"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="border-slate-800 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {saving ? 'Saving...' : 'Save Manufacturer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
