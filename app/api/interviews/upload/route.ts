import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE!
  )
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('video') as File | null
    const questionId = formData.get('questionId') as string | null
    const candidateEmail = (formData.get('email') as string | null) || 'anonymous'

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    const supabase = adminSupabase()
    const cleanEmail = candidateEmail.replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `${cleanEmail}/${Date.now()}_${questionId || 'answer'}.webm`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage 'interviews' bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('interviews')
      .upload(fileName, buffer, {
        contentType: file.type || 'video/webm',
        upsert: true,
      })

    if (uploadError) {
      console.warn('[interviews/upload] Supabase storage upload warning:', uploadError.message)
      // Fallback: If bucket doesn't exist or storage fails, create a signed or data url or log error
      return NextResponse.json({
        ok: false,
        error: uploadError.message,
        fallbackKey: fileName,
      }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('interviews')
      .getPublicUrl(uploadData.path)

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      path: uploadData.path,
    })
  } catch (err) {
    console.error('[interviews/upload] Error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 })
  }
}
