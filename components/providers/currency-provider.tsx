'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useBusinessContext } from '@/lib/hooks/use-business-context'

export const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal' },
]

interface CurrencyContextType {
  currency: string          // e.g. 'GBP'
  symbol: string            // e.g. '£'
  rate: number              // conversion rate from INR
  isLoading: boolean
  setCurrency: (code: string) => Promise<void>
  format: (amountInINR: number) => string
  convert: (amountInINR: number) => number
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'INR',
  symbol: '₹',
  rate: 1,
  isLoading: false,
  setCurrency: async () => {},
  format: (n) => `₹${n.toLocaleString('en-IN')}`,
  convert: (n) => n,
})

export function CurrencyProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const { user } = useAuth()
  const { profile } = useBusinessContext()
  const [currency, setCurrencyState] = useState('INR')
  const [symbol, setSymbol] = useState('₹')
  const [rate, setRate] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Load currency from profile on mount/profile changes
  useEffect(() => {
    if (profile?.currency) {
      setCurrencyState(profile.currency)
      const curr = SUPPORTED_CURRENCIES.find(
        c => c.code === profile.currency
      )
      setSymbol(curr?.symbol || '₹')
      setRate(Number(profile.currency_rate) || 1)
    }
  }, [profile])

  // Listen for real-time currency changes on the owner profile
  // So all employees see changes instantly
  useEffect(() => {
    if (!profile?.id) return

    // Get owner_id — employees use their owner's currency
    const ownerId = profile.owner_id || profile.id

    const channel = supabase
      .channel(`currency_${ownerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${ownerId}`
        },
        (payload: { new: Record<string, any> }) => {
          const newProfile = payload.new
          if (newProfile.currency) {
            setCurrencyState(newProfile.currency)
            const curr = SUPPORTED_CURRENCIES.find(
              c => c.code === newProfile.currency
            )
            setSymbol(curr?.symbol || '₹')
            setRate(Number(newProfile.currency_rate) || 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, profile?.owner_id, supabase])

  const setCurrency = useCallback(async (code: string) => {
    if (!user || code === currency) return

    setIsLoading(true)
    try {
      // Fetch live exchange rate from our endpoint
      const res = await fetch(
        `/api/currency?base=INR&target=${code}`
      )
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      const newRate = code === 'INR' ? 1 : Number(data.rate)
      const curr = SUPPORTED_CURRENCIES.find(c => c.code === code)

      // Update profile in Supabase
      // This triggers real-time update for ALL employees
      const { error } = await supabase
        .from('profiles')
        .update({
          currency: code,
          currency_symbol: curr?.symbol || code,
          currency_rate: newRate,
          currency_updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setCurrencyState(code)
      setSymbol(curr?.symbol || code)
      setRate(newRate)

    } catch (err) {
      console.error('Currency change failed:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [user, currency, supabase])

  // Convert from INR (base) to current currency
  const convert = useCallback((amountInINR: number): number => {
    if (currency === 'INR') return amountInINR
    return amountInINR * rate
  }, [currency, rate])

  // Format with symbol and locale
  const format = useCallback((amountInINR: number): string => {
    const converted = convert(amountInINR)
    
    // Indian number format for INR, international for others
    if (currency === 'INR') {
      return `₹${converted.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })}`
    }
    
    return `${symbol}${converted.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }, [currency, symbol, convert])

  return (
    <CurrencyContext.Provider value={{
      currency, symbol, rate, isLoading,
      setCurrency, format, convert
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
