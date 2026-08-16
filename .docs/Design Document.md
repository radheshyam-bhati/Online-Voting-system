Design Document — College Club Website
Visual Identity & UI/UX Design Brief, v1.0

Design direction: Modern premium, with an EVM-inspired ritual layer reserved specifically for the vote-confirmation moment. Not institutional/government aesthetics throughout — that would read as generic and cold for a club site whose primary job is day-to-day member engagement.

1. Color Palette

Principle: Avoid default-Tailwind blue (
#3B82F6) and default-shadcn slate — these read as "unstyled starter template" immediately to anyone who's seen a few SaaS products. Premium comes from an unexpected but restrained primary, near-black text instead of pure black, and disciplined use of a single accent.

Role	Color	Hex	Why
Primary	Deep ink indigo	
#1B1F3B	Replaces generic navy/black. Dark enough for authority, blue-shifted enough to feel deliberate rather than default. Used for primary buttons, header background option, key headings.
Accent	Warm brass/amber	
#B8860B → refined to 
#C4933A	This is the "premium" signal — a muted metallic gold-brass, not saturated yellow. Evokes ballot-box brass fittings and institutional medals without being literal. Used sparingly: CTA highlights, the vote-confirmation moment, active states.
Background (light)	Warm off-white	
#FAF8F4	Not pure white (
#FFFFFF reads cheap/generic-SaaS). A warm paper-adjacent white gives the "premium print/stationery" feel.
Background (dark)	Near-black ink	
#14151F	Not pure black — retains a hint of the indigo primary for cohesion.
Surface / card	
#FFFFFF (light) / 
#1C1E2E (dark)	Cards sit one step lighter/darker than the page background — subtle elevation, no drop shadows needed.	
Text primary	
#1B1B22	Near-black, not pure black.	
Text secondary	
#5C5D6E	Muted slate-indigo, not generic gray.	
Border/hairline	
#E4E1D8 (light) / 
#2A2C3D (dark)	Warm-neutral hairline, matches the off-white philosophy.	
Success (vote confirmed)	Deep forest green	
#1F5E3F	Reserved almost exclusively for the "vote recorded" state — makes that moment visually distinct from all other UI.
Danger	Muted brick red	
#A13D2E	Not fire-engine red — stays in the same desaturated, premium register as everything else.

Explicitly avoid: default Tailwind indigo/blue/violet palette, pure white backgrounds, pure black text, neon/saturated accent colors, gradients as decoration (gradients are fine functionally — e.g., a very subtle 2% tonal shift on a hero — but never as a loud decorative device).

2. Typography
Role	Typeface	Why
Display / headings	Fraunces (serif, variable) or Canela if licensing allows	A serif for headings is the single highest-leverage move toward "premium, not generic UI" — nearly every templated SaaS/club site uses a geometric sans for everything. A warm, slightly quirky serif like Fraunces signals editorial confidence without going stuffy-institutional.
Body / UI text	Inter or Geist	Keep the workhorse text (buttons, forms, nav, body copy) in a clean, highly legible sans — this is where you want zero friction, not personality. Geist (Vercel's typeface) pairs especially well with a Next.js/shadcn stack and is free.
Numerals / vote counts / results	Tabular figures, same sans family (Geist Mono for results tables)	Vote tallies and participation percentages should use a monospace or tabular-figure variant so digits align in columns — a small detail that reads as "this system takes counting seriously."

Type scale (based on a 1.25 ratio, rem-based):

Token	Size	Use
display	3rem / 48px, serif	Hero headline only
h1	2.25rem / 36px, serif	Page titles
h2	1.75rem / 28px, serif	Section headers
h3	1.25rem / 20px, sans medium	Card titles, subsections
body	1rem / 16px, sans regular	Default text
small	0.875rem / 14px, sans regular	Metadata, captions
micro	0.75rem / 12px, sans medium, letter-spacing +0.02em	Labels, badges, timestamps

Line height: 1.5 for body, 1.15–1.2 for headings (serif headings need tighter leading or they look loose).

3. Layout Structure & Grid System
12-column grid, max content width 1200px, centered, with 24px gutters (desktop), 16px (mobile).
Public pages (Home, About, Events, Announcements): generous, editorial layout — single or two-column, lots of whitespace, serif headings breaking up sans body blocks. This is where the "premium" feel lives visually.
Admin dashboard & election screens: denser, utility-first layout — sidebar nav (240px fixed) + main content area, data tables, standard SaaS dashboard conventions. Premium here comes from restraint and precision (aligned columns, consistent spacing) rather than decoration.
Voting screen specifically: intentionally the most spacious and uncluttered screen in the entire product — one club, one candidate list, nothing else competing for attention. This is the moment the EVM-inspired ritual applies; visual noise here undermines the "this is serious and final" feeling you want.

Breakpoints:

Name	Width	Behavior
Mobile	<640px	Single column, stacked nav (hamburger), full-width cards
Tablet	640–1024px	Two-column where applicable, sidebar becomes a top drawer in admin
Desktop	>1024px	Full grid, persistent sidebar in admin
4. Component Styles

Buttons

Primary: filled ink-indigo (
#1B1F3B), white text, border-radius: 8px, no gradient, subtle scale(0.98) on active press — not a shadow lift, a press-down, which reads more tactile/mechanical (nodding to the physical-button reference without being literal).
Secondary: outline only, 1px border in --border-strong, transparent fill.
Vote button (the one place styling diverges from the rest of the system): larger than standard buttons (min-height 52px), brass/amber accent border, slightly heavier font-weight label ("Cast vote" / "Confirm"), and on press triggers the confirmation ritual described in Section 5. This is the one button in the whole app allowed to feel "special."

Cards

White/dark-surface background, 1px hairline border (no shadow by default — shadows only appear on hover/interactive cards, and even then subtle: 0 2px 8px rgba(0,0,0,0.06)).
border-radius: 12px.
Padding: 24px desktop, 16px mobile.
Event/announcement cards: image top (if present), serif title, sans metadata line, sans body excerpt.

Forms

Inputs: 44px height (comfortable touch target), 1px border, border-radius: 8px, generous internal padding (12px).
Focus state: brass/amber ring (box-shadow: 0 0 0 2px rgba(196,147,58,0.35)) — not the default blue browser focus ring, ties focus states back into the accent palette.
Radio/candidate selection (voting UI specifically): render as large tappable cards, not tiny native radio buttons — each candidate gets their own bordered card with name/photo, and the whole card is the tap target. Selected state: brass border + subtle brass-tinted background fill, not just a filled circle. This is the clearest visual departure from "generic form UI" and the clearest nod to the deliberate, one-choice-at-a-time feeling of a physical voting machine.
5. Overall Visual Mood & The EVM-Inspired Ritual Layer

The general site (Home, Events, Announcements, Members) should feel like a well-made piece of editorial print translated to web — warm off-white paper tones, serif headlines, generous whitespace, brass accents used like foil-stamping. Think a nicely designed university alumni magazine or a boutique institution's website, not a generic SaaS dashboard template.

The voting flow is where the EVM reference earns its place, expressed as interaction and motion, not decoration:

One choice at a time, full-bleed focus. When a student opens a club to vote, the rest of the UI (nav, other clubs) recedes — full attention on the single ballot, echoing the single-purpose physical machine.
Deliberate confirmation step. Selecting a candidate doesn't submit immediately — a distinct "Confirm your vote" state appears (candidate name restated, one clear button), mirroring the two-stage press-then-confirm action on a physical EVM.
A distinct confirmation sound. A short, low, single-tone beep (not a cheerful chime) on successful vote submission — around 150–250ms, a clean sine or triangle wave tone, not a synth flourish. This is the one moment in the entire site that has sound at all; using it nowhere else makes it meaningful rather than gimmicky.
A finality animation. A brief (300–400ms), simple checkmark-fill animation in the success-green, paired with copy that states finality plainly: "Your vote for [Club] has been recorded. It cannot be changed." No confetti, no celebratory motion — deliberate and calm, matching the seriousness of the action.

This gives you the EVM reference as felt ritual at the one moment it matters, while the rest of the product stays in the premium-editorial register you asked for.

6. Spacing & Sizing Guidelines

Use an 8px base unit throughout:

Token	Value	Use
space-1	4px	Icon-to-label gaps
space-2	8px	Tight internal component spacing
space-3	16px	Default internal padding, form field gaps
space-4	24px	Card padding, section internal spacing
space-5	32px	Spacing between distinct components
space-6	48px	Spacing between page sections
space-7	80px	Major section breaks on public pages (editorial breathing room)

Border radius: 8px for controls/buttons/inputs, 12px for cards, 999px (full pill) only for status badges and tags — never for buttons (pill buttons read as generic startup, not premium).

7. Dashboard Structure (Admin)
Fixed left sidebar (240px): Dashboard home, Members, Content (Events/Announcements), Elections, Settings.
Top bar: current admin identity, quick search, notifications icon.
Main content: breadcrumb, page title (sans, not serif — admin is utility mode), then content (tables, forms, stat cards).
Election-specific admin screens get a persistent status bar showing current election state (Draft/Scheduled/Open/Closed/Published) in a colored pill — this should be visible on every election-admin screen so state is never ambiguous.
8. Mobile Responsiveness
Bottom tab bar on mobile for the primary student-facing app (Home, Events, Elections, Profile) — thumb-reachable, not top nav.
Admin remains desktop-first but must be usable on tablet at minimum; full admin function on phone is not required for v1.
Voting screen on mobile: candidate cards stack full-width, confirm button pinned to bottom of viewport (thumb zone) rather than requiring scroll.
9. UX Principles
The vote can never be ambiguous. Every state (not started / in progress / confirmed) must be unmistakable at a glance — this drives the color and copy choices throughout Section 5.
Public pages sell the club; authenticated pages serve the member. Don't make a logged-out visitor click through friction to see what the club is about.
Restraint signals premium. One accent color, used sparingly, reads more expensive than five colors used generously. This is true of the brass accent and true of motion — most of the site should be static and calm; the vote-confirmation moment is the one place motion is earned.
No dark patterns near voting. No pre-selected candidates, no default selections, no visual weighting toward any option — every candidate card must be styled identically until the student chooses.
10. Visual References (Described, Not Linked)

Since I can't browse to attach live reference images in this response, here's the reference vocabulary to hand to a designer or search for:

Editorial/print-inspired SaaS: Linear's marketing site (restraint, serif accents), Arc browser's website (warm neutrals, confident type)
Serif-forward premium sites: The Browser Company, Cash App's brand site (bold serif headlines against warm neutral backgrounds)
EVM/ballot visual texture (for the confirmation moment only): Indian EVM control-unit photography — the brass-toned buttons and beep, not the beige plastic casing — is the specific detail worth referencing, not the machine's overall industrial look.