import React from 'react'

interface StatTileProps {
  label: string
  value: React.ReactNode
  subtext?: string
  icon?: React.ReactNode
  variant?: 'default' | 'green' | 'amber' | 'sky' | 'purple'
}

export function StatTile({ label, value, subtext, icon }: StatTileProps) {
  return (
    <div className="card flex flex-col justify-between h-32 space-y-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest truncate">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 text-xs font-bold flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
          {value}
        </div>
        {subtext && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtext}</p>
        )}
      </div>
    </div>
  )
}
