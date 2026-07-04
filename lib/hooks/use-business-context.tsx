"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import type { Profile } from "@/lib/types"
import { CurrencyService, ExchangeRates } from "@/lib/services/currency"

interface BusinessContextValue {
  user: any | null
  profile: Profile | null
  ownerId: string | null
  loading: boolean
  refreshProfile: () => Promise<void>
  formatPrice: (amount: number) => string
  convertPrice: (amount: number, fromCurrency: string) => Promise<number>
  exchangeRates: ExchangeRates | null
  /** Super Admin: Impersonate a business owner */
  impersonateOwner: (ownerId: string | null) => void
  isImpersonating: boolean
}

const BusinessContext = createContext<BusinessContextValue>({
  user: null,
  profile: null,
  ownerId: null,
  loading: true,
  refreshProfile: async () => {},
  formatPrice: (amount: number) => `₹${amount.toLocaleString()}`,
  convertPrice: async (amount: number) => amount,
  exchangeRates: null,
  impersonateOwner: () => {},
  isImpersonating: false,
})

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const { user: authUser, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonateId, setImpersonateId] = useState<string | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null)
  const retryCount = useRef(0)

  useEffect(() => {
    const saved = localStorage.getItem("ss_impersonate_id")
    if (saved) setImpersonateId(saved)
  }, [])

  const loadProfile = useCallback(
    async (userId: string) => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single()

        if (error?.code === "PGRST116") {
          router.push("/auth/owner-signup")
          return
        }

        if (error) {
          console.error("Error loading profile:", error.message ?? error)
          if (retryCount.current < 3) {
            retryCount.current += 1
            setTimeout(() => loadProfile(userId), 2000)
          }
          return
        }

        retryCount.current = 0
        if (data) {
          setProfile(data as Profile)
          const rates = await CurrencyService.getLatestRates(data.base_currency || "INR")
          setExchangeRates(rates)
        }
      } catch (err) {
        console.error("Profile load exception:", err)
        if (retryCount.current < 3) {
          retryCount.current += 1
          setTimeout(() => loadProfile(userId), 2000)
        }
      } finally {
        setLoading(false)
      }
    },
    [supabase, router]
  )

  useEffect(() => {
    if (authLoading) return
    if (!authUser) return

    retryCount.current = 0
    loadProfile(authUser.id)
  }, [authLoading, authUser?.id, loadProfile])

  const user = authUser

  // Realtime subscription for profile updates (Instant Permission Sync)
  useEffect(() => {
    if (!authUser?.id) return

    const profileChannel = supabase
      .channel(`profile_sync_${authUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${authUser.id}`,
        },
        (payload) => {
          setProfile(payload.new as Profile)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
    }
  }, [supabase, authUser?.id])

  const combinedLoading = authLoading || loading

  const impersonateOwner = (id: string | null) => {
    if (id) {
      localStorage.setItem("ss_impersonate_id", id)
      setImpersonateId(id)
    } else {
      localStorage.removeItem("ss_impersonate_id")
      setImpersonateId(null)
    }
  }

  const isImpersonating = !!(profile?.is_super_admin && impersonateId)
  const ownerId = isImpersonating
    ? impersonateId
    : profile?.role === "owner"
      ? profile.id
      : profile?.owner_id || null

  const formatPrice = useCallback(
    (amount: number) => {
      const currency = (profile as any)?.currency || profile?.base_currency || "INR"
      const rate = Number((profile as any)?.currency_rate) || 1
      const symbol = (profile as any)?.currency_symbol || "₹"
      const converted = amount * rate

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
    },
    [profile]
  )

  const convertPrice = useCallback(
    async (amount: number, fromCurrency: string) => {
      const toCurrency = profile?.base_currency || "INR"
      return await CurrencyService.convert(amount, fromCurrency, toCurrency)
    },
    [profile?.base_currency]
  )

  const refreshProfile = useCallback(async () => {
    if (authUser?.id) {
      retryCount.current = 0
      await loadProfile(authUser.id)
    }
  }, [authUser?.id, loadProfile])

  return (
    <BusinessContext.Provider
      value={{
        user,
        profile,
        ownerId,
        loading: combinedLoading,
        refreshProfile,
        formatPrice,
        convertPrice,
        exchangeRates,
        impersonateOwner,
        isImpersonating,
      }}
    >
      {children}
    </BusinessContext.Provider>
  )
}

/**
 * Hook to access the current user's business context.
 * Must be used inside a <BusinessProvider>.
 */
export function useBusinessContext() {
  const context = useContext(BusinessContext)
  if (context === undefined) {
    throw new Error("useBusinessContext must be used within a BusinessProvider")
  }
  return context
}
