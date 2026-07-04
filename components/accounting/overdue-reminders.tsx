"use client"

import { useEffect, useMemo, useState } from "react"
import type { Invoice } from "@/lib/types"
import { generateReminderWhatsAppLink } from "@/lib/utils/whatsapp"
import { INDIAN_PHONE_REGEX } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp, X, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

function isOverdueUnpaid(invoice: Invoice): boolean {
  const status = (invoice.status || "").toLowerCase()
  if (status === "paid" || status === "cancelled") return false
  if (!["pending", "unpaid", "issued", "draft", "overdue"].includes(status)) return false
  if (!invoice.due_date) return false
  const due = new Date(invoice.due_date)
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due < today
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(1, Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
}

function overdueBucket(days: number): "1-3" | "4-7" | "8+" {
  if (days <= 3) return "1-3"
  if (days <= 7) return "4-7"
  return "8+"
}

export function OverdueReminders({
  invoices,
  businessName,
  upiId,
}: {
  invoices: Invoice[]
  businessName: string
  upiId?: string | null
}) {
  const todayKey = new Date().toISOString().slice(0, 10)
  const dismissKey = `overdue_dismissed_${todayKey}`

  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(dismissKey) === "1") {
      setDismissed(true)
    }
  }, [dismissKey])

  const overdueList = useMemo(
    () =>
      invoices
        .filter(isOverdueUnpaid)
        .map((inv) => ({
          invoice: inv,
          days: daysOverdue(inv.due_date!),
        }))
        .sort((a, b) => b.days - a.days),
    [invoices]
  )

  const grouped = useMemo(() => {
    const groups: Record<"1-3" | "4-7" | "8+", typeof overdueList> = {
      "1-3": [],
      "4-7": [],
      "8+": [],
    }
    overdueList.forEach((item) => {
      groups[overdueBucket(item.days)].push(item)
    })
    return groups
  }, [overdueList])

  if (dismissed || overdueList.length === 0) return null

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, "1")
    setDismissed(true)
  }

  const sendReminder = (inv: Invoice, days: number) => {
    const phone = inv.customer_phone
    const last10 = phone?.replace(/\D/g, "").slice(-10) ?? ""
    if (!phone || !INDIAN_PHONE_REGEX.test(last10)) {
      toast.error("Add a valid customer phone number to send a WhatsApp reminder")
      return
    }
    const link = generateReminderWhatsAppLink({
      phone,
      customerName: inv.customer_name,
      invoiceNumber: inv.invoice_number,
      amount: inv.total_amount,
      businessName,
      daysOverdue: days,
      upiId: upiId || undefined,
    })
    window.open(link, "_blank", "noopener,noreferrer")
  }

  const bucketColors = {
    "1-3": "bg-amber-600/10 border-amber-600/30 text-amber-400",
    "4-7": "bg-orange-600/10 border-orange-600/30 text-orange-400",
    "8+": "bg-red-600/10 border-red-600/30 text-red-400",
  }

  return (
    <Card className="bg-slate-900 border-red-600/40 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-red-950/50 to-orange-950/30 border-b border-red-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-600/20">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-white text-lg flex flex-wrap items-center gap-2">
                Overdue Reminders
                <Badge className="bg-red-600 text-white border-0">
                  {overdueList.length} overdue payment{overdueList.length !== 1 ? "s" : ""} need attention
                </Badge>
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">Send WhatsApp payment reminders by urgency</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-400"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-400"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="p-4 space-y-6">
          {(["1-3", "4-7", "8+"] as const).map((bucket) => {
            const items = grouped[bucket]
            if (items.length === 0) return null
            return (
              <div key={bucket}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 px-2 py-1 rounded border inline-block ${bucketColors[bucket]}`}>
                  {bucket === "1-3" ? "1–3 days overdue" : bucket === "4-7" ? "4–7 days overdue" : "8+ days overdue"} ({items.length})
                </p>
                <div className="space-y-2">
                  {items.map(({ invoice: inv, days }) => (
                    <div
                      key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{inv.customer_name}</p>
                        <p className="text-xs text-slate-500">
                          {inv.invoice_number} · ₹{inv.total_amount.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="destructive" className="text-[10px]">
                          {days}d overdue
                        </Badge>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white h-8"
                          onClick={() => sendReminder(inv, days)}
                        >
                          Send Reminder
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </CardContent>
      )}
    </Card>
  )
}
