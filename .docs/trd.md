# Technical Requirements Document (TRD)
## College Club Website — Tech Stack

**Version:** 1.0 · Reflects 2026–2027 best practices, versions verified via web search on 2026-08-15
**Companion to:** Club Website PRD v1.0

> **How this stack was chosen:** The PRD's hardest constraint (Section 4.6) is a database-level unique constraint that must reject duplicate votes under concurrent requests, plus server-side identity/state checks on every write. Every choice below was filtered through that requirement first, then optimized for a small team, low-to-moderate traffic with election-day bursts, and cost sensitivity — in that order.

---

## 1. Frontend Framework: Next.js 16 (App Router)

**Recommendation:** Next.js 16.3.x, React 19, Node.js 20+ (Node 22 LTS preferred where hosting allows)

**Why:**
- **One deployable unit for a small team.** Next.js's App Router gives you React Server Components, server actions, and API routes in a single codebase — you're not standing up and coordinating a separate frontend and backend for a project this size.
- **Server actions map directly onto the vote-submission requirement.** A vote submission needs to run entirely server-side (identity from session, state check against server clock, DB write) — server actions are built for exactly this, keeping the sensitive logic off the client by construction rather than by discipline.
- **Currently supported and actively maintained.** Next.js 16 is Active LTS with security support projected through October 2027; Next.js 15 is in Maintenance LTS until October 2026 only — starting on 16 avoids an early forced migration.
- **SEO and public-page performance.** The public pages (Home, About, Events, Announcements) benefit from server rendering / static generation for fast first loads and discoverability — not critical for the election module, but genuinely useful for the club-discovery side of the site.

**Alternative considered:** TanStack Start (Vite + Nitro) — a legitimate 2026 alternative with a leaner, more SQL-adjacent philosophy that pairs naturally with Drizzle. Rejected for this project specifically because Next.js's larger ecosystem and documentation base lowers risk for a small/rotating student dev team; TanStack Start is the right call if your team is more comfortable outside the Next.js conventions.

---

## 2. Styling Solution: Tailwind CSS v4 + shadcn/ui

**Recommendation:** Tailwind CSS v4 (CSS-first config via `@theme`), shadcn/ui components on Radix primitives

**Why:**
- **Compile-time only, zero runtime cost.** Tailwind generates static CSS and shadcn/ui components are copied into your repo rather than imported as a dependency — no runtime styling overhead, which matters on a cost-sensitive, low-traffic project where every bit of unnecessary JS hurts both load time and (marginally) hosting cost.
- **You own the components.** shadcn/ui isn't a library you upgrade on someone else's schedule — the code lives in your repo. For a club site likely to be handed off between student maintainers year over year, "you can read and edit every component" is worth more than a smaller node_modules.
- **This is the de facto 2026 default for this category of app** — Tailwind v4 + shadcn/ui is the standard pairing across most current Next.js boilerplates, meaning tutorials, Stack Overflow answers, and AI coding tool training data are all oriented around it, which reduces onboarding friction for a team that will change over time.
- **Accessibility comes built in** via Radix primitives underneath shadcn/ui — meaningful for a form-heavy app (join requests, voting) without a dedicated a11y specialist on a student team.

**Alternative considered:** DaisyUI — a reasonable choice if the team wants pre-styled themes with zero component-copying and less initial setup. Rejected here because shadcn/ui's "own the code" model suits a project that will be maintained by a changing cast of student developers better than a themed component library dependency.

---

## 3. Backend Technology: Next.js Server Actions + Route Handlers (no separate backend service)

**Recommendation:** Use Next.js's built-in server actions for mutations (vote submission, admin writes) and Route Handlers for anything needing a stable REST/webhook endpoint (e.g., CSV import processing). No standalone Express/Nest/Fastify service.

**Why:**
- **A separate backend is unjustified complexity at this scale.** ~3,000 students, bursty but bounded traffic, one small team — running a second service means a second deployment, a second set of environment variables, and a second thing that can go down during an election window. Next.js's integrated backend capabilities cover everything the PRD requires.
- **The vote-integrity requirement doesn't need a separate service to be enforced correctly** — it needs to be enforced at the database layer (Section 4) regardless of what calls it. A separate backend wouldn't strengthen that guarantee; the database constraint does the actual work.

