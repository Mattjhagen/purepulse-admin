# PurePulse Build Pipeline Implementation Plan

Status: Proposed

Last updated: 2026-08-26

Repositories: `Mattjhagen/purepulse-admin`, `Mattjhagen/Server-Handoff-TTY`

## 1. Objective

Build a secure, observable, and billable workflow that moves a customer from intake through contract signing, payment, automated website construction, security review, human review, and deployment.

The completed workflow must:

- Start automated work only after the correct contract is signed and the required Stripe payment is verified.
- Bill automated work at the configured hourly rate using server-generated, idempotent usage events.
- Keep every automated action scoped to exactly one project.
- Display real pipeline state, logs, cost, progress, and failures in PurePulse Admin and the TTY dashboard.
- Run isolated project-manager, developer, and security/QA jobs using managed container jobs.
- Require human approval before production deployment.
- Maintain a complete audit trail for administrative, automated, billing, and deployment actions.

## 2. Guiding Architecture Decisions

### AD-001: One canonical project model

Use `website_projects` as the initial canonical project record. Migrate useful fields from `projects` and `handoff_projects`, update all readers and writers, then retire or convert the older tables into read-only compatibility views.

Related records should reference the canonical project ID:

- `project_briefs`
- `contracts`
- `payments`
- `pipeline_jobs`
- `job_attempts`
- `project_usage_events`
- `project_audit_events`
- `project_artifacts`
- `project_approvals`
- `provider_executions`
- `workflow_outbox`

### AD-002: Transactional workflow with an outbox

Business state changes and workflow events must be committed in the same database transaction. A dispatcher consumes `workflow_outbox` records and starts jobs. This prevents payment from succeeding while build dispatch is silently lost.

### AD-003: Managed, finite container jobs

Do not maintain nine permanently running role containers. Start one finite, isolated job for one project stage and one attempt.

Initial provider recommendation:

1. Select one primary provider for the first production release.
2. Implement a common provider-adapter interface.
3. Add the other providers as tested standby adapters after the primary path is reliable.

Suitable execution products are AWS ECS/Fargate tasks, Google Cloud Run Jobs, and Azure Container Apps Jobs.

### AD-004: Server-authoritative billing

Workers emit authenticated heartbeats tied to a job attempt. The server records append-only, idempotent usage events. Database aggregation calculates totals once. Browser-provided durations and costs are never trusted.

### AD-005: TTY read model plus controlled command gateway

TTY reads canonical project/job state and cached provider status. Administrative actions use a separate authenticated command API with authorization, validation, confirmation rules, idempotency, and audit events.

## 3. Target State Machine

Primary path:

```text
draft
  -> awaiting_client_brief
  -> awaiting_contract
  -> awaiting_payment
  -> ready_for_build
  -> project_planning
  -> development
  -> security_review
  -> human_review
  -> approved
  -> deploying
  -> live
```

Exception states:

```text
blocked_client
payment_failed
failed_retryable
failed_permanent
cap_reached
cancelled
```

Every transition must define:

- Allowed source states.
- Required role or machine identity.
- Preconditions and validation.
- Idempotency key.
- Audit-event payload.
- Compensation or retry behavior.

## 4. Delivery Phases

## Phase 0 — Emergency Security Stabilization

Goal: Close paths that could expose infrastructure, billing, or administrative capabilities before connecting cloud credentials.

### P0-01 Rotate and remove exposed credentials

- [ ] Rotate the database credential found in repository configuration.
- [ ] Rotate TTY dashboard credentials and invalidate existing sessions.
- [ ] Replace hard-coded secret fallbacks with required environment variables.
- [ ] Remove secrets from Git history where practical.
- [ ] Re-enable verified TLS for database and GitHub connections.
- [ ] Add secret scanning to CI.

Acceptance criteria:

- Production refuses to start when required secrets are missing.
- No credential, default password, or production secret is present in tracked files.
- Database and external API clients validate certificate chains and hostnames.

### P0-02 Replace permissive administrator authorization

- [ ] Store roles/permissions in a server-controlled profile or membership table.
- [ ] Require explicit staff/admin roles in `requireAdmin`.
- [ ] Apply authorization inside every privileged API handler.
- [ ] Remove the global `/api` middleware bypass or document and test route-local enforcement.
- [ ] Separate customer, staff, superuser, worker, and TTY-command identities.
- [ ] Add negative authorization tests for customer accounts.

Acceptance criteria:

- A signed-in customer receives `403` from all staff, billing mutation, dispatch, clock, and recovery endpoints.
- Unauthenticated callers receive `401`.
- Authorization decisions are recorded for privileged mutations.

