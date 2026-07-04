"use client"

import React, { useState } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import { useWorkflows } from "@/lib/hooks/use-workflows"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, Plus, Trash2, Mail, MessageSquare, Clock, 
  ArrowRight, Check, X, Bot, Sparkles, RefreshCw, ChevronRight, Settings2, ShieldCheck
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export default function AutomationPage() {
  const { ownerId } = useBusinessContext()
  const { workflows, loading, addWorkflow, toggleWorkflow, removeWorkflow } = useWorkflows(ownerId)
  
  const [showBuilder, setShowBuilder] = useState(false)
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    trigger_type: "new_lead",
    steps: [] as any[]
  })

  const triggers = [
    { id: "new_lead", name: "New Lead Added", icon: Plus, color: "bg-blue-600" },
    { id: "deal_stage_changed", name: "Deal Stage Changed", icon: RefreshCw, color: "bg-purple-600" },
    { id: "invoice_overdue", name: "Invoice Overdue", icon: Clock, color: "bg-rose-600" },
    { id: "inventory_low", name: "Inventory Low Stock", icon: Bot, color: "bg-amber-600" }
  ]

  const actionTypes = [
    { id: "send_email", name: "Send Email", icon: Mail },
    { id: "send_whatsapp", name: "Send WhatsApp", icon: MessageSquare },
    { id: "wait", name: "Delay / Wait", icon: Clock }
  ]

  const addStep = (type: string) => {
    setNewWorkflow({
      ...newWorkflow,
      steps: [...newWorkflow.steps, { type, config: type === 'wait' ? { hours: 24 } : { template: "" } }]
    })
  }

  const removeStep = (index: number) => {
    setNewWorkflow({
      ...newWorkflow,
      steps: newWorkflow.steps.filter((_, i) => i !== index)
    })
  }

  const handleSaveWorkflow = async () => {
    if (!newWorkflow.name || newWorkflow.steps.length === 0) {
      toast.error("Please add a name and at least one step.")
      return
    }
    try {
      await addWorkflow(newWorkflow)
      setShowBuilder(false)
      setNewWorkflow({ name: "", trigger_type: "new_lead", steps: [] })
      toast.success("Workflow activated successfully")
    } catch (error) {
      toast.error("Failed to save workflow")
    }
  }

  if (loading) return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Real-Time Workflows</h1>
          <p className="text-slate-400">Automate your business operations with intelligent triggers and actions</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/40"
          onClick={() => setShowBuilder(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Create Workflow
        </Button>
      </div>

      {!showBuilder ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
               <Zap className="w-12 h-12 text-slate-700 mx-auto mb-4" />
               <h3 className="text-xl font-bold text-slate-300">No active workflows</h3>
               <p className="text-slate-500 mt-2 mb-6">Start by creating your first automation to save hours every week.</p>
               <Button onClick={() => setShowBuilder(true)} variant="outline" className="border-slate-700 text-slate-300">Create Workflow</Button>
            </div>
          ) : (
            workflows.map((w) => (
              <Card key={w.id} className="bg-slate-900 border-slate-800 p-6 hover:border-blue-600/50 transition-all group overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-5 blur-3xl ${w.is_active ? 'bg-blue-600' : 'bg-slate-600'}`} />
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${triggers.find(t => t.id === w.trigger_type)?.color || 'bg-slate-700'}`}>
                    {React.createElement(triggers.find(t => t.id === w.trigger_type)?.icon || Zap, { className: "w-5 h-5 text-white" })}
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      onClick={() => toggleWorkflow(w.id, !w.is_active)}
                      className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${w.is_active ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${w.is_active ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{w.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{triggers.find(t => t.id === w.trigger_type)?.name}</p>
                
                <div className="space-y-2 mb-6">
                   {w.steps.map((step: any, idx: number) => (
                     <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-400">
                        {step.type === 'send_email' ? <Mail className="w-3 h-3" /> : step.type === 'wait' ? <Clock className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                        <span className="capitalize">{step.type.replace('_', ' ')}</span>
                        {idx < w.steps.length - 1 && <ChevronRight className="w-3 h-3 opacity-30" />}
                     </div>
                   ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                   <span className="text-[10px] text-slate-500">Last run: {w.last_run ? new Date(w.last_run).toLocaleDateString() : 'Never'}</span>
                   <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-500/10" onClick={() => removeWorkflow(w.id)}>
                      <Trash2 className="w-4 h-4" />
                   </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card className="bg-slate-900 border-slate-800 p-8 max-w-4xl mx-auto shadow-2xl relative">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-slate-500 hover:text-white" onClick={() => setShowBuilder(false)}>
            <X className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400"><Settings2 className="w-6 h-6" /></div>
            <div>
              <h3 className="text-2xl font-bold text-white">Workflow Builder</h3>
              <p className="text-slate-400">Design your automated process step-by-step</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Step 0: Name & Trigger */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Workflow Identity</label>
              <Input 
                placeholder="e.g. Welcome Sequence for New Leads"
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow({...newWorkflow, name: e.target.value})}
                className="bg-slate-950 border-slate-800 text-white h-12 text-lg font-medium"
              />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {triggers.map((t) => (
                  <div 
                    key={t.id}
                    onClick={() => setNewWorkflow({...newWorkflow, trigger_type: t.id})}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-center ${
                      newWorkflow.trigger_type === t.id 
                        ? 'border-blue-600 bg-blue-600/10' 
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${t.color} mx-auto mb-2 flex items-center justify-center`}>
                      <t.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-[10px] font-bold text-white uppercase">{t.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1+: Actions */}
            <div className="space-y-6 relative">
               <div className="absolute left-[20px] top-0 bottom-0 w-0.5 bg-slate-800 -z-10" />
               
               {newWorkflow.steps.map((step, idx) => (
                 <div key={idx} className="flex gap-6 items-start animate-in slide-in-from-left duration-300">
                    <div className="w-10 h-10 rounded-full bg-blue-600 border-4 border-slate-900 flex items-center justify-center text-white text-xs font-bold z-10">
                       {idx + 1}
                    </div>
                    <Card className="flex-1 bg-slate-950 border-slate-800 p-6 relative group">
                       <Button 
                        variant="ghost" size="icon" className="absolute top-2 right-2 text-slate-600 hover:text-rose-500"
                        onClick={() => removeStep(idx)}
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
                       
                       <div className="flex items-center gap-2 mb-4">
                          {React.createElement(actionTypes.find(a => a.id === step.type)?.icon || Settings2, { className: "w-4 h-4 text-blue-400" })}
                          <span className="text-xs font-bold text-white uppercase">{actionTypes.find(a => a.id === step.type)?.name}</span>
                       </div>

                       {step.type === 'wait' ? (
                         <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500">Wait for</span>
                            <Input 
                              type="number" 
                              value={step.config.hours} 
                              onChange={(e) => {
                                const s = [...newWorkflow.steps]
                                s[idx].config.hours = parseInt(e.target.value)
                                setNewWorkflow({...newWorkflow, steps: s})
                              }}
                              className="w-24 bg-slate-900 border-slate-800 text-white"
                            />
                            <span className="text-sm text-slate-500">Hours</span>
                         </div>
                       ) : (
                         <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Message Template</label>
                            <textarea 
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-white h-24 outline-none focus:ring-1 focus:ring-blue-600"
                              placeholder="Write your custom message here..."
                              value={step.config.template}
                              onChange={(e) => {
                                const s = [...newWorkflow.steps]
                                s[idx].config.template = e.target.value
                                setNewWorkflow({...newWorkflow, steps: s})
                              }}
                            />
                            <p className="text-[10px] text-slate-600">Use AI to generate this template based on the trigger context.</p>
                         </div>
                       )}
                    </Card>
                 </div>
               ))}

               {/* Add Action Button */}
               <div className="flex gap-6 items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border-4 border-slate-900 flex items-center justify-center text-slate-500">
                     <Plus className="w-5 h-5" />
                  </div>
                  <div className="flex gap-2">
                     {actionTypes.map(action => (
                       <Button 
                        key={action.id} 
                        variant="outline" 
                        size="sm" 
                        className="border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                        onClick={() => addStep(action.id)}
                       >
                         <action.icon className="w-3.5 h-3.5 mr-2" />
                         Add {action.name.split(' ')[1] || action.name}
                       </Button>
                     ))}
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-slate-800 flex justify-between items-center">
               <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Real-time persistence enabled
               </div>
               <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setShowBuilder(false)} className="text-slate-400">Cancel</Button>
                  <Button className="bg-blue-600 px-8 py-6 font-bold" onClick={handleSaveWorkflow}>Activate Workflow</Button>
               </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

