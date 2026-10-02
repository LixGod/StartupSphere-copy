'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CustomerSearchProps {
  ownerId: string
  value: string
  onSelect: (customer: any) => void
  onChange: (value: string) => void
  placeholder?: string
}

export function CustomerSearch({
  ownerId,
  value,
  onSelect,
  onChange,
  placeholder = "Customer name or phone..."
}: CustomerSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const supabase = createClient()
  const debounceRef = useRef<any>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  const search = async (q: string) => {
    if (!ownerId || q.length < 2) {
      setResults([])
      return
    }

    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, email, address, outstanding_balance')
      .eq('owner_id', ownerId)
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(8)

    setResults(data || [])
    setShowDropdown(true)
  }

  const handleChange = (e: any) => {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const handleSelect = (customer: any) => {
    setQuery(customer.name)
    setShowDropdown(false)
    onSelect(customer)
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => query.length >= 2 && setShowDropdown(true)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-950 border-slate-800 text-white focus:outline-none focus:border-blue-500 transition-colors"
      />

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-50 max-h-[240px] overflow-y-auto mt-1">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-800 border-b border-slate-800/60 last:border-0 flex justify-between items-center transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-white">{c.name}</p>
                <p className="text-xs text-slate-400">{c.phone || 'No phone'}</p>
              </div>
              {c.outstanding_balance > 0 && (
                <span className="text-xs text-red-400 font-semibold bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50">
                  ₹{Number(c.outstanding_balance).toLocaleString('en-IN')} due
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowDropdown(false)}
            className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 border-t border-slate-800"
          >
            + Save "{query}" as new customer profile
          </button>
        </div>
      )}
    </div>
  )
}
