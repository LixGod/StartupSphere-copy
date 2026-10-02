import { createClient } from "@/lib/supabase/client"

const supabase = () => createClient()

function extractSupabaseError(error: any): string {
  // Supabase error properties are non-enumerable — destructure explicitly
  const msg = error?.message || error?.details || error?.hint || ""
  const code = error?.code ? ` (code: ${error.code})` : ""
  console.error("[Supabase error]", { code: error?.code, message: error?.message, details: error?.details, hint: error?.hint })
  return msg + code || "Unknown database error"
}

export async function getManufacturers(ownerId: string) {
  if (!ownerId) return []
  const { data, error } = await supabase()
    .from("manufacturers")
    .select("*")
    .eq("owner_id", ownerId)
    .order("name", { ascending: true })

  if (error) throw new Error(extractSupabaseError(error))
  return data || []
}

export async function getManufacturerById(id: string) {
  if (!id) return null
  const { data, error } = await supabase()
    .from("manufacturers")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("getManufacturerById error:", error)
    throw new Error(error.message || error.details || "Failed to load manufacturer details")
  }
  return data
}

export async function createManufacturer(manufacturer: {
  owner_id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  gstin?: string | null
  payment_terms?: number
  notes?: string | null
}) {
  const { data, error } = await supabase()
    .from("manufacturers")
    .insert(manufacturer)
    .select()
    .single()

  if (error) {
    console.error("createManufacturer error:", error)
    throw new Error(error.message || error.details || "Failed to create manufacturer")
  }
  return data
}

export async function updateManufacturer(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase()
    .from("manufacturers")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("updateManufacturer error:", error)
    throw new Error(error.message || error.details || "Failed to update manufacturer")
  }
  return data
}

export async function deleteManufacturer(id: string) {
  const { error } = await supabase().from("manufacturers").delete().eq("id", id)
  if (error) {
    console.error("deleteManufacturer error:", error)
    throw new Error(error.message || error.details || "Failed to delete manufacturer")
  }
}

export async function upsertManufacturer(params: {
  owner_id: string
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  gstin?: string | null
  amountToAdd?: number
}) {
  if (!params.owner_id || !params.name?.trim() || params.name.toLowerCase() === "unknown vendor") return null

  const nameTrimmed = params.name.trim()
  const phoneTrimmed = params.phone?.trim() || null
  const emailTrimmed = params.email?.trim() || null
  const addressTrimmed = params.address?.trim() || null
  const cityTrimmed = params.city?.trim() || null
  const gstinTrimmed = params.gstin?.trim() || null

  try {
    let query = supabase()
      .from("manufacturers")
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
      const newTotalPurchased = (Number(existing.total_purchased) || 0) + (params.amountToAdd || 0)
      const updates: Record<string, any> = {
        name: nameTrimmed,
        updated_at: new Date().toISOString(),
        total_purchased: newTotalPurchased,
      }
      if (phoneTrimmed) updates.phone = phoneTrimmed
      if (emailTrimmed) updates.email = emailTrimmed
      if (addressTrimmed) updates.address = addressTrimmed
      if (cityTrimmed) updates.city = cityTrimmed
      if (gstinTrimmed) updates.gstin = gstinTrimmed

      const { data, error } = await supabase()
        .from("manufacturers")
        .update(updates)
        .eq("id", existing.id)
        .select()
        .single()

      if (error) {
        console.error("[upsertManufacturer update error]:", extractSupabaseError(error), error)
        return existing
      }
      return data
    } else {
      const { data, error } = await supabase()
        .from("manufacturers")
        .insert({
          owner_id: params.owner_id,
          name: nameTrimmed,
          phone: phoneTrimmed,
          email: emailTrimmed,
          address: addressTrimmed,
          city: cityTrimmed,
          gstin: gstinTrimmed,
          total_purchased: params.amountToAdd || 0,
          outstanding_balance: 0,
          total_paid: 0,
        })
        .select()
        .single()

      if (error) {
        console.error("[upsertManufacturer insert error]:", extractSupabaseError(error), error)
        return null
      }
      return data
    }
  } catch (err: any) {
    console.error("[upsertManufacturer catch error]:", err?.message || err)
    return null
  }
}

