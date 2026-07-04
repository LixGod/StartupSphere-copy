"use client"

import React, { useState } from "react"
import { useBusinessContext } from "@/lib/hooks/use-business-context"
import type { Deal, PipelineStage } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Plus, Calendar, DollarSign, GripVertical } from "lucide-react"

interface PipelineBoardProps {
  stages: PipelineStage[]
  deals: Deal[]
  onDealMove: (dealId: string, stageId: string) => void
  onAddDeal: (stageId: string) => void
}

export function PipelineBoard({ stages, deals, onDealMove, onAddDeal }: PipelineBoardProps) {
  const { formatPrice } = useBusinessContext()
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggingDealId(dealId)
    e.dataTransfer.setData("dealId", dealId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    const dealId = e.dataTransfer.getData("dealId")
    if (dealId) {
      onDealMove(dealId, stageId)
    }
    setDraggingDealId(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
      {stages.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage_id === stage.id)
        const totalValue = stageDeals.reduce((sum, d) => sum + Number(d.value), 0)

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-80 bg-slate-900/30 rounded-xl border border-slate-800 flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  {stage.name}
                  <Badge variant="outline" className="ml-1 bg-slate-800 border-slate-700 text-slate-400">
                    {stageDeals.length}
                  </Badge>
                </h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Total: {formatPrice(totalValue)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  onClick={() => onAddDeal(stage.id)}
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                  title="Add Deal to Stage"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {stageDeals.length === 0 ? (
                <div className="h-24 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-600 italic">
                  No deals in this stage
                </div>
              ) : (
                stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal.id)}
                    className={`bg-slate-800 border-slate-700 hover:border-blue-600/50 cursor-grab active:cursor-grabbing transition-all ${
                      draggingDealId === deal.id ? "opacity-40" : "opacity-100"
                    }`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-white leading-tight group-hover:text-blue-400">
                          {deal.title}
                        </h4>
                        <div className="text-slate-500 hover:text-white transition-colors cursor-pointer">
                          <GripVertical className="w-3 h-3" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                          {deal.contacts?.first_name?.[0] || "U"}
                        </div>
                        <span className="text-xs text-slate-400">
                          {deal.contacts?.first_name} {deal.contacts?.last_name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        <div className="flex items-center text-[11px] text-blue-400 font-bold">
                          {formatPrice(deal.value)}
                        </div>
                        {deal.expected_close_date && (
                          <div className="flex items-center text-[10px] text-slate-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(deal.expected_close_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              
              <Button
                variant="ghost"
                onClick={() => onAddDeal(stage.id)}
                className="w-full justify-start text-[10px] text-slate-500 hover:text-blue-400 hover:bg-blue-400/5 h-8 border border-dashed border-slate-800/50"
              >
                <Plus className="w-3 h-3 mr-2" />
                Quick Deal
              </Button>
            </div>
          </div>
        )
      })}

      {/* Add Stage Placeholder */}
      <div className="flex-shrink-0 w-80 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center p-6 bg-slate-900/10 hover:bg-slate-900/30 transition-all group cursor-pointer">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all">
            <Plus className="w-5 h-5 text-slate-500" />
          </div>
          <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-300 transition-colors">
            Add New Stage
          </span>
        </div>
      </div>
    </div>
  )
}

