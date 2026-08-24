import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Handles incoming candidate applications from Indeed Apply Webhook
 * Payload standard includes applicant personal details, job details, and base64 encoded resume.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!rawBody) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 })
    }

    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const supabase = adminSupabase()

    // 1. Extract candidate information from Indeed standard schema
    const applicant = (payload.applicant || payload.candidate || payload) as Record<string, unknown>
    const candidateName = (applicant.fullName || applicant.name || `${applicant.firstName || ''} ${applicant.lastName || ''}`).toString().trim() || 'Indeed Applicant'
    const candidateEmail = (applicant.email || applicant.emailAddress || '').toString().trim()
    const candidatePhone = (applicant.phoneNumber || applicant.phone || '').toString().trim() || null
    const jobTitle = (payload.jobTitle || (payload.job as Record<string, unknown>)?.jobTitle || 'PurePulse Affiliate Partner').toString()

    if (!candidateEmail) {
      return NextResponse.json({ error: 'Candidate email is required in payload' }, { status: 400 })
    }

    const candidateId = crypto.randomUUID()
    let resumeUrl: string | null = null
    let resumeName: string | null = null
    const now = new Date().toISOString()

    // 2. Extract and upload resume PDF if provided (Base64 or URL)
    const resumeData = applicant.resume as Record<string, unknown> | string | undefined
    if (resumeData) {
      let fileBuffer: Buffer | null = null
      let fileName = `${candidateName.replace(/[^a-zA-Z0-9]/g, '_')}_Indeed_Resume.pdf`

      if (typeof resumeData === 'string' && resumeData.startsWith('data:')) {
        // Base64 Data URI
        const base64Content = resumeData.split(',')[1]
        fileBuffer = Buffer.from(base64Content, 'base64')
      } else if (typeof resumeData === 'object' && resumeData.data) {
        // Indeed Apply format: { data: 'base64...', fileName: 'resume.pdf' }
        fileBuffer = Buffer.from(resumeData.data as string, 'base64')
        if (resumeData.fileName) fileName = resumeData.fileName as string
      } else if (typeof resumeData === 'object' && resumeData.url) {
        // Direct URL to resume
        try {
          const fetched = await fetch(resumeData.url as string)
          const arrayBuf = await fetched.arrayBuffer()
          fileBuffer = Buffer.from(arrayBuf)
          if (resumeData.fileName) fileName = resumeData.fileName as string
        } catch (fetchErr) {
          console.warn('[Indeed Webhook] Failed to fetch resume from URL:', fetchErr)
        }
      }

      if (fileBuffer) {
        const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${candidateId}/${Date.now()}_${cleanName}`

        const { data: uploadRes, error: uploadErr } = await supabase.storage
          .from('applications')
          .upload(storagePath, fileBuffer, {
            contentType: 'application/pdf',
            upsert: true,
          })

        if (!uploadErr && uploadRes) {
          const { data: { publicUrl } } = supabase.storage
            .from('applications')
            .getPublicUrl(uploadRes.path)
          resumeUrl = publicUrl
          resumeName = fileName
        } else {
          console.error('[Indeed Webhook] Resume storage error:', uploadErr)
        }
      }
    }

    // 3. Insert or update candidate in the interviews table
    const { data: interview, error: dbErr } = await supabase
      .from('interviews')
      .upsert({
        id: candidateId,
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        candidate_phone: candidatePhone,
        job_title: jobTitle,
        status: 'new_applicant',
        application_pdf_url: resumeUrl,
        application_pdf_name: resumeName,
        application_pdf_uploaded_at: resumeUrl ? now : null,
        created_at: now,
      }, { onConflict: 'candidate_email' })
      .select()
      .single()

    if (dbErr) {
      console.error('[Indeed Webhook] DB error:', dbErr)
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    // 4. Also register/update in affiliates table
    const referralCode = candidateName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) + '346'
    await supabase
      .from('affiliates')
      .upsert({
        id: candidateId,
        name: candidateName,
        email: candidateEmail,
        phone: candidatePhone,
        referral_code: referralCode,
        status: 'pending',
        application_pdf_url: resumeUrl,
        application_pdf_name: resumeName,
        application_pdf_uploaded_at: resumeUrl ? now : null,
        notes: `Imported from Indeed Application on ${new Date().toLocaleDateString()}`,
        created_at: now,
      }, { onConflict: 'email' })

    // 5. Send automated pre-screen video interview invitation to candidate
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const prescreenUrl = `https://login.purepulse.one/interview/prescreen?email=${encodeURIComponent(candidateEmail)}&name=${encodeURIComponent(candidateName)}`

        await resend.emails.send({
          from: 'PurePulse Careers <careers@purepulse.one>',
          to: candidateEmail,
          subject: `Next Step: Complete Your Quick Virtual Video Interview with PurePulse`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #07070D; color: #F4F4FF; border-radius: 12px; overflow: hidden; border: 1px solid #1F1F2E;">
              <div style="padding: 24px 32px; border-bottom: 1px solid #1F1F2E; text-align: center;">
                <span style="font-size: 20px; font-weight: 800; color: #F4F4FF; letter-spacing: -0.5px;">Pure<span style="color: #A066FF;">Pulse</span></span>
              </div>
              <div style="padding: 32px;">
                <h2 style="margin: 0 0 12px; font-size: 18px; color: #F4F4FF;">Hi ${candidateName},</h2>
                <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                  Thank you for applying for the <strong>${jobTitle}</strong> position on Indeed! We have received your application and resume.
                </p>
                <p style="color: #D1D5DB; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                  To expedite our hiring review, the next step is to complete our quick 9-question interactive video pre-screen. It takes only a few minutes and can be completed from your phone or computer.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${prescreenUrl}" style="background: #7B2FFF; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; display: inline-block;">
                    Start Video Pre-Screen →
                  </a>
                </div>
                <p style="font-size: 12px; color: #6B7280; text-align: center; margin-top: 24px;">
                  If you have any questions, feel free to reply directly to this email.
                </p>
              </div>
            </div>
          `,
        })
      } catch (emailErr) {
        console.warn('[Indeed Webhook] Invitation email error:', emailErr)
      }
    }

    return NextResponse.json({
      ok: true,
      candidateId: interview.id,
      name: candidateName,
      email: candidateEmail,
      resumeUrl,
      message: 'Indeed candidate auto-loaded and invited successfully.',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook error'
    console.error('[Indeed Webhook Exception]:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
