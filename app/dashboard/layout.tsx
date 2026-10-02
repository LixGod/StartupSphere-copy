"use client"
import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardNav } from "@/components/dashboard-nav"
import { BusinessProvider, useBusinessContext } from "@/lib/hooks/use-business-context"
import { AuthProvider, useAuth } from "@/components/providers/auth-provider"
import { CurrencyProvider } from "@/components/providers/currency-provider"
import { BranchProvider, useBranch } from "@/components/providers/branch-provider"
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
        <BranchProvider>
          <DashboardContent>
            <ErrorBoundary>{children}</ErrorBoundary>
          </DashboardContent>
        </BranchProvider>
      </CurrencyProvider>
    </BusinessProvider>
  )
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { profile, isImpersonating, loading: businessLoading } = useBusinessContext()
  const { hasPermissions, isOwner, isLoading: branchLoading } = useBranch()
  const router = useRouter()

  useEffect(() => {
    if (businessLoading) return
    if (profile?.is_super_admin && !isImpersonating) {
      router.push("/admin")
    }
  }, [profile, isImpersonating, businessLoading, router])

  if (businessLoading || branchLoading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center text-white">
        Loading Workspace...
      </div>
    )
  }

  if (!user) return null

  if (!isOwner && !hasPermissions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-6 text-center bg-slate-950 text-white">
        <div className="text-7xl">⏳</div>
        <h2 className="text-2xl font-bold">
          Waiting for Access
        </h2>
        <p className="text-slate-400 max-w-md">
          Your account is registered. Your employer needs to assign your permissions before you can access the dashboard.
        </p>
        <p className="text-sm text-slate-500">
          Signed in as: {user?.email}
        </p>
        <button
          onClick={async () => {
            const { createClient } = await import("@/lib/supabase/client")
            await createClient().auth.signOut()
            router.push("/auth/employee-login")
          }}
          className="px-6 py-2 border border-slate-700 rounded-xl hover:bg-slate-800 transition text-sm text-slate-300"
        >
          Sign Out
        </button>
      </div>
    )
  }

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
