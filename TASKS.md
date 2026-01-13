# TASKS.md - Phase 1 MVP Implementation Checklist

## 1. Project Setup & Foundation

### 1.1 Monorepo Initialization
- [ ] Initialize npm workspace in root
- [ ] Set up Turborepo configuration
- [ ] Create `apps/web` directory (React frontend)
- [ ] Create `apps/api` directory (Express backend)
- [ ] Create `packages/shared` directory (shared types)
- [ ] Configure root `tsconfig.base.json`
- [ ] Set up ESLint with TypeScript rules
- [ ] Set up Prettier configuration
- [ ] Create `.gitignore` with proper exclusions
- [ ] Initialize git repository

### 1.2 Frontend Setup (apps/web)
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Set up path aliases (@/components, @/lib, etc.)
- [ ] Install and configure React Router
- [ ] Install Zustand for state management
- [ ] Install Axios for HTTP requests
- [ ] Install React Hook Form + Zod
- [ ] Create base folder structure (components, features, hooks, lib, stores, types)
- [ ] Set up environment variables (.env)
- [ ] Create basic App.tsx with router

### 1.3 Backend Setup (apps/api)
- [ ] Initialize Express + TypeScript project
- [ ] Configure TypeScript with strict mode
- [ ] Set up nodemon for development
- [ ] Install and configure Prisma
- [ ] Install middleware (cors, helmet, express-json)
- [ ] Install Zod for validation
- [ ] Install bcrypt for password hashing
- [ ] Install jsonwebtoken for JWT
- [ ] Create base folder structure (routes, services, middleware, lib, types)
- [ ] Set up environment variables (.env)
- [ ] Create basic server entry point

### 1.4 Database Setup
- [ ] Create PostgreSQL database (local or Railway/Supabase)
- [ ] Write Prisma schema (User, Prd, RefreshToken models)
- [ ] Run initial migration
- [ ] Verify database connection
- [ ] Set up Prisma Studio for debugging

### 1.5 Shared Package
- [ ] Create shared TypeScript types (User, Prd, Section, etc.)
- [ ] Create shared constants (PRD_SECTIONS, STATUS_OPTIONS)
- [ ] Configure package exports
- [ ] Verify imports work from both apps

---

## 2. Authentication System

### 2.1 Backend Auth
- [ ] Create auth routes file (`/api/auth/*`)
- [ ] Implement `POST /api/auth/register`
  - [ ] Email format validation
  - [ ] Password strength validation (12+ chars, mixed case, numbers, symbols)
  - [ ] Check for existing email
  - [ ] Hash password with bcrypt
  - [ ] Create user in database
  - [ ] Return success (no auto-login)
- [ ] Implement `POST /api/auth/login`
  - [ ] Validate credentials
  - [ ] Generate access token (15 min expiry)
  - [ ] Generate refresh token (7 day expiry)
  - [ ] Store refresh token in database
  - [ ] Set httpOnly cookie for refresh token
  - [ ] Return access token and user info
- [ ] Implement `POST /api/auth/refresh`
  - [ ] Validate refresh token from cookie
  - [ ] Check token exists in database and not expired
  - [ ] Generate new access token
  - [ ] Rotate refresh token (delete old, create new)
  - [ ] Return new access token
- [ ] Implement `POST /api/auth/logout`
  - [ ] Delete refresh token from database
  - [ ] Clear httpOnly cookie
- [ ] Create auth middleware for protected routes
- [ ] Implement `GET /api/auth/me` (get current user)

### 2.2 Frontend Auth
- [ ] Create auth store (Zustand)
  - [ ] User state
  - [ ] isAuthenticated state
  - [ ] Login/logout actions
  - [ ] Token refresh logic
- [ ] Create auth API service
- [ ] Create Login page
  - [ ] Email input with validation
  - [ ] Password input
  - [ ] Remember me checkbox
  - [ ] Submit button with loading state
  - [ ] Error display
  - [ ] Link to register
- [ ] Create Register page
  - [ ] Name input
  - [ ] Email input with validation
  - [ ] Password input with strength indicator
  - [ ] Confirm password input
  - [ ] Submit button with loading state
  - [ ] Error display
  - [ ] Link to login
- [ ] Create ProtectedRoute component
- [ ] Set up Axios interceptor for token refresh
- [ ] Handle 401 responses (redirect to login)

---

## 3. PRD Form Interface

