"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { isAuthRateLimitError } from "@/lib/utils/auth-errors"
import { AuthRateLimitScreen } from "@/components/auth-rate-limit-screen"

export default function AuthRedirect() {
  const router = useRouter()
  const supabase = createClient()
  const [rateLimited, setRateLimited] = useState(false)

  const checkRole = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError && isAuthRateLimitError(sessionError)) {
        setRateLimited(true)
        return
      }

      const user = session?.user
      if (!user) {
        router.replace("/auth/login")
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, owner_id, is_super_admin")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        router.replace("/auth/login")
        return
      }

      if (profile.role === "admin" || profile.is_super_admin) {
        router.replace("/admin")
      } else if (profile.role === "owner") {
        router.replace("/dashboard/overview")
      } else if (profile.role === "employee") {
        if (!profile.owner_id) {
          router.replace("/auth/employee-login?error=pending")
          return
        }
        router.replace("/dashboard/overview")
      } else {
        router.replace("/dashboard/overview")
      }
    } catch (err) {
      if (isAuthRateLimitError(err)) {
        setRateLimited(true)
        return
      }
      console.error("Redirect error:", err)
      router.replace("/auth/login")
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      checkRole()
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (rateLimited) {
    return <AuthRateLimitScreen onRetry={() => { setRateLimited(false); checkRole() }} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium">Verifying account...</p>
      </div>
    </div>
  )
}
