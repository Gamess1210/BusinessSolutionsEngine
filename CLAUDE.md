# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server on http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Serve dist/ locally
npm run lint      # Run ESLint (complexity rule enforced, errors at CC > 10)
```

To test API routes locally (requires Vercel CLI):
```powershell
$env:PORT = "3001"; vercel dev
```

No test framework is configured yet.

## Environment Variables

Create `.env` in the project root (never commit):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
```

All config is accessed via `import.meta.env.VITE_*`.

## Architecture Overview

**Business Solutions Engine** is a React 19 + Vite SPA for Comotion consultants to manage AI-powered client engagements. Consultants capture client problems through three intake modes, then route them through an eight-gate review pipeline.

### Key Concepts

**Engagement** — the central entity. Has `status`, `analysis_mode` (quick/deep), and `industry` (financial_services/general).

Status state machine: `captured → brief_pending → gate1_review → solutions_pending → gate2_review → proposal_pending → gate3_review → gate4_review → plan_pending → gate5_review → spec_pending → gate6_review → code_pending → code_review → gate7_review → output_pending → gate8_review → complete`. Any state → `failed` on chain error. `failed` → last successful gate state on BA retry.

**Capture modes** (how client input enters the system):
- **Guided** — 14 structured discovery questions, one at a time
- **Brain-dump** — Unstructured notes; Claude restructures
- **Transcript** — Paste a Fireflies meeting transcript; Claude extracts context

**Analysis modes** (`analysis_mode` defaults to `'deep'` — Quick Ideas is opt-in):
- **Quick Ideas** — Single Claude call, 3 solution options, <60s
- **Deep Analysis** — Two sequential Claude calls, full brief + 5 solutions with ROI/risk, ~5min

**Eight-gate pipeline** (from `openspec/config.yaml`):
1. Brief Review — human reviews AI-structured problem brief
2. Solutions Review — human reviews generated solution options
3. Client Decision, Proposal and Confirmation Loop — BA selects chosen solution, generates and refines Document B
4. Client Decision and Context — BA records chosen solution and captures post-meeting context
5. Project Plan — BA converses with Claude to produce a structured project plan
6. Spec Approval — OpenSpec files written to client repo
7. Code Review — Gemini scorecard + ESLint complexity scores
8. Output Review — final client documents

**Client Intake** — public token-based form at `/intake/:token`. Internal user generates a UUID token via Dashboard; client fills the form without auth; data lands in `engagement_inputs` with `intake_token`.

### Database (Supabase)

Two core tables:

- **engagements** — `id, client_name, organisation, department, industry, analysis_mode, status, team_member_id, created_at, updated_at`
- **engagement_inputs** — `id, engagement_id, input_type, source, content (JSONB), intake_token, created_at, updated_at`

`content` JSONB structure varies by `input_type`:
- `guided`: `{ answers: [{ section, question, answer, notes }] }`
- `braindump` / `transcript`: `{ text }`
- `client_intake`: `{ contact_name, contact_email, organisation, department, problem_description, impact_description, constraints }`

RLS: users see only their own engagements (`team_member_id = auth.uid()`). Intake token reads are open by token match.

### Auth Flow

`src/lib/auth.js` wraps `signIn()` / `signOut()` / `getSession()`. `src/hooks/useAuth.js` subscribes to `onAuthStateChange`. `src/App.jsx` has a `<ProtectedRoute>` that redirects to `/login` when unauthenticated. Azure AD via MSAL is installed but not yet integrated.

### Source Layout

