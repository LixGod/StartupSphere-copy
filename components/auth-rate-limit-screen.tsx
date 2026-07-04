"use client"

import { Button } from "@/components/ui/button"

export function AuthRateLimitScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
        <p className="text-lg font-semibold text-white">Too many requests</p>
        <p className="text-slate-400 text-sm">
          Please wait about 1 minute before trying again. Automatic retries are disabled to avoid
          making the problem worse.
        </p>
        <Button onClick={onRetry} className="w-full">
          Retry
        </Button>
      </div>
    </div>
  )
}