### P0-03 Lock down dangerous mutation endpoints

- [ ] Protect usage, billing clock, dispatch, force-review, healing, and log-clearing endpoints.
- [ ] Convert mutation-via-GET routes to `POST` or `DELETE` as appropriate.
- [ ] Require project ID, expected state/version, reason, actor, and idempotency key.
- [ ] Add confirmation requirements for destructive or infrastructure-wide actions.
- [ ] Remove hard-coded project targets.

Acceptance criteria:

- No GET request changes state.
- Every administrative mutation produces a project-scoped audit event.
- Cross-project and global operations require a distinct superuser permission.

## Phase 1 — Canonical Data and Workflow Foundation

Goal: Create one reliable source of truth and eliminate split-brain project state.

### P1-01 Consolidate project tables

- [ ] Inventory all reads/writes to `projects`, `website_projects`, and `handoff_projects`.
- [ ] Define the final `website_projects` schema and constraints.
- [ ] Write a reversible data migration with reconciliation reporting.
- [ ] Update Admin, Stripe, chat, build, usage, and TTY integrations.
- [ ] Stop adding hard-coded fallback projects to production UI.
- [ ] Retire old tables only after read/write parity tests pass.

### P1-02 Correct row-level security

- [ ] Replace policies that allow all authenticated users to read or mutate pipeline records.
- [ ] Scope customer access to their own client/project records.
- [ ] Scope workers to their assigned project and job attempt.
- [ ] Reserve cross-project access for explicit staff roles.
- [ ] Test policies using customer, staff, worker, and anonymous identities.

### P1-03 Add workflow and audit tables

- [ ] Add `workflow_outbox`, `job_attempts`, `provider_executions`, `project_artifacts`, and `project_approvals`.
- [ ] Make audit and usage events append-only.
- [ ] Add unique constraints for provider event IDs and idempotency keys.
- [ ] Add optimistic versioning to project state transitions.
- [ ] Add retention rules for logs and artifacts.

Acceptance criteria for Phase 1:

- Admin and TTY return the same state for the same project.
- Concurrent transition attempts cannot skip stages or bill twice.
- No production page fabricates a project when a lookup fails.

## Phase 2 — Contract and Payment Gate

Goal: Ensure the correct project starts exactly once after the exact contract and payment are verified.

### P2-01 Make contract signing fail closed

- [ ] Reject invalid, expired, already-used, or wrong-status signing tokens.
- [ ] Bind a contract to exactly one project and one versioned brief.
- [ ] Update only the project referenced by the contract.
- [ ] Move signed projects to `awaiting_payment`, never directly to `building`.
- [ ] Remove mock success behavior outside automated test fixtures.

### P2-02 Make checkout fail closed

- [ ] Require a valid signed contract before creating checkout.
- [ ] Derive the plan, prices, customer, and currency from server records.
- [ ] Prevent query parameters from overriding the signed plan.
- [ ] Remove mock checkout URLs from production error handling.
- [ ] Attach canonical project, contract, and brief version IDs to Stripe metadata.

### P2-03 Implement transactional webhook processing

- [ ] Verify the Stripe signature and supported event type.
- [ ] Verify customer, contract, project, amount, currency, and payment status.
- [ ] Store the Stripe event ID and process it idempotently.
- [ ] Record payment, transition to `ready_for_build`, and insert an outbox event in one transaction.
- [ ] Return non-2xx on retryable processing failure so Stripe retries.
- [ ] Add replay tests and out-of-order event tests.

Acceptance criteria for Phase 2:

- Signing one contract never changes another project.
- Duplicate webhooks create one payment and one build request.
- No build starts without both a signed contract and verified required payment.

## Phase 3 — Cloud Build Orchestration

Goal: Replace simulated dispatch with real, traceable, project-isolated jobs.

### P3-01 Define the provider adapter

The adapter should support:

```text
startJob(project, stage, attempt, imageDigest, inputArtifact)
getJob(executionId)
cancelJob(executionId)
getLogReference(executionId)
getUsage(executionId)
health()
```

- [ ] Persist the chosen provider, region, execution ID, attempt, image digest, and commit SHA.
- [ ] Define normalized status and error categories.
- [ ] Do not automatically fail over after an unknown/ambiguous start result until reconciliation proves no job is running.

### P3-02 Build immutable worker images

- [ ] Create versioned worker images for project management, development, and security/QA.
- [ ] Run as non-root with CPU, memory, time, and filesystem limits.
- [ ] Use an isolated workspace for each job.
- [ ] Pass secrets through the provider secret manager, never the job payload or image.
- [ ] Restrict outbound networking where feasible.
- [ ] Produce a signed result manifest containing commit SHA, artifacts, tests, findings, timing, and exit status.

