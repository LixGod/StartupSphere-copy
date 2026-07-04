import { createClient } from "@/lib/supabase/client"
import type {
  Deal, PipelineStage, FollowUpTask, SmartAlert,
  Conversation, Message, MessageTemplate,
  SupportTicket, TicketComment, KnowledgeArticle,
  Contact
} from "@/lib/types"

const supabase = () => createClient()

// ---- Pipeline Stages ----

export async function getPipelineStages(ownerId: string) {
  let { data, error } = await supabase()
    .from("pipeline_stages")
    .select("*")
    .eq("owner_id", ownerId)
    .order("order_index")

  if (error) throw error

  if (!data || data.length === 0) {
    const { data: defaultData, error: defaultError } = await supabase()
      .from("pipeline_stages")
      .select("*")
      .is("owner_id", null)
      .order("order_index")

    if (defaultError) throw defaultError
    return (defaultData || []) as PipelineStage[]
  }

  return data as PipelineStage[]
}

export async function createPipelineStage(stage: Partial<PipelineStage> & { owner_id: string; name: string; order_index: number }) {
  const { data, error } = await supabase()
    .from("pipeline_stages")
    .insert(stage)
    .select()
    .single()

  if (error) throw error
  return data as PipelineStage
}

// ---- Deals ----

export async function getDeals(ownerId: string) {
  const { data, error } = await supabase()
    .from("deals")
    .select("*, contacts(*), companies(*), pipeline_stages(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data || []) as Deal[]
}

export async function createDeal(deal: Partial<Deal> & { owner_id: string; title: string }) {
  const { data, error } = await supabase()
    .from("deals")
    .insert(deal)
    .select()
    .single()

  if (error) throw error
  return data as Deal
}

export async function updateDeal(id: string, updates: Partial<Deal>) {
  const { data, error } = await supabase()
    .from("deals")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Deal
}

// ---- Follow-up Tasks ----

export async function getFollowUpTasks(ownerId: string) {
  const { data, error } = await supabase()
    .from("follow_up_tasks")
    .select("*, contacts(*), deals(*)")
    .eq("owner_id", ownerId)
    .order("due_date", { ascending: true })

  if (error) throw error
  return (data || []) as FollowUpTask[]
}

export async function createFollowUpTask(task: Partial<FollowUpTask> & { owner_id: string; title: string }) {
  const { data, error } = await supabase()
    .from("follow_up_tasks")
    .insert(task)
    .select()
    .single()

  if (error) throw error
  return data as FollowUpTask
}

// ---- Smart Alerts ----

export async function getSmartAlerts(ownerId: string, limit = 50) {
  const { data, error } = await supabase()
    .from("smart_alerts")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("is_resolved", false)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as SmartAlert[]
}

export async function resolveAlert(id: string) {
  const { error } = await supabase()
    .from("smart_alerts")
    .update({ is_resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw error
}

// ---- Conversations & Messages ----

export async function getConversations(ownerId: string) {
  const { data, error } = await supabase()
    .from("conversations")
    .select("*, contacts(*)")
    .eq("owner_id", ownerId)
    .order("last_message_at", { ascending: false })

  if (error) throw error
  return (data || []) as (Conversation & { contacts: Contact })[]
}

export async function createConversation(conversation: Partial<Conversation> & { owner_id: string; contact_id: string; platform: string }) {
  const { data, error } = await supabase()
    .from("conversations")
    .insert(conversation)
    .select()
    .single()

  if (error) throw error
  return data as Conversation
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase()
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data || []) as Message[]
}

export async function createMessage(message: Partial<Message> & { conversation_id: string; content: string; sender_type: string }) {
  const { data, error } = await supabase()
    .from("messages")
    .insert(message)
    .select()
    .single()

  if (error) throw error

  await supabase()
    .from("conversations")
    .update({ 
      last_message_at: new Date().toISOString(),
      last_message_preview: message.content.substring(0, 100),
      updated_at: new Date().toISOString()
    })
    .eq("id", message.conversation_id)

  return data as Message
}

export async function updateMessageStatus(id: string, status: string, metadata: Record<string, any> = {}) {
  const { data, error } = await supabase()
    .from("messages")
    .update({ status, ...metadata, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Message
}

export async function getMessageTemplates(ownerId: string) {
  const { data, error } = await supabase()
    .from("message_templates")
    .select("*")
    .eq("owner_id", ownerId)
    .order("name")

  if (error) throw error
  return (data || []) as MessageTemplate[]
}

// ---- Helpdesk ----

export async function getSupportTickets(ownerId: string) {
  const { data, error } = await supabase()
    .from("support_tickets")
    .select("*, contacts(*)")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false })

  if (error) throw error
  return (data || []) as (SupportTicket & { contacts: Contact })[]
}

export async function createSupportTicket(ticket: Partial<SupportTicket> & { owner_id: string; subject: string }) {
  const { data, error } = await supabase()
    .from("support_tickets")
    .insert(ticket)
    .select()
    .single()

  if (error) throw error
  return data as SupportTicket
}

export async function updateSupportTicket(id: string, updates: Partial<SupportTicket>) {
  const { data, error } = await supabase()
    .from("support_tickets")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as SupportTicket
}

export async function getTicketComments(ticketId: string) {
  const { data, error } = await supabase()
    .from("ticket_comments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data || []) as TicketComment[]
}

export async function createTicketComment(comment: Partial<TicketComment> & { ticket_id: string; content: string }) {
  const { data, error } = await supabase()
    .from("ticket_comments")
    .insert(comment)
    .select()
    .single()

  if (error) throw error
  return data as TicketComment
}

export async function getKnowledgeArticles(ownerId: string) {
  const { data, error } = await supabase()
    .from("knowledge_articles")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data || []) as KnowledgeArticle[]
}
