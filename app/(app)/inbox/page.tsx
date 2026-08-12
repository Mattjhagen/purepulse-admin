import { createServerSupabaseClient } from '@/lib/supabase-server'
import { InboxClient } from './inbox-client'

export default async function InboxPage() {
  const supabase = await createServerSupabaseClient()

  const { data: emails } = await supabase
    .from('received_emails')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const unread = (emails ?? []).filter((e: { read_at: string | null }) => !e.read_at).length

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Emails sent to matty@purepulse.one
            {unread > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {unread} unread
              </span>
            )}
          </p>
        </div>
      </div>
      <InboxClient emails={emails ?? []} />
    </div>
  )
}
