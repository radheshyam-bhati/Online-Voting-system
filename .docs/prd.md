# Product Requirements Document
## College Club Website (with integrated Election Module)

**Version:** 1.0 — Draft for review
**Format:** Markdown — intended for handoff to developers or AI build tools

> **Scope note:** This PRD extends an earlier, narrower PRD for a standalone "College Online Election System." That system is now repositioned as one module (Section 4.6) inside a broader club website. The election module's functional requirements are carried over unchanged; everything else in this document — audience, page inventory, other features, journeys — is new.

---

## 1. Project Overview and Goals

### 1.1 What this is
A website for a college club that serves as the club's public and member-facing home online: information about the club, events, announcements, member/leadership listings, and — during election periods — a secure online voting system for club elections.

### 1.2 Problem this solves
Today the club has no single home online. Announcements, event info, and membership details are scattered (WhatsApp groups, physical notices, ad hoc Google Forms), and elections specifically are run through Google Forms, which cannot enforce one-vote-per-student integrity or verify voter identity (see Section 4.6 for the full problem statement on this part).

### 1.3 Goals
- Give the club one authoritative, always-current public presence.
- Make it easy for prospective members to discover the club and understand how to join.
- Give current members a reliable place to find events and announcements without relying on group chats.
- Replace the Forms-based election process with a system that enforces vote integrity at the database level, not just the UI.
- Ship something a small student team can realistically build and maintain — this is a club site, not an enterprise platform.

### 1.4 Non-goals for v1
- Not a general-purpose multi-club platform (single club, not a directory of clubs).
- Not a payments/dues-collection system.
- Not a full LMS or file-sharing platform for internal club documents.

---

## 2. Target Audience Definition

| Audience | Who they are | What they need from the site |
|---|---|---|
| **Prospective members** | Students who haven't joined yet, browsing to decide | Clear "what is this club," upcoming events, how to join |
| **Current members** | Already part of the club | Event schedule, announcements, their own membership status |
| **Eligible voters** | Students eligible to vote in club elections (may overlap heavily with members, but eligibility is admin-defined, not membership-defined) | A way to log in, see what's open to vote on, and vote once per club |
| **Club leadership / organizers** | Officers who need to communicate and run events | Ability to post events/announcements |
| **Administrator(s)** | Person(s) running the site and elections | Manage members, content, campuses (if applicable), elections, candidates, results |
| **Casual/public visitor** | Faculty, other students, outside visitors | Basic "about the club" info — lowest-priority audience, no login needed |

**Primary audience for v1 design decisions:** current members and eligible voters — the two groups with a recurring reason to return to the site. Prospective members and public visitors matter for the public pages but don't drive feature priority.

---

## 3. Complete List of Required Pages

| Page | Access | Purpose |
|---|---|---|
| **Home** | Public | Club intro, highlights, latest announcement, upcoming event teaser |
| **About** | Public | Club mission, history, what the club does |
| **Events** (list + detail) | Public (RSVP may require login) | Upcoming and past events; each event has its own detail page |
| **Announcements** | Public or members-only (configurable) | Chronological feed of club updates |
| **Members / Team** | Public or members-only (configurable) | Leadership and member listing |
| **Join / Membership** | Public | How to become a member; membership request form |
| **Elections — Dashboard** | Authenticated (eligible voters) | Shows current election, per-club voting status |
| **Elections — Vote** | Authenticated (eligible voters) | Candidate selection and vote submission for a specific club |
| **Elections — Results** | Public or members-only, admin-controlled | Published results and participation stats |
| **Login** | Public | Single entry point for both members/voters and admin |
| **Admin Dashboard** | Admin only | Central hub linking to all admin management screens |
| **Admin — Members** | Admin only | Add/edit/deactivate members and voters |
| **Admin — Content** | Admin only | Create/edit events and announcements |
| **Admin — Elections** | Admin only | Everything from the original election PRD: campuses, clubs, candidates, election lifecycle, results |
| **404 / Error** | Public | Fallback page |

---

## 4. Core Features (with Priority Levels)