```
src/
  pages/          # Login, Dashboard, NewEngagement, EngagementDetail, IntakeForm
  pages/review/   # BriefReview (Gate 1), SolutionsReview (Gate 2), ProposalReview (Gate 3),
                  # ClientDecisionReview (Gate 4), ProjectPlanReview (Gate 5),
                  # SpecReview (Gate 6), CodeReview (Gate 7), OutputsReview (Gate 8)
                  # Part1SolutionSelect, Part2ContextCapture, Part3ProposalLoop (Gate 3 sub-screens)
  components/layout/Layout.jsx   # Top nav + <Outlet>
  lib/            # supabase.js (client), auth.js (helpers)
  lib/chains/     # LangChain chains: consolidation, quickIdeas, deepAnalysis, documentAGeneration,
                  # proposalGeneration, proposalEdit, projectPlan, contextGeneration,
                  # openspecGeneration, codeGeneration, codeFix, codeReview, reviewLoop, outputGeneration
  lib/prompts/    # LangChain prompt templates: deepAnalysisPrompt, solutionsPrompt
  hooks/          # useAuth.js
  App.jsx         # Routes + ProtectedRoute
api/pipeline/     # Vercel serverless routes:
                  #   consolidate, quick-ideas, deep-analysis, gate2-approve, regenerate-brief-and-solutions
                  #   gate3-select-solution, gate3-generate, gate3-edit, gate3-send, gate3-approve, gate3-reset-solution
                  #   gate4-approve, gate4-reject
                  #   plan-message, gate5-approve
openspec/         # Spec-driven workflow config and change tracking
```

## Code Conventions

**Language**: JavaScript/JSX (not TypeScript).

