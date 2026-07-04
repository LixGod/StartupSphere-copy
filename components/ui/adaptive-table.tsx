"use client"

import React from "react"
import { Card } from "@/components/ui/card"

interface AdaptiveTableProps<T> {
  data: T[]
  columns: {
    header: string
    accessorKey: keyof T | ((item: T) => React.ReactNode)
    className?: string
  }[]
  mobileCard: (item: T) => React.ReactNode
  onRowClick?: (item: T) => void
  emptyMessage?: string
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  idKey?: keyof T
}

export function AdaptiveTable<T extends { id: string }>({
  data,
  columns,
  mobileCard,
  onRowClick,
  emptyMessage = "No records found",
  selectedIds = [],
  onSelectionChange,
  idKey = "id" as keyof T
}: AdaptiveTableProps<T>) {
  const toggleAll = () => {
    if (!onSelectionChange) return
    if (selectedIds.length === data.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(data.map(item => item.id))
    }
  }

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }
  if (data.length === 0) {
    return <div className="p-8 text-center text-slate-500 italic">{emptyMessage}</div>
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-900 border-b border-slate-800">
            <tr>
              {onSelectionChange && (
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-700 bg-slate-800"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-3 font-semibold text-slate-300 ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.map((item, rowIdx) => (
              <tr 
                key={rowIdx} 
                className={`hover:bg-slate-800/50 transition-colors ${onRowClick ? "cursor-pointer" : ""} ${selectedIds.includes(item.id) ? 'bg-blue-600/5' : ''}`}
              >
                {onSelectionChange && (
                  <td className="px-4 py-4 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-700 bg-slate-800"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                )}
                {columns.map((col, colIdx) => (
                  <td 
                    key={colIdx} 
                    className={`px-4 py-4 text-slate-300 ${col.className || ""}`}
                    onClick={() => onRowClick?.(item)}
                  >
                    {typeof col.accessorKey === "function" 
                      ? col.accessorKey(item) 
                      : (item[col.accessorKey] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 p-4">
        {data.map((item, idx) => (
          <div key={idx} className="relative">
            {onSelectionChange && (
              <input 
                type="checkbox" 
                className="absolute top-4 right-4 z-10 w-5 h-5 rounded border-slate-700 bg-slate-800 shadow-lg"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleOne(item.id)}
              />
            )}
            <Card 
              onClick={() => onRowClick?.(item)}
              className={`bg-slate-900 border-slate-800 p-4 active:bg-slate-800 transition-colors ${selectedIds.includes(item.id) ? 'border-blue-600/50 bg-blue-600/5' : ''}`}
            >
              {mobileCard(item)}
            </Card>
          </div>
        ))}
      </div>
    </>
  )
}

