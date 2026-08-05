'use client'
import { createClient } from './supabase'

const ADMIN_EMAILS = ['matty@purepulse.one', 'mattjhagen0@gmail.com']

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
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

export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email)
}
