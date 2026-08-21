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

CRITICAL INSTRUCTIONS:
- You are in live chat mode. Respond directly to the user with your final message only.
- NEVER output your thinking process, scratchpad, reasoning steps, analysis, or constraints check.
- Keep responses concise (2 to 4 sentences), clear, and direct.
`

const FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'z-ai/glm-5.2:free',
  'nvidia/nemotron-3.5-lightning:free',
]

function cleanAiResponse(text: string, defaultFallback: string): string {
  if (!text) return defaultFallback

  // 1. Strip XML-like thinking/thought tags
  let cleaned = text.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, '').trim()

  // 2. Strip "Here's a thinking process:" or meta analysis dumps
  if (
    /^Here'?s a thinking process/i.test(cleaned) ||
    /^\*\*Thinking Process/i.test(cleaned) ||
    /^1\.\s+\*\*Analyze/i.test(cleaned) ||
    cleaned.toLowerCase().includes('thinking process:') ||
    cleaned.includes('Check against constraints')
  ) {
    // Attempt to extract the last valid quoted response
    const parts = cleaned.split(/["“”]/)
    const validQuotes: string[] = []
    for (let i = 1; i < parts.length; i += 2) {
      const q = parts[i].trim()
      if (q.length > 25 && !q.startsWith('If asked') && !q.startsWith('Keep responses') && !q.startsWith('Analyze')) {
        validQuotes.push(q)
      }
    }
    if (validQuotes.length > 0) {
      return validQuotes[validQuotes.length - 1]
    }
    return defaultFallback
  }

  // 3. Strip leading assistant label prefixes
  cleaned = cleaned.replace(/^(?:Assistant|Response|PulseBot|Answer):\s*/i, '').trim()

  return cleaned || defaultFallback
}

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

    const defaultGreeting = "Hey! 👋 I'm PulseBot, PurePulse's design & engineering consultant. We craft modern web apps and digital experiences starting at a $150 deposit. How can I help you today?"

    if (!apiKey) {
      return NextResponse.json({
        response: defaultGreeting,
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
            include_reasoning: false,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const rawReply = data.choices?.[0]?.message?.content?.trim()
          if (rawReply) {
            const cleanedReply = cleanAiResponse(rawReply, defaultGreeting)
            return NextResponse.json({
              response: cleanedReply,
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
      response: defaultGreeting,
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
