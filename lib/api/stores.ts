import { createClient } from "@/lib/supabase/client"
import type {
  BusinessLocation, LocationInventory, WholesaleTier,
  BulkOrder, ClientPortal, Company
} from "@/lib/types"

const supabase = () => createClient()

export async function getLocations(ownerId: string) {
  const { data, error } = await supabase()
    .from("locations")
    .select("*")
    .eq("owner_id", ownerId)
    .order("name")

  if (error) throw error
  return (data || []) as BusinessLocation[]
}

export async function getLocationInventory(locationId: string) {
  const { data, error } = await supabase()
    .from("location_inventory")
    .select("*, products(*)")
    .eq("location_id", locationId)

  if (error) throw error
  return (data || []) as (LocationInventory & { products: any })[]
}

export async function createLocation(location: Partial<BusinessLocation> & { owner_id: string; name: string; type: string }) {
  const { data, error } = await supabase()
    .from("locations")
    .insert(location)
    .select()
    .single()

  if (error) throw error
  return data as BusinessLocation
}

export async function updateLocation(id: string, updates: Partial<BusinessLocation>) {
  const { data, error } = await supabase()
    .from("locations")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as BusinessLocation
}

export async function deleteLocation(id: string) {
  const { error } = await supabase().from("locations").delete().eq("id", id)
  if (error) throw error
}

export async function getWholesaleTiers(ownerId: string) {
  const { data, error } = await supabase()
    .from("wholesale_tiers")
    .select("*")
    .eq("owner_id", ownerId)
    .order("name")

  if (error) throw error
  return (data || []) as WholesaleTier[]
}

export async function getBulkOrders(ownerId: string) {
  const { data, error } = await supabase()
    .from("bulk_orders")
    .select("*, companies(*), locations(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data || []) as (BulkOrder & { companies: Company; locations: BusinessLocation })[]
}

export async function createWholesaleTier(tier: Partial<WholesaleTier> & { owner_id: string; name: string; discount_percentage: number; min_order_value: number }) {
  const { data, error } = await supabase()
    .from("wholesale_tiers")
    .insert(tier)
    .select()
    .single()

  if (error) throw error
  return data as WholesaleTier
}

export async function deleteWholesaleTier(id: string) {
  const { error } = await supabase().from("wholesale_tiers").delete().eq("id", id)
  if (error) throw error
}

export async function getClientPortals(ownerId: string) {
  const { data, error } = await supabase()
    .from("client_portals")
    .select("*, companies(*)")
    .eq("owner_id", ownerId)

  if (error) throw error
  return (data || []) as (ClientPortal & { companies: Company })[]
}
