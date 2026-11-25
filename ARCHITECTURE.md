# PurePulse Architecture

The canonical application is a Next.js App Router application with Supabase Auth/Postgres as the persistence and identity boundary. Server routes perform privileged writes through server-side clients; browser views must never receive service-role credentials.

## Domains

- Public marketing: landing, pricing, portfolio, consultation intake, referral attribution.
- Client portal: services, projects, contracts/signatures, invoices, tickets, documents, messages.
- Affiliate portal: identity, referral links/QR, asset personalization, leads, commissions, payout onboarding.
- Workforce: interview/prescreen, invitations, onboarding, team profiles, time clock, test-mode compensation.
- Operations: clients, leads, projects, campaigns, contracts, invoices, team, settings, audit/handoff.

## Isolation model

Every client-owned record must carry a client/tenant key and be filtered in server code and Supabase RLS. Roles are enforced at the route boundary. Cross-tenant identifiers return not-found rather than leaking existence. Sensitive employee, tax, identity, and banking records are never public.

## Integration boundaries

Stripe, Resend, Google Calendar, Anthropic, social networks, and payout providers are optional adapters. Missing credentials produce a clearly labeled setup state. Payment and payroll execution are disabled in demo/staging mode.
