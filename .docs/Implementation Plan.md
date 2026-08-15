College Club Website — Phased Build Roadmap

Sequencing principle: Phases are ordered by what blocks what, not just by conventional project-template order. The vote-integrity transaction (the one piece of this system with a hard correctness bar) is deliberately built and concurrency-tested inside the Database phase, before any voting UI exists — building screens against an unverified data layer risks having to rework both once a race condition surfaces late.

Effort key: S = small (days), M = medium (roughly a week for a small team), L = large (multi-week or requires the most care). These are relative, not calendar commitments — actual duration depends on team size, which wasn't specified.

Phase 0 — Setup

Goal: A deployable "hello world" on the real stack, with CI and environments wired, before any real feature code.

Task	Effort
Initialize Next.js 16 project (App Router, TypeScript strict mode)	S
Configure Tailwind v4 + shadcn/ui, install base design tokens (colors, fonts from design doc)	S
Set up GitHub repo, branch protection, GitHub Actions CI skeleton (lint + typecheck on PR)	S
Provision Neon project + branches (main, dev)	S
Connect Vercel project, verify preview deploys work against a Neon dev branch	S
Install Drizzle, verify a trivial schema round-trips (migration → query)	S

Deliverables:

Empty but deployed Next.js app on Vercel, connected to a real Neon database.
CI running lint/typecheck on every PR.
A README documenting local dev setup (env vars, npm run dev, migration commands).

Exit criteria: A new team member can clone the repo, follow the README, and have it running locally and see a preview deploy from their first PR.

Phase 1 — Database

Goal: The full schema from the Backend Schema Document is live, migrated, and the one correctness-critical transaction is built and stress-tested — before UI work begins.

Task	Effort
Write Drizzle schema definitions for all tables (Section 2–6 of schema doc)	M
Generate and run initial migration against Neon dev branch	S
Seed script: sample campuses, clubs, candidates, test students, for local dev	S
Build the vote-insert server action exactly as specified (transaction, unique-violation catch, election-state re-check)	M
Write a concurrency test: fire N simultaneous vote-insert attempts for the same (student, club) and assert exactly one succeeds	M
Implement soft-delete conventions and partial unique indexes (join_request dedup, club name dedup)	S

Deliverables:

Full schema live on Neon dev, matching the Backend Schema Document exactly.
A passing automated test proving duplicate-vote prevention holds under concurrency — this is the single most important deliverable in the entire plan, and it should be demonstrable independent of any UI (a test script hitting the server action directly).
Seed data for local development.

Exit criteria: The concurrency test passes reliably (run it multiple times, not once) and is part of CI going forward — a regression here should fail the build, not get caught in manual QA.

Phase 2 — Authentication

Goal: Session-based auth working end-to-end, with the identity-derivation rule (never trust client-supplied student_id) enforced structurally.

