import { createClient } from "@/lib/supabase/client"
import type { Contact, Company } from "@/lib/types"

const supabase = () => createClient()

function extractSupabaseError(error: any): string {
  const msg = error?.message || error?.details || error?.hint || ""
  const code = error?.code ? ` (code: ${error.code})` : ""
  console.error("[Supabase error]", { code: error?.code, message: error?.message, details: error?.details, hint: error?.hint })
  return msg + code || "Unknown database error"
}

export async function getContacts(ownerId: string, branchId?: string | null) {
  let query = supabase()
    .from("contacts")
    .select("*, companies(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })

  if (branchId && branchId !== "global") {
    query = query.eq("location_id", branchId)
  }

  const { data, error } = await query
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

// Saved Customers table helpers
export async function getSavedCustomers(ownerId: string) {
  if (!ownerId) return []
  const { data, error } = await supabase()
    .from("customers")
    .select("*")
    .eq("owner_id", ownerId)
    .order("name", { ascending: true })

  if (error) throw new Error(extractSupabaseError(error))
  return data || []
}

export async function getSavedCustomerById(id: string) {
  if (!id) return null
  const { data, error } = await supabase()
    .from("customers")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("getSavedCustomerById error:", error)
    throw new Error(error.message || error.details || "Failed to load customer details")
  }
  return data
}

export async function createSavedCustomer(customer: {
  owner_id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  gstin?: string | null
  credit_limit?: number
  notes?: string | null
}) {
  const { data, error } = await supabase()
    .from("customers")
    .insert(customer)
    .select()
    .single()

  if (error) {
    console.error("createSavedCustomer error:", error)
    throw new Error(error.message || error.details || "Failed to create customer")
  }
  return data
}

export async function updateSavedCustomer(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase()
    .from("customers")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("updateSavedCustomer error:", error)
    throw new Error(error.message || error.details || "Failed to update customer")
  }
  return data
}

export async function deleteSavedCustomer(id: string) {
  const { error } = await supabase().from("customers").delete().eq("id", id)
  if (error) {
    console.error("deleteSavedCustomer error:", error)
    throw new Error(error.message || error.details || "Failed to delete customer")
  }
}

export async function upsertCustomer(params: {
  owner_id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  gstin?: string | null
  amountToAdd?: number
}) {
  if (!params.owner_id || !params.name?.trim() || params.name.toLowerCase() === "walk-in customer") return null

  const nameTrimmed = params.name.trim()
  const phoneTrimmed = params.phone?.trim() || null
  const emailTrimmed = params.email?.trim() || null
  const addressTrimmed = params.address?.trim() || null
  const cityTrimmed = params.city?.trim() || null
  const gstinTrimmed = params.gstin?.trim() || null

  try {
    let query = supabase()
      .from("customers")
      .select("*")
      .eq("owner_id", params.owner_id)

    if (phoneTrimmed) {
      query = query.eq("phone", phoneTrimmed)
    } else {
      query = query.ilike("name", nameTrimmed)
    }

    const { data: existingList } = await query.limit(1)
    const existing = existingList && existingList.length > 0 ? existingList[0] : null

    if (existing) {
      const newTotalPurchases = (Number(existing.total_purchases) || 0) + (params.amountToAdd || 0)
      const updates: Record<string, any> = {
        name: nameTrimmed,
        updated_at: new Date().toISOString(),
        total_purchases: newTotalPurchases,
      }
      if (phoneTrimmed) updates.phone = phoneTrimmed
      if (emailTrimmed) updates.email = emailTrimmed
      if (addressTrimmed) updates.address = addressTrimmed
      if (cityTrimmed) updates.city = cityTrimmed
      if (gstinTrimmed) updates.gstin = gstinTrimmed

      const { data, error } = await supabase()
        .from("customers")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single()

      if (error) {
        console.error("[upsertCustomer update error]:", extractSupabaseError(error), error)
        return existing
      }
      return data
    } else {
      const insertPayload: Record<string, any> = {
        owner_id: params.owner_id,
        name: nameTrimmed,
        phone: phoneTrimmed,
        email: emailTrimmed,
        address: addressTrimmed,
        city: cityTrimmed,
        gstin: gstinTrimmed,
        total_purchases: params.amountToAdd || 0,
        outstanding_balance: 0,
        total_paid: 0,
      }

      const { data, error } = await supabase()
        .from("customers")
        .insert(insertPayload)
        .select()
        .single()

      if (error) {
        console.error("[upsertCustomer insert error]:", extractSupabaseError(error), error)
        return null
      }
      return data
    }
  } catch (err: any) {
    console.error("[upsertCustomer catch error]:", err?.message || err)
    return null
  }
}

