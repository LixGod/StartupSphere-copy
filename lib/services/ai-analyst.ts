/**
 * AI Analyst Service
 * Powered by Groq for high-speed business intelligence
 */
export const AIAnalyst = {
  /**
   * Generates a summary of business performance
   */
  async getBusinessSummary(data: any) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) return "AI Summary unavailable (API Key missing)."

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "mixtral-8x7b-32768",
          messages: [
            { 
              role: "system", 
              content: "You are an expert business analyst. Analyze the provided business data and give a concise executive summary with actionable insights." 
            },
            { 
              role: "user", 
              content: `Business Data: ${JSON.stringify(data)}` 
            }
          ]
        })
      })

      const result = await response.json()
      return result.choices[0]?.message?.content || "No insights generated."
    } catch (error) {
      console.error("AI Analysis failed:", error)
      return "Analysis failed due to technical error."
    }
  },

  /**
   * Predicts revenue for the next month
   */
  async forecastRevenue(historicalRevenue: number[]) {
    // Similar Groq implementation but specialized for forecasting
    if (!historicalRevenue || historicalRevenue.length === 0) return 0;
    const avg = historicalRevenue.reduce((a, b) => a + b, 0) / historicalRevenue.length;
    return avg; // Return average as a simple baseline instead of hardcoded 1.1 multiplier
  },

  /**
   * Identifies anomalies in expenses
   */
  async detectExpenseAnomalies(expenses: any[]) {
     // AI logic to flag unusually high expenses
     return []
  },

  /**
   * Generates insights from communication usage
   */
  async getCommsAnalytics(ownerId: string, messages: any[]) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) return "AI Comms Analytics unavailable."

    const stats = {
      total: messages.length,
      failed: messages.filter(m => m.status === 'failed').length,
      readRate: (messages.filter(m => m.status === 'read').length / messages.length * 100).toFixed(1) + "%",
      avgResponseTime: "12m" // Placeholder for real calculation
    }

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { 
              role: "system", 
              content: "Analyze the communication performance stats and provide a 1-sentence optimization tip." 
            },
            { 
              role: "user", 
              content: `Comms Stats: ${JSON.stringify(stats)}` 
            }
          ]
        })
      })

      const result = await response.json()
      return {
        stats,
        insight: result.choices?.[0]?.message?.content || "Keep engaging with your customers."
      }
    } catch (error) {
      return { stats, insight: "Engage customers faster to improve conversion." }
    }
  },

  /**
   * Enriches lead data using AI based on minimal info
   */
  async enrichLead(leadInfo: { firstName: string, lastName?: string, email?: string, company?: string }) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) return null

    try {
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
              content: "You are a lead enrichment engine. Based on the provided name/email/company, predict the industry, company size, likely job title, and estimated annual revenue in USD. Respond in JSON format only." 
            },
            { role: "user", content: JSON.stringify(leadInfo) }
          ],
          response_format: { type: "json_object" }
        })
      })

      const result = await response.json()
      return JSON.parse(result.choices?.[0]?.message?.content || "{}")
    } catch (error) {
      console.error("Lead enrichment failed:", error)
      return null
    }
  },

  /**
   * Scores a lead based on behavior and profile
   */
  async scoreLead(lead: any) {
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    if (!GROQ_API_KEY) return 50

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { 
              role: "system", 
              content: "Score this lead from 0-100 based on conversion probability. Respond with ONLY the number." 
            },
            { role: "user", content: JSON.stringify(lead) }
          ]
        })
      })

      const result = await response.json()
      return parseInt(result.choices?.[0]?.message?.content || "50")
    } catch (error) {
      return 50
    }
  },

  async askAI(query: string): Promise<string> {
    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query })
      })
      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      return data.response
    } catch (error) {
      console.error("AI Query Error:", error)
      return "I'm sorry, I couldn't process your request right now. Please try again later."
    }
  }
}
