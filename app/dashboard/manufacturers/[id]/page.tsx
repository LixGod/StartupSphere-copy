'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBusinessContext } from '@/lib/hooks/use-business-context'
import { getManufacturerById, updateManufacturer, deleteManufacturer } from '@/lib/api/manufacturers'
import { PaymentSheet } from '@/components/ui/payment-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
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
import {
  ArrowLeft, Edit, Plus, Building, Phone, Mail, FileText, Package,
  AlertTriangle, DollarSign, Calendar, CheckCircle2, Trash2
} from 'lucide-react'
import { toast } from 'sonner'

export default function ManufacturerDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { formatPrice, ownerId } = useBusinessContext()

  const [manufacturer, setManufacturer] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Payment Sheet state
  const [paymentSheetState, setPaymentSheetState] = useState<{ open: boolean; expense: any | null }>({
    open: false,
    expense: null,
  })

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '', phone: '', email: '', address: '', city: '', gstin: '', paymentTerms: '30', notes: ''
  })

  const supabase = createClient()

  useEffect(() => {
    if (id) {
      loadManufacturerDetails()
    }
  }, [id])

  const loadManufacturerDetails = async () => {
    setLoading(true)
    try {
      // 1. Fetch manufacturer
      const m = await getManufacturerById(id)
      setManufacturer(m)

      if (m) {
        setEditFormData({
          name: m.name || '',
          phone: m.phone || '',
          email: m.email || '',
          address: m.address || '',
          city: m.city || '',
          gstin: m.gstin || '',
          paymentTerms: String(m.payment_terms || 30),
          notes: m.notes || '',
        })

        // 2. Fetch linked expenses/purchases
        const { data: expData } = await supabase
          .from('expenses')
          .select('*')
          .eq('owner_id', m.owner_id)
          .order('expense_date', { ascending: false })

        const mExpenses = (expData || []).filter((e: any) => {
          if (e.category === 'Cost of Goods Sold' || e.category?.toLowerCase().includes('cogs')) return false
          if (e.manufacturer_id && e.manufacturer_id === m.id) return true
          if (e.vendor_name && m.name && e.vendor_name.toLowerCase().includes(m.name.toLowerCase())) return true
          if (e.description && m.name && e.description.toLowerCase().includes(m.name.toLowerCase())) return true
          return false
        })
        // 2. Fetch linked expenses/purchases & linked payments
        const expIds = mExpenses.map((e: any) => e.id)
        let payData: any[] = []
        if (expIds.length > 0) {
          const { data: pData } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('reference_type', 'purchase')
            .in('reference_id', expIds)
            .order('created_at', { ascending: false })
          payData = pData || []
        }
        setPayments(payData)

        // Enrich expenses with actual payments recorded
        const enrichedExpenses = mExpenses.map((e: any) => {
          const matchingPayments = payData.filter((p: any) => p.reference_id === e.id)
          const sumPaidFromTx = matchingPayments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
          const totalAmt = Number(e.amount) || 0
          const amtPaid = Math.max(Number(e.amount_paid) || 0, sumPaidFromTx)
          const balDue = Math.max(0, totalAmt - amtPaid)
          const isPaid = amtPaid >= totalAmt || e.payment_status === 'paid'

          return {
            ...e,
            amount_paid: amtPaid,
            balance_due: balDue,
            payment_status: isPaid ? 'paid' : (amtPaid > 0 ? 'partial' : 'unpaid')
          }
        })

        setExpenses(enrichedExpenses)

        // 4. Fetch linked products
        const { data: prodData } = await supabase
          .from('products')
          .select('*')
          .or(`manufacturer_id.eq.${m.id},manufacturer_name.ilike.%${m.name}%`)
          .order('name')
        setProducts(prodData || [])

        // 5. Fetch linked purchase orders
        const { data: poData } = await supabase
          .from('purchase_orders')
          .select('*, purchase_order_items(*)')
          .eq('manufacturer_id', m.id)
          .order('created_at', { ascending: false })
        setPurchaseOrders(poData || [])
      }
    } catch (err: any) {
      console.error('Error loading manufacturer details:', err)
      toast.error('Failed to load manufacturer ledger')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateManufacturer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateManufacturer(id, {
        name: editFormData.name,
        phone: editFormData.phone || null,
        email: editFormData.email || null,
        address: editFormData.address || null,
        city: editFormData.city || null,
        gstin: editFormData.gstin || null,
        payment_terms: parseInt(editFormData.paymentTerms) || 30,
        notes: editFormData.notes || null,
      })

      toast.success('Manufacturer profile updated!')
      setShowEditModal(false)
      loadManufacturerDetails()
    } catch (err: any) {
      toast.error('Failed to update manufacturer')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteManufacturer = async () => {
    if (!manufacturer) return
    if (!confirm(`Are you sure you want to delete manufacturer profile "${manufacturer.name}"?`)) return
    try {
      await deleteManufacturer(manufacturer.id)
      toast.success(`Manufacturer "${manufacturer.name}" deleted`)
      router.push('/dashboard/manufacturers')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete manufacturer')
    }
  }

  const calculatedPurchased = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  const totalPurchased = Math.max(Number(manufacturer?.total_purchased) || 0, calculatedPurchased)
  const calculatedPaid = expenses.reduce((sum, e) => sum + (Number(e.amount_paid) || 0), 0)
  const totalPaid = Math.max(Number(manufacturer?.total_paid) || 0, calculatedPaid)
  const totalOutstanding = Math.max(0, totalPurchased - totalPaid)

  const displayExpenses = expenses.length > 0 ? expenses : (totalPurchased > 0 ? [{
    id: 'initial-purchase-entry',
    expense_date: new Date(manufacturer?.created_at || Date.now()).toISOString().split('T')[0],
    category: 'Inventory Purchase',
    description: `Opening purchase balance for ${manufacturer?.name}`,
    amount: totalPurchased,
    amount_paid: totalPaid,
    balance_due: totalOutstanding,
    payment_status: totalOutstanding <= 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'unpaid')
  }] : [])

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading manufacturer ledger details...
      </div>
    )
  }

  if (!manufacturer) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="text-xl font-bold text-white mb-2">Manufacturer Not Found</p>
        <Button onClick={() => router.push('/dashboard/manufacturers')} variant="outline" className="border-slate-800">
          Back to Manufacturers List
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => router.push('/dashboard/manufacturers')}
          variant="outline"
          className="border-slate-800 text-slate-400 hover:text-white bg-slate-900"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Manufacturers
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowEditModal(true)}
            variant="outline"
            className="border-slate-800 text-amber-400 hover:bg-amber-600/10"
            size="sm"
          >
            <Edit className="w-4 h-4 mr-2" /> Edit Manufacturer Profile
          </Button>
          <Button
            onClick={handleDeleteManufacturer}
            variant="outline"
            className="border-rose-900/50 text-rose-400 hover:bg-rose-600/10"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete Manufacturer
          </Button>
        </div>
      </div>

      {/* Manufacturer Header Card */}
      <Card className="bg-slate-900 border-slate-800 p-6 rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-2xl">
              {manufacturer.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white">{manufacturer.name}</h1>
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                  {manufacturer.payment_terms || 30} Days Terms
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                {manufacturer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" /> {manufacturer.phone}
                  </span>
                )}
                {manufacturer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" /> {manufacturer.email}
                  </span>
                )}
                {manufacturer.gstin && (
                  <span className="bg-slate-950 px-2 py-0.5 rounded text-slate-300 font-mono text-[11px]">
                    GST: {manufacturer.gstin}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Outstanding Payables Box */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-wrap gap-6 items-center justify-between min-w-[280px]">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Outstanding Payable</p>
              <p className={`text-3xl font-black mt-1 ${totalOutstanding > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                {formatPrice(totalOutstanding)}
              </p>
            </div>
            <div className="text-right border-l border-slate-800 pl-4">
              <p className="text-[11px] text-slate-500">Total Purchased</p>
              <p className="text-sm font-bold text-slate-300">{formatPrice(totalPurchased)}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Detail Tabs */}
      <Tabs defaultValue="purchases" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 mb-6">
          <TabsTrigger value="purchases" className="data-[state=active]:bg-amber-600 px-6">
            Purchases / Expenses ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-purple-600 px-6">
            Payments Made ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-blue-600 px-6">
            Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="pos" className="data-[state=active]:bg-indigo-600 px-6">
            Purchase Orders ({purchaseOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PURCHASES */}
        <TabsContent value="purchases" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Purchases from {manufacturer.name}</h3>
            <Button
              onClick={() => router.push(`/dashboard/accounting?manufacturerName=${encodeURIComponent(manufacturer.name)}`)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 text-xs"
            >
              <Plus className="w-4 h-4 mr-1" /> New Purchase from This Manufacturer
            </Button>
          </div>

          <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
            {displayExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No expense/purchase entries found for this manufacturer.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="p-4 pl-6">Date</th>
                      <th className="p-4">Category / Description</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Amount Paid</th>
                      <th className="p-4">Balance Due</th>
                      <th className="p-4">Payment Status</th>
                      <th className="p-4 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {displayExpenses.map((e) => {
                      const amountPaid = Number(e.amount_paid) || 0
                      const totalAmt = Number(e.amount) || 0
                      const balDue = e.balance_due !== undefined && e.balance_due !== null ? Number(e.balance_due) : Math.max(0, totalAmt - amountPaid)
                      const isFullyPaid = e.payment_status === 'paid' || (balDue <= 0 && amountPaid > 0)
                      const isPartial = e.payment_status === 'partial' || (amountPaid > 0 && balDue > 0)

                      return (
                        <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 pl-6 text-sm text-slate-300">{e.expense_date}</td>
                          <td className="p-4">
                            <p className="font-bold text-white text-sm">{e.category}</p>
                            <p className="text-xs text-slate-400">{e.description}</p>
                          </td>
                          <td className="p-4 font-black text-rose-400 text-sm">{formatPrice(totalAmt)}</td>
                          <td className="p-4 font-bold text-emerald-400 text-sm">{formatPrice(amountPaid)}</td>
                          <td className="p-4 font-bold text-amber-500 text-sm">{formatPrice(balDue)}</td>
                          <td className="p-4">
                            {isFullyPaid ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-bold">Paid ✓</Badge>
                            ) : isPartial ? (
                              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs font-bold">Partial</Badge>
                            ) : (
                              <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs font-bold">Unpaid</Badge>
                            )}
                          </td>
                          <td className="p-4 text-right pr-6">
                            {!isFullyPaid && (
                              <Button
                                size="sm"
                                onClick={() => setPaymentSheetState({ open: true, expense: e })}
                                className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/30 h-8 text-xs font-bold px-2.5"
                              >
                                💰 Record Payment
                              </Button>
                            )}
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

        {/* TAB 2: PAYMENTS */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
            {payments.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No payment transactions recorded to this manufacturer.</div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                        <th className="p-4 pl-6">Date</th>
                        <th className="p-4">Amount Paid</th>
                        <th className="p-4">Payment Method</th>
                        <th className="p-4">Reference</th>
                        <th className="p-4 pr-6">Notes / Cheque Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 pl-6 text-sm text-slate-300">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                          <td className="p-4 font-black text-emerald-400 text-base">{formatPrice(p.amount)}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="uppercase text-[10px] border-slate-700 text-slate-300">
                              {p.payment_method}
                            </Badge>
                          </td>
                          <td className="p-4 font-mono text-xs text-amber-400">
                            Expense #{p.reference_id?.slice(-6).toUpperCase()}
                          </td>
                          <td className="p-4 text-xs text-slate-400 pr-6">
                            {p.notes || '-'}
                            {p.cheque_number && ` (Cheque #${p.cheque_number} - ${p.cheque_bank || ''})`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-400">Total Payments Sent</span>
                  <span className="text-emerald-400 text-lg">
                    {formatPrice(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 3: PRODUCTS */}
        <TabsContent value="products" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 p-6 overflow-hidden shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Products Sourced from {manufacturer.name}</h3>

            {products.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No products linked to this manufacturer yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => (
                  <div key={p.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{p.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">SKU: {p.sku}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Stock: <span className="text-blue-400 font-bold">{p.stock_quantity}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Selling Price</p>
                      <p className="text-base font-bold text-emerald-400">{formatPrice(p.price)}</p>
                      {p.cost_price > 0 && (
                        <p className="text-[10px] text-slate-500">Cost: {formatPrice(p.cost_price)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 4: PURCHASE ORDERS */}
        <TabsContent value="pos" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 p-6 overflow-hidden shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Purchase Orders Raised</h3>

            {purchaseOrders.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No purchase orders created for this manufacturer.</div>
            ) : (
              <div className="space-y-3">
                {purchaseOrders.map((po) => (
                  <div key={po.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-amber-400">{po.po_number || `PO-${po.id.slice(-6)}`}</span>
                        <Badge className="uppercase text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">{po.status}</Badge>
                        {po.is_auto_generated && (
                          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">🤖 Auto PO</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{po.notes || 'Draft PO'}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">Total Amount</p>
                      <p className="text-base font-bold text-white">{formatPrice(po.total_amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Manufacturer Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Manufacturer Profile</DialogTitle>
            <DialogDescription className="text-slate-400">Update vendor identity and payment terms</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateManufacturer} className="space-y-4">
            <div>
              <Label className="text-xs text-slate-300">Manufacturer Name</Label>
              <Input
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="bg-slate-950 border-slate-800 text-white mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Phone</Label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Email</Label>
                <Input
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">City</Label>
                <Input
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-300">Payment Terms (Days)</Label>
                <Input
                  type="number"
                  value={editFormData.paymentTerms}
                  onChange={(e) => setEditFormData({ ...editFormData, paymentTerms: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-300">GSTIN</Label>
              <Input
                value={editFormData.gstin}
                onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value })}
                className="bg-slate-950 border-slate-800 text-white mt-1"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="border-slate-800">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700 font-bold">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Payment Sheet */}
      {paymentSheetState.expense && (
        <PaymentSheet
          open={paymentSheetState.open}
          onOpenChange={(open) => setPaymentSheetState((prev) => ({ ...prev, open }))}
          referenceType="purchase"
          referenceId={paymentSheetState.expense.id}
          title={`Expense: ${paymentSheetState.expense.category}`}
          customerOrVendorName={manufacturer.name}
          totalAmount={Number(paymentSheetState.expense.amount) || 0}
          amountPaid={Number(paymentSheetState.expense.amount_paid) || 0}
          balanceDue={paymentSheetState.expense.balance_due !== undefined && paymentSheetState.expense.balance_due !== null ? Number(paymentSheetState.expense.balance_due) : Math.max(0, (Number(paymentSheetState.expense.amount) || 0) - (Number(paymentSheetState.expense.amount_paid) || 0))}
          ownerId={manufacturer.owner_id}
          onPaymentRecorded={() => loadManufacturerDetails()}
        />
      )}
    </div>
  )
}
