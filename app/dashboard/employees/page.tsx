"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { UserPlus, CheckCircle, XCircle, Clock, Shield } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import { BranchAssignmentModal } from "@/components/employees/branch-assignment-modal"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()
  const { toast } = useToast()
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false)

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel("employee-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadData()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "employee_requests" }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Load user profile
    const { data: profileData, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    
    if (profileError) {
      console.error("Error fetching profile:", profileError)
      setLoading(false)
      return
    }
    
    setProfile(profileData)

    if (profileData?.role === "owner") {
      // Load active employees by owner_id
      const { data: empData, error: empError } = await supabase
        .from("profiles")
        .select("*")
        .eq("owner_id", user.id)
        .eq("role", "employee")
      
      if (empError) {
        console.error("Error loading employees:", empError)
      } else {
        // Removed console.log for production
      }
      setEmployees(empData || [])

      // Load pending requests by owner email
      // Removed console.log for production
      
      const { data: reqData, error: reqError } = await supabase
        .from("employee_requests")
        .select("*")
        .eq("owner_email", user.email)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
      
      if (reqError) {
        console.error("❌ Error loading employee requests:", reqError)
        console.error("RLS or query error details:", reqError.message)
      } else {
        // Removed console.log for production
      }
      
      setRequests(reqData || [])
    }

    setLoading(false)
  }

  const handleApproveRequest = async (request: any) => {
    try {
      // Removed console.log for production

      // Use API route to create user and profile (uses admin API, no email confirmation needed)
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
        console.error("❌ API Error:", result.error)
        throw new Error(result.error)
      }

      // Removed console.log for production
      
      // Reload data to refresh the UI
      await loadData()
      toast({
        title: "Success",
        description: `Employee ${request.employee_email} has been approved`,
      })
    } catch (error) {
      console.error("❌ Error approving request:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve employee",
        variant: "destructive",
      })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      // Removed console.log for production
      
      const { error } = await supabase.from("employee_requests").delete().eq("id", requestId)

      if (error) {
        console.error("❌ Delete error:", error)
        throw error
      }

      // Removed console.log for production
      
      await loadData()
      alert("Request rejected and removed.")
    } catch (error: any) {
      console.error("❌ Error rejecting request:", error)
      alert("Error rejecting request: " + error.message)
    }
  }

  const handleTogglePermission = async (employeeId: string, permission: string, currentValue: boolean) => {
    try {
      await supabase
        .from("profiles")
        .update({ [permission]: !currentValue })
        .eq("id", employeeId)

      loadData()
      alert("Permission updated successfully!")
    } catch (error: any) {
      alert("Error updating permission: " + error.message)
    }
  }

  if (profile?.role !== "owner") {
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
        <p className="text-slate-400 mt-1">Manage your team and approval requests</p>
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Joined</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Global Permissions</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Branches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-white text-sm font-medium">{emp.email}</p>
                        <p className="text-slate-500 font-mono text-xs mt-0.5">{emp.id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{new Date(emp.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() =>
                              handleTogglePermission(emp.id, "can_manage_inventory", emp.can_manage_inventory)
                            }
                            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full transition-all ${
                              emp.can_manage_inventory
                                ? "bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30"
                                : "bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            Inventory
                          </button>
                          <button
                            onClick={() => handleTogglePermission(emp.id, "can_manage_sales", emp.can_manage_sales)}
                            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full transition-all ${
                              emp.can_manage_sales
                                ? "bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30"
                                : "bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            Sales
                          </button>
                          <button
                            onClick={() =>
                              handleTogglePermission(emp.id, "can_manage_accounting", emp.can_manage_accounting)
                            }
                            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full transition-all ${
                              emp.can_manage_accounting
                                ? "bg-amber-600/20 text-amber-400 border border-amber-600/30 hover:bg-amber-600/30"
                                : "bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            <Shield className="w-3 h-3" />
                            Accounting
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-800 text-xs text-blue-400 hover:bg-blue-600/10 hover:text-blue-300"
                          onClick={() => {
                            setSelectedEmployee(emp)
                            setIsBranchModalOpen(true)
                          }}
                        >
                          Manage Branch Access
                        </Button>
                      </td>
                    </tr>
                  ))}
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
    </div>
  )
}

