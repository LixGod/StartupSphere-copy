'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBusinessContext } from '@/lib/hooks/use-business-context'
import { getSavedCustomerById, updateSavedCustomer, deleteSavedCustomer } from '@/lib/api/customers'
import { getPayments } from '@/lib/api/payments'
import { PaymentSheet } from '@/components/ui/payment-sheet'
import { WHATSAPP_REMINDER_TEMPLATES } from '@/lib/constants'
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
import {
  ArrowLeft, Edit, Plus, MessageCircle, AlertTriangle, Calendar, ShoppingBag,
  CreditCard, Award, CheckCircle2, RefreshCw, Send, DollarSign, Phone, Mail, Trash2
} from 'lucide-react'
import { toast } from 'sonner'

export default function CustomerDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const { profile, formatPrice, ownerId } = useBusinessContext()

  const [customer, setCustomer] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Payment Sheet state
  const [paymentSheetState, setPaymentSheetState] = useState<{ open: boolean; order: any | null }>({
    open: false,
    order: null,
  })

  // Edit customer modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '', phone: '', email: '', address: '', city: '', gstin: '', creditLimit: '0', notes: ''
  })

  const supabase = createClient()

  useEffect(() => {
    if (id) {
      loadCustomerDetails()
    }
  }, [id])

  const loadCustomerDetails = async () => {
    setLoading(true)
    try {
      // 1. Fetch customer profile
      const cust = await getSavedCustomerById(id)
      setCustomer(cust)

      if (cust) {
        setEditFormData({
          name: cust.name || '',
          phone: cust.phone || '',
          email: cust.email || '',
          address: cust.address || '',
          city: cust.city || '',
          gstin: cust.gstin || '',
          creditLimit: String(cust.credit_limit || 0),
          notes: cust.notes || '',
        })

        // 2. Fetch customer's orders
        let ordersQuery = supabase
          .from('sales_orders')
          .select('*, order_items(*, products(name))')

        if (cust.phone) {
          ordersQuery = ordersQuery.or(`customer_id.eq.${cust.id},customer_phone.eq.${cust.phone}`)
        } else {
          ordersQuery = ordersQuery.eq('customer_id', cust.id)
        }

        const { data: ordersData } = await ordersQuery.order('order_date', { ascending: false })
        const rawOrders = ordersData || []

        // 3. Fetch all payments for customer's orders and enrich order payment status
        if (rawOrders.length > 0) {
          const orderIds = rawOrders.map((o: any) => o.id)
          const { data: paymentsData } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('reference_type', 'sale')
            .in('reference_id', orderIds)
            .order('created_at', { ascending: false })

          const pList = paymentsData || []
          setPayments(pList)

          const enrichedOrders = rawOrders.map((ord: any) => {
            const ordPayments = pList.filter((p: any) => p.reference_id === ord.id)
            const paidTxSum = ordPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0)
            const totAmt = Number(ord.total_amount) || 0
            const amtPaid = Math.max(Number(ord.amount_paid) || 0, paidTxSum)
            const balDue = Math.max(0, totAmt - amtPaid)
            const pStatus = balDue <= 0 ? 'paid' : amtPaid > 0 ? 'partial' : (ord.payment_status || 'unpaid')

            return {
              ...ord,
              amount_paid: amtPaid,
              balance_due: balDue,
              payment_status: pStatus,
            }
          })
          setOrders(enrichedOrders)
        } else {
          setOrders([])
          setPayments([])
        }
      }
    } catch (err: any) {
      console.error('Error loading customer detail:', err)
      toast.error('Failed to load customer details')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSavedCustomer(id, {
        name: editFormData.name,
        phone: editFormData.phone || null,
        email: editFormData.email || null,
        address: editFormData.address || null,
        city: editFormData.city || null,
        gstin: editFormData.gstin || null,
        credit_limit: parseFloat(editFormData.creditLimit) || 0,
        notes: editFormData.notes || null,
      })

      toast.success('Customer updated!')
      setShowEditModal(false)
      loadCustomerDetails()
    } catch (err: any) {
      toast.error('Failed to update customer')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCustomer = async () => {
    if (!customer) return
    if (!confirm(`Are you sure you want to delete customer profile "${customer.name}"?`)) return
    try {
      await deleteSavedCustomer(customer.id)
      toast.success(`Customer "${customer.name}" deleted`)
      router.push('/dashboard/customers')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer')
    }
  }

  // Financial Computations & Feature 7 (LTV) Stats
  const activeOrders = orders.filter((o) => o.status !== 'cancelled' && o.order_status !== 'cancelled')
  const totalSpent = activeOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
  const totalPaid = activeOrders.reduce((sum, o) => sum + (Number(o.amount_paid) || 0), 0)
  const totalOutstanding = activeOrders.reduce((sum, o) => {
    if (o.payment_status === 'paid') return sum
    const bal = o.balance_due !== undefined && o.balance_due !== null ? Number(o.balance_due) : Math.max(0, Number(o.total_amount) - (Number(o.amount_paid) || 0))
    return sum + bal
  }, 0)

  const firstPurchaseDate = activeOrders.length > 0 ? new Date(activeOrders[activeOrders.length - 1].order_date).toLocaleDateString('en-IN') : 'N/A'
  const lastPurchaseDate = activeOrders.length > 0 ? new Date(activeOrders[0].order_date).toLocaleDateString('en-IN') : 'N/A'
  const aov = activeOrders.length > 0 ? totalSpent / activeOrders.length : 0

  // LTV Rank badge logic
  const getLtvRank = () => {
    if (totalSpent >= 100000) return '⭐ Top 5% VIP Customer'
    if (totalSpent >= 50000) return '🥇 Top 10% High Value'
    if (totalSpent >= 10000) return '🥈 Loyal Regular Customer'
    return '🥉 Standard Customer'
  }

  // Outstanding orders
  const unpaidOrders = activeOrders.filter((o) => {
    const bal = o.balance_due !== undefined && o.balance_due !== null ? Number(o.balance_due) : Math.max(0, Number(o.total_amount) - (Number(o.amount_paid) || 0))
    return bal > 0 && o.payment_status !== 'paid'
  })

  const sendWhatsAppReminder = (order: any) => {
    if (!customer?.phone && !order.customer_phone) {
      toast.error('Customer phone number not available')
      return
    }

    const phone = customer?.phone || order.customer_phone
    const formattedPhone = phone.replace(/\D/g, '')
    const fullPhone = formattedPhone.length === 10 ? `91${formattedPhone}` : formattedPhone

    const invoiceNo = `INV-${order.id.slice(-6).toUpperCase()}`
    const dueAmt = formatPrice(order.balance_due || order.total_amount)
    const bizName = profile?.company_name || 'Startup Sphere'
    const upiLink = `${window.location.origin}/receipt/${order.id}`

    const message = WHATSAPP_REMINDER_TEMPLATES.day3(
      customer?.name || 'Customer',
      invoiceNo,
      dueAmt,
      bizName,
      upiLink
    )

    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const sendAllReminders = () => {
    if (unpaidOrders.length === 0) {
      toast.info('No outstanding orders to remind')
      return
    }

    unpaidOrders.forEach((o, i) => {
      setTimeout(() => sendWhatsAppReminder(o), i * 1200)
    })
    toast.success(`Sending ${unpaidOrders.length} WhatsApp reminders...`)
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Loading customer ledger details...
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="text-xl font-bold text-white mb-2">Customer Not Found</p>
        <Button onClick={() => router.push('/dashboard/customers')} variant="outline" className="border-slate-800">
          Back to Customer List
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-200">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => router.push('/dashboard/customers')}
          variant="outline"
          className="border-slate-800 text-slate-400 hover:text-white bg-slate-900"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Customers
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowEditModal(true)}
            variant="outline"
            className="border-slate-800 text-blue-400 hover:bg-blue-600/10"
            size="sm"
          >
            <Edit className="w-4 h-4 mr-2" /> Edit Customer Profile
          </Button>
          <Button
            onClick={handleDeleteCustomer}
            variant="outline"
            className="border-rose-900/50 text-rose-400 hover:bg-rose-600/10"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete Customer
          </Button>
        </div>
      </div>

      {/* Customer Banner Header */}
      <Card className="bg-slate-900 border-slate-800 p-6 rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/20 flex items-center justify-center font-black text-2xl">
              {customer.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white">{customer.name}</h1>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-bold">
                  {getLtvRank()}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" /> {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" /> {customer.email}
                  </span>
                )}
                {customer.gstin && (
                  <span className="bg-slate-950 px-2 py-0.5 rounded text-slate-300 font-mono text-[11px]">
                    GST: {customer.gstin}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Outstanding Box */}
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-wrap gap-6 items-center justify-between min-w-[280px]">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Outstanding Balance</p>
              <p className={`text-3xl font-black mt-1 ${totalOutstanding > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                {formatPrice(totalOutstanding)}
              </p>
            </div>
            {customer.credit_limit > 0 && (
              <div className="text-right border-l border-slate-800 pl-4">
                <p className="text-[11px] text-slate-500">Credit Limit</p>
                <p className="text-sm font-bold text-slate-300">{formatPrice(customer.credit_limit)}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Feature 7: Customer Lifetime Value (LTV) Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs text-slate-500 font-semibold uppercase">First Purchase</p>
          <p className="text-base font-bold text-white mt-1">{firstPurchaseDate}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs text-slate-500 font-semibold uppercase">Last Purchase</p>
          <p className="text-base font-bold text-white mt-1">{lastPurchaseDate}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <p className="text-xs text-slate-500 font-semibold uppercase">Total Orders</p>
          <p className="text-base font-bold text-blue-400 mt-1">{orders.length} orders</p>
        </div>
        <div className="bg-slate-900 border border-emerald-900/40 p-4 rounded-2xl">
          <p className="text-xs text-emerald-400 font-semibold uppercase">Total Spent (LTV)</p>
          <p className="text-base font-bold text-emerald-400 mt-1">{formatPrice(totalSpent)}</p>
        </div>
        <div className="bg-slate-900 border border-purple-900/40 p-4 rounded-2xl">
          <p className="text-xs text-purple-400 font-semibold uppercase">Avg. Order Value</p>
          <p className="text-base font-bold text-purple-300 mt-1">{formatPrice(aov)}</p>
        </div>
      </div>

      {/* Detail Tabs */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 mb-6">
          <TabsTrigger value="orders" className="data-[state=active]:bg-blue-600 px-6">
            Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-purple-600 px-6">
            Payment History ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="outstanding" className="data-[state=active]:bg-rose-600 px-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" /> Outstanding ({unpaidOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ORDERS */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Sales Orders for {customer.name}</h3>
            <Button
              onClick={() => router.push(`/dashboard/sales?customerName=${encodeURIComponent(customer.name)}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs"
            >
              <Plus className="w-4 h-4 mr-1" /> New Sale for This Customer
            </Button>
          </div>

          <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
            {orders.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No sales orders found for this customer.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <th className="p-4 pl-6">Date</th>
                      <th className="p-4">Order #</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Amount Paid</th>
                      <th className="p-4">Balance Due</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.map((o) => {
                      const amountPaid = Number(o.amount_paid) || 0
                      const totalAmt = Number(o.total_amount) || 0
                      const balDue = o.balance_due !== undefined && o.balance_due !== null ? Number(o.balance_due) : Math.max(0, totalAmt - amountPaid)
                      const isFullyPaid = o.payment_status === 'paid' || (balDue <= 0 && amountPaid > 0)
                      const isPartial = o.payment_status === 'partial' || (amountPaid > 0 && balDue > 0)

                      return (
                        <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 pl-6 text-sm text-slate-300">
                            {new Date(o.order_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="p-4 font-mono text-xs font-bold text-blue-400">
                            #{o.id.slice(-6).toUpperCase()}
                          </td>
                          <td className="p-4 font-black text-white text-sm">{formatPrice(totalAmt)}</td>
                          <td className="p-4 font-bold text-emerald-400 text-sm">{formatPrice(amountPaid)}</td>
                          <td className="p-4 font-bold text-rose-400 text-sm">{formatPrice(balDue)}</td>
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
                                onClick={() => setPaymentSheetState({ open: true, order: o })}
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
              <div className="p-12 text-center text-slate-500">No payment transactions recorded for this customer.</div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                        <th className="p-4 pl-6">Date</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Payment Method</th>
                        <th className="p-4">Order Reference</th>
                        <th className="p-4 pr-6">Notes / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 pl-6 text-sm text-slate-300">
                            {new Date(p.payment_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="p-4 font-black text-emerald-400 text-base">{formatPrice(p.amount)}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="uppercase text-[10px] border-slate-700 text-slate-300">
                              {p.payment_method}
                            </Badge>
                          </td>
                          <td className="p-4 font-mono text-xs text-blue-400">
                            Order #{p.reference_id?.slice(-6).toUpperCase()}
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
                  <span className="text-slate-400">Total Payments Received</span>
                  <span className="text-emerald-400 text-lg">
                    {formatPrice(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 3: OUTSTANDING */}
        <TabsContent value="outstanding" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Unpaid & Partial Orders ({unpaidOrders.length})
            </h3>

            {unpaidOrders.length > 0 && (
              <Button
                onClick={sendAllReminders}
                className="bg-green-600 hover:bg-green-700 text-white font-bold h-9 text-xs shadow-lg shadow-green-950/40"
              >
                <MessageCircle className="w-4 h-4 mr-1.5" /> Send All Reminders (WhatsApp)
              </Button>
            )}
          </div>

          <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
            {unpaidOrders.length === 0 ? (
              <div className="p-12 text-center text-emerald-400 font-bold">
                🎉 All orders paid! Customer has 0 outstanding balance.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {unpaidOrders.map((o) => {
                  const bal = o.balance_due !== undefined && o.balance_due !== null ? Number(o.balance_due) : Math.max(0, Number(o.total_amount) - (Number(o.amount_paid) || 0))
                  return (
                    <div key={o.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-blue-400">#{o.id.slice(-6).toUpperCase()}</span>
                          <span className="text-xs text-slate-500">· {new Date(o.order_date).toLocaleDateString('en-IN')}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Total: {formatPrice(o.total_amount)} | Paid: {formatPrice(o.amount_paid || 0)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 font-semibold uppercase">Balance Due</p>
                          <p className="text-xl font-black text-rose-500">{formatPrice(bal)}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => sendWhatsAppReminder(o)}
                            className="bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-600/30 h-9 text-xs font-bold"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp Reminder
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setPaymentSheetState({ open: true, order: o })}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-bold"
                          >
                            💰 Record Payment
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer Profile</DialogTitle>
            <DialogDescription className="text-slate-400">Update identity, contact info, and credit limits</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCustomer} className="space-y-4">
            <div>
              <Label className="text-xs text-slate-300">Customer Name</Label>
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
                <Label className="text-xs text-slate-300">GSTIN</Label>
                <Input
                  value={editFormData.gstin}
                  onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value })}
                  className="bg-slate-950 border-slate-800 text-white mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-300">Credit Limit (₹)</Label>
              <Input
                type="number"
                value={editFormData.creditLimit}
                onChange={(e) => setEditFormData({ ...editFormData, creditLimit: e.target.value })}
                className="bg-slate-950 border-slate-800 text-white mt-1"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} className="border-slate-800">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 font-bold">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Sheet */}
      {paymentSheetState.order && (
        <PaymentSheet
          open={paymentSheetState.open}
          onOpenChange={(open) => setPaymentSheetState((prev) => ({ ...prev, open }))}
          referenceType="sale"
          referenceId={paymentSheetState.order.id}
          title={`Order #${paymentSheetState.order.id.slice(-6).toUpperCase()}`}
          customerOrVendorName={customer.name}
          totalAmount={Number(paymentSheetState.order.total_amount) || 0}
          amountPaid={Number(paymentSheetState.order.amount_paid) || 0}
          balanceDue={paymentSheetState.order.balance_due !== undefined && paymentSheetState.order.balance_due !== null ? Number(paymentSheetState.order.balance_due) : Math.max(0, (Number(paymentSheetState.order.total_amount) || 0) - (Number(paymentSheetState.order.amount_paid) || 0))}
          ownerId={customer.owner_id}
          onPaymentRecorded={() => loadCustomerDetails()}
        />
      )}
    </div>
  )
}
