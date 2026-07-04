"use client"

import { useState, useEffect } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { getSmartAlerts, resolveAlert } from "@/lib/api"
import type { SmartAlert } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function AlertCenter() {
  const { ownerId } = useBusinessContext()
  const [alerts, setAlerts] = useState<SmartAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ownerId) {
      loadAlerts()
    }
  }, [ownerId])

  const loadAlerts = async () => {
    try {
      const data = await getSmartAlerts(ownerId!)
      setAlerts(data)
    } catch (error) {
      console.error("Error loading alerts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (id: string) => {
    try {
      setAlerts(prev => prev.filter(a => a.id !== id))
      await resolveAlert(id)
    } catch (error) {
      console.error("Error resolving alert:", error)
      loadAlerts()
    }
  }

  const getIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertCircle className="w-5 h-5 text-red-500" />
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-500" />
      default: return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  if (loading) return null
  if (alerts.length === 0) return null

  return (
    <Card className="bg-slate-900 border-slate-800 shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-slate-800">
        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          Smart Alerts
          <Badge className="bg-blue-600/20 text-blue-400 border-0 ml-1">{alerts.length}</Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-white h-7 px-2">
          Clear All
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="divide-y divide-slate-800">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 flex gap-4 hover:bg-slate-800/30 transition-colors group">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(alert.severity)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white leading-none">{alert.title}</p>
                    <span className="text-[10px] text-slate-500">
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{alert.message}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-[10px] text-blue-400 hover:bg-blue-400/10"
                      onClick={() => handleResolve(alert.id)}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Resolve
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-[10px] text-slate-500 hover:bg-slate-800"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

