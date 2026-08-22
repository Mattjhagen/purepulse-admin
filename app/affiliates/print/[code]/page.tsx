import { notFound } from 'next/navigation'
import Image from 'next/image'
import { adminSupabase } from '@/lib/supabase'
import { PrintControls } from './PrintControls'

export const dynamic = 'force-dynamic'

const TEMPLATE_COPY = {
  neon: { eyebrow: 'HIGH-PERFORMANCE WEBSITES', headline: 'YOUR NEXT WEBSITE SHOULD MOVE PEOPLE FORWARD.' },
  clean: { eyebrow: 'WEB DESIGN WITHOUT THE AGENCY HEADACHE', headline: 'A BETTER WEBSITE FOR YOUR BUSINESS.' },
  local: { eyebrow: 'BUILT FOR LOCAL BUSINESS', headline: 'TURN MORE VISITORS INTO CUSTOMERS.' },
  tabs: { eyebrow: 'TAKE ONE • SCAN • GET STARTED', headline: 'YOUR BUSINESS DESERVES A WEBSITE THAT WORKS.' },
} as const

export default async function PartnerFlyerPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ template?: string }>
}) {
  const { code } = await params
  const query = await searchParams
  const referralCode = decodeURIComponent(code || '').trim().toUpperCase()
  if (!/^[A-Z0-9_-]{3,40}$/.test(referralCode)) notFound()

  const { data: affiliate } = await adminSupabase()
    .from('affiliates')
    .select('name, referral_code, status')
    .eq('referral_code', referralCode)
    .eq('status', 'active')
    .maybeSingle()
  if (!affiliate) notFound()

  const templateKey = query.template && query.template in TEMPLATE_COPY
    ? query.template as keyof typeof TEMPLATE_COPY
    : 'neon'
  const copy = TEMPLATE_COPY[templateKey]
  const referralUrl = `https://login.purepulse.one/ref/${encodeURIComponent(referralCode)}`
  const qrUrl = `/api/qr?format=svg&size=240&margin=1&data=${encodeURIComponent(referralUrl)}`

  return (
    <main>
      <PrintControls />
      <article className={`flyer ${templateKey}`}>
        <header>
          <Image src="/icon.svg" alt="PurePulse" width={52} height={52} priority />
          <div><strong>PurePulse</strong><span>WEB DESIGN &amp; DEVELOPMENT</span></div>
        </header>
        <section>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.headline}</h1>
          <div className="rule" />
          <ul>
            <li>$150 deposit to launch</li>
            <li>Responsive, secure, high-performance development</li>
            <li>Ongoing updates and maintenance available</li>
          </ul>
        </section>
        <footer>
          <Image className="qr" src={qrUrl} alt={`QR code for ${referralUrl}`} width={96} height={96} unoptimized />
          <div><small>VISIT YOUR PARTNER LINK</small><strong>{referralUrl}</strong><span>Partner: {affiliate.name}</span></div>
        </footer>
        {templateKey === 'tabs' && <div className="tabs">{Array.from({ length: 8 }, (_, index) => <span key={index}>PUREPULSE.ONE<br />{referralCode}</span>)}</div>}
      </article>
      <style>{`
        *{box-sizing:border-box} body{margin:0;background:#0b0f19;color:#fff;font-family:Arial,sans-serif} main{padding:24px}.controls{max-width:816px;margin:0 auto 18px;display:flex;gap:10px}button{border:0;border-radius:10px;padding:12px 18px;background:#7c3aed;color:white;font-weight:800;cursor:pointer}.secondary{background:#1f2937}.flyer{width:min(816px,100%);min-height:1056px;margin:auto;padding:64px;background:linear-gradient(145deg,#0f172a,#111827 60%,#3b0764);border:1px solid #4c1d95;display:flex;flex-direction:column}.flyer.clean{background:#fff;color:#111827;border-color:#ddd}.flyer.local{background:linear-gradient(145deg,#052e16,#14532d)}header{display:flex;align-items:center;gap:14px}header img{width:52px;height:52px}header strong{display:block;font-size:28px}header span{display:block;font-size:11px;letter-spacing:1.5px;opacity:.65;margin-top:3px}section{margin:auto 0}.eyebrow{color:#a78bfa;font-weight:900;letter-spacing:2px}h1{font-size:58px;line-height:1.02;margin:18px 0;max-width:680px}.rule{height:5px;width:110px;background:#7c3aed;margin:30px 0}ul{font-size:22px;line-height:1.7;padding-left:28px}footer{display:flex;gap:20px;align-items:center;padding:24px;background:rgba(255,255,255,.08);border-radius:18px;overflow-wrap:anywhere}.clean footer{background:#f1f5f9}.qr{width:96px;height:96px;border-radius:8px;background:#fff;flex:none}footer small,footer strong,footer span{display:block}footer strong{font-size:18px;margin:5px 0}.tabs{display:flex;margin:28px -50px -64px}.tabs span{flex:1;border:1px dashed currentColor;padding:12px 3px;font-size:8px;text-align:center;writing-mode:vertical-rl}@media print{body{background:white}main{padding:0}.no-print{display:none!important}.flyer{width:8.5in;height:11in;min-height:0;border:0;margin:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}@page{size:letter;margin:0}}@media(max-width:600px){main{padding:12px}.flyer{min-height:calc((100vw - 24px)*1.294);padding:28px}h1{font-size:34px}ul{font-size:15px}footer{padding:14px}.qr{width:64px;height:64px}.tabs{margin-bottom:-28px}}
      `}</style>
    </main>
  )
}
