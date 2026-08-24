import { NextRequest, NextResponse } from 'next/server'
import { adminSupabase } from '@/lib/supabase'

async function recoverStoredApplication(supabase: ReturnType<typeof adminSupabase>, id: string) {
  const { data: files, error } = await supabase.storage.from('applications').list(id, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  })
  if (error || !files?.length) return null
  const file = files.find(item => item.name && item.id)
  if (!file) return null
  const storagePath = `${id}/${file.name}`
  const { data: { publicUrl } } = supabase.storage.from('applications').getPublicUrl(storagePath)
  return {
    application_pdf_url: publicUrl,
    application_pdf_name: file.name.replace(/^\d+_/, ''),
    application_pdf_uploaded_at: file.created_at || new Date().toISOString(),
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()

  // 1. Try fetching from referrals table
  const [{ data: referral }, { data: clicks }] = await Promise.all([
    supabase.from('referrals').select('*').eq('id', id).maybeSingle(),
    supabase.from('referral_clicks').select('*').eq('referral_id', id).order('created_at', { ascending: false }),
  ])

  if (referral) {
    if (!referral.application_pdf_url) {
      const recovered = await recoverStoredApplication(supabase, id)
      if (recovered) {
        Object.assign(referral, recovered)
        await supabase.from('referrals').update({ ...recovered, updated_at: new Date().toISOString() }).eq('id', id)
        if (referral.email) {
          await supabase.from('affiliates').update({ ...recovered, updated_at: new Date().toISOString() }).ilike('email', referral.email)
        }
      }
    }
    return NextResponse.json({ referral, clicks: clicks ?? [] })
  }

  // 2. Try fetching from affiliates table
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (affiliate) {
    if (!affiliate.application_pdf_url) {
      const recovered = await recoverStoredApplication(supabase, id)
      if (recovered) {
        Object.assign(affiliate, recovered)
        await supabase.from('affiliates').update({ ...recovered, updated_at: new Date().toISOString() }).eq('id', id)
      }
    }
    const [{ data: affRefs }, { data: affComms }] = await Promise.all([
      supabase.from('affiliate_referrals').select('*, clients(name, email, company)').eq('affiliate_id', id),
      supabase.from('affiliate_commissions').select('*').eq('affiliate_id', id),
    ])

    const totalEarned = (affComms ?? []).reduce((s, c) => s + Number(c.amount || 0), 0)
    const totalPaid = (affComms ?? []).filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.amount || 0), 0)

    const mappedReferral = {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      phone: affiliate.phone,
      code: affiliate.referral_code,
      clicks: 0,
      conversions: (affRefs ?? []).length,
      commission_per_conversion: 50,
      total_earned: totalEarned,
      total_paid: totalPaid,
      notes: affiliate.notes || null,
      active: affiliate.status === 'active',
      created_at: affiliate.created_at,
      updated_at: affiliate.updated_at,
      stripe_account_id: affiliate.stripe_account_id ?? null,
      stripe_payouts_enabled: affiliate.stripe_payouts_enabled ?? false,
      application_pdf_url: affiliate.application_pdf_url ?? null,
      application_pdf_name: affiliate.application_pdf_name ?? null,
      application_pdf_uploaded_at: affiliate.application_pdf_uploaded_at ?? null,
    }

    const mappedClicks = (affRefs ?? []).map(r => ({
      id: r.id,
      referral_id: affiliate.id,
      converted: true,
      converted_at: r.created_at,
      client_name: r.clients?.name || r.clients?.company || 'Referred Client',
      plan: r.plan,
      created_at: r.created_at,
    }))

    return NextResponse.json({ referral: mappedReferral, clicks: mappedClicks })
  }

  // 3. Fallback: check interviews table
  const { data: interview } = await supabase
    .from('interviews')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (interview) {
    const mappedReferral = {
      id: interview.id,
      name: interview.candidate_name,
      email: interview.candidate_email,
      phone: interview.candidate_phone,
      code: (interview.candidate_name ? interview.candidate_name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) + '346' : 'PARTNER'),
      clicks: 0,
      conversions: 0,
      commission_per_conversion: 50,
      total_earned: 0,
      total_paid: 0,
      notes: `Applicant from Video Interview (${interview.status})`,
      active: interview.status === 'onboarded' || interview.status === 'completed' || interview.status === 'strong_hire',
      created_at: interview.created_at,
      updated_at: interview.created_at,
      stripe_account_id: null,
      stripe_payouts_enabled: false,
      application_pdf_url: interview.application_pdf_url ?? null,
      application_pdf_name: interview.application_pdf_name ?? null,
      application_pdf_uploaded_at: interview.application_pdf_uploaded_at ?? null,
    }
    return NextResponse.json({ referral: mappedReferral, clicks: [] })
  }

  return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = adminSupabase()

  const { active, name, email, phone, commission_per_conversion, notes } = body
  const now = new Date().toISOString()
  const updates: PromiseLike<unknown>[] = []

  if (typeof active === 'boolean') {
    // 1. Update referrals
    updates.push(
      supabase.from('referrals').update({ active, updated_at: now }).eq('id', id)
    )
    // 2. Update affiliates
    updates.push(
      supabase.from('affiliates').update({ status: active ? 'active' : 'suspended', updated_at: now }).eq('id', id)
    )
    // 3. Update interviews if candidate
    updates.push(
      supabase.from('interviews').update({ status: active ? 'onboarded' : 'rejected' }).eq('id', id)
    )
  }

  if (name !== undefined || email !== undefined || phone !== undefined || commission_per_conversion !== undefined || notes !== undefined || body.total_paid !== undefined) {
    const refPayload: Record<string, unknown> = { updated_at: now }
    if (name !== undefined) refPayload.name = name.trim()
    if (email !== undefined) refPayload.email = email?.trim() || null
    if (phone !== undefined) refPayload.phone = phone?.trim() || null
    if (commission_per_conversion !== undefined) refPayload.commission_per_conversion = parseFloat(commission_per_conversion) || 50
    if (notes !== undefined) refPayload.notes = notes?.trim() || null
    if (body.total_paid !== undefined) refPayload.total_paid = Number(body.total_paid) || 0

    updates.push(
      supabase.from('referrals').update(refPayload).eq('id', id)
    )

    const affPayload: Record<string, unknown> = { updated_at: now }
    if (name !== undefined) affPayload.name = name.trim()
    if (email !== undefined) affPayload.email = email?.trim() || null
    if (phone !== undefined) affPayload.phone = phone?.trim() || null
    if (notes !== undefined) affPayload.notes = notes?.trim() || null

    updates.push(
      supabase.from('affiliates').update(affPayload).eq('id', id)
    )
  }

  await Promise.all(updates)
  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const supabase = adminSupabase()
  const { clientName, plan } = body

  // 1. Check if in referrals table
  const { data: ref } = await supabase.from('referrals').select('*').eq('id', id).maybeSingle()
  if (ref) {
    const newConversions = (ref.conversions || 0) + 1
    const newEarned = (ref.total_earned || 0) + (ref.commission_per_conversion || 50)
    await Promise.all([
      supabase.from('referrals').update({
        conversions: newConversions,
        total_earned: newEarned,
        updated_at: new Date().toISOString(),
      }).eq('id', id),
      supabase.from('referral_clicks').insert({
        referral_id: id,
        converted: true,
        converted_at: new Date().toISOString(),
        client_name: clientName,
        plan: plan || 'starter',
      }),
    ])
    return NextResponse.json({ success: true })
  }

  // 2. Check if in affiliates table
  const { data: aff } = await supabase.from('affiliates').select('*').eq('id', id).maybeSingle()
  if (aff) {
    const { data: client } = await supabase.from('clients').insert({
      name: clientName,
      company: clientName,
      status: 'active',
      plan: plan || 'starter',
      referral_code: aff.referral_code,
    }).select('id').single()

    if (client) {
      await supabase.from('affiliate_referrals').insert({
        affiliate_id: aff.id,
        client_id: client.id,
        plan: plan || 'starter',
        status: 'active',
        commission_rate: 0.2,
        monthly_commission: 50,
      })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = adminSupabase()

  try {
    let emailToDelete: string | null = null
    let authUserIdToDelete: string | null = null

    // 1. Check in affiliates
    const { data: aff } = await supabase.from('affiliates').select('*').eq('id', id).maybeSingle()
    if (aff) {
      emailToDelete = aff.email
      authUserIdToDelete = aff.auth_user_id

      // Delete cascade items
      await supabase.from('affiliate_clicks').delete().eq('affiliate_id', id)
      await supabase.from('affiliate_commissions').delete().eq('affiliate_id', id)
      await supabase.from('affiliate_referrals').delete().eq('affiliate_id', id)
      await supabase.from('affiliates').delete().eq('id', id)
    }

    // 2. Check in referrals
    const { data: ref } = await supabase.from('referrals').select('*').eq('id', id).maybeSingle()
    if (ref) {
      if (!emailToDelete && ref.email) emailToDelete = ref.email
      await supabase.from('referral_clicks').delete().eq('referral_id', id)
      await supabase.from('referrals').delete().eq('id', id)
    }

    // 3. Check in interviews
    const { data: iv } = await supabase.from('interviews').select('*').eq('id', id).maybeSingle()
    if (iv) {
      if (!emailToDelete && iv.candidate_email) emailToDelete = iv.candidate_email
      await supabase.from('interviews').delete().eq('id', id)
    }

    // 4. Clean up by email across any other tables if email was found
    if (emailToDelete) {
      const emailLower = emailToDelete.toLowerCase().trim()
      // Remove any matching rows in affiliates
      const { data: moreAffs } = await supabase.from('affiliates').select('id, auth_user_id').ilike('email', emailLower)
      if (moreAffs && moreAffs.length > 0) {
        for (const a of moreAffs) {
          if (!authUserIdToDelete && a.auth_user_id) authUserIdToDelete = a.auth_user_id
          await supabase.from('affiliate_clicks').delete().eq('affiliate_id', a.id)
          await supabase.from('affiliate_commissions').delete().eq('affiliate_id', a.id)
          await supabase.from('affiliate_referrals').delete().eq('affiliate_id', a.id)
          await supabase.from('affiliates').delete().eq('id', a.id)
        }
      }
      // Remove any matching rows in referrals
      const { data: moreRefs } = await supabase.from('referrals').select('id').ilike('email', emailLower)
      if (moreRefs && moreRefs.length > 0) {
        for (const r of moreRefs) {
          await supabase.from('referral_clicks').delete().eq('referral_id', r.id)
          await supabase.from('referrals').delete().eq('id', r.id)
        }
      }
      // Remove matching interviews
      await supabase.from('interviews').delete().ilike('candidate_email', emailLower)
    }

    // 5. Delete Supabase Auth User if present (so email can be tested again if needed)
    if (authUserIdToDelete) {
      try {
        await supabase.auth.admin.deleteUser(authUserIdToDelete)
      } catch (authErr) {
        console.warn('Could not delete auth user:', authErr)
      }
    }

    return NextResponse.json({ success: true, message: 'Account and associated test records deleted.' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete affiliate'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
