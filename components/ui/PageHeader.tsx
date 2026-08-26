import React from 'react'
import Link from 'next/link'

interface PageHeaderProps {
  title: string
  description?: string
  backLink?: { href: string; label: string }
  badge?: { label: string; variant?: 'purple' | 'green' | 'amber' | 'ghost' }
  action?: React.ReactNode
}

export function PageHeader({ title, description, backLink, badge, action }: PageHeaderProps) {
  return (
    <div className="space-y-4 mb-6">
      {backLink && (
        <div>
          <Link
            href={backLink.href}
            className="inline-flex items-center text-xs font-semibold text-zinc-400 hover:text-white transition gap-1"
          >
            ← {backLink.label}
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight min-w-0">
              {title}
            </h1>
            {badge && (
              <span className={`badge badge-${badge.variant || 'purple'}`}>
                ● {badge.label}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="flex-shrink-0 flex items-center gap-3">
            {action}
          </div>
        )}
      </div>
    </div>
  )
}
