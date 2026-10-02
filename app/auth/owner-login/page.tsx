"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle } from "lucide-react"

export default function OwnerLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Sign out any existing session first
      await supabase.auth.signOut({ scope: "local" })
      
      // Wait for session to clear
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) throw signInError

      if (!data.user) throw new Error("No user returned from login")

      // Verify user is an owner
      let { data: profile, error: profileError } = await supabase.from("profiles").select("role,is_super_admin").eq("id", data.user.id).single()

      if (profileError) {
        console.error("Profile verification error:", profileError)
        await supabase.auth.signOut({ scope: "local" })
        if (profileError.code === "PGRST116") {
          // Create missing profile for the owner
          const { error: insertError } = await supabase.from("profiles").insert({
            id: data.user.id,
            role: "owner",
            is_super_admin: email === "beast525372@gmail.com",
            // Add other required fields with default values if needed
          })
          if (insertError) {
            throw new Error(`Failed to create owner profile: ${insertError.message}`)
          }
          // Retry fetching the profile after insertion
          const { data: newProfile, error: newProfileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single()
          if (newProfileError) {
            throw new Error(`Profile verification failed after creation: ${newProfileError.message}`)
          }
          if (newProfile?.role !== "owner") {
            throw new Error("Created profile does not have owner role")
          }
          profile = newProfile
          // Continue to success flow
        } else {
          throw new Error(`Could not verify account type: ${profileError.message}`)
        }
      }

        // Ensure admin flag for known admin email
        if (profile && email === "beast525372@gmail.com" && !profile.is_super_admin) {
          const { error: adminUpdateError } = await supabase
            .from("profiles")
            .update({ is_super_admin: true })
            .eq("id", data.user.id)
          if (adminUpdateError) {
            console.error("Failed to set is_super_admin flag:", adminUpdateError)
          } else {
            profile.is_super_admin = true
          }
        }
      // Determine destination based on role
      if (profile?.is_super_admin) {
        // Admin access
        setLoading(false)
        router.push("/admin")
        router.refresh()
        return
      }
      if (profile?.role !== "owner") {
        await supabase.auth.signOut({ scope: "local" })
        setError("This account is not an owner account. Please use employee login.")
        setLoading(false)
        return
      }
      // Owner success
      setLoading(false)
      router.push("/dashboard/overview")
      router.refresh()
      return
    } catch (err: any) {
      setError(err.message || "Invalid email or password")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 backdrop-blur-sm shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Owner Sign In</h1>
            <p className="text-slate-400">Access your startup dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@startup.com"
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-300 flex gap-2 p-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/50"
            >
              {loading ? "Signing in..." : "Sign In as Owner"}
            </Button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm">
            <p className="text-slate-400">
              Don't have an account?{" "}
              <Link href="/auth/owner-signup" className="text-blue-400 hover:text-blue-300 font-medium">
                Create your startup
              </Link>
            </p>
            <p className="text-slate-500">
              Employee?{" "}
              <Link href="/auth/employee-login" className="text-slate-400 hover:text-slate-300">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

