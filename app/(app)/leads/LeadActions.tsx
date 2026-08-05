'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const STATUSES = ['new', 'contacted', 'converted', 'closed']

export default function LeadActions({ id, status, currentNotes }: { id: string; status: string; currentNotes: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [notes, setNotes] = useState(currentNotes)
  const [editingNotes, setEditingNotes] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function setStatus(s: string) {
    await supabase.from('leads').update({ status: s, updated_at: new Date().toISOString() }).eq('id', id)
    startTransition(() => router.refresh())
  }

  async function saveNotes() {
    await supabase.from('leads').update({ notes, updated_at: new Date().toISOString() }).eq('id', id)
    setEditingNotes(false)
    startTransition(() => router.refresh())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '180px' }}>
      {/* Status selector */}
      <select
        className="input input-sm"
        value={status}
        onChange={e => setStatus(e.target.value)}
        disabled={isPending}
        style={{ fontSize: '0.8125rem' }}
      >
        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
      </select>

      {/* Notes */}
      {editingNotes ? (
        <div style={{ width: '100%' }}>
          <textarea
            className="input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Add a note…"
            style={{ fontSize: '0.8125rem', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
            <button className="btn btn-primary btn-sm" onClick={saveNotes}>Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingNotes(false); setNotes(currentNotes) }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={() => setEditingNotes(true)} style={{ fontSize: '0.75rem' }}>
          {currentNotes ? 'Edit note' : '+ Add note'}
        </button>
      )}
    </div>
  )
}
