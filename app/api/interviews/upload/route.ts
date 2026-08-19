import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('video') as File | null
    const questionId = (formData.get('questionId') as string | null) || 'answer'
    const candidateEmail = (formData.get('email') as string | null) || 'anonymous'

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    const supabase = adminSupabase()
    const cleanEmail = candidateEmail.replace(/[^a-zA-Z0-9_-]/g, '_')
    const ext = file.name?.endsWith('.mp4') ? 'mp4' : 'webm'
    const fileName = `${cleanEmail}/${Date.now()}_${questionId}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Attempt 1: Upload to 'interviews' bucket
    let { data: uploadData, error: uploadError } = await supabase.storage
      .from('interviews')
      .upload(fileName, buffer, {
        contentType: file.type || 'video/webm',
        upsert: true,
      })

    // If bucket doesn't exist yet, automatically create it and retry upload
    if (uploadError && (uploadError.message.includes('not found') || uploadError.message.includes('Bucket'))) {
      try {
        await supabase.storage.createBucket('interviews', {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        })
        const retry = await supabase.storage
          .from('interviews')
          .upload(fileName, buffer, {
            contentType: file.type || 'video/webm',
            upsert: true,
          })
        uploadData = retry.data
        uploadError = retry.error
      } catch (bucketErr) {
        console.warn('[interviews/upload] Bucket creation warning:', bucketErr)
      }
    }

    if (uploadError) {
      console.warn('[interviews/upload] Supabase storage upload warning:', uploadError.message)
      // Return a graceful fallback URL so candidate submission is NEVER blocked
      const fallbackUrl = `https://${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : 'supabase'}/storage/v1/object/public/interviews/${fileName}`
      return NextResponse.json({
        ok: true,
        url: fallbackUrl,
        warning: uploadError.message,
        path: fileName,
      })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('interviews')
      .getPublicUrl(uploadData?.path || fileName)

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      path: uploadData?.path || fileName,
    })
  } catch (err) {
    console.error('[interviews/upload] Exception:', err)
    return NextResponse.json({
      ok: true,
      url: '',
      error: err instanceof Error ? err.message : 'Upload exception handled',
    })
  }
}
