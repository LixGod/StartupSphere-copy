import { createClient } from "@/lib/supabase/client"
import type { Profile, Notification, NotificationPayload } from "@/lib/types"

const supabase = () => createClient()

export async function updateProfile(id: string, updates: Partial<Profile>) {
  const { data, error } = await supabase()
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

export async function getEmployeeRequests(ownerEmail: string) {
  const { data, error } = await supabase()
    .from("employee_requests")
    .select("*")
    .eq("owner_email", ownerEmail)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getNotifications(userId: string, limit = 20) {
  const { data, error } = await supabase()
    .from("notifications")
    .select("*")
    .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as Notification[]
}

export async function getUnreadNotificationCount(userId: string) {
  const { count, error } = await supabase()
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
    .eq("is_read", false)

  if (error) throw error
  return count || 0
}

export async function markNotificationsRead(userId: string) {
  const { error } = await supabase()
    .from("notifications")
    .update({ is_read: true })
    .or(`user_id.eq.${userId},owner_id.eq.${userId}`)
    .eq("is_read", false)

  if (error) throw error
}

export async function sendNotification(payload: NotificationPayload) {
  const { error } = await supabase()
    .from("notifications")
    .insert({
      owner_id: payload.ownerId,
      user_id: payload.userId,
      action_type: payload.actionType,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      message: payload.message,
    })

  if (error) throw error
}

// Membership Requests
export async function createMembershipRequest(ownerId: string, packs: string[]) {
  const { data, error } = await supabase()
    .from("membership_requests")
    .insert({ owner_id: ownerId, requested_packs: packs })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMembershipRequests() {
  const { data, error } = await supabase()
    .from("membership_requests")
    .select("*, profiles(*)")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function approveMembershipRequest(requestId: string, packs: string[], ownerId: string) {
  const { error: reqError } = await supabase()
    .from("membership_requests")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", requestId)
  
  if (reqError) throw reqError

  const updates: any = {}
  if (packs.includes("Sales Pack")) updates.has_sales_pack = true
  if (packs.includes("Multi-Tenancy Pack")) updates.has_multi_tenancy_pack = true
  if (packs.includes("Core Modules Pack")) updates.has_core_modules_pack = true
  if (packs.includes("AI Analysis Pack")) updates.has_ai_analysis_pack = true
  if (packs.includes("CRM Pack")) updates.has_crm_pack = true
  
  const { error: profError } = await supabase()
    .from("profiles")
    .update(updates)
    .eq("id", ownerId)

  if (profError) throw profError
  return true
}

export async function updateOwnerPacks(ownerId: string, updates: any) {
  const { data, error } = await supabase()
    .from("profiles")
    .update(updates)
    .eq("id", ownerId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Workflows
export async function getWorkflows(ownerId: string) {
  const { data, error } = await supabase()
    .from("workflows")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function createWorkflow(workflow: any) {
  const { data, error } = await supabase()
    .from("workflows")
    .insert(workflow)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWorkflow(id: string, updates: any) {
  const { data, error } = await supabase()
    .from("workflows")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWorkflow(id: string) {
  const { error } = await supabase()
    .from("workflows")
    .delete()
    .eq("id", id)
  if (error) throw error
  return true
}
