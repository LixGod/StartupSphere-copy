"use client"

import { DealActivity } from "@/lib/types"
import { Mail, Phone, Calendar, MessageSquare, ArrowRight, User } from "lucide-react"

interface ActivityTimelineProps {
  activities: DealActivity[]
  loading?: boolean
}

export function ActivityTimeline({ activities, loading }: ActivityTimelineProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="w-4 h-4" />
      case "call": return <Phone className="w-4 h-4" />
      case "meeting": return <Calendar className="w-4 h-4" />
      case "note": return <MessageSquare className="w-4 h-4" />
      case "stage_change": return <ArrowRight className="w-4 h-4 text-blue-400" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-800 rounded-xl" />)}
    </div>
  }

  if (activities.length === 0) {
    return <div className="text-center py-8 text-slate-500 text-sm">
      No activity recorded yet.
    </div>
  }

  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-800 before:via-slate-800 before:to-transparent">
      {activities.map((activity) => (
        <div key={activity.id} className="relative flex items-start gap-4">
          <div className="sticky top-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400 shadow-sm">
            {getIcon(activity.type)}
          </div>
          <div className="flex flex-col gap-1 bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl w-full">
            <div className="flex justify-between items-start">
               <h4 className="text-sm font-bold text-white">{activity.title}</h4>
               <span className="text-[10px] text-slate-500 font-mono">
                 {new Date(activity.activity_date).toLocaleString()}
               </span>
            </div>
            {activity.description && (
              <p className="text-sm text-slate-400">{activity.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/50">
               <div className="w-4 h-4 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <User className="w-2.5 h-2.5 text-blue-400" />
               </div>
               <span className="text-[10px] text-slate-500">Performed by {activity.performed_by}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

