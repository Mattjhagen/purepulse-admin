import { NextRequest, NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-title',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

const SYSTEM_PROMPT = `You are PulseBot, the intelligent AI design consultant for PurePulse (purepulse.one).
You are sharp, modern, friendly, and helpful.

Key facts about PurePulse:
- Modern web design, full-stack web applications, and fast digital experiences.
- Starting cost: $150 deposit to kick off custom design & engineering.
- Monthly plans: Starter ($20/mo), Growth ($50/mo), Premium ($75/mo), Business ($100/mo) for fast edge hosting, ongoing updates, security, and maintenance.
- Custom software capabilities: Client dashboards, automated invoicing & Stripe billing, affiliate partner networks, video onboarding, and custom workflows.
- Contact: matty@purepulse.one
- Affiliate / Partner Application: https://login.purepulse.one/affiliates/apply
- Onboarding & Interview: https://login.purepulse.one/interview
- Client Portal: https://login.purepulse.one/

Tone & style:
- Keep responses concise (2 to 4 sentences), clear, and direct.
- If asked about pricing or starting a project, mention the $150 deposit and invite them to reach out or apply.
`

const FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3.5-lightning:free',
  'deepseek/deepseek-r1:free',
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    let rawMessages = body.messages || []

    if (body.message && typeof body.message === 'string') {
      rawMessages = [{ role: 'user', content: body.message }]
    }

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: 'messages array or message string required' }, { status: 400, headers: CORS_HEADERS })
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...rawMessages.map((m: { role?: string; content?: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 2000),
      })),
    ]

    const apiKey = (process.env.OPENROUTER_API_KEY || '').trim().replace(/^["'`]|["'`]$/g, '').trim()
    const preferredModel = process.env.OPENROUTER_MODEL || FREE_MODELS[0]

    const modelQueue = [preferredModel, ...FREE_MODELS.filter(m => m !== preferredModel)]

    if (!apiKey) {
      return NextResponse.json({
        response: "Thanks for checking out PurePulse! We build high-performance web applications and sleek sites starting at a $150 deposit. Reach out to matty@purepulse.one or visit https://login.purepulse.one/ to get started!",
        model: 'simulated-fallback',
      }, { headers: CORS_HEADERS })
    }

    let lastError: string | null = null

    for (const model of modelQueue) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://purepulse.one',
            'X-Title': 'PurePulse Assistant',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 600,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const reply = data.choices?.[0]?.message?.content?.trim()
          if (reply) {
            return NextResponse.json({
              response: reply,
              model,
            }, { headers: CORS_HEADERS })
          }
        } else {
          const errBody = await res.text()
          lastError = `Model ${model} returned status ${res.status}: ${errBody}`
          console.warn('[OpenRouter Chat]', lastError)
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err)
        console.warn(`[OpenRouter Chat] Error querying ${model}:`, lastError)
      }
    }

    return NextResponse.json({
      response: "Thanks for reaching out to PurePulse! We're ready to build your next web project starting at a $150 deposit. Drop an email to matty@purepulse.one or start your application at https://login.purepulse.one/affiliates/apply!",
      model: 'smart-fallback',
      warning: lastError,
    }, { headers: CORS_HEADERS })

  } catch (err: unknown) {
    console.error('[OpenRouter Chat Fatal Error]:', err)
    return NextResponse.json({
      response: "Thanks for reaching out! Please email matty@purepulse.one to chat with our team directly.",
      error: err instanceof Error ? err.message : 'Internal error',
    }, { status: 500, headers: CORS_HEADERS })
  }
}
