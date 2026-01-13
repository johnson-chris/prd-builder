# CLAUDE.md - PRD Builder Application

## Project Overview

A web-based PRD (Product Requirements Document) builder that helps business analysts and product managers create comprehensive PRDs through an interactive, guided process with Claude AI assistance.

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Zustand (lightweight, simple API)
- **Styling**: Tailwind CSS
- **Rich Text Editor**: TipTap (extensible, markdown-friendly)
- **Markdown Preview**: react-markdown with remark-gfm
- **Form Management**: React Hook Form with Zod validation
- **HTTP Client**: Axios with retry logic
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js 20+ with Express
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Authentication**: JWT with refresh tokens (httpOnly cookies)
- **Validation**: Zod
- **API Documentation**: OpenAPI/Swagger

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway
- **Database**: Railway PostgreSQL or Supabase
- **Error Tracking**: Sentry
- **CDN**: Cloudflare

### Claude Integration
- **Model**: claude-sonnet-4-5-20250514
- **Streaming**: Server-Sent Events (SSE)
- **Rate Limiting**: 10 requests/minute per user (token bucket)

## Project Structure

```
prd-builder/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   │   ├── ui/         # Base components (Button, Input, Card, etc.)
│   │   │   │   ├── forms/      # Form-specific components
│   │   │   │   ├── editor/     # PRD editor components
│   │   │   │   └── layout/     # Layout components
│   │   │   ├── features/       # Feature modules
│   │   │   │   ├── auth/       # Authentication
│   │   │   │   ├── dashboard/  # PRD dashboard
│   │   │   │   ├── editor/     # PRD editor
│   │   │   │   └── planning/   # Claude planning mode
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utilities and helpers
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── types/          # TypeScript types
│   │   │   └── styles/         # Global styles
│   │   ├── public/
│   │   └── index.html
│   │
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── routes/         # API route handlers
│       │   ├── services/       # Business logic
│       │   ├── middleware/     # Express middleware
│       │   ├── lib/            # Utilities (claude, markdown, etc.)
│       │   ├── types/          # TypeScript types
│       │   └── index.ts        # Entry point
│       └── prisma/
│           └── schema.prisma   # Database schema
│
├── packages/
│   └── shared/                 # Shared types and utilities
│       └── src/
│           ├── types/          # Shared TypeScript interfaces
│           └── constants/      # Shared constants
│
├── package.json                # Root package.json (workspace)
├── turbo.json                  # Turborepo config
└── tsconfig.base.json          # Base TypeScript config
```

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` when necessary)
- Explicit return types on functions
- Use interfaces for object shapes, types for unions/primitives
- Prefer `const` assertions for literal types

### React
- Functional components only
- Custom hooks for reusable logic
- Colocation: keep related files together
- Lazy loading for route-level code splitting
- Error boundaries for graceful failure handling

### Naming Conventions
- **Files**: kebab-case (`prd-editor.tsx`, `auth-service.ts`)
- **Components**: PascalCase (`PrdEditor`, `AuthProvider`)
- **Functions/Variables**: camelCase (`createPrd`, `isLoading`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_PRD_LENGTH`, `API_URL`)
- **Types/Interfaces**: PascalCase (`User`, `PrdSection`)
- **Database tables**: snake_case (`user_preferences`, `prd_sections`)

### API Design
- RESTful endpoints
- Consistent error response format: `{ error: string, code: string, details?: object }`
- Always return appropriate HTTP status codes
- Validate all inputs with Zod schemas
- Rate limit all endpoints

### Error Handling
- Never swallow errors silently
- Log errors with context (user ID, action, timestamp)
- Return user-friendly error messages
- Use error boundaries in React
- Implement retry logic for transient failures

### Security
- Sanitize all user inputs
- Use parameterized queries (Prisma handles this)
- CSRF protection on all state-changing endpoints
- Rate limiting on authentication endpoints
- Never log sensitive data (passwords, tokens)
- Store secrets in environment variables only

### Testing
- Unit tests for business logic (Vitest)
- Integration tests for API endpoints (Supertest)
- E2E tests for critical flows (Playwright)
- Minimum 80% coverage for business logic
- Test file naming: `*.test.ts` or `*.spec.ts`

## Database Schema Overview

```prisma
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  passwordHash   String
  name           String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  preferences    Json     @default("{}")
  prds           Prd[]
  refreshTokens  RefreshToken[]
}

model Prd {
  id                    String   @id @default(cuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  title                 String
  status                String   @default("draft")
  version               String   @default("1.0.0")
  sections              Json     @default("[]")
  planningConversations Json     @default("{}")
  markdownContent       String?
  completenessScore     Int      @default(0)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([userId])
  @@index([status])
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
}
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
VITE_APP_NAME="PRD Builder"
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/prd_builder
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
ANTHROPIC_API_KEY=sk-ant-...
CORS_ORIGIN=http://localhost:5173
PORT=3001
NODE_ENV=development
```

## Key Design Decisions

1. **Monorepo with Turborepo**: Enables code sharing between frontend/backend while maintaining separate deployments.

2. **Zustand over Redux**: Simpler API, less boilerplate, sufficient for this app's complexity level.

3. **TipTap for Rich Text**: Better markdown support than alternatives, extensible for custom features.

4. **JWT with Refresh Tokens**: Stateless auth with secure token rotation. Access tokens expire in 15 minutes, refresh tokens in 7 days.

5. **SSE for Claude Streaming**: More reliable than WebSockets for one-way server-to-client streaming, better reconnection handling.

6. **PostgreSQL over MongoDB**: Relational structure fits PRD data well, better for filtering/searching, ACID compliance.

7. **Prisma ORM**: Type-safe database access, excellent migration system, good developer experience.

## Commands

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:web          # Start frontend only
npm run dev:api          # Start backend only

# Database
npm run db:push          # Push schema changes
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run all tests
npm run test:web         # Run frontend tests
npm run test:api         # Run backend tests
npm run test:e2e         # Run E2E tests

# Build
npm run build            # Build all packages
npm run build:web        # Build frontend
npm run build:api        # Build backend

# Linting
npm run lint             # Lint all packages
npm run lint:fix         # Fix linting issues
npm run typecheck        # Run TypeScript checks
```

## Claude Integration Notes

### Planning Mode System Prompt
The system prompt should include:
- Section context (which section user is working on)
- Project title and existing content
- Conversation history for continuity
- Guidelines for focused, practical responses

### Rate Limiting Strategy
- Token bucket: 10 tokens, refill 1 per 6 seconds
- Per-user tracking via user ID
- Graceful handling when limit reached (queue or inform user)

### Context Management
- Maintain conversation per section
- Include previous messages (up to 20 exchanges)
- Clear conversation option for fresh start
- Store conversations with PRD for reference
