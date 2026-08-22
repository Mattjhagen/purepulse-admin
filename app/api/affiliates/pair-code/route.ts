import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cucksfwkdmrkeiwmdlut.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const { affiliateId } = await req.json();

    if (!affiliateId) {
      return NextResponse.json({ error: 'Affiliate ID is required' }, { status: 400 });
    }

    // Generate random 6-character code (e.g. PX-4892)
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const pairCode = `PX-${randomDigits}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Store in Supabase
    const { error } = await supabase
      .from('affiliates')
      .update({
        mobile_pair_code: pairCode,
        mobile_pair_expires_at: expiresAt,
      })
      .eq('id', affiliateId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deepLink = `purepulse://link?code=${pairCode}`;

    return NextResponse.json({
      success: true,
      pairCode,
      expiresAt,
      deepLink,
      webSiteUrl: 'https://mattjhagen.github.io/PurePulseMeet/',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
