"use client"

import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { ShieldAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ImpersonationBanner() {
  const { isImpersonating, impersonateOwner } = useBusinessContext()

  if (!isImpersonating) return null

  return (
    <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300 z-[1000] sticky top-0 shadow-lg">
      <div className="flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 animate-pulse" />
        <div className="text-xs">
          <span className="font-bold uppercase tracking-widest mr-2">Admin View Mode:</span>
          You are currently viewing this dashboard as the business owner. Any changes made will affect their live data.
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => {
            impersonateOwner(null)
            window.location.href = "/admin"
        }}
        className="bg-white/10 border-white/20 hover:bg-white/20 text-white font-bold h-7 text-[10px]"
      >
        <X className="w-3 h-3 mr-1" /> Exit View
      </Button>
    </div>
  )
}

