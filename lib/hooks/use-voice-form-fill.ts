'use client'

import { useState } from 'react'

export type FormContext =
  | 'inventory_product'
  | 'sales_order'
  | 'expense'
  | 'crm_lead'

interface VoiceFormFillResult {
  isLoading: boolean
  fillForm: (transcript: string, context: FormContext) => Promise<Record<string, unknown>>
}

const CONTEXT_SCHEMAS: Record<FormContext, string> = {
  inventory_product: `{
    name: string | null,
    sku: string | null,
    price: number | null,
    cost_price: number | null,
    stock_quantity: number | null,
    category: string | null,
    unit: string | null,
    description: string | null
  }`,
  sales_order: `{
    customer_name: string | null,
    customer_phone: string | null,
    product_name: string | null,
    quantity: number | null,
    unit_price: number | null,
    total_amount: number | null,
    notes: string | null
  }`,
  expense: `{
    category: string | null,
    amount: number | null,
    description: string | null,
    vendor_name: string | null
  }`,
  crm_lead: `{
    first_name: string | null,
    last_name: string | null,
    company: string | null,
    email: string | null,
    phone: string | null,
    notes: string | null,
    source: string | null
  }`,
}

function parseJsonFromAiText(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {}
  try {
    return JSON.parse(jsonMatch[0]) as Record<string, unknown>
  } catch {
    return {}
  }
}

export function useVoiceFormFill(): VoiceFormFillResult {
  const [isLoading, setIsLoading] = useState(false)

  const fillForm = async (
    transcript: string,
    context: FormContext
  ): Promise<Record<string, unknown>> => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcript,
          systemPrompt: `You are a form-filling assistant for an Indian business app.
The user spoke in Hindi, Marathi, Gujarati, or English (or a mix).
Extract form field values from what they said.
Context: ${context}
Return ONLY a valid JSON object matching this schema (no markdown, no explanation):
${CONTEXT_SCHEMAS[context]}
Rules:
- Set fields to null if not mentioned or unclear
- For Indian names, preserve the full name
- For amounts, extract just the number (no ₹ symbol)
- For phone numbers, extract 10 digits only
- For categories use common Indian business categories`,
        }),
      })

      if (response.status === 401) {
        return { __authError: true }
      }

      if (!response.ok) return {}

      const data = await response.json()
      const text =
        (typeof data.response === 'string' && data.response) ||
        (typeof data.message === 'string' && data.message) ||
        (typeof data.content === 'string' && data.content) ||
        ''

      return parseJsonFromAiText(text)
    } catch {
      return {}
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, fillForm }
}
