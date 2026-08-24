'use client'
import { createClient } from './supabase'

const MASTER_ADMIN_EMAILS = ['matty@purepulse.one', 'mattjhagen0@gmail.com']

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch {}
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
  } catch {}
}

export async function getSession() {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getUser() {
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

export function isAdmin(email?: string | null, role?: string | null): boolean {
  if (!email) return false
  const clean = email.toLowerCase().trim()
  if (MASTER_ADMIN_EMAILS.includes(clean)) return true
  if (role && role.toLowerCase() === 'admin') return true
  return false
}

export function isSuperuser(email?: string | null): boolean {
  if (!email) return false
  return MASTER_ADMIN_EMAILS.includes(email.toLowerCase().trim())
}

export function isManager(email?: string | null, role?: string | null): boolean {
  if (!email) return false
  if (isAdmin(email, role)) return true
  if (role && (role.toLowerCase() === 'manager' || role.toLowerCase() === 'admin')) return true
  return false
}