### P3-03 Enforce least privilege by role

- [ ] Project manager: may create the build plan and task records, but not deploy.
- [ ] Developer: may create a project branch/commit/PR, but not merge to protected production branches.
- [ ] Security/QA: may read and test the exact commit, but not modify the reviewed branch.
- [ ] Deployer: may deploy only an approved, security-passed commit.
- [ ] Human reviewer: may approve or request changes, with every decision audited.

### P3-04 Implement one primary provider

- [ ] Select AWS, GCP, or Azure as the primary provider.
- [ ] Provision registry, job runtime, IAM identities, secret access, networking, logging, quotas, and budgets using infrastructure as code.
- [ ] Implement dispatch, status reconciliation, log references, cancellation, timeout, and cleanup.
- [ ] Run failure-injection tests before production traffic.

### P3-05 Add secondary providers

- [ ] Implement the same contract for provider two and provider three.
- [ ] Validate artifact portability and identical worker image behavior.
- [ ] Add explicit capacity and failover policies.
- [ ] Test failure before start, during start, during execution, and after completion.

Acceptance criteria for Phase 3:

- A queued job produces a real provider execution ID and observable lifecycle.
- A worker can access only its assigned project and required secrets.
- Retrying a job cannot create untracked parallel executions.
- Security approval is tied to the exact commit/image digest delivered to human review.

## Phase 4 — Accurate Billing and Spending Caps

Goal: Bill only validated work once and stop automatically at the authorized cap.

### P4-01 Rebuild automated usage accounting

- [ ] Align APIs, migrations, triggers, and TypeScript types on one event schema.
- [ ] Require worker identity, project ID, job ID, attempt ID, sequence, start/end time, and idempotency key.
- [ ] Record usage as immutable events.
- [ ] Remove direct total updates from application routes.
- [ ] Aggregate totals once in a transaction or database function.
- [ ] Decide and document treatment of queue time, cold starts, provider outages, failed attempts, and PurePulse-caused retries.

### P4-02 Enforce the cap atomically

- [ ] Reserve expected spend before dispatch or each billing interval.
- [ ] Reject or pause work when the remaining cap is insufficient.
- [ ] Cancel active work when the authorized cap is reached.
- [ ] Notify staff and the customer when work is paused for approval.
- [ ] Require an audited cap increase before resuming.

### P4-03 Repair human-review timekeeping

- [ ] Require a staff actor and project ID.
- [ ] Allow only one active clock per user/project unless explicitly supported.
- [ ] Remove unintended minimum-time rounding if billing is promised in minute increments.
- [ ] Close abandoned clocks through an audited correction workflow.
- [ ] Keep human time separate from automated job usage.

### P4-04 Reconcile commercial language

- [ ] Align checkout, contract, UI, and emails on deposit crediting, first-month billing, hourly work, caps, refunds, and recurring billing start date.
- [ ] Have qualified counsel review the final customer-facing terms.

Acceptance criteria for Phase 4:

- Duplicate heartbeats and webhook retries do not increase cost twice.
- Public clients cannot submit billable duration or cost.
- Project cost reconciles to its immutable usage ledger.
- Work cannot exceed the authorized cap because of a race condition.

## Phase 5 — Admin Project Experience and Scoped Assistant

Goal: Make the Admin project page the accurate control surface for one project.

### P5-01 Replace hard-coded project pages

- [ ] Load canonical project, brief, contract/payment state, jobs, usage, artifacts, and approvals.
- [ ] Add a timeline for every pipeline transition.
- [ ] Display provider, execution ID, attempt, active stage, progress, last heartbeat, logs, commit, tests, findings, cost, and cap.
- [ ] Provide useful loading, empty, error, blocked, retrying, and stale states.
- [ ] Make desktop and mobile layouts pass overflow and accessibility testing.

### P5-02 Enforce strict project-scoped chat

- [ ] Derive the project ID on the server from the current authorized route/session.
- [ ] Store chat threads and attachments under that project ID.
- [ ] Restrict tools, repositories, files, logs, jobs, and commands to the project binding.
- [ ] Reject tool calls lacking or conflicting with the server-bound project ID.
- [ ] Scan uploads and enforce file type, size, ownership, retention, and licensing rules.
- [ ] Require confirmation for deployment, deletion, rollback, cap changes, and other high-impact actions.
- [ ] Record prompts, tool requests, approvals, results, and affected resources in the audit trail.

### P5-03 Support dashboard/TTY administrative mode