**When this recommendation would flip:** If the club's needs grow to include real-time features (live vote-count dashboards during counting, live chat) beyond what Next.js's request/response model comfortably handles, a lightweight dedicated service (e.g., a small Node/WebSocket service) becomes justified. Not needed for v1 as scoped.

---

## 4. Database: PostgreSQL (via Neon), accessed through Drizzle ORM

**Recommendation:** PostgreSQL 17/18 hosted on Neon (serverless Postgres), with Drizzle ORM as the query/schema layer.

**Why PostgreSQL specifically:**
- It's the only realistic choice given the PRD's core constraint: a genuine relational database with enforceable `UNIQUE` constraints and transactional guarantees is required to make "one vote per (election, student, club[, campus])" a database-level fact rather than an application-level hope. A NoSQL document store would require reimplementing this guarantee in application code — exactly the failure mode the original problem statement (Google Forms) already demonstrates.

**Why Neon specifically:**
- **Free tier realistically covers this project's scale.** 0.5GB storage and 100 CU-hours/month on the free plan, autoscaling up to 2 CU before scaling to zero, is enough for a real application at a few thousand users with bursty (not constant) traffic.
- **Database branching fits the annual-election model well** (PRD Section 16 in the earlier doc) — you can branch the production database to test a new election year's configuration without touching live data, then merge or discard.
- **Native Postgres, not a proprietary variant** — everything here is portable to any other Postgres host (Supabase, RDS, a self-hosted instance) if the club's needs or budget change later; there's no lock-in to Neon-specific syntax.
- **One real trade-off worth naming explicitly:** scale-to-zero means the first request after an idle period has a cold-start delay of roughly 500ms–2 seconds. This is a genuine UX consideration for the exact moment when many students log in at once as an election opens. Mitigation: keep the compute warm during announced voting windows (Neon supports this), or simply accept the one-time delay — it's not a correctness risk, only a perceived-speed one, and it's isolated to the first request after idle, not sustained.

**Why Drizzle over Prisma specifically:**
- This is the one place I'm deviating from "whatever's most popular" in favor of the correctness requirement. Drizzle keeps you close to raw SQL with a code-first TypeScript API — for the vote-insert path specifically, where you need precise control over the transaction and the exact unique constraint definition, that directness is worth more than Prisma's higher-level abstraction. You want to read and reason about the exact SQL that enforces "one vote per club," not trust an ORM's query planner to have produced it correctly.
- Drizzle is also lighter (near-zero runtime overhead, no separate engine process), which matters modestly for a serverless deploy target like Vercel.
- **Trade-off acknowledged:** Prisma 7 has closed much of this gap (its new TypeScript/WASM engine narrowed the performance difference substantially) and offers a more polished migration UX and Prisma Studio for data browsing — genuinely nice for a less SQL-fluent student team. If your team is more comfortable with an ORM abstraction than raw SQL, Prisma 7 is a defensible alternative and not a "wrong" choice — it's a DX-vs-directness trade, not a correctness one, given Prisma 7's maturity.

---

## 5. Essential Libraries and Packages

| Purpose | Package | Why |
|---|---|---|
| Authentication | **Auth.js (NextAuth) v5** | Native Next.js integration, session-based auth fits the "server derives identity from session, never trusts client input" requirement directly |
| Form handling + validation | **React Hook Form + Zod** | Type-safe validation shared between client-side UX and server-side re-validation (never trust client validation alone for the vote/admin forms) |
| Database schema/migrations | **Drizzle Kit** | Companion migration tool to Drizzle ORM |
| Date/time handling | **date-fns** | Lightweight; needed for election open/close window logic and event scheduling |
| File upload (CSV import, images) | **Uploadthing** or direct Neon-adjacent object storage (Vercel Blob) | CSV bulk import (PRD 4.1) and event/announcement images need somewhere to land; Vercel Blob is the path of least friction if hosting on Vercel |
| CSV parsing | **papaparse** | Standard, well-tested CSV parsing for the bulk student import feature |
| Testing | **Vitest** (unit) + **Playwright** (e2e) | Playwright specifically for testing the vote-submission flow under concurrent conditions — this is the one place automated concurrency testing genuinely matters, given the non-negotiable duplicate-vote constraint |
| Linting/formatting | **ESLint + Prettier** (or **Biome** as a faster combined alternative) | Biome is a legitimate 2026 alternative if build speed on a small team's machines matters more than ESLint's larger plugin ecosystem |

