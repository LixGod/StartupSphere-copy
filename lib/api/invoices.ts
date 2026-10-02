import { createClient } from "@/lib/supabase/client"
import type { Invoice } from "@/lib/types"

const supabase = () => createClient()

export async function getInvoices(ownerId: string, locationId?: string | null) {
  let query = supabase()
    .from("invoices")
    .select("*, sales_orders(*)")
    .eq("owner_id", ownerId)

  if (locationId && locationId !== "global") {
    query = query.eq("location_id", locationId)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) throw error
  return (data || []) as Invoice[]
}

export async function createInvoice(invoice: Partial<Invoice> & { owner_id: string; invoice_number: string; customer_name: string; subtotal: number; gst_amount: number; total_amount: number }) {
  const { data, error } = await supabase()
    .from("invoices")
    .insert(invoice)
    .select()
    .single()

  if (error) throw error
  return data as Invoice
}

export async function updateInvoice(id: string, updates: Partial<Invoice>) {
  const { data, error } = await supabase()
    .from("invoices")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Invoice
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase().from("invoices").delete().eq("id", id)
  if (error) throw error
}

export async function deleteInvoices(ids: string[]) {
  const { error } = await supabase()
    .from("invoices")
    .delete()
    .in("id", ids)

  if (error) throw error
}