**Styling**: Tailwind CSS v3 only — **do not upgrade to v4, it breaks Vercel deployment**. Brand palette defined in `tailwind.config.js`:
- `navy` (#1A3B66) — primary headers/buttons
- `cgreen` (#8CC240) — success/accent
- `cblue` (#4DBFED) — info
- `cred` (#D61C5E) — error/danger
- `grey-light/mid/dark` — backgrounds, borders, body text

**ESLint** (`eslint.config.js`, flat config): cyclomatic complexity max 10 (`'complexity': ['error', { 'max': 10 }]`). Functions exceeding CC 10 are a build-blocking error — refactor into smaller functions.

**Async pattern** — always wrap Supabase calls:
```javascript
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
try {
  setLoading(true)
  const { data, error } = await supabase.from(...).insert(...)
  if (error) throw error
} catch (err) {
  setError(err.message)
} finally {
  setLoading(false)
}
```

**Spec-driven development**: New features start with an OpenSpec change in `openspec/`. Use `/opsx:propose` to create a change spec, `/opsx:apply` to implement tasks from it.

## BSE Pipeline Rules — Read Before Writing Any Code

These rules are non-negotiable. Every file in this repo must comply.

### AI Model Separation
- `codeGenerationChain` and `codeFixChain` always use Claude (claude-sonnet-4-20250514)
- `codeReviewChain` always uses Gemini (gemini-2.0-flash)
- Never use the same model for generation and review — this is structural, not optional
- All chains live in `src/lib/chains/` — never call Anthropic or Google APIs directly in components

### LangChain Chains
All multi-step AI sequences use LangChain 0.3.x chains. Direct API calls are not permitted for pipeline steps. Single-step utility functions may call Claude directly but must be labelled:
```javascript
// NON-PIPELINE: direct AI call
```

Chains to implement (in order):
1. `consolidationChain` — merges all engagement inputs into structured brief (Claude)
2. `quickIdeasChain` — generates 3 solution options (Claude)
3. `deepAnalysisChain` — two-call deep analysis, 5 solutions (Claude)
4. `documentAGenerationChain` — Solution Options Summary PDF after Gate 2 approval (Claude)
5. `proposalGenerationChain` — generates A4 HTML business proposal PDF for chosen solution (Claude)
6. `proposalEditChain` — targeted BA-instructed edits to Document B without full rewrite (Claude)
7. `projectPlanChain` — interactive discovery + project plan generation + iteration loop (Claude)
8. `contextGenerationChain` — extracts domain vocabulary → CONTEXT.md (Claude)
9. `openspecGenerationChain` — generates OpenSpec files in client repo, epic by epic (Claude)
10. `codeGenerationChain` — generates code from OpenSpec (Claude)
11. `codeFixChain` — applies targeted fixes from Gemini review (Claude)
12. `codeReviewChain` — scores code on 5 dimensions (Gemini)
13. `reviewLoopChain` — orchestrates pre-check → Gemini review → fix cycles (Both)
14. `outputGenerationChain` — generates final A4 HTML documents (Claude)

### Gate Enforcement
- Gate state is always verified server-side in Vercel API routes (`/api/pipeline/...`)
- Frontend never controls pipeline progression — it only reflects state from Supabase
- Eight mandatory gates — nothing advances without a `gate_approvals` record in Supabase:
  - Gate 1: Brief Review
  - Gate 2: Solutions Review
  - Gate 3: Business Proposal (client-facing PDF, sent from app to client_email)
  - Gate 4: Client Decision and Context (BA selects chosen solution; optional supplementary context)
  - Gate 5: Project Plan (BA and Claude build structured project plan)
  - Gate 6: Spec Approval (OpenSpec files committed to client repo)
  - Gate 7: Code Review (Gemini scorecard + ESLint CC scores per file)
  - Gate 8: Output Review (final client documents)

### ESLint Complexity — Pre-check Behaviour
- CC 1–10: pass
- CC 11–20: error — auto-fed to codeFixChain before Gemini review runs
- CC 21+: untestable — pipeline PAUSES, BA notified via Teams, human decision required
- Never suppress complexity errors with eslint-disable comments

### Error Recovery Pattern
Every chain must follow this pattern:
```javascript
try {
  // chain execution
} catch (error) {
  await supabase.from('engagements').update({
    status: 'failed',
    last_successful_gate: lastApprovedGate,
    error_log: { message: error.message, chain: chainName, timestamp: new Date() }
  }).eq('id', engagementId)
  await triggerFailureNotification(engagementId, error)
  throw error
}
```

### Document Generation
- All PDFs use the `comotion-a4-html-template.html` standard — read this file before writing any document generation code
- Pipeline: Claude JSON → A4 HTML → Puppeteer (@sparticuz/chromium) → PDF → SharePoint
- Never use standard `puppeteer` — always `puppeteer-core` + `@sparticuz/chromium`
- Eleven documents per engagement:
  - Document A: Solution Options Summary PDF (after Gate 2, all approved options, not client-branded)
  - Document B: Business Proposal PDF (Gate 3, client-facing, Comotion-branded, chosen solution only)
  - As-Is Process Map PDF (after Gate 1 approval, internal + client validation)
  - Business Requirements Document (BRD) PDF (after Gate 1 approval, client sign-off)
  - Stakeholder Impact Assessment (SIA) PDF (after Gate 3 proposal sent, internal + client sponsor)
  - To-Be Process Map PDF (after Gate 6 approval, internal + client sign-off)
  - Requirements Traceability Matrix (RTM) PDF (progressive: initial after Gate 1, updated after Gate 6, finalised after Gate 7 — mandatory for financial services)
  - Business Readiness and Change Management Plan PDF (after Gate 7 approval, client-facing)
  - Final Client Brief PDF (Gate 8, client-facing)
  - Review Loop Report PDF (Gate 8, internal only, never sent to clients)
  - Project Summary PDF (Gate 8, internal only, full engagement audit trail, never sent to clients)

### Schema Rules
- Never store spec content in Supabase — specs live in the client GitHub repo
- `specifications` table stores `repo_path` and `commit_sha` only (pointers)
- `client_email` on `engagements` — captured at new engagement setup, used for Gate 3 proposal delivery
- Before writing any database query, check the Supabase Schema Reference skill

### Branch Naming for Generated Code
feature/{client-name}/{engagement-id}

Pipeline never merges to any branch. All merges are manual human decisions.

### Skills Available in This Project
Located in `.agents/skills/` — reference before implementing related functionality:
- `/caveman` — token-efficient generation (~75% reduction, full accuracy preserved)
- `/tdd` — red-green-refactor per user story
- `/zoom-out` — re-read codebase for context before applying fixes
- `/diagnose` — manual BA tool after Gate 7 only, not used in automated loop
- `/setup-matt-pocock-skills` — must run before `/to-issues`
- `/to-issues` — converts epics to GitHub issues