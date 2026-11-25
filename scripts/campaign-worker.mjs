import { Client } from 'pg'

const db = new Client({ connectionString: process.env.DATABASE_URL })
await db.connect()
console.log('[campaign-worker] running in safe demo mode')

async function tick() {
  const { rows } = await db.query(`UPDATE campaign_social_posts SET status = 'publishing', attempts = attempts + 1, updated_at = now() WHERE status = 'scheduled' AND scheduled_at <= now() RETURNING id, demo_mode, platforms`)
  for (const post of rows) {
    const status = post.demo_mode ? 'published' : 'failed'
    const message = post.demo_mode ? 'Recorded as a local demonstration publication; no external API was called.' : 'No verified publishing connector is configured.'
    await db.query(`UPDATE campaign_social_posts SET status = $1, published_at = CASE WHEN $1 = 'published' THEN now() ELSE NULL END, last_error = CASE WHEN $1 = 'failed' THEN $2 ELSE NULL END, updated_at = now() WHERE id = $3 AND status = 'publishing'`, [status, message, post.id])
    for (const platform of post.platforms ?? []) await db.query(`INSERT INTO campaign_publication_logs(post_id, platform, status, message) VALUES ($1,$2,$3,$4)`, [post.id, platform, status, message])
  }
}

await tick()
setInterval(() => tick().catch(error => console.error('[campaign-worker] tick failed', error.message)), 30000)
