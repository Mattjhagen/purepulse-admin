# Security

## Controls required for release

- Supabase Auth with strong password hashing and privileged MFA where supported.
- Server-side RBAC for super administrator, business administrator, manager, employee, contractor, affiliate, and client.
- Tenant/client scoping in every query plus RLS regression tests.
- Zod/input validation, parameterized Supabase/Postgres queries, CSRF-safe mutations, secure cookies, rate limits, and safe error messages.
- Private document storage with signed, short-lived access URLs; no tax, identity, payroll, or banking data in logs.
- Immutable audit events for authentication, permissions, document access, signatures, payouts, payroll previews, and admin changes.
- Secret scanning and dependency scanning in CI. `.env*`, database dumps, keys, tokens, and real records are never committed.

No government form is represented as legally verified or submitted unless an authorized provider workflow is actually connected.
