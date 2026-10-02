"use client"

import { useState, useEffect } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { getSupportTickets, updateSupportTicket, createSupportTicket } from "@/lib/api"
import type { SupportTicket, Contact } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  Filter, 
  MessageSquare, 
  Clock, 
  User, 
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  ChevronRight
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"

export default function HelpdeskPage() {
  const { ownerId, loading: contextLoading } = useBusinessContext()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<(SupportTicket & { contacts: Contact })[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    if (ownerId) {
      loadTickets()
    }
  }, [ownerId])

  const loadTickets = async () => {
    try {
      const data = await getSupportTickets(ownerId!)
      setTickets(data)
    } catch (error) {
      console.error("Error loading tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      const isClosedOrResolved = newStatus === 'closed' || newStatus === 'resolved'
      const updates: any = { 
        status: newStatus as any,
        ...(isClosedOrResolved ? { resolved_at: new Date().toISOString() } : {})
      }
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t))
      await updateSupportTicket(ticketId, updates)
    } catch (error) {
      console.error("Error updating ticket:", error)
      loadTickets()
    }
  }

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.contacts?.first_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-500 bg-red-500/10 border-red-500/20"
      case "high": return "text-amber-500 bg-amber-500/10 border-amber-500/20"
      case "medium": return "text-blue-500 bg-blue-500/10 border-blue-500/20"
      default: return "text-slate-500 bg-slate-500/10 border-slate-500/20"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-600 text-white"
      case "pending": return "bg-amber-600 text-white"
      case "resolved": return "bg-emerald-600 text-white"
      default: return "bg-slate-700 text-white"
    }
  }

  if (contextLoading || loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Helpdesk & Support</h1>
          <p className="text-slate-400">Manage customer issues and support requests</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/40">
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {['all', 'open', 'pending', 'resolved', 'closed'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "secondary" : "ghost"}
              size="sm"
              className={`capitalize text-xs px-4 h-8 ${statusFilter === s ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search tickets..." 
              className="pl-10 bg-slate-900 border-slate-800 text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="bg-slate-900 border-slate-800 text-slate-400 hover:text-white">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">No tickets found</h3>
            <p className="text-slate-500">Search for something else or create a new ticket</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="bg-slate-900 border-slate-800 hover:border-blue-600/50 transition-all group cursor-pointer overflow-hidden shadow-xl">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className={`w-1.5 ${getStatusColor(ticket.status)}`}></div>
                  <div className="flex-1 p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[9px] uppercase tracking-wider border-0 px-2 py-0.5 ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </Badge>
                          <span className="text-xs text-slate-500 font-mono">#{ticket.id.slice(0, 8)}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors leading-tight">
                          {ticket.subject}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex flex-col items-end">
                          <span className="text-slate-500">Assigned To</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                              <User className="w-3 h-3 text-slate-400" />
                            </div>
                            <span className="text-slate-300 font-medium">Unassigned</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-white">
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'open')}>Mark Open</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'pending')}>Mark Pending</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'resolved')}>Mark Resolved</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(ticket.id, 'closed')} className="text-red-400">Close Ticket</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-800/50 text-xs">
                      <div className="flex items-center gap-2 text-slate-400">
                        <User className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-slate-200">{ticket.contacts?.first_name} {ticket.contacts?.last_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Created {new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <span>3 Comments</span>
                      </div>
                      <div className="flex-1 flex justify-end">
                        <Button variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-400/10 group-hover:translate-x-1 transition-transform">
                          View Details
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