Priority scale: **Must-have** (v1 cannot ship without this) · **Should-have** (materially weakens v1 if missing, but launch is possible without it) · **Nice-to-have** (defer without regret).

---

### 4.1 Public Club Information (Home / About)

**Description:** Static-ish public pages presenting the club's identity — name, mission, what it does, and a home page that surfaces the latest announcement and next upcoming event as teasers, so a first-time visitor immediately sees the club is active.

**User interaction flow:**
1. Visitor lands on Home (no login required).
2. Sees club intro, a card for the latest announcement, a card for the next event.
3. Clicks through to About for more detail, or to Events/Announcements for the full list.

**Technical requirements:**
- Content editable by admin (not hard-coded), even if the editing UI is simple (a basic CMS-style form is enough — no need for a rich page builder).
- Home page pulls its "latest announcement" and "next event" dynamically from the Announcements and Events data, not manually re-typed.
- No authentication required to view.

**Priority:** Must-have (this is the site's front door)

**Success criteria:**
- A first-time visitor can understand what the club is and see current activity within one screen, no scrolling required for the essentials.
- Home page content updates automatically when a new announcement or event is added — zero manual sync steps.

---

### 4.2 Events (List + Detail)

**Description:** A browsable list of upcoming and past events, each with its own detail page (date, time, location, description). Optionally supports RSVP for logged-in members.

**User interaction flow:**
1. User navigates to Events.
2. Sees upcoming events first (chronological), with past events available lower down or via a filter/tab.
3. Clicks an event to see full detail.
4. If RSVP is enabled and the user is logged in, they can mark interest/attendance; if not logged in, they're prompted to log in first.

**Technical requirements:**
- Events stored with: title, description, date/time, location, optional image, status (upcoming/past — can be derived from date rather than stored separately).
- Admin CRUD interface for events.
- RSVP (if built) needs a simple join table (event_id, member_id) — no need for capacity limits or waitlists in v1.

**Priority:** Must-have (core reason members return to the site) — RSVP specifically is **Should-have**, event listing/detail is **Must-have**.

**Success criteria:**
- Admin can publish a new event and it appears on the public Events page within the same session, no delay or manual republish step.
- A member can find "what's the next event and when" in two clicks or fewer from Home.

---

### 4.3 Announcements

**Description:** A simple reverse-chronological feed of club updates — text posts, optionally with an image, that admins/officers publish for members (or the public, depending on visibility setting).

**User interaction flow:**
1. Admin creates an announcement (title, body text, optional image, visibility: public or members-only).
2. Announcement appears at the top of the Announcements feed and, if it's the most recent, on the Home page teaser.
3. Visitor/member reads the feed; no interaction (likes/comments) required for v1.

**Technical requirements:**
- Simple content model: title, body, timestamp, optional image, visibility flag.
- No commenting/reaction system in v1 — this is a broadcast feed, not a social feature.

**Priority:** Must-have

**Success criteria:**
- Admin can publish an announcement in under a minute from the admin dashboard.
- Announcements are correctly hidden from non-members when marked members-only (verified by testing as a logged-out user).

---

### 4.4 Members / Team Directory

**Description:** A listing of club leadership (and optionally general members) with name, role/title, and optionally a photo — gives the club a face and shows prospective members who's running things.

**User interaction flow:**
1. Visitor navigates to Members/Team.
2. Sees leadership listed first (e.g., President, Vice President, club heads), general members below if shown.
3. No interaction required — this is a read-only directory in v1.

**Technical requirements:**
- Admin CRUD for member/leadership entries: name, role, optional photo, optional short bio.
- Decide and configure visibility: is the full member list public, or just leadership? (Recommend: leadership public, full roster members-only or admin-only, to avoid exposing student names/data unnecessarily.)

**Priority:** Should-have (valuable for credibility and transparency, but the site functions without it)

**Success criteria:**
- Prospective members can identify who leads the club without needing to ask in person or in a group chat.

---

### 4.5 Join / Membership Request

**Description:** A form allowing a prospective member to express interest in joining the club. This is a request/interest capture, not an automatic membership grant — admin reviews and approves.

**User interaction flow:**
1. Visitor clicks "Join" from Home or nav.
2. Fills a short form: name, enrollment number (if required for eligibility later), email/contact, optional message.
3. Submits; sees a confirmation ("Your request has been received").
4. Admin sees the request in the Admin dashboard and can approve (which can optionally auto-add them to the Members/eligible-voter list) or decline.

**Technical requirements:**
- Simple form + submission table (name, enrollment no., contact, status: pending/approved/declined).
- Admin approval action should optionally create the corresponding Member/Student record, avoiding double data entry — this is the one place where "join requests" and "election eligibility" data can and should share a backend model, since a club member is very likely the same population as an eligible voter.

**Priority:** Should-have

**Success criteria:**
- A prospective member can submit a join request in under a minute.
- Admin can approve a request and have that person appear as a member (and, where relevant, an eligible voter) without re-entering their details.

---

### 4.6 Elections / Voting Module

**Description:** The full election system carried over from the prior PRD, now positioned as one feature area of the club site rather than the entire product. Covers: student/voter management, optional multi-campus configuration, club and candidate management, election lifecycle (Draft → Scheduled → Open → Closed → Results Published), the one-vote-per-club voting flow, and results/participation reporting. Functional detail below is unchanged from the original election-system PRD.

**User interaction flow:**

*Voter:*
1. Logs in (same login as the rest of the site).
2. Goes to Elections Dashboard — sees current election and per-club status (Completed / Vote Now).
3. Opens a club, selects one candidate, submits.
4. Club is marked Completed; cannot be re-voted.

*Admin:*
1. Creates an election (Draft state); sets the Multi-Campus toggle (ON = candidates scoped per campus; OFF = shared college-wide).
2. Adds/imports voters (manual add or CSV bulk import: name, enrollment number, campus).
3. Configures campuses (if not hard-coded), clubs, and candidates (per campus if toggle is ON).
4. Schedules and opens the election; system enforces the voting window server-side.
5. Closes the election; system auto-tallies votes.
6. Reviews results (with campus-wise filtering, not just a pooled total) and publishes when ready.

**Technical requirements:**
- **Hard constraint, non-negotiable:** one vote per (election, student, club[, campus]) enforced via a database-level unique constraint — not application logic alone — so concurrent or duplicate requests cannot produce a second valid vote.
- Server derives voter identity from the authenticated session; never trusts a client-submitted enrollment number.
- Election state (Open/Closed) is checked server-side on every vote submission against the actual server clock, not just reflected in the UI.
- Data model: `Election → (Campus, if multi-campus) → Club → Candidate`, plus a `Vote` table keyed by the unique constraint above.
- Audit log of key admin actions (student list uploaded, candidate added, election opened/closed, results published).
- Standard hardening: parameterized queries, output encoding, authenticated routes, login rate-limiting.
- **Open decision, not yet resolved:** the tension between audit-log detail (useful for dispute resolution) and vote privacy (student→candidate link should not be trivially reconstructable) needs an explicit design decision before this is built — flagged here rather than silently resolved either way.

**Priority:** Must-have — and specifically, the *integrity guarantees* (one vote per club, server-side state checks) are non-negotiable Must-have, while sub-features like campus-wise result filtering are Should-have.

**Success criteria:**
- Zero duplicate votes recorded under any load, retry, or concurrent-request condition — this is a correctness bar, not a target to approach.
- Voting completion rate (% of eligible voters completing all applicable ballots) is measurably higher than the prior Google Forms process.
- Time from election Closed to tallied results available to admin is near-instant, not a manual counting exercise.

---

### 4.7 Authentication & Access Control

**Description:** A single login system shared across the whole site — the same account a member uses to browse members-only content is the account used to vote and (for admins) manage the site.

**User interaction flow:**
1. User clicks Login, enters credentials.
2. System identifies whether they're a student/member, an eligible voter, and/or an admin, and shows the appropriate views/permissions accordingly.

**Technical requirements:**
- Single authenticated session model; role/permission flags (member, voter-eligible, admin) rather than separate login systems for the club site and the election module.
- Server-side permission checks on every protected route and action — never inferred from what the UI shows.

**Priority:** Must-have

**Success criteria:**
- A single set of credentials works across all site areas — no separate login for "the voting part" of the site.
- Unauthenticated or under-permissioned access to protected pages/actions is reliably blocked server-side (verified by direct URL/API testing, not just UI testing).

---

### 4.8 Admin Dashboard

**Description:** A central hub for the admin to reach member management, content management, and election management without hunting through the public site structure.

**User interaction flow:**
1. Admin logs in, is routed to (or can navigate to) the Admin Dashboard.
2. Sees at-a-glance summary (pending join requests, current election status, recent announcements) and links into each management area.

**Technical requirements:**
- Route-level protection: entire `/admin` area requires the admin role, checked server-side.
- No new data model of its own — this is a UI aggregation layer over the other admin features.

**Priority:** Should-have (the individual admin CRUD screens are Must-have; a unifying dashboard view is a usability layer on top of them)

**Success criteria:**
- Admin can reach any management function (members, content, elections) in two clicks or fewer from login.

---

## 5. User Journey Mapping

### 5.1 Prospective member discovering the club
Home → About / Events (browses to understand the club) → Join page → submits request → receives confirmation → (later) admin approves → becomes a Member.

### 5.2 Current member checking what's happening
Login → Home (sees latest announcement/event teaser) → Events (checks upcoming schedule) → optionally RSVPs.

### 5.3 Eligible voter during an election window
Login → redirected or navigates to Elections Dashboard → sees per-club status → opens first incomplete club → selects candidate → submits → returns to dashboard → repeats for remaining clubs → sees all clubs marked Completed.

### 5.4 Officer/admin publishing an update
Admin login → Admin Dashboard → Content management → creates announcement or event → publishes → confirms it appears on the public-facing pages.

### 5.5 Admin running an election cycle
Admin login → Admin Dashboard → Elections → create election (set Multi-Campus toggle) → add/import voters → configure campuses/clubs/candidates → schedule and open → (voting window occurs) → close election → review results (campus-wise) → publish.

---

## 6. Success Metrics

| Metric | Target / Rationale |
|---|---|
| Duplicate votes recorded | Zero — correctness bar, not an optimization target |
| Voter/member turnout | Measurable increase in election participation vs. the prior Google Forms baseline |
| Join requests processed | Admin can approve/decline a join request in under a minute, with no duplicate manual data entry |
| Content freshness | Time from admin publishing an announcement/event to it appearing live: near-instant, no manual republish step |
| Site availability during election window | Zero downtime during any election's Open state — highest-stakes window in the product |
| Time to election results | Near-instant tallying once election is Closed |
| Page load / usability | A first-time visitor can identify what the club is and find the next event without needing to ask anyone — verified via informal user testing before launch |
| Admin setup time | Time to fully configure and open an election (voters, campuses, clubs, candidates) is materially lower than the manual Forms-based process it replaces |

---

## 7. Deferred / Out of Scope for v1

Carried forward from the original election PRD, still applicable:
- Role-based admin permission tiers (Super Admin / Campus Admin split)
- Multi-factor authentication
- Full ballot-anonymity architecture (separate shuffled vote-store) — pending an explicit college decision, not a default
- Multi-year cross-election analytics
- Self-service account recovery

New to this version:
- Comments/reactions on announcements
- Event RSVP capacity limits or waitlists
- Rich page-builder/CMS for public pages (a simple admin-editable form is sufficient)
- Public full-member directory (default to leadership-only visibility; revisit if the club wants full rosters public)

---

## 8. Open Questions Requiring a Decision Before Build

1. **Audit log vs. vote privacy** (carried from prior PRD, unresolved): an audit log detailed enough to investigate disputes may allow reconstruction of student→candidate links unless deliberately designed otherwise.
2. **Authentication source:** existing college SSO, or a new credential system built for this site?
3. **Membership vs. voter eligibility:** should approving a join request automatically make someone an eligible voter, or are these two separate admin-controlled lists that happen to usually overlap?
4. **Visibility defaults:** should Announcements and the Members directory default to public or members-only? This PRD assumes members-only-by-default with an admin override, but that's a product/privacy call for the club to confirm.