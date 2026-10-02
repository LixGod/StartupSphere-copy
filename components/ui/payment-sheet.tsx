'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPayments, recordPayment } from '@/lib/api/payments'
import { useBusinessContext } from '@/lib/hooks/use-business-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import { DollarSign, Calendar, Landmark, CreditCard, FileText, CheckCircle2, History } from 'lucide-react'

interface PaymentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  referenceType: 'sale' | 'purchase'
  referenceId: string
  title: string
  customerOrVendorName: string
  totalAmount: number
  amountPaid: number
  balanceDue: number
  ownerId: string
  onPaymentRecorded?: () => void
}

export function PaymentSheet({
  open,
  onOpenChange,
  referenceType,
  referenceId,
  title,
  customerOrVendorName,
  totalAmount,
  amountPaid: initialAmountPaid,
  balanceDue: initialBalanceDue,
  ownerId,
  onPaymentRecorded
}: PaymentSheetProps) {
  const { formatPrice } = useBusinessContext()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Payment form state
  const [amount, setAmount] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState<string>('')
  
  // Cheque state
  const [chequeNumber, setChequeNumber] = useState('')
  const [chequeDate, setChequeDate] = useState('')
  const [chequeBank, setChequeBank] = useState('')

  useEffect(() => {
    if (open && referenceId) {
      loadPaymentHistory()
      setAmount(String(Math.max(0, initialBalanceDue)))
    }
  }, [open, referenceId, initialBalanceDue])

  const loadPaymentHistory = async () => {
    setLoading(true)
    try {
      const data = await getPayments(referenceType, referenceId)
      setPayments(data)
    } catch (err: any) {
      console.error('Failed to load payments:', err)
      toast.error('Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const paymentVal = parseFloat(amount)
    if (isNaN(paymentVal) || paymentVal <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('User not authenticated')
        return
      }

      await recordPayment({
        owner_id: ownerId,
        created_by: user.id,
        reference_type: referenceType,
        reference_id: referenceId,
        amount: paymentVal,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: notes.trim() || undefined,
        cheque_number: paymentMethod === 'cheque' ? chequeNumber : undefined,
        cheque_date: paymentMethod === 'cheque' ? chequeDate : undefined,
        cheque_bank: paymentMethod === 'cheque' ? chequeBank : undefined,
      })

      const remaining = Math.max(0, initialBalanceDue - paymentVal)
      toast.success(`Payment of ${formatPrice(paymentVal)} recorded. Balance: ${formatPrice(remaining)} remaining`)
      
      // Reset form
      setAmount('')
      setNotes('')
      setChequeNumber('')
      setChequeDate('')
      setChequeBank('')

      if (onPaymentRecorded) {
        onPaymentRecorded()
      }
      loadPaymentHistory()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Payment submit error:', err?.message || err)
      toast.error(err?.message || 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-900 border-slate-800 text-white sm:max-w-lg overflow-y-auto custom-scrollbar">
        <SheetHeader className="pb-4 border-b border-slate-800">
          <SheetTitle className="text-xl font-bold text-white flex items-center gap-2">
            💰 Record Payment
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            {title} ({customerOrVendorName})
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
              <p className="text-xs text-slate-400 font-medium">Total Amount</p>
              <p className="text-base font-bold text-white mt-1">{formatPrice(totalAmount)}</p>
            </div>
            <div className="bg-slate-950 border border-emerald-900/40 p-3 rounded-xl">
              <p className="text-xs text-emerald-400 font-medium">Already Paid</p>
              <p className="text-base font-bold text-emerald-400 mt-1">{formatPrice(initialAmountPaid)}</p>
            </div>
            <div className="bg-slate-950 border border-rose-900/40 p-3 rounded-xl">
              <p className="text-xs text-rose-400 font-medium">Balance Due</p>
              <p className="text-base font-bold text-rose-500 mt-1">{formatPrice(initialBalanceDue)}</p>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              New Payment Details
            </h3>

            <div>
              <Label className="text-xs text-slate-300">Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-300">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer / NEFT</SelectItem>
                    <SelectItem value="card">Credit / Debit Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="advance">Advance Adjustment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-slate-300">Payment Date</Label>
                <Input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white mt-1"
                />
              </div>
            </div>

            {/* Cheque details (Conditional) */}
            {paymentMethod === 'cheque' && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-300">
                <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-amber-400" />
                  Cheque Details
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-slate-400">Cheque No.</Label>
                    <Input
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="e.g. 000123"
                      className="h-8 bg-slate-950 border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-400">Cheque Date</Label>
                    <Input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="h-8 bg-slate-950 border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] text-slate-400">Bank Name</Label>
                  <Input
                    value={chequeBank}
                    onChange={(e) => setChequeBank(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="h-8 bg-slate-950 border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs text-slate-300">Notes / Remarks (Optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Transaction ID, ref no, etc."
                className="bg-slate-900 border-slate-700 text-white mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-lg shadow-emerald-950/40"
            >
              {submitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </form>

          {/* Previous Payments List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Previous Payments ({payments.length})
            </h3>

            {loading ? (
              <p className="text-xs text-slate-500 animate-pulse">Loading transaction history...</p>
            ) : payments.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-center text-xs text-slate-500">
                No payments recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase border-slate-700 text-slate-300">
                          {p.payment_method}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {new Date(p.payment_date).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      {p.notes && <p className="text-[11px] text-slate-500 mt-1">{p.notes}</p>}
                      {p.cheque_number && (
                        <p className="text-[10px] text-amber-400/80 mt-0.5">
                          Cheque #{p.cheque_number} ({p.cheque_bank || 'Bank'})
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">+{formatPrice(p.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
