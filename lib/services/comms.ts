import { createMessage, updateMessageStatus } from "@/lib/api"
import { TenantCommsService } from "@/lib/services/tenant-comms"
import type { Message } from "@/lib/types"

/**
 * Service to handle external communication integrations (WhatsApp, Email, etc.)
 */
export const CommsService = {
  /**
   * Sends a message through the specified platform using tenant-specific credentials
   */
  async sendMessage({
    conversationId,
    recipient,
    content,
    platform,
    ownerId
  }: {
    conversationId?: string
    recipient: string
    content: string
    platform: "whatsapp" | "email" | "in_app"
    ownerId: string
  }) {
    // 1. Log the message in our DB immediately (status: 'sending')
    let loggedMessage: Message | null = null
    
    if (conversationId) {
      loggedMessage = await createMessage({
        conversation_id: conversationId,
        content,
        sender_type: "business",
        sender_id: ownerId,
        status: "sending"
      })
    }

    // 2. Fetch Tenant Credentials
    const credentials = await TenantCommsService.getCredentials(ownerId, platform)
    
    // 3. Trigger external API call based on platform
    try {
      let externalResult: any = null

      if (platform === "whatsapp") {
        externalResult = await this.sendWhatsApp(recipient, content, credentials, ownerId)
      } else if (platform === "email") {
        externalResult = await this.sendEmail(recipient, content, credentials, ownerId)
      }

      // 4. Update status on success
      if (loggedMessage) {
        await updateMessageStatus(loggedMessage.id, "sent", { external_id: externalResult?.id || externalResult?.messageId })
      }

      return loggedMessage
    } catch (error: any) {
      console.error(`Failed to send ${platform} message to ${recipient}:`, error)
      
      // Update status on failure
      if (loggedMessage) {
        await updateMessageStatus(loggedMessage.id, "failed", { error_message: error.message })
      }
      
      throw error
    }
  },

  /**
   * Multi-tenant WhatsApp Business API Implementation
   */
  async sendWhatsApp(phone: string, content: string, credentials: any, ownerId: string) {
    if (!credentials || !credentials.accessToken || !credentials.phoneId) {
      throw new Error("WhatsApp credentials not configured for this business.")
    }

    const { accessToken, phoneId } = credentials

    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone.replace(/\D/g, ''),
        type: "text",
        text: { body: content }
      })
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || "WhatsApp API Error")
    
    return { id: data.messages?.[0]?.id }
  },

  /**
   * Multi-tenant Email Integration (Resend/SMTP)
   */
  async sendEmail(email: string, content: string, credentials: any, ownerId: string, subject?: string) {
    if (!credentials) {
      throw new Error("Email credentials not configured for this business.")
    }

    const { provider, apiKey, fromEmail, fromName } = credentials

    if (provider === "resend") {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: `${fromName || "StartupSphere"} <${fromEmail}>`,
          to: [email],
          subject: subject || "New Message",
          text: content
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || "Email API Error")
      return { id: data.id }
    }

    // Add SMTP/SendGrid logic here...
    throw new Error(`Email provider ${provider} not supported yet.`)
  },

  /**
   * AI-Powered Message Refinement (Using Groq)
   */
  async getAiSuggestion(context: string) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) return "AI suggested message placeholder..."

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: "You are an expert sales and customer support assistant. Refine the user's message to be more professional, persuasive, and clear. Keep it concise." 
          },
          { role: "user", content: context }
        ],
        temperature: 0.7
      })
    })

    const data = await response.json()
    return data.choices?.[0]?.message?.content || "Could not generate AI suggestion."
  }
}
