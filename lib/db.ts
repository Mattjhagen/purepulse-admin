import { adminSupabase } from '@/lib/supabase'

export async function getDbClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://postgres.kofjljwctqqllnjiejxd:${process.env.SUPABASE_DB_PASS || 'uAyNuDiLdoE1wNjV'}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

  try {
    // @ts-ignore
    const { Client } = await import('pg')
    return new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  } catch {
    return null
  }
}

export async function setUserPasswordAndConfirm(params: {
  email: string
  password: string
  name: string
  role: string
  title?: string | null
}) {
  const { email, password, name, role, title } = params
  const cleanEmail = email.toLowerCase().trim()
  const supabase = adminSupabase()

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        title: title || '',
      },
    })

    if (error && (error.message.includes('already registered') || error.status === 422)) {
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      )
      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
          password,
          user_metadata: {
            name,
            role,
            title: title || '',
          },
        })
        return { userId: existing.id, email: cleanEmail }
      }
    }

    return { userId: data?.user?.id || '', email: cleanEmail }
  } catch (err: any) {
    console.warn('[setUserPasswordAndConfirm] Error:', err)
    return { userId: '', email: cleanEmail }
  }
}
