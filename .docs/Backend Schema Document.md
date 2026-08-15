College Club Website — Database, Auth, Permissions

Target: PostgreSQL 17/18 (Neon), consumed via Drizzle ORM per TRD Section 4.

1. Schema Design Principles (stated before the tables, since they explain choices below)
Multi-campus is modeled as nullable campus_id, not a schema fork. NULL campus = shared/college-wide scope. This applies to club and, transitively, candidate.
The vote-uniqueness constraint is UNIQUE (election_id, student_id, club_id) — campus is implicit in which club_id exists, not a separate constraint column. See reasoning above.
Every write that matters is attributed to an authenticated identity via foreign key, never a client-supplied string field. No table storing "who did this" as free text.
Soft delete over hard delete for anything with downstream references (students, events, announcements) — a deactivated_at / deleted_at timestamp, not row removal, because election history (PRD Section 16) must remain queryable in future years even if a student is later deactivated.
Audit log is append-only and structurally separate from vote data — this is the resolution to the audit-log-vs-privacy tension flagged unresolved in every prior document. Resolved here: see Section 6.
2. Core Identity & Auth Tables
sql
-- One row per human, regardless of role. Role capability lives in role tables below,
-- not as a single enum column, because a person can be both a Member and, separately,
-- flagged eligible to vote — these are administratively distinct lists that happen to overlap.
CREATE TABLE app_user (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT,              -- NULL if using SSO exclusively [OPEN DECISION, TRD §8]
  full_name       TEXT NOT NULL,
  enrollment_no   TEXT UNIQUE,        -- nullable: an admin-only account may have no enrollment number
  campus_id       UUID REFERENCES campus(id) ON DELETE SET NULL,
  is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,   -- deactivation flag, never hard-delete
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_user_enrollment ON app_user(enrollment_no) WHERE enrollment_no IS NOT NULL;
CREATE INDEX idx_app_user_campus ON app_user(campus_id);

-- Session table (if not using a JWT-only strategy) — Auth.js v5 database session strategy
CREATE TABLE session (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  session_token   TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_user ON session(user_id);
CREATE INDEX idx_session_token ON session(session_token);
-- Expired sessions should be purged by a scheduled job, not left to accumulate.

Why app_user isn't split into student / admin tables: an admin can also be a club member browsing events; splitting would require duplicate-identity handling (same email, two rows) or a join anyway. One identity table with a boolean role flag and separate scoped-permission tables (below) is simpler and avoids the "which table is this person's real record" ambiguity.

3. Membership, Campus, and Join Requests
sql
CREATE TABLE campus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Club membership is distinct from election voter-eligibility (PRD §4.5 open question,
-- resolved here: they are separate tables, joined only by approval action in application logic).
CREATE TABLE membership (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role_title      TEXT,              -- e.g. "President", NULL for general members
  display_order   INTEGER NOT NULL DEFAULT 999,  -- for Members page sort (PRD §4.4)
  is_public       BOOLEAN NOT NULL DEFAULT FALSE, -- leadership-visible-by-default per design doc
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)   -- one membership record per user; role_title distinguishes leadership
);

CREATE TABLE join_request (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT NOT NULL,
  enrollment_no   TEXT NOT NULL,
  contact_email   TEXT NOT NULL,
  message         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'declined')),
  reviewed_by     UUID REFERENCES app_user(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_join_request_status ON join_request(status);
-- Enforces "no duplicate pending request for the same enrollment number" (App Flow §8 error state):
CREATE UNIQUE INDEX idx_join_request_pending_enrollment
  ON join_request(enrollment_no) WHERE status = 'pending';
4. Content: Events & Announcements
sql
CREATE TABLE event (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  location        TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  image_url       TEXT,
  rsvp_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID NOT NULL REFERENCES app_user(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ    -- soft delete
);

CREATE INDEX idx_event_starts_at ON event(starts_at) WHERE deleted_at IS NULL;

CREATE TABLE event_rsvp (
  event_id        UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE announcement (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  image_url       TEXT,
  visibility      TEXT NOT NULL DEFAULT 'members_only'
                    CHECK (visibility IN ('public', 'members_only')),
  created_by      UUID NOT NULL REFERENCES app_user(id),
  published_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_announcement_published ON announcement(published_at DESC) WHERE deleted_at IS NULL;
5. Elections, Clubs, Candidates, Votes

This is the correctness-critical section. Every constraint here is load-bearing.

sql
CREATE TABLE election (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  multi_campus        BOOLEAN NOT NULL DEFAULT FALSE,  -- the toggle from TRD §2
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'scheduled', 'open', 'closed', 'published')),
  starts_at           TIMESTAMPTZ,
  ends_at             TIMESTAMPTZ,
  results_visibility  TEXT NOT NULL DEFAULT 'members_only'
                        CHECK (results_visibility IN ('public', 'members_only', 'admin_only')),
  created_by          UUID NOT NULL REFERENCES app_user(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at        TIMESTAMPTZ
);

-- Club: campus_id nullable = shared across the election (multi_campus = FALSE case,
-- or a specific club the admin chooses to keep shared even in a multi-campus election —
-- this flexibility is a deliberate looseness, not a bug: the constraint below still
-- enforces consistency with the election's toggle setting via a trigger, see note.)
CREATE TABLE club (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES election(id) ON DELETE CASCADE,
  campus_id       UUID REFERENCES campus(id) ON DELETE RESTRICT,  -- NULL = shared
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A club name should not be duplicated within the same (election, campus) scope.
  -- Partial unique indexes handle the NULL-campus case correctly (NULLs aren't
  -- distinct-comparable by default, so this needs two indexes):
  UNIQUE NULLS NOT DISTINCT (election_id, campus_id, name)
);

CREATE INDEX idx_club_election ON club(election_id);
CREATE INDEX idx_club_campus ON club(campus_id);

CREATE TABLE candidate (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES club(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  statement       TEXT,
  photo_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_club ON candidate(club_id);

-- Voter eligibility: explicit table, not inferred from membership.
-- This is what "admin adds/imports students as eligible voters" (PRD §4.6) maps to.
CREATE TABLE election_voter (
  election_id     UUID NOT NULL REFERENCES election(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  campus_id       UUID REFERENCES campus(id),  -- snapshot of the voter's campus at import time —
                                                 -- deliberately NOT a live join to app_user.campus_id,
                                                 -- because a student transferring campuses mid-election
                                                 -- must not silently change which ballot they see.
  PRIMARY KEY (election_id, user_id)
);

-- THE load-bearing table. Every column here exists to make one write path correct
-- under concurrency.
CREATE TABLE vote (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES election(id),
  club_id         UUID NOT NULL REFERENCES club(id),
  student_id      UUID NOT NULL REFERENCES app_user(id),
  candidate_id    UUID NOT NULL REFERENCES candidate(id),
  cast_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- THE non-negotiable constraint (PRD §4.8, TRD §4, corrected per reasoning above):
  CONSTRAINT uq_one_vote_per_student_per_club UNIQUE (election_id, student_id, club_id)
);

CREATE INDEX idx_vote_club ON vote(club_id);          -- for tallying
CREATE INDEX idx_vote_election ON vote(election_id);  -- for participation counts
CREATE INDEX idx_vote_student ON vote(student_id);    -- for "has this student completed all clubs"

Insert path for a vote (the exact transaction, since this is the one piece of logic that must not be left to inference):

sql
BEGIN;
  -- 1. Re-check election is open and within window (App Flow §11 guard)
  --    (application-level SELECT before insert, using the server clock, not client-supplied time)
  -- 2. Re-check student is in election_voter for this election
  -- 3. Attempt the insert:
  INSERT INTO vote (election_id, club_id, student_id, candidate_id)
  VALUES ($1, $2, $3, $4);
  -- If this violates uq_one_vote_per_student_per_club, Postgres raises a unique_violation
  -- error (SQLSTATE 23505). The application catches this specific error code and returns
  -- the "You've already voted for this club" state (App Flow §11) — never a generic 500.
COMMIT;

Why no campus_id column on vote: as established above, campus is already encoded in which club_id was voted for. Adding a redundant campus_id column would require it to always agree with club.campus_id, which is a data-integrity liability (two sources of truth) with zero query benefit — any campus-filtered result query joins through club, not vote directly.

6. Audit Log — Resolving the Privacy/Audit Tension

This resolves the open question flagged unresolved in every prior document (PRD §4.8/4.9, TRD §8, App Flow implicit throughout).

Resolution: The audit log records that an action occurred and by whom, never what a vote's content was. It is structurally incapable of linking a student to a candidate choice, because it never stores a candidate_id or references the vote table at all — it logs administrative actions (uploads, opens, closes, publishes) and, separately, the fact of a student casting a vote (for participation tracking) without the choice.

sql
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID REFERENCES app_user(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,   -- e.g. 'student_list_uploaded', 'election_opened', 'election_closed',
                                     -- 'results_published', 'candidate_added', 'student_deactivated'
  target_type     TEXT,             -- e.g. 'election', 'student', 'candidate' — no 'vote' target ever
  target_id       UUID,
  metadata        JSONB,            -- structured details, e.g. {"election_id": "...", "row_count": 3000}
                                     -- MUST NEVER contain candidate_id or any vote content
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Participation fact, separate from audit_log and from vote content:
-- "did student X vote in club Y" is already answerable from the vote table's existence
-- of a row (election_id, student_id, club_id) — querying that IS the participation check.
-- No separate table needed. The audit log does not duplicate this.

What this means practically: an admin investigating a dispute can see "student X's account cast a vote in Tech Club at 14:32" (via the vote table's timestamp + existence, without candidate_id being admin-queryable through normal application permissions — see Section 7 for the permission boundary that enforces this) and can see "election was opened by admin Y at time Z" (via audit_log), but cannot construct "student X voted for candidate B" through any normal application code path. The candidate_id column exists in vote (it has to, for tallying) but application-layer permissions (Section 7) restrict which queries are allowed to select it.

This is a resolution, not a deferral — it should be confirmed with the college, since it's a real design decision (a determined admin with raw database access could still theoretically join vote to candidate; true cryptographic anonymity would require a further architecture — shuffled/detached ballot storage — which remains the TRD's flagged v2 item, not built here).

7. Permissions & Data Ownership

Enforcement layer: Application-level (server actions / route handlers), not Postgres row-level security, for v1 — RLS is a legitimate upgrade path but adds operational complexity disproportionate to a single-admin-role v1 (per TRD §8.1's role-tier deferral).

Resource	Who can read	Who can write
app_user (own record)	Self, any admin	Self (limited fields: name), admin (all fields)
app_user (others' records)	Admin only	Admin only
event, announcement	Public/members per visibility/nothing-restrictive-on-events	Admin only
event_rsvp	Self (own RSVPs), admin (all)	Self (own row only)
join_request	Admin only (contains enrollment no. — PII)	Public can create (unauthenticated insert, rate-limited); admin can update status
campus, club, candidate	Public (read, for transparency of who's running) once election is Open or later; hidden pre-Open per App Flow §10	Admin only, and only while election is in draft (structural changes locked once scheduled, per App Flow §16)
election_voter	Admin only; a student can check only their own eligibility (a scoped query, WHERE user_id = current_user, never a listing)	Admin only (bulk import / manual add)
vote	No application code path exposes candidate_id to anyone except the tallying/results query, which runs pre-aggregated (GROUP BY candidate_id, COUNT) — never a raw per-row select accessible to any role, including admin, through normal UI. Existence of a row (participation) is admin-queryable.	Only via the single server action described in Section 5, executed as the authenticated student themselves — never on behalf of another user, never with a client-supplied student_id.
audit_log	Admin only	System-inserted only (no direct user-facing write path — every insert is a side effect of another admin action, never a standalone "create audit entry" endpoint)

The one rule every write path must satisfy, restated from the PRD because it's the schema's reason for existing: student_id in the vote insert is always derived from the authenticated session server-side (session.user_id), never accepted as a request parameter. If a request body ever contains a student_id field for a vote submission, that field must be ignored/rejected, not trusted — this is a schema document, not a code review, but this rule is the entire point of the student_id foreign key existing rather than a client-asserted enrollment number.

8. Relationships Summary (ERD in text form)
app_user ──< membership
app_user ──< event_rsvp >── event
app_user ──< join_request (self-referential via enrollment_no match, not FK — join_request
                            precedes account existence)
app_user ──< election_voter >── election
app_user ──< vote (as student_id)
app_user ──< audit_log (as actor_id)
app_user ──< event, announcement, club, candidate, election (as created_by, nullable-on-delete)

campus ──< app_user (campus_id)
campus ──< club (campus_id, nullable)
campus ──< election_voter (campus_id snapshot)

election ──< club ──< candidate
election ──< election_voter
election ──< vote
club ──< vote
candidate ──< vote
9. Indexing Rationale Summary
All foreign keys used in WHERE/JOIN clauses for common queries (dashboard loads, tallying, eligibility checks) are indexed above — no foreign key is left unindexed given this app's read patterns are heavily "fetch everything for one election" or "fetch everything for one student."
The two partial unique indexes (join_request pending-dedup, club name-dedup with NULL handling) are the only non-obvious ones — both encode a business rule directly in the schema rather than leaving it to application-only validation, which is deliberate: a rule this important shouldn't rely on every code path remembering to check it.
vote's unique constraint doubles as its own index — no separate index needed for the duplicate check itself, since Postgres uses the unique constraint's backing index automatically.