---

## 6. Deployment and Hosting

**Recommendation:** Vercel (frontend + serverless functions) + Neon (database), both on free/low-cost tiers to start.

**Why:**
- **Vercel is the natural pairing for Next.js** — first-party integration, zero-config deploys from GitHub, and a free tier (100GB bandwidth, 100 hours function execution) that comfortably covers a club site's traffic profile.
- **Vercel + Neon is a documented, common combination** with first-party integration between the two — reduces setup friction for a student team.
- **Cost profile fits "club site" reality:** both services are usage-based with generous free tiers; a reasonable estimate is $0/month during normal operation, with the only likely cost being Neon compute if the team chooses to keep the database warm during voting windows (a few dollars, not a budget line item).

**Election-day consideration:** Given the cold-start trade-off noted in Section 4, plan to either (a) accept the one-time delay as acceptable UX, or (b) temporarily configure Neon to stay warm during the announced voting window — a manual toggle, not a permanent always-on cost.

**Alternative considered:** Railway or Render for a more traditional "always-on server" model if the team prefers predictable behavior over serverless cold-starts and is willing to pay a small fixed monthly fee (~$5–10) instead. Reasonable if the cold-start trade-off is judged unacceptable rather than merely inconvenient.

---

## 7. Development Tools and Workflow

| Area | Recommendation | Why |
|---|---|---|
| Version control | **GitHub** | Standard; needed for Vercel's deploy integration regardless |
| CI | **GitHub Actions** | Run tests (especially the Playwright concurrency test for voting) on every PR before merge — non-negotiable given the correctness bar on the vote path |
| Environment management | **Vercel Preview Deployments** + **Neon branching** | Every PR gets its own preview deploy against its own database branch — lets the team test schema changes and election configuration safely, without touching production data |
| Local dev | **Next.js dev server (Turbopack, default in 16.x)** | Turbopack's file-system caching is now stable, giving faster local iteration than the older Webpack dev path |
| Type safety | **TypeScript, strict mode** | Given the correctness requirements throughout the election module, strict typing end-to-end (Drizzle schema → server actions → React components via Zod-inferred types) is not optional polish — it's a meaningful line of defense against the exact class of bug (wrong ID passed, wrong state assumed) that could compromise vote integrity |

---

## 8. Summary Table

| Layer | Choice | Primary reason |
|---|---|---|
| Frontend framework | Next.js 16 (App Router) | Integrated server actions fit the vote-integrity requirement; long support runway |
| Styling | Tailwind v4 + shadcn/ui | Zero runtime cost, component ownership, 2026 ecosystem default |
| Backend | Next.js server actions/route handlers | No separate service justified at this scale |
| Database | PostgreSQL via Neon | Only real option for enforceable transactional uniqueness constraints |
| ORM | Drizzle | Direct SQL control for the correctness-critical vote-insert path |
| Hosting | Vercel + Neon | Native pairing, generous free tiers, cost matches a club-site budget |
| Auth | Auth.js v5 | Session-based identity, fits "never trust client-submitted identity" |

---

## 9. Open Trade-offs to Revisit

1. **Drizzle vs. Prisma** is a defensible either-way choice — Drizzle was picked for directness on the vote path; Prisma 7 is a reasonable alternative if the team values its DX and migration tooling more than raw SQL control.
2. **Neon cold-start behavior** during election-opening bursts should be explicitly tested (Playwright + load simulation) before the first real election, not assumed away.
3. **Vercel serverless vs. an always-on host (Railway/Render)** is worth revisiting if cold starts prove unacceptable in testing rather than just theoretically undesirable.