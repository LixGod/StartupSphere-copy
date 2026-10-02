'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBusinessContext } from '@/lib/hooks/use-business-context'
import { getSavedCustomers, createSavedCustomer, deleteSavedCustomer } from '@/lib/api/customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Search, Plus, Users, Trophy, ChevronRight, Phone, Mail, MapPin, IndianRupee, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function CustomersPage() {
  const { profile, formatPrice, ownerId } = useBusinessContext()
  const router = useRouter()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'outstanding' | 'paid' | 'new'>('all')

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
    creditLimit: '0',
    notes: '',
  })

  useEffect(() => {
    if (ownerId) {
      loadCustomers()
    }
  }, [ownerId])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const data = await getSavedCustomers(ownerId)
      const supabase = createClient()
      const { data: salesData } = await supabase
        .from('sales_orders')
        .select('id, customer_id, customer_name, customer_phone, total_amount, amount_paid, balance_due, payment_status, status')
        .eq('owner_id', ownerId)

      const { data: paymentsData } = await supabase
        .from('payment_transactions')
        .select('reference_id, amount')
        .eq('reference_type', 'sale')

      const orders = (salesData || []).filter((o: any) => o.status !== 'cancelled' && o.payment_status !== 'cancelled')
      const payments = paymentsData || []

      const enriched = data.map((cust: any) => {
        const matchingOrders = orders.filter((o: any) => 
          (o.customer_id && o.customer_id === cust.id) ||
          (cust.phone && o.customer_phone && o.customer_phone.trim() === cust.phone.trim()) ||
          (cust.name && o.customer_name && o.customer_name.trim().toLowerCase() === cust.name.trim().toLowerCase())
        )

        let calculatedPurchases = 0
        let calculatedPaid = 0
        let calculatedOutstanding = 0

        matchingOrders.forEach((o: any) => {
          const ordPayments = payments.filter((p: any) => p.reference_id === o.id)
          const paidTxSum = ordPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
          const totAmt = Number(o.total_amount) || 0
          const amtPaid = Math.max(Number(o.amount_paid) || 0, paidTxSum)
          const balDue = Math.max(0, totAmt - amtPaid)
          const isPaid = balDue <= 0 || o.payment_status === 'paid'

          calculatedPurchases += totAmt
          calculatedPaid += amtPaid
          if (!isPaid) {
            calculatedOutstanding += balDue
          }
        })

        return {
          ...cust,
          total_purchases: calculatedPurchases,
          total_paid: calculatedPaid,
          outstanding_balance: calculatedOutstanding,
        }
      })

      setCustomers(enriched)
    } catch (err: any) {
      console.error('Failed to load customers:', err)
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Customer name is required')
      return
    }

    setSaving(true)
    try {
      await createSavedCustomer({
        owner_id: ownerId,
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        gstin: formData.gstin.trim() || null,
        credit_limit: parseFloat(formData.creditLimit) || 0,
        notes: formData.notes.trim() || null,
      })

      toast.success('Customer profile saved successfully!')
      setShowAddModal(false)
      setFormData({
        name: '', phone: '', email: '', address: '', city: '', gstin: '', creditLimit: '0', notes: ''
      })
      loadCustomers()
    } catch (err: any) {
      console.error('Create customer error:', err)
      toast.error(err.message || 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCustomer = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete customer "${name}"?`)) return
    try {
      await deleteSavedCustomer(id)
      toast.success(`Customer "${name}" deleted`)
      loadCustomers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer')
    }
  }

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))

    if (!matchesSearch) return false

    if (filter === 'outstanding') return (c.outstanding_balance || 0) > 0
    if (filter === 'paid') return (c.outstanding_balance || 0) <= 0
    if (filter === 'new') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      return c.created_at >= thirtyDaysAgo
    }
    return true
  })

  // Top 10 Customers by total_purchases
  const topCustomers = [...customers]
    .sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0))
    .slice(0, 10)

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Customer Ledger</h1>
            <p className="text-slate-400 text-sm">Manage customer profiles, orders, balances, and payment history</p>
          </div>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-5 shadow-lg shadow-blue-950/40 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <Tabs defaultValue="all-customers" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger value="all-customers" className="data-[state=active]:bg-blue-600 px-6">
              All Customers ({customers.length})
            </TabsTrigger>
            <TabsTrigger value="top-customers" className="data-[state=active]:bg-amber-600 px-6 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-300" /> Top Customers
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search by name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-800 text-white h-10 rounded-xl"
            />
          </div>
        </div>

        <TabsContent value="all-customers" className="space-y-6">
          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Customers' },
              { id: 'outstanding', label: 'With Outstanding' },
              { id: 'paid', label: 'Paid Up' },
              { id: 'new', label: 'New (Last 30 Days)' },
            ].map((item) => (
              <Button
                key={item.id}
                variant={filter === item.id ? 'default' : 'outline'}
                onClick={() => setFilter(item.id as any)}
                className={
                  filter === item.id
                    ? 'bg-blue-600 text-white font-bold border-blue-500'
                    : 'border-slate-800 text-slate-400 hover:text-white bg-slate-900'
                }
                size="sm"
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Customer Table / List */}
          <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400 animate-pulse">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No customers found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="p-4 pl-6">Customer Name</th>
                      <th className="p-4">Contact Details</th>
                      <th className="p-4">Total Purchases</th>
                      <th className="p-4">Total Paid</th>
                      <th className="p-4">Outstanding Balance</th>
                      <th className="p-4 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCustomers.map((customer) => {
                      const outstanding = Number(customer.outstanding_balance) || 0
                      return (
                        <tr
                          key={customer.id}
                          onClick={() => router.push(`/dashboard/customers/${customer.id}`)}
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
                                {customer.name[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                                  {customer.name}
                                </p>
                                {customer.city && <p className="text-xs text-slate-500">{customer.city}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-slate-300">
                            <div>{customer.phone || 'No Phone'}</div>
                            {customer.email && <div className="text-xs text-slate-500">{customer.email}</div>}
                          </td>
                          <td className="p-4 font-bold text-slate-200">
                            {formatPrice(customer.total_purchases || 0)}
                          </td>
                          <td className="p-4 font-bold text-emerald-400">
                            {formatPrice(customer.total_paid || 0)}
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
                                className="text-slate-400 group-hover:text-white group-hover:bg-blue-600"
                              >
                                View Ledger <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                onClick={(e) => handleDeleteCustomer(e, customer.id, customer.name)}
                                title="Delete Customer"
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
        </TabsContent>

        {/* Feature 7: Top Customers Tab */}
        <TabsContent value="top-customers">
          <Card className="bg-slate-900 border-slate-800 p-6 overflow-hidden shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Top 10 Customers by Lifetime Spend
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topCustomers.map((c, index) => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/dashboard/customers/${c.id}`)}
                  className="bg-slate-950 border border-slate-800 p-4 rounded-2xl hover:border-amber-500/50 transition-all cursor-pointer relative overflow-hidden"
                >
                  {index === 0 && (
                    <div className="absolute top-3 right-3 bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                      👑 #1 Customer
                    </div>
                  )}
                  {index > 0 && (
                    <div className="absolute top-3 right-3 text-slate-500 text-xs font-bold">
                      #{index + 1}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-400 text-lg">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{c.name}</h4>
                      <p className="text-xs text-slate-400">{c.phone || c.email || 'No contact'}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center">
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Total Spent</p>
                      <p className="text-base font-black text-emerald-400">{formatPrice(c.total_purchases || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Outstanding</p>
                      <p className={`text-sm font-bold ${(c.outstanding_balance || 0) > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {formatPrice(c.outstanding_balance || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Customer Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Add Saved Customer Profile
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a permanent profile for customer credit limits & ledger tracking
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div>
              <Label className="text-xs text-slate-300">Customer Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Full customer or business name"
                className="bg-slate-950 border-slate-800 text-white mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="10-digit mobile"
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-xs text-slate-300">Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="customer@email.com"
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
                  placeholder="e.g. Mumbai"
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

            <div>
              <Label className="text-xs text-slate-300">Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Billing / Shipping address"
                className="bg-slate-950 border-slate-800 text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">Credit Limit (₹)</Label>
              <Input
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                placeholder="0 for no limit"
                className="bg-slate-950 border-slate-800 text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-slate-300">Notes / Tags</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="VIP customer, Wholesale, etc."
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {saving ? 'Saving...' : 'Save Customer Profile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
