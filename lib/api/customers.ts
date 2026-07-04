import { createClient } from "@/lib/supabase/client"
import type { Contact, Company } from "@/lib/types"

const supabase = () => createClient()

export async function getContacts(ownerId: string) {
  const { data, error } = await supabase()
    .from("contacts")
    .select("*, companies(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data || []) as Contact[]
}

export async function createContact(contact: Partial<Contact> & { owner_id: string; first_name: string }) {
  const { data, error } = await supabase()
    .from("contacts")
    .insert(contact)
    .select()
    .single()

  if (error) throw error
  return data as Contact
}

export async function updateContact(id: string, updates: Partial<Contact>) {
  const { data, error } = await supabase()
    .from("contacts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Contact
}

export async function deleteContact(id: string) {
  const { error } = await supabase().from("contacts").delete().eq("id", id)
  if (error) throw error
}

export async function deleteContacts(ids: string[]) {
  const { error } = await supabase().from("contacts").delete().in("id", ids)
  if (error) throw error
}

export async function getCompanies(ownerId: string) {
  const { data, error } = await supabase()
    .from("companies")
    .select("*")
    .eq("owner_id", ownerId)
    .order("name")

  if (error) throw error
  return (data || []) as Company[]
}

export async function createCompany(company: Partial<Company> & { owner_id: string; name: string }) {
  const { data, error } = await supabase()
    .from("companies")
    .insert(company)
    .select()
    .single()

  if (error) throw error
  return data as Company
}
