export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()
  let { data: client, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()

  if (!client) {
    // Check if client exists in website_projects
    const { data: proj } = await supabase.from('website_projects').select('*,clients(*)').eq('client_id', id).maybeSingle()
    if (proj && proj.clients) {
      client = Array.isArray(proj.clients) ? proj.clients[0] : proj.clients
    }
  }

  if (!client) {
    // Check if client exists by searching clients table by partial id or email
    const { data: allClients } = await supabase.from('clients').select('*').limit(50)
    client = (allClients || []).find(c => c.id === id || c.id.startsWith(id) || id.startsWith(c.id))
  }

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }
  return NextResponse.json(client)
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || 'https://cucksfwkdmrkeiwmdlut.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key'
  return createClient(url, key)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = adminSupabase()
  const { error } = await supabase.from('clients').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
