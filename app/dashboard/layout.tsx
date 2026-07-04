"use client"
import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardNav } from "@/components/dashboard-nav"
import { BusinessProvider, useBusinessContext } from "@/lib/hooks/use-business-context"
import { AuthProvider, useAuth } from "@/components/providers/auth-provider"
import { CurrencyProvider } from "@/components/providers/currency-provider"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { ErrorBoundary } from "@/components/error-boundary"
import { AuthRateLimitScreen } from "@/components/auth-rate-limit-screen"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  )
}

/** Wait for auth before mounting BusinessProvider (avoids profile load race). */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, rateLimited, retrySession } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || rateLimited) return
    if (!user) {
      router.push("/auth/login")
    }
  }, [user, isLoading, rateLimited, router])

  if (rateLimited) {
    return <AuthRateLimitScreen onRetry={retrySession} />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <BusinessProvider>
      <CurrencyProvider>
        <DashboardContent>
          <ErrorBoundary>{children}</ErrorBoundary>
        </DashboardContent>
      </CurrencyProvider>
    </BusinessProvider>
  )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { profile, isImpersonating, loading: businessLoading } = useBusinessContext()
  const router = useRouter()

  useEffect(() => {
    if (businessLoading) return
    if (profile?.is_super_admin && !isImpersonating) {
      router.push("/admin")
    }
  }, [profile, isImpersonating, businessLoading, router])

  if (businessLoading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center text-white">
        Loading Workspace...
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-slate-950">
      <DashboardNav user={user} />
      <main className="flex-1 overflow-auto pt-14 pb-16 lg:pt-0 lg:pb-0 relative">
        <ImpersonationBanner />
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
