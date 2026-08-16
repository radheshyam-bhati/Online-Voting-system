College Club Website — Screen-by-Screen Specification

Purpose: Exhaustive behavioral spec for every screen — actions, navigation, success/error/empty states — precise enough to build from without design or product judgment calls at the implementation level.

How to read this document: Each screen lists (1) entry points, (2) every interactive element and its exact behavior, (3) every navigation path out, (4) success state, (5) error states, (6) empty state where applicable. Anything not specified elsewhere in the prior PRD/TRD/design docs is called out explicitly as [ASSUMPTION] so it can be corrected rather than silently built.

0. Global Rules (apply to every screen unless overridden)
Auth guard: Any route under /admin/* or /elections/* (except public results) checks session server-side on every request. Unauthenticated → redirect to /login?redirect={originalPath}. Under-permissioned (student hitting admin route) → 403 page, not a redirect (don't silently bounce to login when the real problem is role, not auth).
Loading state default: Any action that hits the server (button click, form submit, page navigation with data fetch) shows a disabled button with an inline spinner replacing the button label, not a full-page spinner, unless it's an initial page load.
Toast pattern: Success confirmations for non-critical actions (e.g., "Announcement published") use a dismissible toast, bottom-right, auto-dismiss after 4s. Critical confirmations (vote submitted) use a full in-page state change, never just a toast — a toast is dismissible/missable and a vote confirmation must not be.
Network failure default [ASSUMPTION — not specified upstream]: Any server action that fails due to network/timeout (not a validation error) shows: "Something went wrong. Try again." with a Retry button that re-attempts the same action. Never silently fail.
Session expiry mid-action [ASSUMPTION]: If a session expires during any authenticated action, redirect to /login?redirect={currentPath}. On successful re-login, return to the exact screen the user was on. For the voting screen specifically: since votes are atomic single-submissions (not multi-step forms with partial state), there is no partial data to lose — the student simply re-authenticates and their in-progress (unsubmitted) selection is gone, and they select again.
1. Home (Public)

Route: /
Entry points: Direct visit, nav bar "Home" link, logo click from any page.

Elements:

Nav bar (persistent, see Section 12) with Login button (top-right) if logged out, or user avatar/menu if logged in.
Hero section: club name, one-line mission statement, primary CTA button.
CTA button behavior: If logged out → "Join the club" → navigates to /join. If logged in and not yet a member → same. If logged in and already a member → button text changes to "View events" → navigates to /events. [ASSUMPTION: button text/destination is state-dependent — not specified upstream, but showing "Join" to an existing member is a poor pattern worth avoiding by default.]
"Latest announcement" card: pulls most recent published announcement. Click → navigates to /announcements/{id}.
"Next event" card: pulls nearest upcoming event by date. Click → navigates to /events/{id}.

Success state: Standard render with live data populated.

Empty states:

No announcements exist yet: card shows "No announcements yet" with muted styling, no click action, no error — this is a normal early-life state, not a failure.
No upcoming events: card shows "No upcoming events" similarly, with a secondary link "See past events" if any exist, else nothing.

Error state: If the data fetch for announcement/event teasers fails, the cards individually show "Couldn't load" with a small retry icon-button scoped to that card only — the rest of the page (hero, nav) still renders normally. Do not fail the whole page for a teaser-card fetch failure.

2. About (Public)

Route: /about
Entry points: Nav bar link.

Elements: Static admin-edited content block (mission, history). No dynamic data, no interactive elements beyond nav.

Success/error/empty: Standard page render; if content hasn't been set by admin yet, show a neutral placeholder: "About content coming soon." — not a broken/blank page.

3. Events — List

Route: /events
Entry points: Nav bar, Home page CTA (for existing members), Admin preview link.

Elements:

Tab or filter control: "Upcoming" (default) / "Past". [ASSUMPTION: tabs, not separate pages — simpler for a small event volume.]
Event cards in a grid, each showing: image (if set) or default placeholder, title, date/time, location, short excerpt.
Click anywhere on card → navigates to /events/{id}.
If logged in and RSVP enabled: card shows an RSVP status pill ("Going" / "RSVP") — clicking the pill directly toggles RSVP without navigating to detail page (optimistic UI: pill updates immediately, reverts with error toast if the server call fails).

Success state: Grid populated, sorted chronologically (upcoming: soonest first; past: most recent first).

Empty state: "No upcoming events yet — check back soon." centered, no card grid. If "Past" tab is empty (first year of use): "No past events yet."

Error state: Full-section error card: "Couldn't load events." with Retry button, replacing the grid.

4. Events — Detail

Route: /events/{id}
Entry points: Click-through from list, Home teaser, direct link/share.

Elements:

Full event info: title, date/time, location, full description, image.
RSVP button (if enabled and user logged in): "RSVP" → on click, becomes "Going ✓" (filled state), server call fires in background. Click again on "Going ✓" → confirmation micro-prompt "Remove your RSVP?" (Yes/Cancel inline, not a modal) before reverting — prevents accidental un-RSVP taps.
If logged out and RSVP enabled: button reads "Log in to RSVP" → navigates to /login?redirect=/events/{id}.
Back link to /events.

Success state: Standard render.

Error states:

Event ID doesn't exist / was deleted: 404-style in-page message "This event couldn't be found." with a link back to /events — not the generic site 404 page, a contextual one.
RSVP action fails: pill reverts to prior state, inline error text below button: "Couldn't update RSVP. Try again."

Empty state: N/A (detail page always has content or errors to 404).

5. Announcements — Feed

Route: /announcements
Entry points: Nav bar, Home teaser.

Elements:

Reverse-chronological list of announcement cards (title, timestamp, excerpt, optional image).
Click → /announcements/{id} (or expand inline — [ASSUMPTION: separate detail page, for consistency with Events pattern and simpler share-links]).
Members-only announcements: if user is logged out or not a member, these are simply absent from the list (not shown-but-locked) — avoids advertising the existence of content someone can't see. [ASSUMPTION — this is a privacy-leaning default; if the club wants to show "members-only" teasers to entice joining, that's a different, explicit choice.]

Success state: Standard list render.

Empty state: "No announcements yet."

Error state: "Couldn't load announcements." with Retry, replacing the list.

6. Announcements — Detail

Route: /announcements/{id}
Same pattern as Event Detail: full content render, back link, 404-style in-page message if the ID is invalid or the announcement is members-only and the viewer isn't authorized (same message either way — "This announcement couldn't be found" — never reveal that members-only content exists but is hidden, which would leak information about content the visitor can't see).

7. Members / Team

Route: /members
Entry points: Nav bar.

Elements: Grid of member cards (photo/initials avatar, name, role). Leadership shown first (sorted by a display_order admin field), general members below if visibility is set to public.

Success state: Standard render.

Empty state: "Member list coming soon." (only relevant before any admin data entry).

Error state: "Couldn't load members." with Retry.

8. Join / Membership Request

Route: /join
Entry points: Nav bar, Home CTA.

Elements:

Form: Full name (required, text), Enrollment number (required, text, format-validated — [ASSUMPTION: format validation regex not specified upstream; use a permissive alphanumeric pattern unless the college provides a specific format]), Email/contact (required, email format), Optional message (textarea, optional).
Submit button: "Send request".

Submit button behavior:

Client-side validation fires first (required fields, email format). Invalid fields get inline red-text errors directly below the field, focus jumps to the first invalid field. Button does not proceed to server call until client validation passes.
On valid submit: button shows spinner, disabled.
Server validates again (never trust client-only validation) — checks for duplicate enrollment number in pending/existing requests.

Success state: Form is replaced (not just cleared) with a confirmation panel: "Your request has been received. The club will review it and reach out." No further action available on this screen — this is a terminal state for this visit.

Error states:

Duplicate enrollment number already has a pending or approved request: inline error above the submit button (not a field-level error, since it's not a format problem): "A request already exists for this enrollment number." Do not reveal whether it's pending or already a member (avoid leaking membership status of other people via enrollment number guessing).
Server/network failure: form remains filled (nothing is lost), inline error: "Couldn't send your request. Try again," Retry re-submits the same form data.

Empty state: N/A (this is a form, not a data display).

9. Login

Route: /login
Entry points: Any auth-guard redirect, nav bar "Login" button.

Elements:

Single credential form (exact fields depend on auth method finalized in TRD Section 8 open item — spec here assumes email/enrollment + password as a placeholder pattern). [OPEN DECISION — carried from TRD: SSO vs. custom credentials not yet resolved. This flow assumes a standard credential form; if SSO is chosen, this screen becomes a single "Continue with [SSO provider]" button instead, and the rest of this section's error states become the SSO provider's responsibility except for the account-linking/first-time-mapping error.]
"Log in" submit button.

Submit button behavior:

Client validates both fields are non-empty.
Server call: checks credentials, checks account is active (not deactivated by admin).

Success state: Redirect to ?redirect param if present, else to / for students or /admin for admin accounts (role-based default landing — [ASSUMPTION]).

Error states:

Wrong credentials: single generic message "Incorrect email or password." (never specify which field was wrong — standard security practice against account enumeration).
Account deactivated by admin: "Your account is inactive. Contact the club admin." — distinct message because this is actionable differently than a typo.
Rate-limited (too many failed attempts): "Too many attempts. Try again in a few minutes." — button becomes disabled with a countdown if feasible, else just the static message.

Empty state: N/A.

10. Elections — Dashboard

Route: /elections
Entry points: Nav bar (only visible/highlighted to authenticated users), direct link, post-login redirect if ?redirect=/elections was set.
Auth guard: Requires login. Additionally requires the student to be marked eligible for at least one election — see empty state below.

Elements:

Election header: current election name, status pill (color-coded per TRD/design doc — Draft is never visible to students, so only Scheduled/Open/Closed/Published states appear here).
If status is Scheduled: page shows "Voting opens {date/time}." — no club list yet, nothing actionable. [ASSUMPTION: clubs/candidates aren't previewed before opening, to avoid any perception of pre-campaigning through the platform itself — this is a judgment call the college should confirm.]
If status is Open: list of clubs the student is eligible for (all 6, or their campus's set, depending on multi-campus toggle), each row showing club name and status: "Completed" (checkmark, muted styling, not clickable) or "Vote now" (button, navigates to /elections/vote/{clubId}).
If status is Closed and results not yet published: "Voting has closed. Results will be published soon."
If status is Results Published: club list becomes clickable through to /elections/results instead of vote screens.

Success state: As described per status above.

Empty state — no eligible clubs [gap identified, not specified upstream]: If a logged-in, eligible-in-principle student has zero clubs assigned to them (data/admin error, or genuinely not eligible for anything in this election), show: "You're not eligible to vote in any club this election. If this seems wrong, contact the election admin." This is distinct from "no election exists yet" (see below) — don't conflate the two messages, since one is a system state and one is a personal-eligibility state.

Empty state — no active election at all: "There's no election running right now." — plain, no error styling, this is a normal off-season state.

Error state: If the election data fails to load: "Couldn't load election status." with Retry, full-section replacement.

11. Elections — Vote (single club)

Route: /elections/vote/{clubId}
Entry points: "Vote now" button from dashboard only — this route should not be reachable/guessable to a club the student isn't eligible for or has already completed (server-side check on every load, not just UI hiding).

Guard behavior: On page load, server re-validates: (a) election is still Open, (b) student is eligible for this club, (c) student hasn't already voted for this club. Any of these failing → redirect back to /elections with an inline message explaining why (see error states).

Elements:

Candidate list: each candidate rendered as a large tappable card (per design doc Section 4) — name, optional photo, optional short statement. No pre-selection, all cards visually identical until chosen.
Selecting a card: visually marks it selected (border + fill per design system), all other cards de-emphasize slightly (not disabled, just visually secondary) — student can change their selection freely before confirming.
"Continue" button: disabled until a candidate is selected. [ASSUMPTION: explicit two-step select-then-confirm, matching the design doc's EVM-inspired ritual — not a single-click-and-submit pattern.]
On "Continue": transitions to a confirmation state (same screen, not a new route) — restates the selected candidate's name, shows "Confirm vote" (primary, brass-accented per design doc) and "Change selection" (secondary, returns to candidate list) buttons.
"Confirm vote" button behavior: disabled state + spinner on click, server call fires (the actual vote-insert transaction).

Success state: Full-screen state change (not a toast) — checkmark animation, "Your vote for {Club} has been recorded. It cannot be changed.", confirmation sound plays (per design doc Section 5), single button "Back to dashboard" → /elections.

Error states:

Election closed between page load and submission (race condition — genuinely possible near the close time): "Voting closed while you were selecting. Your vote was not recorded." No retry — this is correct behavior, not a bug, so the message must not imply the student did anything wrong.
Duplicate vote detected server-side (student already voted — e.g., opened two tabs): "You've already voted for this club." — redirect to dashboard after acknowledgment, since this state is unrecoverable and correct.
Network/server failure during confirm: "Couldn't record your vote. Try again." with Retry — the retry re-attempts the same submission; because the server enforces the unique constraint, a duplicate retry-after-partial-success is safely rejected as a duplicate, not double-counted. This is the one place where the underlying DB constraint (TRD Section 4) directly protects the UI from a dangerous retry — worth the coding agent knowing why retry-on-failure is safe here specifically.

Empty state: N/A (guarded route always has exactly one club's candidates or redirects out).

12. Elections — Results

Route: /elections/results
Entry points: Dashboard link (only after Results Published state), direct link if admin has made results public.
Auth guard: Depends on admin's visibility setting (public vs. members-only) — checked server-side.

Elements:

Per-club results: candidate names with vote counts and computed percentages (tabular figures, per design doc).
Participation summary: eligible count, voted count, participation %.
If multi-campus is ON: a campus filter/tab control to view results scoped to one campus or (if admin allows) an aggregate view.

Success state: Standard render once published.

Empty/blocked state: If a logged-in student navigates here before results are published: "Results haven't been published yet." — not a 403/error, since this isn't a permissions problem, it's a timing one.

Error state: "Couldn't load results." with Retry.

13. Admin — Login-gated Dashboard Home

Route: /admin
Auth guard: Admin role required; non-admin gets 403 page (see Global Rules).

Elements:

Summary cards: pending join requests count, current election status, recent announcement count.
Quick links to each management section (Members, Content, Elections).
Each summary card is clickable, navigating to the relevant management screen filtered to the relevant state (e.g., clicking "3 pending requests" goes to /admin/members?filter=pending).

Success/empty/error: Standard patterns — empty summary cards show "0" not blank, error cards show "Couldn't load" scoped per-card as in Home page teasers.

14. Admin — Members Management

Route: /admin/members

Elements:

Table: Name, Enrollment No., Campus, Status (Active/Deactivated), Actions (Edit/Deactivate).
"Add student" button → opens a modal (not a new route — keeps context) with Name, Enrollment No., Campus fields.
"Bulk import" button → opens a modal with file upload (CSV), preview table of parsed rows before final confirm, and per-row validation errors shown inline in the preview (e.g., "Row 14: duplicate enrollment number") — admin can fix the source file and re-upload, or proceed with only the valid rows (explicit choice via radio: "Import valid rows only" vs. "Cancel and fix file").
Join requests sub-tab: pending requests with Approve/Decline buttons per row. Approve → creates the Member/Student record automatically (per PRD Section 4.5), row moves to "approved" state with a brief inline confirmation, no full page reload.

Success states: Add/edit/import all show inline success toasts; table updates optimistically or via re-fetch immediately after.

Error states:

Add student with duplicate enrollment number: inline field error on the modal, not a toast — "This enrollment number already exists."
Bulk import with malformed CSV (wrong columns, unreadable file): "Couldn't read this file. Check it matches the expected format (Name, Enrollment No., Campus)." — block the modal from proceeding, no partial import attempted.

Empty state: "No students added yet. Add your first student or import a list to get started." with both action buttons visible directly in the empty state (not hidden behind a generic "no data" message).

15. Admin — Content Management (Events & Announcements)

Route: /admin/content

Elements:

Two tabs: Events, Announcements.
"New event" / "New announcement" button → form (modal or dedicated route — [ASSUMPTION: dedicated route /admin/content/events/new for events given more fields (date, location, image); modal acceptable for announcements given fewer fields]).
Existing items listed with Edit/Delete actions.
Delete action: confirmation prompt required ("Delete this event? This can't be undone.") — never a silent/instant delete on a single click, given this is public-facing content.

Success/error/empty states: Standard CRUD patterns matching Members Management above — empty state prompts creation directly, errors are field-level for validation and toast-level for save failures.

16. Admin — Elections Management

Route: /admin/elections

This is the most state-dependent admin screen — behavior branches heavily on election lifecycle state (Draft/Scheduled/Open/Closed/Published, per TRD Section 4.5/PRD Section 4.6).

Elements:

Election list (past + current), "Create election" button.
Selecting an election opens /admin/elections/{id} with sub-sections: Settings (name, dates, Multi-Campus toggle), Campuses, Clubs & Candidates, Voters, Results.

Multi-Campus toggle behavior: Only editable while election is in Draft state. Once any campus/club/candidate data has been entered, changing the toggle shows a warning: "Changing this will require reconfiguring clubs and candidates. Continue?" — because switching from shared to per-campus (or back) invalidates the existing candidate structure (per TRD Section 2's data-model implication).

Lifecycle action buttons:

Draft → "Schedule" button: requires start/end dates set and at least one club/candidate configured; disabled with a tooltip explaining what's missing if not ready.
Scheduled → "Open now" button (manual override) or automatic transition at scheduled start time — [ASSUMPTION: both manual-early-open and scheduled-automatic-open are supported; if only automatic is wanted, remove the manual button].
Open → "Close now" button: requires a confirmation modal — "This will immediately stop all voting. Continue?" — since this is irreversible and affects real votes in progress.
Closed → "Publish results" button: shows a results preview before the actual publish action, admin must explicitly confirm.

Success states: Each transition shows a toast confirming the new state, and the status pill (visible per Global Rules across all election screens) updates immediately.

Error states:

Attempting to open an election with zero eligible voters configured: blocked with inline message, not a silent failure.
Attempting to close an election that's already closed (race condition, e.g., two admin tabs open): "This election is already closed." — refresh state, no duplicate action taken.

Empty state: "No elections yet. Create your first election to get started." with the Create button directly visible.

17. Navigation & Global Chrome

Nav bar (persistent across public + student-facing pages):

Left: club logo/name → /
Center/right: Home, Events, Announcements, Members, Join (if not yet a member) — Elections link only appears if the user is logged in and eligible for at least one active or recently-closed election. [ASSUMPTION: hiding Elections entirely rather than showing it disabled avoids confusing non-eligible users — but this means a logged-in eligible voter with zero current elections also won't see it, which conflicts slightly with wanting them to check "no election running" state in Section 10. Resolve by showing Elections whenever logged in, not conditioned on an active election existing — simpler and avoids the conflict.]
Right: Login button (logged out) or avatar menu (logged in): Profile (if built), Admin (if admin role), Log out.

Admin sidebar (persistent across /admin/*): Dashboard, Members, Content, Elections, (Settings — if built). Active route highlighted.

Footer (public pages only): Basic club contact info, copyright line. Not present on authenticated app-shell pages (dashboard, voting) to reduce visual noise at moments requiring focus, per design doc's restraint principle.

18. Cross-Cutting Error Pages
404: Generic site 404 for genuinely unknown routes (not used for the contextual "event not found" cases above, which stay in-page per their sections).
403: Distinct page for authenticated-but-wrong-role access attempts — "You don't have access to this page." with a link back to /.
500 / unhandled error boundary: "Something went wrong on our end." with a link to / — never expose a raw stack trace or error message to the end user in production.
19. Open Decisions Requiring Confirmation (compiled from flags above)
Auth method (credential form vs. SSO) — affects Section 9 entirely.
Whether pre-open election club/candidate lists are visible during Scheduled state (Section 10) — currently assumed hidden.
Whether the Elections nav link should always show when logged in, regardless of an active election (Section 17) — recommended default stated, but worth confirming against the "no election running" empty state design.
Bulk CSV format/columns exact spec (Section 14) — assumed Name/Enrollment No./Campus in that order; confirm before building the parser.