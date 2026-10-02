"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import {
  LogOut,
  UserIcon,
  ChevronDown,
  ChevronLeft,
  Package,
  ShoppingCart,
  TrendingUp,
  Bot,
  Users,
  Store,
  Home,
  ShieldCheck,
  Bell,
  Menu,
  X,
  MessageSquare,
  AlertCircle,
  BrainCircuit,
  Settings,
  Zap,
  Trash2,
} from "lucide-react"
import { BranchSelector } from "@/components/branch-selector"

interface NavItem {
  href: string
  label: string
  icon: any
  group: string
}

export function DashboardNav({ user }: { user: any }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { profile, isOwner, can } = useBusinessContext()
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    loadUnreadCount()
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(10)
      setNotifications(data || [])
    } catch {}
  }

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    loadNotifications()
    loadUnreadCount()
  }

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const loadUnreadCount = async () => {
    try {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .eq("is_read", false)
      setUnreadCount(count || 0)
    } catch {}
  }

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push("/")
  }

  // Detect Branch Mode
  const [locationId, setLocationId] = useState<string | null>(null)
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setLocationId(params.get("locationId"))
  }, [pathname, typeof window !== 'undefined' ? window.location.search : ''])

  const allNavItems = [
    { href: "/dashboard/overview", label: "Overview", icon: Home, group: "Main" },
    { href: "/dashboard/crm-founder", label: "Founder CRM", icon: Users, group: "Sales", pack: "has_crm_pack", globalOnly: true, permission: "can_manage_crm" },
    { href: "/dashboard/helpdesk", label: "Helpdesk", icon: AlertCircle, group: "Sales", pack: "has_crm_pack", globalOnly: true, permission: "can_manage_crm" },
    { href: "/dashboard/multi-store", label: "Multi-Store & B2B", icon: Store, group: "Sales", pack: "has_multi_tenancy_pack", globalOnly: true, ownerOnly: true },
    { href: "/dashboard/inventory", label: "Inventory", icon: Package, group: "Operations", pack: "has_core_modules_pack", permission: "can_view_inventory" },
    { href: "/dashboard/manufacturers", label: "Manufacturers", icon: Store, group: "Operations", pack: "has_core_modules_pack", permission: "can_view_inventory" },
    { href: "/dashboard/sales", label: "Sales & POS", icon: ShoppingCart, group: "Operations", pack: "has_core_modules_pack", permission: "can_view_sales" },
    { href: "/dashboard/customers", label: "Customers", icon: Users, group: "Operations", pack: "has_core_modules_pack", permission: "can_view_sales" },
    { href: "/dashboard/bills-trash", label: "Trash Bin", icon: Trash2, group: "Operations", pack: "has_core_modules_pack", permission: "can_view_sales" },
    { href: "/dashboard/accounting", label: "Accounting", icon: TrendingUp, group: "Finance", pack: "has_core_modules_pack", permission: "can_view_accounting" },
    { href: "/dashboard/ai-intelligence", label: "AI Intelligence", icon: BrainCircuit, group: "Growth", pack: "has_ai_analysis_pack", globalOnly: true, ownerOnly: true },
    { href: "/dashboard/ai-marketing", label: "AI Marketing", icon: Bot, group: "Growth", pack: "has_ai_analysis_pack", globalOnly: true, ownerOnly: true },

    { href: "/dashboard/employees", label: "Employees", icon: Users, group: "Settings", pack: "has_core_modules_pack", ownerOnly: true },
    { href: "/dashboard/store-connect", label: "Connect Store", icon: Store, group: "Settings", pack: "has_multi_tenancy_pack", globalOnly: true, ownerOnly: true },
    { href: "/dashboard/settings", label: "Settings", icon: Settings, group: "Settings" },
  ]

  // Filter items based on active packs, location mode, and RBAC permissions
  const navItems = allNavItems.filter(item => {
    // Check packs
    if (item.pack && profile?.[item.pack] !== true) return false
    
    // Check Branch Mode
    if (locationId && (item as any).globalOnly) return false
    
    // Check RBAC permissions for employees
    if (!isOwner) {
      if ((item as any).ownerOnly) return false
      if ((item as any).permission && !can((item as any).permission as any)) return false
    }

    return true
  })

  // Append locationId to links in Branch Mode
  const processedNavItems = navItems.map(item => {
    if (locationId && !item.href.includes("locationId") && item.href.startsWith("/dashboard")) {
       const separator = item.href.includes("?") ? "&" : "?"
       return { ...item, href: `${item.href}${separator}locationId=${locationId}` }
    }
    return item
  })

  if (profile?.is_super_admin && !locationId) {
    processedNavItems.push({ href: "/admin", label: "Super Admin", icon: ShieldCheck, group: "Admin" } as any)
  }

  // Group nav items
  const groups = processedNavItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  const renderNavContent = () => (
    <>
      {/* Branch Selector */}
      {!collapsed && (
        <div className="mb-4">
          <BranchSelector />
        </div>
      )}

      {/* Branch Indicator */}
      {locationId && (
        <div className="mb-6 p-3 bg-blue-600/10 border border-blue-600/20 rounded-xl">
           <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Store className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Branch Mode</span>
           </div>
           <button 
            onClick={() => router.push(pathname)}
            className="text-[10px] text-slate-500 hover:text-white transition-colors flex items-center gap-1"
           >
             <ChevronLeft className="w-3 h-3" /> Return to Global
           </button>
        </div>
      )}

      {/* Company Header */}
      <div className="relative mb-6">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full text-left hover:bg-slate-800 rounded-lg p-3 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className={`flex-1 min-w-0 ${collapsed ? "hidden" : ""}`}>
              <p className="text-sm font-bold text-white truncate">
                {profile?.company_name || user.email?.split("@")[0] + "'s Startup" || "Dashboard"}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </div>
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 first:rounded-t-lg transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              <UserIcon className="w-4 h-4" />
              Profile
            </Link>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 last:rounded-b-lg transition-colors border-t border-slate-700"
            >
              <LogOut className="w-4 h-4" />
              {loading ? "Logging out..." : "Logout"}
            </button>
          </div>
        )}
      </div>

      {/* Notification Bell */}
      <div className="mb-4">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
            showNotifications 
              ? "bg-slate-800 text-white" 
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          } ${collapsed ? "justify-center" : ""}`}
        >
          <div className="relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          {!collapsed && <span>Notifications</span>}
        </button>

        {showNotifications && (
          <div className="mt-2 bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Alerts</h3>
               <button onClick={() => setShowNotifications(false)} className="text-slate-600 hover:text-white transition-colors">
                 <X className="w-3 h-3" />
               </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto no-scrollbar">
               {notifications.length === 0 ? (
                 <div className="p-6 text-center text-[10px] text-slate-600 italic">No recent notifications</div>
               ) : (
                 notifications.map(n => (
                   <div 
                    key={n.id} 
                    onClick={() => markRead(n.id)}
                    className={`p-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer relative ${!n.is_read ? 'bg-blue-600/5' : ''}`}
                   >
                      {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />}
                      <p className="text-[11px] text-slate-300 leading-relaxed mb-1">{n.message}</p>
                      <p className="text-[9px] text-slate-600">{new Date(n.created_at).toLocaleDateString()}</p>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 space-y-5">
        {Object.entries(groups).map(([groupName, items]) => (
          <div key={groupName}>
            {!collapsed && (
              <p className="px-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {groupName}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                      collapsed ? "justify-center" : ""
                    } ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Collapse Toggle (desktop only) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mt-4"
      >
        <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        {!collapsed && "Collapse"}
      </button>
    </>
  )

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-400 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          StartupSphere
        </h1>
        <div className="relative">
          <Bell className="w-5 h-5 text-slate-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-50"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="w-72 h-full bg-slate-900 border-r border-slate-800 p-6 flex flex-col overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Menu</h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavContent()}
          </nav>
        </div>
      )}

      {/* Desktop Sidebar */}
      <nav className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-800 p-6 h-screen sticky top-0 overflow-y-auto no-scrollbar transition-all duration-200 ${collapsed ? "w-20" : "w-64"}`}>
        {renderNavContent()}
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-2 py-1.5 flex items-center justify-around safe-area-bottom">
        {[
          { href: "/dashboard/overview", label: "Home", icon: Home },
          { href: "/dashboard/sales", label: "Sales", icon: ShoppingCart },
          { href: "/dashboard/inventory", label: "Inventory", icon: Package },
          { href: "/dashboard/accounting", label: "Finance", icon: TrendingUp },
          { href: "/dashboard/ai-marketing", label: "AI", icon: Bot },
        ].map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] transition-colors ${isActive ? "text-blue-400" : "text-slate-500"}`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </>
  )
}