- [ ] Outside a project route, place chat in explicit administrative mode.
- [ ] Allow log cleanup, stuck-job recovery, reconciliation, and other approved admin actions only for authorized staff.
- [ ] Require the user to select or confirm targets before project-affecting actions.
- [ ] Distinguish project actions from infrastructure-wide actions in both UI and authorization.
- [ ] Make recovery operations idempotent and report verified results rather than optimistic success messages.

Acceptance criteria for Phase 5:

- Project chat cannot read or change another project, the admin application source, or shared infrastructure.
- Admin-mode actions identify their exact targets and create audit records.
- The UI never claims an action succeeded until the underlying result is verified.

## Phase 6 — TTY Command Center

Goal: Provide a truthful, fast operational view without fabricating health or bypassing controls.

### P6-01 Secure the TTY web service

- [ ] Bind to loopback/private networking or place it behind authenticated TLS ingress.
- [ ] Replace deterministic long-lived sessions with expiring, revocable sessions.
- [ ] Use `Secure`, `HttpOnly`, and appropriate `SameSite` cookies.
- [ ] Add rate limits and login-attempt controls.
- [ ] Remove password-change keyword heuristics and never return credentials in chat.
- [ ] Tighten Content Security Policy and remove unnecessary inline-script allowances.

### P6-02 Replace fabricated fallback state

- [ ] Return explicit `unknown`, `unavailable`, or `stale` states when collection fails.
- [ ] Never insert example issues/projects into production results.
- [ ] Verify command return codes and post-action state before reporting success.
- [ ] Repair the missing `live_status` API and restore the failing test suite.

### P6-03 Build the operational read model

- [ ] Poll database/provider state centrally on a controlled interval.
- [ ] Cache normalized snapshots and broadcast them to SSE clients.
- [ ] Avoid one set of cloud/SSH calls per connected browser.
- [ ] Show project pipeline, provider execution, heartbeat, log reference, cost, cap, retries, artifacts, and approvals.
- [ ] Add freshness indicators and partial-outage behavior.

### P6-04 Build the command gateway

- [ ] Define a strict allowlist of actions such as reconcile status, retry eligible job, cancel job, clear an identified stale log stream, or close an abandoned clock.
- [ ] Validate actor permission, target scope, current state, expected version, and idempotency key.
- [ ] Require step-up confirmation for destructive/global operations.
- [ ] Save before/after state and result evidence to the central audit trail.

Acceptance criteria for Phase 6:

- TTY reports unknown rather than healthy when providers cannot be reached.
- Multiple dashboard viewers do not multiply provider requests.
- Every command is authenticated, authorized, scoped, idempotent, and audited.

## Phase 7 — Improved Customer Intake

Goal: Give the AI enough approved, structured information to build accurately without inventing business facts.

### P7-01 Add structured business requirements

- [ ] Primary website goal and call to action.
- [ ] Requested pages and purpose/content for each page.
- [ ] Structured services/products, descriptions, prices, and service areas.
- [ ] Address, hours, phone, public email, and approval contact.
- [ ] Website-type conditional questions for brochure, store, booking, membership, or custom applications.

### P7-02 Add brand and asset intake

- [ ] Logo, photography, video, documents, and existing brand guide uploads.
- [ ] Colors, fonts, tone, styles to use, and styles to avoid.
- [ ] Competitor/example URLs with likes and dislikes.
- [ ] Ownership/licensing confirmation for every uploaded asset.
- [ ] Malware scanning, validation, private storage, and retention rules.

### P7-03 Add technical and compliance requirements

- [ ] Domain, registrar, DNS owner, current site, and access owner.
- [ ] Booking, payment, CRM, email, analytics, form, and social integrations.
- [ ] SEO services, locations, phrases, redirects, and existing analytics.
- [ ] Accessibility, language, privacy, terms, refund, and industry-specific requirements.
- [ ] Desired launch date and post-launch maintenance needs.

### P7-04 Add brief generation and approval

- [ ] Generate a structured preview from intake answers.
- [ ] Highlight missing/conflicting information.
- [ ] Allow the client to correct answers before approval.
- [ ] Version and lock the approved brief.
- [ ] Bind the approved brief version to the contract and every build job.
- [ ] Move the project to `blocked_client` when required facts are missing.

## Phase 8 — Testing, Observability, and Rollout

### P8-01 Establish required test gates

- [ ] Unit tests for authorization, transitions, idempotency, cap enforcement, and provider normalization.
- [ ] Integration tests using Stripe fixtures and a real test database.
- [ ] Contract tests for every cloud provider adapter.
- [ ] End-to-end tests from intake through human review.
- [ ] Cross-project isolation and malicious-upload tests.
- [ ] Mobile layout tests at supported widths.
- [ ] Restore TTY tests and include them in CI.

