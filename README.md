# Votara — College Club Website with Secure Online Voting

A modern college club website with an integrated election module that enforces vote integrity at the database level.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Database**: PostgreSQL via Neon + Drizzle ORM
- **Auth**: Auth.js v5 (NextAuth) with credentials provider
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Hosting**: Vercel + Neon

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database (Neon recommended)
- pnpm/npm/yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd online-voting-system

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database URL and auth secret
```

### Environment Variables

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/db?schema=public"

# Auth.js
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Vercel Blob (for file uploads)
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

### Database Setup

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Or push schema directly (development)
npm run db:push

# Seed development data
npm run db:seed
```

### Development

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Run type checking
npx tsc --noEmit

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Open Drizzle Studio
npm run db:studio
```

### Test Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@college.edu | admin123 |
| Student | student1@college.edu | student123 |
| Student | student2@college.edu | student123 |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard pages
│   ├── elections/         # Election/voting pages
│   └── ...                # Public pages
├── components/
│   ├── ui/                # shadcn/ui components
│   └── ...                # Feature components
├── db/                    # Database layer
│   ├── schema.ts          # Drizzle schema
│   ├── index.ts           # Database client
│   └── seed.ts            # Development seed data
├── lib/
│   ├── auth.ts            # Auth.js configuration
│   ├── auth-utils.ts      # Password hashing
│   └── utils.ts           # Utility functions
├── middleware.ts          # Auth guards
└── test/                  # Test files
```

## Key Features

### Vote Integrity (Non-Negotiable)
- Database-level unique constraint: `UNIQUE(election_id, student_id, club_id)`
- Server-side identity derivation from session (never trust client input)
- Server-side election state validation on every vote submission
- Concurrency-safe vote insertion with unique violation handling

### Election Module
- Multi-campus support with configurable toggle
- Election lifecycle: Draft → Scheduled → Open → Closed → Published
- Campus-scoped clubs and candidates
- Real-time results with campus filtering
- Audit logging (admin actions only, no vote content)

### Club Website
- Public pages: Home, About, Events, Announcements, Members
- Join/Membership request flow
- Admin dashboard: Members, Content, Elections management
- Responsive design with mobile-first approach

## Design System

- **Primary**: Deep ink indigo `#1B1F3B`
- **Accent**: Warm brass/amber `#C4933A`
- **Background**: Warm off-white `#FAF8F4`
- **Typography**: Fraunces (headings), Geist (body), Geist Mono (numerals)
- **EVM-inspired vote confirmation**: Two-step select-confirm, sound, checkmark animation

## Deployment

### Vercel + Neon (Recommended)

1. Push to GitHub
2. Connect Vercel project to repository
3. Add environment variables in Vercel dashboard
4. Provision Neon database (production branch)
5. Run migrations: `npm run db:migrate` against production DB
6. Deploy

### Election Day Considerations

- Configure Neon to stay warm during voting windows to avoid cold starts
- Monitor Vercel function execution limits
- Have rollback plan documented

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run migrations |
| `npm run db:push` | Push schema (dev only) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed development data |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |

## License

MIT