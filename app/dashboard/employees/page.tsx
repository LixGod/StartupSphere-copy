"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { getEmployees, getEmployeeRequests, getLocations } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { UserPlus, CheckCircle, XCircle, Clock, Shield } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { Sheet } from "@/components/ui/sheet"
import { PermissionManager } from "@/components/employees/permission-manager"
import { BranchAssignmentModal } from "@/components/employees/branch-assignment-modal"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const supabaseRef = useRef(createClient())
  const { toast } = useToast()
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false)
  const [selectedEmployeeForPerms, setSelectedEmployeeForPerms] = useState<any>(null)
  const [isPermModalOpen, setIsPermModalOpen] = useState(false)

  useEffect(() => {
    loadData()

    const channel = supabaseRef.current
      .channel("employee-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadData()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "employee_requests" }, () => {
        loadData()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "employee_permissions" }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabaseRef.current.removeChannel(channel)
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabaseRef.current.auth.getUser()
      if (!user) return

      const { data: profileData, error: profileError } = await supabaseRef.current
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
      
      if (profileError) {
        console.error("Error fetching profile:", profileError)
        return
      }
      
      setProfile(profileData)

      if (profileData?.role === "owner" || profileData?.role === "admin") {
        const ownerId = profileData.id
        const [empData, reqData, locData] = await Promise.all([
          getEmployees(ownerId),
          getEmployeeRequests(ownerId),
          getLocations(ownerId),
        ])

        setEmployees(empData || [])
        setRequests((reqData || []).filter((request: any) => request.status === "pending"))
        setBranches(locData || [])
      }
    } catch (err: any) {
      console.error("Error loading employee data:", err)
      toast({
        title: "Error loading employees",
        description: err.message || "Could not load employee list",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async (request: any) => {
    try {
      const response = await fetch('/api/approve-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.employee_email,
          password: request.employee_password_hash,
          companyName: profile.company_name,
          ownerId: profile.id,
          requestId: request.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error)
      }
      
      await loadData()
      toast({
        title: "Success",
        description: `Employee ${request.employee_email} has been approved`,
      })
    } catch (error) {
      console.error("Error approving request:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve employee",
        variant: "destructive",
      })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabaseRef.current.from("employee_requests").delete().eq("id", requestId)
      if (error) throw error
      await loadData()
      toast({ title: "Request Rejected", description: "Request removed." })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return (
      <div className="p-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400">Only owners can manage employees</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Employee Management</h1>
        <p className="text-slate-400 mt-1">Manage your team, roles, and access permissions</p>
      </div>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Pending Approval Requests ({requests.length})
          </h2>
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-slate-900 border border-amber-600/30 rounded-xl p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-white">{request.employee_email}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Requested on {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleApproveRequest(request)} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleRejectRequest(request.id)}
                    variant="outline"
                    className="border-red-900/50 text-red-400 hover:bg-red-950/50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Employees */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-400" />
          Active Employees ({employees.length})
        </h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading employees...</div>
          ) : employees.length === 0 ? (
            <Empty className="py-12 bg-slate-900 border-none">
              <EmptyHeader>
                <EmptyTitle className="text-white">No employees yet</EmptyTitle>
                <EmptyDescription className="text-slate-400">Invite your first team member to get started</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-800 bg-slate-950">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Employee</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Joined</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Module Access</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {employees.map((emp) => {
                    const activePerms = emp.employee_permissions?.[0]
                    return (
                      <tr key={emp.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-white text-sm font-medium">{emp.full_name || emp.email}</p>
                          <p className="text-slate-400 text-xs">{emp.email}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">{new Date(emp.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap">
                            {activePerms?.can_access_sales && <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-300 border border-green-500/30 rounded-full">Sales</span>}
                            {activePerms?.can_access_inventory && <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">Inventory</span>}
                            {activePerms?.can_access_accounting && <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">Accounting</span>}
                            {activePerms?.can_access_crm && <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">CRM</span>}
                            {!activePerms && <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded-full">No permissions set</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-xs text-white"
                              onClick={() => {
                                setSelectedEmployeeForPerms(emp)
                                setIsPermModalOpen(true)
                              }}
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              Permissions
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-800 text-xs text-emerald-400 hover:bg-emerald-950/50"
                              onClick={() => {
                                const target = prompt(`Enter monthly sales target (₹) for ${emp.full_name || emp.email}:`, "50000")
                                if (target && !isNaN(Number(target))) {
                                  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
                                  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)
                                  supabaseRef.current
                                    .from('sales_targets')
                                    .insert({
                                      owner_id: profile.id,
                                      employee_id: emp.id,
                                      target_amount: Number(target),
                                      period_start: start,
                                      period_end: end,
                                      sales_achieved: 0,
                                      status: 'active'
                                    })
                                    .then(({ error }) => {
                                      if (error) alert("Error setting target: " + error.message)
                                      else {
                                        toast({ title: "Target Set!", description: `₹${Number(target).toLocaleString('en-IN')} target assigned to ${emp.email}` })
                                        loadData()
                                      }
                                    })
                                }
                              }}
                            >
                              🎯 Set Target
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-800 text-xs text-slate-300 hover:bg-slate-800"
                              onClick={() => {
                                setSelectedEmployee(emp)
                                setIsBranchModalOpen(true)
                              }}
                            >
                              Branch Access
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {selectedEmployee && (
        <BranchAssignmentModal
          isOpen={isBranchModalOpen}
          onClose={() => {
            setIsBranchModalOpen(false)
            setSelectedEmployee(null)
          }}
          employee={selectedEmployee}
        />
      )}

      {selectedEmployeeForPerms && (
        <Sheet open={isPermModalOpen} onOpenChange={(open) => {
          setIsPermModalOpen(open)
          if (!open) setSelectedEmployeeForPerms(null)
        }}>
          <PermissionManager
            employee={selectedEmployeeForPerms}
            ownerId={profile?.id}
            branches={branches}
            isMultiBranch={branches.length > 1}
            onClose={() => {
              setIsPermModalOpen(false)
              setSelectedEmployeeForPerms(null)
              loadData()
            }}
          />
        </Sheet>
      )}
    </div>
  )
}