### P8-02 Add operational telemetry

- [ ] Structured logs with project, job, attempt, provider, and trace IDs.
- [ ] Metrics for queue delay, execution time, failures, retries, stale jobs, cap stops, and webhook errors.
- [ ] Alerts for payment/build inconsistencies, missing heartbeats, repeated failures, security findings, and billing drift.
- [ ] Dashboards for business pipeline and infrastructure health.
- [ ] Redaction rules preventing secrets and customer-sensitive content from entering logs.

### P8-03 Roll out safely

- [ ] Create separate development, staging, and production environments.
- [ ] Run migrations against a production-like snapshot and verify reconciliation.
- [ ] Launch an internal synthetic project first.
- [ ] Launch a small customer pilot with manual approval at every stage.
- [ ] Compare usage events to provider metrics and invoices.
- [ ] Enable automation stage by stage behind feature flags.
- [ ] Document rollback and incident-response procedures.

## 5. Proposed Milestones

| Milestone | Included phases | Exit condition |
| --- | --- | --- |
| M1: Safe foundation | 0–1 | Credentials rotated, authorization/RLS repaired, canonical project model operational |
| M2: Trustworthy purchase gate | 2 | Signed contract plus verified payment creates exactly one durable build request |
| M3: First real build | 3 | One provider completes PM, developer, and security jobs with persisted evidence |
| M4: Billable pilot | 4 | Usage ledger and caps reconcile under retries and concurrent events |
| M5: Admin operations | 5–6 | Admin and TTY display identical live state and run controlled audited commands |
| M6: Customer pilot | 7–8 | Approved brief flows through human review and controlled deployment |

## 6. Definition of Done

The pipeline is ready for general production use only when:

- No build can start before the exact contract and required payment are verified.
- No customer, worker, or project assistant can cross its authorization boundary.
- All state transitions, commands, usage, approvals, and deployments are audited.
- Automated and human work reconcile to the displayed project cost.
- Spending caps cannot be exceeded through concurrency or retry behavior.
- Provider failures are visible and never replaced with fabricated success.
- Human review receives the exact commit that passed security review.
- Production deployment requires explicit approval and supports rollback.
- Backups, recovery, alerts, and incident runbooks have been tested.

## 7. Matt's Tasks

These decisions and account-level actions require the business owner. Complete them in this order.

- [ ] **Immediately rotate credentials:** database password, TTY credentials, exposed application secrets, and any cloud credentials that may have been committed or copied into scripts.
- [ ] **Choose the first cloud provider:** select AWS, Google Cloud, or Azure as the production primary. Keep the other two as later standby adapters.
- [ ] **Approve the commercial rules:** confirm the automated hourly rate, human-review rate, billing increment, deposit credit treatment, first-month charge, cap behavior, retry billing, refunds, and recurring-billing start date.
- [ ] **Have customer terms reviewed:** ask qualified counsel to reconcile the contract, checkout, emails, and application language.
- [ ] **Approve required intake fields:** decide which answers and assets are mandatory before a brief can be approved.
- [ ] **Choose data retention:** specify retention periods for customer uploads, source archives, job logs, chat transcripts, security reports, and audit records.
- [ ] **Choose deployment authority:** identify which staff members can approve builds, increase caps, retry/cancel jobs, clear logs, merge code, and deploy/rollback production.
- [ ] **Provide a test customer/project:** create one synthetic project with non-sensitive assets for the complete staging workflow.
- [ ] **Approve an infrastructure budget:** set provider budgets, quotas, alert thresholds, maximum concurrent jobs, timeout limits, and maximum retries.
- [ ] **Authorize a read-only cloud inventory:** review AWS, GCP, and Azure IAM, compute, registries, networking, secrets, logging, quotas, and billing before allowing mutation or deployment.
- [ ] **Decide the release gate:** approve a limited manual pilot before enabling unattended customer builds.

## 8. Immediate Engineering Sprint

The first implementation sprint should contain only these tasks:

1. Rotate/remove secrets and repair TLS verification.
2. Replace permissive admin authorization and RLS policies.
3. Protect all usage, clock, dispatch, recovery, and force-review APIs.
4. Repair signing so it updates only the bound project and moves to `awaiting_payment`.
5. Repair checkout so it requires the bound signed contract and never returns mock success.
6. Repair Stripe webhook idempotency, failure responses, and transactional outbox creation.
7. Add regression tests for invalid tokens, cross-project signing, duplicate webhooks, customer access, and public billing mutation.

Do not connect production cloud credentials or enable automated dispatch until this sprint is complete and independently reviewed.
