"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

type RealTimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*"

interface RealTimeOptions {
  table: string
  event?: RealTimeEvent
  filter?: string
  callback: (payload: any) => void
  enabled?: boolean
}

/**
 * Hook to handle centralized real-time subscriptions.
 * Enforces architecture rule of centralizing Supabase interactions.
 */
export function useRealTime({ 
  table, 
  event = "*", 
  filter, 
  callback,
  enabled = true 
}: RealTimeOptions) {
  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    
    // Create channel name based on table and optional filter
    const channelName = filter 
      ? `realtime:${table}:${filter}`
      : `realtime:${table}`

    const channel = supabase.channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          filter,
        },
        (payload: any) => {
          // Removed console.log for production
          callback(payload)
        }
      )
      .subscribe()

    return () => {
      // Removed console.log for production
      supabase.removeChannel(channel)
    }
  }, [table, event, filter, callback, enabled])
}
