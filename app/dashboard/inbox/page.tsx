"use client"

import { useState, useEffect, useRef } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { getConversations, getMessages, createMessage, createConversation, getContacts } from "@/lib/api"
import type { Conversation, Message, Contact } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { CommsService } from "@/lib/services/comms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Send, 
  MessageSquare, 
  Mail, 
  Phone, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Check, 
  CheckCheck,
  Clock,
  AlertCircle,
  Filter,
  Plus,
  X,
  Users,
  Bot,
  ShieldAlert
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

export default function InboxPage() {
  const { ownerId, profile, loading: contextLoading } = useBusinessContext()
  const supabaseRef = useRef(createClient())
  
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<(Conversation & { contacts: Contact })[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [platformFilter, setPlatformFilter] = useState<string | "all">("all")
  
  // New chat state
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [newChatData, setNewChatData] = useState<{ contactId: string; platform: "whatsapp" | "email" | "in_app"; initialMessage: string }>({ 
    contactId: "", 
    platform: "in_app", 
    initialMessage: "" 
  })
  const [isAiReplying, setIsAiReplying] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Initial Load
  useEffect(() => {
    if (ownerId) {
      loadConversations()
    }
  }, [ownerId])

  const loadConversations = async () => {
    try {
      const data = await getConversations(ownerId!)
      setConversations(data)
      if (data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0].id)
      }
      
      // Load contacts for new chat modal
      const contactsData = await getContacts(ownerId!)
      setAllContacts(contactsData)
    } catch (error) {
      console.error("Error loading conversations:", error)
    } finally {
      setLoading(false)
    }
  }

  // 2. Load Messages for Active Conversation
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId)
      
      // Subscribe to real-time messages for THIS conversation
      const channel = supabaseRef.current
        .channel(`chat:${activeConversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'crm_messages',
            filter: `conversation_id=eq.${activeConversationId}`,
          },
          (payload: any) => {
            const newMsg = payload.new as Message
            setMessages((prev) => [...prev, newMsg])
            setTimeout(scrollToBottom, 50)
          }
        )
        .subscribe()

      return () => {
        supabaseRef.current.removeChannel(channel)
      }
    }
  }, [activeConversationId])

  // 3. Global Conversation Real-time Updates (for the sidebar)
  useEffect(() => {
    if (ownerId) {
      const channel = supabaseRef.current
        .channel('global-conversations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `owner_id=eq.${ownerId}`,
          },
          () => {
            loadConversations() // Refresh list on any change
          }
        )
        .subscribe()

      return () => {
        supabaseRef.current.removeChannel(channel)
      }
    }
  }, [ownerId])

  const loadMessages = async (id: string) => {
    try {
      const data = await getMessages(id)
      setMessages(data)
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConversationId) return

    const messageContent = newMessage
    setNewMessage("")

    try {
      // Use CommsService to handle DB logging AND external delivery
      await CommsService.sendMessage({
        conversationId: activeConversationId,
        recipient: activeConversation?.contacts?.email || activeConversation?.contacts?.phone || "",
        content: messageContent,
        platform: activeConversation?.platform || "in_app",
        ownerId: ownerId!
      })
      
      // The local state will update via the Realtime subscription
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ownerId || !newChatData.contactId || !newChatData.initialMessage) return

    try {
      const conv = await createConversation({
        owner_id: ownerId,
        contact_id: newChatData.contactId,
        platform: newChatData.platform,
        status: "active"
      })
      
      await createMessage({
        conversation_id: conv.id,
        content: newChatData.initialMessage,
        sender_type: "business",
        sender_id: ownerId
      })

      setShowNewChatModal(false)
      setNewChatData({ contactId: "", platform: "in_app", initialMessage: "" })
      setActiveConversationId(conv.id) // Automatically switch to the new chat
      loadConversations()
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  const activeConversation = conversations.find(c => c.id === activeConversationId)

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.contacts?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = platformFilter === "all" || c.platform === platformFilter
    return matchesSearch && matchesPlatform
  })

  if (contextLoading || (loading && conversations.length === 0)) {
    return (
      <div className="flex h-[calc(100vh-120px)] bg-slate-950 p-4 lg:p-8">
        <Skeleton className="w-80 h-full rounded-xl mr-4" />
        <Skeleton className="flex-1 h-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-slate-950 overflow-hidden border border-slate-800 rounded-xl m-4 lg:m-8">
      {/* Sidebar: Conversation List */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">Messages</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300" onClick={() => setShowNewChatModal(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search chats..." 
              className="pl-10 bg-slate-800 border-slate-700 text-white text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'whatsapp', 'email', 'in_app'].map((p) => (
              <Badge 
                key={p}
                className={`cursor-pointer capitalize text-[10px] px-2 py-0.5 border-0 ${
                  platformFilter === p ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
                onClick={() => setPlatformFilter(p)}
              >
                {p === 'in_app' ? 'In-App' : p}
              </Badge>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-slate-800/50">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm italic">
                No conversations found
              </div>
            ) : (
              filteredConversations.map((c) => (
                <div 
                  key={c.id}
                  className={`p-4 flex gap-3 cursor-pointer transition-all hover:bg-slate-800/40 relative ${
                    activeConversationId === c.id ? 'bg-blue-600/10 border-l-2 border-blue-600' : ''
                  }`}
                  onClick={() => setActiveConversationId(c.id)}
                >
                  <Avatar className="h-10 w-10 border border-slate-700">
                    <AvatarFallback className="bg-slate-800 text-slate-300 font-bold">
                      {c.contacts?.first_name?.[0]}{c.contacts?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className="text-sm font-semibold text-white truncate">
                        {c.contacts?.first_name} {c.contacts?.last_name}
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        {new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate leading-relaxed">
                      {c.last_message_preview || "No messages yet"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {c.platform === 'whatsapp' && <Phone className="w-2.5 h-2.5 text-emerald-500" />}
                      {c.platform === 'email' && <Mail className="w-2.5 h-2.5 text-blue-400" />}
                      {c.platform === 'in_app' && <MessageSquare className="w-2.5 h-2.5 text-amber-400" />}
                      <span className="text-[9px] uppercase tracking-wider font-bold text-slate-600">{c.platform}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col bg-slate-950/50 relative">
        {activeConversationId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/30 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-slate-700 shadow-xl">
                  <AvatarFallback className="bg-blue-600/20 text-blue-400 font-bold">
                    {activeConversation?.contacts?.first_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">
                    {activeConversation?.contacts?.first_name} {activeConversation?.contacts?.last_name}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online • {activeConversation?.contacts?.email || activeConversation?.contacts?.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Message Area */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-6">
                <div className="flex justify-center my-4">
                  <Badge variant="outline" className="bg-slate-900 border-slate-800 text-slate-500 text-[10px] px-3 font-medium uppercase tracking-widest">
                    Beginning of conversation
                  </Badge>
                </div>
                
                {messages.map((msg, idx) => {
                  const isBusiness = msg.sender_type === "business"
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isBusiness ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] group relative ${isBusiness ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-xl leading-relaxed ${
                          isBusiness 
                            ? 'bg-blue-600 text-white rounded-tr-none border border-blue-500/50' 
                            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
                        }`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1.5 mt-1.5 px-1 ${isBusiness ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[9px] text-slate-500 font-medium">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isBusiness && (
                            <>
                              {msg.status === "sending" && <Clock className="w-3 h-3 text-slate-500 animate-pulse" />}
                              {msg.status === "sent" && <Check className="w-3 h-3 text-slate-400" />}
                              {msg.status === "delivered" && <CheckCheck className="w-3 h-3 text-slate-400" />}
                              {msg.status === "read" && <CheckCheck className="w-3 h-3 text-blue-400" />}
                              {msg.status === "failed" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <AlertCircle className="w-3 h-3 text-red-500" />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-red-900 text-white border-red-800">
                                      <p>{msg.error_message || "Delivery failed"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {isAiReplying && (
                  <div className="flex items-end gap-2 justify-start mb-6">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                      <Bot className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 border border-slate-700">
                      <div className="flex gap-1 items-center h-4">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/30">
              <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 max-w-4xl mx-auto">
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" className="text-slate-500 hover:text-blue-400">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-slate-500 hover:text-blue-400"
                    onClick={async () => {
                      if (!newMessage.trim()) {
                        toast.info("Type a brief context first for AI suggestions")
                        return
                      }
                      setIsAiReplying(true)
                      try {
                        const suggestion = await CommsService.getAiSuggestion(newMessage)
                        setNewMessage(suggestion)
                      } catch (error) {
                        toast.error("AI failed to generate suggestion")
                      } finally {
                        setIsAiReplying(false)
                      }
                    }}
                  >
                    <Bot className="w-5 h-5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="text-slate-500 hover:text-blue-400">
                    <Smile className="w-5 h-5" />
                  </Button>
                </div>
                <div className="relative flex-1">
                  <Input 
                    placeholder="Type your message..." 
                    className="bg-slate-800 border-slate-700 text-white pr-12 focus:ring-blue-600 h-11 rounded-full"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="absolute right-1.5 top-1.5 h-8 w-8 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-900/50 transition-all active:scale-90"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-6 border border-slate-800">
              <MessageSquare className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No conversation selected</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Select a conversation from the sidebar to start messaging your customers in real-time.
            </p>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" /> New Message
              </h3>
              <Button onClick={() => setShowNewChatModal(false)} variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form onSubmit={handleCreateConversation} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Select Contact *</label>
                <select
                  required
                  value={newChatData.contactId}
                  onChange={(e) => setNewChatData({ ...newChatData, contactId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Choose a contact...</option>
                  {allContacts.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email || c.phone || 'No info'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Platform *</label>
                <select
                  required
                  value={newChatData.platform}
                  onChange={(e) => setNewChatData({ ...newChatData, platform: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="in_app">In-App Chat</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Initial Message *</label>
                <Input
                  value={newChatData.initialMessage}
                  onChange={(e) => setNewChatData({ ...newChatData, initialMessage: e.target.value })}
                  placeholder="Type your first message..."
                  required
                  className="bg-slate-800 border-slate-700 text-white h-24"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-6 mt-4">
                Start Conversation
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

