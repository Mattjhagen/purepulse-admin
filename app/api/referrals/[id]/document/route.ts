import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const supabase = adminSupabase()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${id}/${Date.now()}_${cleanFileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to 'applications' storage bucket
    let { data: uploadData, error: uploadErr } = await supabase.storage
      .from('applications')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: true,
      })

    // If bucket not found, dynamically create it and retry upload
    if (uploadErr && (uploadErr.message.includes('not found') || uploadErr.message.includes('Bucket'))) {
      try {
        await supabase.storage.createBucket('applications', {
          public: true,
          fileSizeLimit: 52428800,
        })
        const retry = await supabase.storage
          .from('applications')
          .upload(storagePath, buffer, {
            contentType: file.type || 'application/pdf',
            upsert: true,
          })
        uploadData = retry.data
        uploadErr = retry.error
      } catch (bErr) {
        console.warn('[referrals/document] Bucket creation warning:', bErr)
      }
    }

    if (uploadErr) {
      console.error('[document upload] Storage upload error:', uploadErr)
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('applications')
      .getPublicUrl(uploadData?.path || storagePath)

    const now = new Date().toISOString()

    const [{ data: legacyReferral }, { data: directAffiliate }] = await Promise.all([
      supabase.from('referrals').select('id, email').eq('id', id).maybeSingle(),
      supabase.from('affiliates').select('id, email').eq('id', id).maybeSingle(),
    ])
    const profileEmail = legacyReferral?.email || directAffiliate?.email || null
    const documentFields = {
      application_pdf_url: publicUrl,
      application_pdf_name: file.name,
      application_pdf_uploaded_at: now,
    }

    const writes = [
      supabase.from('referrals').update({ ...documentFields, updated_at: now }).eq('id', id),
      supabase.from('affiliates').update({ ...documentFields, updated_at: now }).eq('id', id),
      supabase.from('interviews').update(documentFields).eq('id', id),
    ]
    if (profileEmail) {
      writes.push(
        supabase.from('referrals').update({ ...documentFields, updated_at: now }).ilike('email', profileEmail),
        supabase.from('affiliates').update({ ...documentFields, updated_at: now }).ilike('email', profileEmail),
        supabase.from('interviews').update(documentFields).ilike('candidate_email', profileEmail),
      )
    }
    const writeResults = await Promise.all(writes)
    const writeError = writeResults.find(result => result.error)?.error
    if (writeError) {
      console.error('[document upload] Metadata update error:', writeError)
      return NextResponse.json({ error: `File uploaded, but profile attachment failed: ${writeError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      fileName: file.name,
      uploadedAt: now,
      message: 'Indeed PDF application attached successfully!',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    console.error('[document upload] Exception:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = adminSupabase()
    const now = new Date().toISOString()

    const [{ data: legacyReferral }, { data: directAffiliate }] = await Promise.all([
      supabase.from('referrals').select('email').eq('id', id).maybeSingle(),
      supabase.from('affiliates').select('email').eq('id', id).maybeSingle(),
    ])
    const profileEmail = legacyReferral?.email || directAffiliate?.email || null
    const emptyDocument = {
      application_pdf_url: null,
      application_pdf_name: null,
      application_pdf_uploaded_at: null,
    }
    await Promise.all([
      supabase.from('referrals').update({ ...emptyDocument, updated_at: now }).eq('id', id),
      supabase.from('affiliates').update({ ...emptyDocument, updated_at: now }).eq('id', id),
      supabase.from('interviews').update(emptyDocument).eq('id', id),
      ...(profileEmail ? [
        supabase.from('referrals').update({ ...emptyDocument, updated_at: now }).ilike('email', profileEmail),
        supabase.from('affiliates').update({ ...emptyDocument, updated_at: now }).ilike('email', profileEmail),
        supabase.from('interviews').update(emptyDocument).ilike('candidate_email', profileEmail),
      ] : []),
    ])

    const { data: files } = await supabase.storage.from('applications').list(id, { limit: 100 })
    if (files?.length) {
      await supabase.storage.from('applications').remove(files.map(file => `${id}/${file.name}`))
    }

    return NextResponse.json({
      ok: true,
      message: 'Attached application removed successfully.',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
