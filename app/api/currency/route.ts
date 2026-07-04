import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const base = url.searchParams.get('base') || 'INR'
  const target = url.searchParams.get('target') || 'INR'

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch live rate
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${base}`,
      { next: { revalidate: 3600 } } // cache 1 hour
    )

    if (!res.ok) throw new Error('Rate fetch failed')
    const data = await res.json()

    const rate = data.rates[target]
    if (!rate) throw new Error(`Rate not found for ${target}`)

    // Save to exchange_rates table
    await supabase
      .from('exchange_rates')
      .upsert({
        base_currency: base,
        target_currency: target,
        rate: rate,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'base_currency,target_currency'
      })

    return Response.json({
      base,
      target,
      rate,
      last_updated: new Date().toISOString()
    })
  } catch (err: any) {
    // Fallback: try to get from database cache
    const { data: cached } = await supabase
      .from('exchange_rates')
      .select('rate, last_updated')
      .eq('base_currency', base)
      .eq('target_currency', target)
      .single()

    if (cached) {
      return Response.json({
        base,
        target,
        rate: Number(cached.rate),
        last_updated: cached.last_updated,
        cached: true
      })
    }

    return Response.json(
      { error: 'Could not fetch exchange rate' },
      { status: 500 }
    )
  }
}