Task	Effort
Resolve the open decision: SSO vs. custom credentials (TRD §8 — this blocks starting the work, not just a detail)	— (decision, not build)
Implement Auth.js v5 with chosen provider/strategy	M
Session table wiring (per schema doc Section 2)	S
Login page (per App Flow §9), including error states (wrong credentials, deactivated account, rate limiting)	M
Auth guard middleware for /admin/* and /elections/* routes (per App Flow Global Rules)	M
Role-check helper (is_admin) used consistently across all protected server actions	S

Deliverables:

Working login/logout flow.
Every protected route verifiably rejects unauthenticated and under-permissioned access — test this directly (attempt direct API/URL access without a session, confirm rejection), not just via UI click-through.
Session data available server-side in every subsequent server action, satisfying "identity is always derived server-side."

Exit criteria: A scripted/manual test confirms: unauthenticated request to a protected route → redirected/rejected; authenticated non-admin request to an admin route → 403; authenticated request with a spoofed student_id in a request body → ignored, real session identity used instead.

Phase 3 — Core UI

Goal: Design system components built once, reused everywhere — buttons, cards, forms, nav, admin shell — matching the Design Document exactly.

Task	Effort
Global layout shell: nav bar, footer, admin sidebar (per App Flow §17)	M
Typography and color tokens wired into Tailwind config (serif headings, ink/brass palette)	S
Base component library via shadcn/ui, customized to design doc spec: buttons (including the distinct vote-button variant), cards, form inputs, focus states	M
Toast/error/loading state patterns (per App Flow Global Rules) built as reusable primitives	S
Responsive breakpoints verified against design doc's grid spec	S

Deliverables:

A component storybook or equivalent reference page showing every base component in its states (default, hover, disabled, error).
Nav and admin shell rendering correctly, empty of real feature content but structurally complete.

Exit criteria: Building any subsequent screen is primarily composition of existing components, not new component invention.

Phase 4 — Main Features

Goal: Every screen from the App Flow Document, built against the already-verified database and auth layers.

Sub-phased by dependency order, not by document order:

4a. Public content (no auth dependency, lowest risk):

Home, About, Events (list/detail), Announcements (list/detail), Members — per App Flow §1–7.
Admin content management (Events/Announcements CRUD) — App Flow §15.

4b. Membership flow:

Join form — App Flow §8.
Admin members management, including bulk CSV import with the preview/validation UX specified — App Flow §14.

4c. Elections (the highest-stakes screens, built last within this phase precisely because the hard part — the transaction — is already done and tested in Phase 1):

Admin elections management: full lifecycle (Draft → Published), multi-campus toggle, campus/club/candidate CRUD — App Flow §16.
Student elections dashboard — App Flow §10.
Vote screen, including the two-step select-then-confirm flow and all specified error states (election closed mid-vote, duplicate detected, network failure) — App Flow §11. This screen is UI wiring at this point, not new correctness logic — the transaction underneath was proven in Phase 1.
Results screen — App Flow §12.
Sub-phase	Effort
4a	M
4b	M
4c	L

Deliverables:

Every screen in the App Flow Document implemented, matching its specified success/error/empty states exactly — not just the happy path.
Admin can run a complete election lifecycle end-to-end in a staging environment: create, configure, open, students vote, close, publish.

Exit criteria: A full dry-run election (5–10 test student accounts, 2 clubs) completed manually in staging, including at least one deliberate duplicate-vote attempt (confirming it's rejected) and one deliberate vote-after-close attempt (confirming it's rejected).

Phase 5 — Integrations

Goal: The supporting services that aren't core app logic but are required for real usage.

Task	Effort
File storage for images (event/announcement images, candidate photos) — Vercel Blob or equivalent	S
CSV parsing library integration (papaparse) for bulk student import	S
Confirmation sound asset integration for vote-success moment (design doc §5)	S
Email delivery (if join-request notifications or admin alerts are wanted) — not specified as required in the PRD; flag as optional, only build if confirmed in scope	M (if included)

Deliverables:

Image upload working end-to-end from admin content forms through to public display.
Bulk CSV import functioning against real-format files, not just the seed script's synthetic data.

Exit criteria: No feature from Phase 4 is blocked on a stubbed/mocked integration by the time this phase closes.

Phase 6 — Testing

Goal: Systematic verification beyond the ad hoc checks embedded in earlier phases — this phase formalizes and extends them, it doesn't start testing from zero.

Task	Effort
Unit tests (Vitest) for validation logic, permission checks, data transformations	M
E2E tests (Playwright) for critical user journeys: join → approve → login → vote → results; admin election lifecycle	L
Repeat and harden the Phase 1 concurrency test at higher load (more simultaneous requests, closer to realistic election-opening burst conditions)	M
Accessibility pass (keyboard navigation, screen reader labels, contrast ratios against the design doc's palette)	M
Security pass: confirm every admin route rejects non-admin access via direct API call; confirm no vote-content leak through any query path (Schema doc §7's permission table, verified against actual code)	M

Deliverables:

CI running unit + E2E tests on every PR.
A written security/permissions checklist, each item verified against actual running code, not just design intent.
Documented load-test results for the vote-submission path under simulated election-opening conditions.

Exit criteria: No known-open correctness or security gap remains undocumented; anything deferred is explicitly logged as a known limitation, not silently skipped.

Phase 7 — Deployment

Goal: Production environment live, separate from staging, with the operational safeguards an election specifically needs.

Task	Effort
Provision production Neon branch, separate from dev/staging	S
Production environment variables, secrets management on Vercel	S
Domain setup, SSL (handled by Vercel automatically)	S
Decide and configure Neon warm-compute strategy for announced voting windows (per TRD §4/§6 cold-start trade-off)	S
Backup/rollback plan documented: what happens if an election needs to be paused or a bug is found mid-voting-window	M

Deliverables:

Production app live at the real domain, pointed at production database.
A written runbook: how to open/close an election, how to respond to an in-flight incident during a voting window, who has access to production admin.

Exit criteria: A dry run of the full deployment process (deploy → smoke test → rollback) completed at least once before the first real election is scheduled on it.

Phase 8 — Final Polish

Goal: The details that don't block launch but meaningfully affect the "premium, not generic" goal from the design doc.

Task	Effort
Motion/animation pass on the vote-confirmation moment (checkmark animation timing, sound playback) matched precisely to design doc spec	S
Copy pass: every error/empty/success message reviewed against the exact wording specified in the App Flow Document	S
Cross-browser/cross-device visual QA against the design doc's mobile responsiveness spec	M
Performance pass: Lighthouse/Core Web Vitals check on public pages (these are the SEO/discovery-facing pages where load speed matters most)	S

Deliverables:

Final visual QA sign-off against the Design Document.
Performance baseline recorded for future regression comparison.

Exit criteria: The product, side by side with the Design Document's stated mood ("premium, not generic"), reads as consistent with it — this is inherently a judgment call, ideally made by someone other than the builder, to avoid the blind spot of having stared at it for weeks.

Summary Dependency Chain
Setup → Database (incl. vote transaction + concurrency test) → Auth → Core UI
                                                                          ↓
                                              Main Features (4a → 4b → 4c, elections last)
                                                                          ↓
                                        Integrations → Testing → Deployment → Polish