### 3.1 Backend PRD CRUD
- [ ] Create PRD routes file (`/api/prds/*`)
- [ ] Implement `GET /api/prds` (list user's PRDs)
  - [ ] Filter by userId from auth
  - [ ] Basic pagination (limit, offset)
  - [ ] Return PRD list with metadata
- [ ] Implement `POST /api/prds` (create PRD)
  - [ ] Initialize with default sections
  - [ ] Set status to 'draft'
  - [ ] Set version to '1.0.0'
  - [ ] Return created PRD
- [ ] Implement `GET /api/prds/:id` (get single PRD)
  - [ ] Verify ownership
  - [ ] Return full PRD with sections
- [ ] Implement `PUT /api/prds/:id` (update PRD)
  - [ ] Verify ownership
  - [ ] Update sections, title, status
  - [ ] Update `updatedAt` timestamp
  - [ ] Return updated PRD
- [ ] Implement `DELETE /api/prds/:id` (delete PRD)
  - [ ] Verify ownership
  - [ ] Hard delete from database
  - [ ] Return success

### 3.2 PRD Section Structure
- [ ] Define 13 required sections in shared package:
  1. Executive Summary
  2. Problem Statement
  3. Goals and Success Metrics
  4. Target Users/Personas
  5. User Stories and Use Cases
  6. Functional Requirements
  7. Non-Functional Requirements
  8. Technical Architecture/Constraints
  9. Security and Compliance
  10. Timeline and Milestones
  11. Dependencies and Risks
  12. Success Criteria
  13. Appendices
- [ ] Create Section interface (id, title, content, order, required, completed)
- [ ] Create default section generator function

### 3.3 Frontend PRD Store
- [ ] Create PRD store (Zustand)
  - [ ] Current PRD state
  - [ ] PRD list state
  - [ ] Loading states
  - [ ] CRUD actions
  - [ ] Section update action
- [ ] Create PRD API service

### 3.4 PRD Editor Page
- [ ] Create PRD editor layout (two-pane: form | preview)
- [ ] Create sticky header
  - [ ] Editable title input
  - [ ] Status dropdown (draft, in-review, approved)
  - [ ] Save button with auto-save indicator
  - [ ] Planning mode toggle
  - [ ] Export button
- [ ] Create section accordion component
  - [ ] Collapsible sections
  - [ ] Section title and description
  - [ ] Completion indicator (checkmark)
  - [ ] Expand/collapse animation
- [ ] Create progress indicator (X/13 sections complete)

### 3.5 Rich Text Editor
- [ ] Install and configure TipTap
- [ ] Create TipTap editor component
  - [ ] Basic formatting (bold, italic, lists)
  - [ ] Headings (H3, H4)
  - [ ] Code blocks
  - [ ] Links
- [ ] Create toolbar component
- [ ] Add character count display
- [ ] Style editor to match design system

### 3.6 Form Validation
- [ ] Create Zod schemas for PRD
- [ ] Implement required field validation
- [ ] Show validation errors inline
- [ ] Prevent save if critical validation fails

### 3.7 Auto-Save
- [ ] Implement 60-second auto-save interval
- [ ] Show "Saving..." indicator during save
- [ ] Show "Saved at [time]" after successful save
- [ ] Show "Save failed" with retry on error
- [ ] Implement LocalStorage backup on every change
- [ ] Implement draft recovery on page load
- [ ] Add "unsaved changes" warning before navigation

---

## 4. Markdown Generation & Export

### 4.1 Backend Markdown Service
- [ ] Create markdown generator service
- [ ] Implement YAML frontmatter generation
  - [ ] title, author, created, updated, status, version
- [ ] Implement section-to-markdown conversion
  - [ ] H1 for title
  - [ ] H2 for major sections
  - [ ] H3 for subsections
  - [ ] Proper list formatting
  - [ ] Code block handling
- [ ] Implement `GET /api/prds/:id/download`
  - [ ] Generate markdown
  - [ ] Set Content-Disposition header
  - [ ] Return .md file

### 4.2 Frontend Export
- [ ] Add download button to editor header
- [ ] Implement download trigger
- [ ] Create filename: `[project-slug]-prd-[YYYY-MM-DD].md`
- [ ] Add "Copy to clipboard" button
- [ ] Show success toast on copy

### 4.3 Markdown Preview
- [ ] Install react-markdown + remark-gfm
- [ ] Create preview pane component
- [ ] Add toggle to show/hide preview
- [ ] Style preview to match generated markdown
- [ ] Sync scroll position with editor (optional)

---

## 5. Claude Integration - Planning Mode

### 5.1 Backend Claude Service
- [ ] Install Anthropic SDK
- [ ] Create Claude service
- [ ] Implement rate limiting (token bucket: 10/min per user)
- [ ] Create section-specific system prompts (from Appendix B)
- [ ] Implement conversation history management

### 5.2 Streaming Endpoint
- [ ] Create `POST /api/prds/:id/sections/:sectionId/plan/message`
- [ ] Set up SSE response headers
- [ ] Stream Claude response chunks
- [ ] Handle errors gracefully
- [ ] Store conversation in PRD record

### 5.3 Frontend Planning UI
- [ ] Create planning mode dialog/panel
- [ ] Create chat message component
- [ ] Create message input with send button
- [ ] Implement SSE client for streaming
- [ ] Display streaming response in real-time
- [ ] Add "Apply to Section" button
- [ ] Add "Regenerate" button
- [ ] Add "Start Over" button
- [ ] Show rate limit status
- [ ] Handle API unavailable gracefully

### 5.4 Planning Mode Integration
- [ ] Add "Get AI Help" button to each section
- [ ] Pass section context to planning mode
- [ ] Insert suggestion into section content
- [ ] Save conversation history with PRD
- [ ] Load previous conversation when reopening planning

---

## 6. MVP Polish & Testing

### 6.1 Error Handling
- [ ] Create global error boundary
- [ ] Implement toast notification system
- [ ] Handle network errors gracefully
- [ ] Handle auth errors (token expired, etc.)
- [ ] Handle Claude API errors

### 6.2 Loading States
- [ ] Add loading skeletons for PRD list
- [ ] Add loading state for PRD editor
- [ ] Add loading state for planning mode
- [ ] Add loading state for downloads

### 6.3 Basic Styling
- [ ] Implement color palette from PRD
- [ ] Set up typography (Inter, JetBrains Mono)
- [ ] Style buttons, inputs, cards
- [ ] Style navigation/header
- [ ] Ensure basic mobile responsiveness

### 6.4 Testing
- [ ] Write unit tests for auth service
- [ ] Write unit tests for markdown generator
- [ ] Write unit tests for rate limiter
- [ ] Write API integration tests for auth endpoints
- [ ] Write API integration tests for PRD endpoints
- [ ] Manual test: registration flow
- [ ] Manual test: login flow
- [ ] Manual test: create PRD flow
- [ ] Manual test: edit PRD flow
- [ ] Manual test: planning mode flow
- [ ] Manual test: export flow
- [ ] Manual test: auto-save and recovery

### 6.5 Security Checks
- [ ] Verify password hashing works correctly
- [ ] Verify JWT tokens expire properly
- [ ] Verify refresh token rotation works
- [ ] Verify user can only access own PRDs
- [ ] Verify rate limiting works
- [ ] Test for XSS in markdown preview
- [ ] Test input sanitization

---

## Quick Reference: API Endpoints (MVP)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| POST | /api/auth/logout | User logout |
| POST | /api/auth/refresh | Refresh access token |
| GET | /api/auth/me | Get current user |
| GET | /api/prds | List user's PRDs |
| POST | /api/prds | Create new PRD |
| GET | /api/prds/:id | Get single PRD |
| PUT | /api/prds/:id | Update PRD |
| DELETE | /api/prds/:id | Delete PRD |
| GET | /api/prds/:id/download | Download PRD as markdown |
| POST | /api/prds/:id/sections/:sectionId/plan/message | Planning mode message (SSE) |

---

## Success Criteria for MVP

- [ ] User can register with email/password
- [ ] User can login and stay logged in (refresh tokens work)
- [ ] User can create a new PRD
- [ ] User can edit all 13 sections of a PRD
- [ ] PRD auto-saves every 60 seconds
- [ ] User can manually save PRD
- [ ] User can use planning mode to get AI assistance
- [ ] Planning mode streams responses in real-time
- [ ] User can apply AI suggestions to sections
- [ ] User can download PRD as markdown file
- [ ] Markdown includes proper frontmatter and formatting
- [ ] User can view markdown preview while editing
- [ ] LocalStorage backup prevents data loss
- [ ] Rate limiting prevents API abuse
- [ ] All auth endpoints are secure
- [ ] Zero critical bugs
