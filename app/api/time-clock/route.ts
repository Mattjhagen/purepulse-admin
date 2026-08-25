import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { getAppSession } from '@/lib/session'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isSuperuser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function getCallerUser(): Promise<{ id: string; email: string; name: string; role: string; isSuper: boolean } | null> {
  const teamSession = await getAppSession()
  if (teamSession) {
    return {
      id: teamSession.id,
      email: teamSession.email,
      name: teamSession.name,
      role: teamSession.role,
      isSuper: isSuperuser(teamSession.email),
    }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const email = user.email?.toLowerCase().trim() || ''
      return {
        id: user.id,
        email,
        name: user.user_metadata?.name || email.split('@')[0],
        role: user.user_metadata?.role || 'admin',
        isSuper: isSuperuser(email),
      }
    }
  } catch {}

  return null
}

export async function GET(req: NextRequest) {
  const caller = await getCallerUser()
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await getDbClient()
  try {
    const { searchParams } = new URL(req.url)
    const requestedUserId = searchParams.get('user_id')
    const viewAll = searchParams.get('all') === 'true'

    await client.connect()

    // 1. Fetch team members list for superuser filter dropdown
    const teamRes = await client.query(
      'SELECT id, auth_user_id, name, email, role, title, hourly_rate, status FROM team_members ORDER BY name'
    )
    const teamMembers = teamRes.rows

    // 2. Determine target user filter
    let query = `
      SELECT 
        te.id,
        te.user_id,
        te.client_id,
        te.clock_in,
        te.clock_out,
        te.hourly_rate,
        te.description,
        te.status,
        te.needs_review,
        te.auto_clock_out,
        te.manual_entry,
        te.created_at,
        te.updated_at,
        c.name AS client_name,
        COALESCE(tm.name, u.raw_user_meta_data->>'name', u.email, 'Team Member') AS user_name,
        COALESCE(tm.email, u.email) AS user_email,
        COALESCE(tm.role, u.raw_user_meta_data->>'role', 'member') AS user_role
      FROM time_entries te
      LEFT JOIN clients c ON c.id = te.client_id
      LEFT JOIN auth.users u ON u.id = te.user_id
      LEFT JOIN team_members tm ON (tm.auth_user_id = te.user_id OR LOWER(tm.email) = LOWER(u.email))
    `

    const params: any[] = []

    if (caller.isSuper) {
      if (requestedUserId && requestedUserId !== 'all') {
        params.push(requestedUserId)
        query += ` WHERE te.user_id = $1`
      }
    } else {
      // Regular users only see their own
      params.push(caller.id)
      query += ` WHERE te.user_id = $1`
    }

    query += ` ORDER BY te.clock_in DESC LIMIT 100`

    const res = await client.query(query, params)
    const entries = res.rows.map((row: any) => ({
      ...row,
      clients: { name: row.client_name },
    }))

    // 3. Find open entry for active user (or targeted user)
    const activeTargetId = (caller.isSuper && requestedUserId && requestedUserId !== 'all') ? requestedUserId : caller.id
    const openEntry = entries.find((e: any) => e.status === 'open' && e.user_id === activeTargetId) || null

    return NextResponse.json({
      entries,
      openEntry,
      teamMembers: caller.isSuper ? teamMembers : [],
      isSuperuser: caller.isSuper,
      currentUser: caller,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error'
    console.error('[GET /api/time-clock] Exception:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await client.end()
  }
}

export async function POST(req: NextRequest) {
  const caller = await getCallerUser()
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await getDbClient()
  try {
    const body = await req.json()
    const { action, client_id, description, hourly_rate, clock_in, clock_out, target_user_id } = body

    await client.connect()

    // Determine target user
    let effectiveUserId = caller.id
    if (caller.isSuper && target_user_id) {
      effectiveUserId = target_user_id
    }

    // Resolve user's default rate if not specified
    let rate = Number(hourly_rate)
    if (!rate || rate <= 0) {
      const tmRes = await client.query('SELECT hourly_rate FROM team_members WHERE auth_user_id = $1', [effectiveUserId])
      rate = Number(tmRes.rows[0]?.hourly_rate) || 85
    }

    if (action === 'clock-out') {
      const entryId = body.entry_id
      if (entryId) {
        await client.query(
          `UPDATE time_entries SET clock_out = NOW(), status = 'closed', updated_at = NOW() WHERE id = $1`,
          [entryId]
        )
      } else {
        await client.query(
          `UPDATE time_entries SET clock_out = NOW(), status = 'closed', updated_at = NOW() 
           WHERE user_id = $1 AND status = 'open'`,
          [effectiveUserId]
        )
      }
      return NextResponse.json({ ok: true, message: 'Clocked out successfully' })
    }

    if (action === 'manual') {
      const inTime = clock_in ? new Date(clock_in).toISOString() : new Date().toISOString()
      const outTime = clock_out ? new Date(clock_out).toISOString() : null
      const status = outTime ? 'closed' : 'open'

      const res = await client.query(
        `INSERT INTO time_entries (
          user_id, client_id, description, hourly_rate, clock_in, clock_out, status, manual_entry, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW()) RETURNING *`,
        [effectiveUserId, client_id, description || null, rate, inTime, outTime, status]
      )
      return NextResponse.json({ ok: true, entry: res.rows[0] })
    }

    // Default: Clock-In
    // Ensure no other active session is open for this user
    await client.query(
      `UPDATE time_entries SET clock_out = NOW(), status = 'closed', updated_at = NOW() 
       WHERE user_id = $1 AND status = 'open'`,
      [effectiveUserId]
    )

    const res = await client.query(
      `INSERT INTO time_entries (
        user_id, client_id, description, hourly_rate, clock_in, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), 'open', NOW(), NOW()) RETURNING *`,
      [effectiveUserId, client_id, description || null, rate]
    )

    return NextResponse.json({ ok: true, entry: res.rows[0] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error'
    console.error('[POST /api/time-clock] Exception:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await client.end()
  }
}

export async function PATCH(req: NextRequest) {
  const caller = await getCallerUser()
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await getDbClient()
  try {
    const body = await req.json()
    const { id, client_id, description, hourly_rate, clock_in, clock_out, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    await client.connect()

    // Permission check
    const checkRes = await client.query('SELECT user_id FROM time_entries WHERE id = $1', [id])
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const entryOwnerId = checkRes.rows[0].user_id
    if (!caller.isSuper && entryOwnerId !== caller.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const res = await client.query(
      `UPDATE time_entries SET
        client_id = COALESCE($1, client_id),
        description = COALESCE($2, description),
        hourly_rate = COALESCE($3, hourly_rate),
        clock_in = COALESCE($4, clock_in),
        clock_out = $5,
        status = COALESCE($6, status),
        updated_at = NOW()
      WHERE id = $7 RETURNING *`,
      [
        client_id || null,
        description,
        hourly_rate ? Number(hourly_rate) : null,
        clock_in ? new Date(clock_in).toISOString() : null,
        clock_out ? new Date(clock_out).toISOString() : null,
        status,
        id,
      ]
    )

    return NextResponse.json({ ok: true, entry: res.rows[0] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await client.end()
  }
}

export async function DELETE(req: NextRequest) {
  const caller = await getCallerUser()
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await getDbClient()
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })

    await client.connect()

    const checkRes = await client.query('SELECT user_id FROM time_entries WHERE id = $1', [id])
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    if (!caller.isSuper && checkRes.rows[0].user_id !== caller.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    await client.query('DELETE FROM time_entries WHERE id = $1', [id])
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await client.end()
  }
}
