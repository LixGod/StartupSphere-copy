import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createMessage, createConversation, getContacts } from "@/lib/api"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  // This token should ideally be shared or per-tenant, but for simplicity of setup, 
  // we use a system-wide verify token that users set in their Meta app.
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response("Forbidden", { status: 403 })
}

export async function POST(request: Request) {
  const payload = await request.json()
  const supabase = await createClient()

  try {
    const entry = payload.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    
    if (!value || !value.messages) {
       // Handle delivery status updates (sent, delivered, read)
       if (value?.statuses?.[0]) {
          const statusUpdate = value.statuses[0]
          const externalId = statusUpdate.id
          const status = statusUpdate.status
          
          await supabase
            .from("messages")
            .update({ status })
            .eq("external_id", externalId)
       }
       return NextResponse.json({ success: true })
    }

    const message = value.messages[0]
    const from = message.from // Customer phone number
    const text = message.text?.body || "Media message (not supported yet)"
    const metadata = value.metadata
    const phoneId = metadata?.phone_number_id

    // 1. Find the tenant (owner_id) by phoneId
    const { data: settings, error: settingsError } = await supabase
      .from("comms_settings")
      .select("owner_id")
      .eq("whatsapp_phone_id", phoneId)
      .single()

    if (settingsError || !settings) {
      console.error("No tenant found for phoneId:", phoneId)
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
    }

    const ownerId = settings.owner_id

    // 2. Find or create the contact
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("phone", from)
      .limit(1)
    
    let contactId = contacts?.[0]?.id

    if (!contactId) {
      // Create a new lead/contact if it doesn't exist
      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          owner_id: ownerId,
          first_name: "WhatsApp User",
          phone: from,
          lead_source: "WhatsApp",
          lead_status: "new"
        })
        .select()
        .single()
      contactId = newContact?.id
    }

    // 3. Find or create conversation
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("contact_id", contactId)
      .eq("platform", "whatsapp")
      .limit(1)

    let conversationId = conversations?.[0]?.id

    if (!conversationId) {
      const { data: newConversation } = await supabase
        .from("conversations")
        .insert({
          owner_id: ownerId,
          contact_id: contactId,
          platform: "whatsapp",
          subject: `Chat with ${from}`
        })
        .select()
        .single()
      conversationId = newConversation?.id
    }

    // 4. Save the message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "customer",
      content: text,
      metadata: { whatsapp_raw: message },
      external_id: message.id,
      status: "delivered"
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("WhatsApp Webhook Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
