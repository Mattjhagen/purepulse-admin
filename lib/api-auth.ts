import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { adminSupabase } from '@/lib/supabase'

export async function getApiUser(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : ''

  if (token) {
    const { data, error } = await adminSupabase().auth.getUser(token)
    return error ? null : data.user
  }

  const client = await createServerSupabaseClient()
  const { data } = await client.auth.getUser()
  return data.user
}

