# Business Solutions Engine (BSE)

Comotion's internal platform for managing AI-powered client engagements. BAs capture client problems, generate and review solution options, and produce branded deliverables — all through a structured seven-gate pipeline.

---

## What It Does

**For BAs:** Replaces the manual process after a client meeting. Capture notes (guided questions, brain-dump, or transcript), run AI to structure a brief and generate solution options, review and edit at each gate, then produce client-ready documents and a full technical specification.

**For development:** The BSE ends at Spec Approval (Gate 6) and Output Package generation (Gate 7). It produces the client brief, solution options, business proposal, project plan, OpenSpec files, and final document package. It does not generate, review, or deploy client code — that is handled by a separate downstream Build microservice.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Deployment | Vercel (serverless) |
| Database | Supabase (Postgres + Auth + RLS) |
| AI Orchestration | LangChain 0.3.x |
| Content & Spec Generation | Claude (`claude-sonnet-4-20250514`) |
| PDF Generation | Puppeteer + `@sparticuz/chromium` |
| File Storage | Microsoft Graph API → SharePoint |
| Notifications | Power Automate (Teams + email) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- Anthropic API key (for AI pipeline)

### Install

```bash
npm install
```

### Environment Variables

Create `.env` in the project root (never commit):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
```

Server-side variables (Vercel environment or `.env.local`):

```env
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

### Commands

```bash
npm run dev       # Start dev server on http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Serve dist/ locally
npm run lint      # ESLint (cyclomatic complexity max 10 enforced)
```

---

## Project Structure

```
src/
  pages/          # Login, Dashboard, NewEngagement, EngagementDetail, IntakeForm
  pages/review/   # BriefReview (Gate 1), SolutionsReview (Gate 2), ProposalReview (Gate 3),
                  # ClientDecisionReview (Gate 4), ProjectPlanReview (Gate 5),
                  # SpecReview (Gate 6), OutputsReview (Gate 7)
  components/layout/Layout.jsx
  lib/            # supabase.js, auth.js
  lib/chains/     # LangChain chains: consolidation, quickIdeas, deepAnalysis, documentAGeneration,
                  # proposalGeneration, proposalEdit, buildInstructions, projectPlan,
                  # contextGeneration, openspecGeneration, outputGeneration
  lib/prompts/    # LangChain prompt templates
  hooks/          # useAuth.js
  App.jsx
api/pipeline/     # Vercel serverless routes: consolidate, quick-ideas, deep-analysis,
                  # gate1-approve, gate2-approve, gate3-*, gate4-approve, gate5-approve, plan-message
openspec/         # Spec-driven workflow config and change tracking
docs/             # Project instructions (BSE_Instructions_v5.7.md) and backlog
```

---

## The Seven-Gate Pipeline

```
Capture inputs (guided / brain-dump / transcript / client intake)
    ↓
[Gate 1] Brief Review          — BA reviews AI-structured problem brief
    ↓
[Gate 2] Solutions Review      — BA reviews and edits generated solution options
    ↓
[Gate 3] Business Proposal     — BA previews and sends Comotion-branded PDF to client
    ↓
[Gate 4] Client Decision       — BA records chosen solution and captures post-meeting context
    ↓
[Gate 5] Project Plan          — BA and Claude build structured project plan (three phases)
    ↓
[Gate 6] Spec Approval         — BA reviews OpenSpec files committed to client repo
    ↓
[Gate 7] Output Package        — BA approves final client document package for download
```

Gate state is always enforced server-side in Vercel API routes. The frontend reflects state — it never controls it.

---

## Analysis Modes

| Mode | Calls | Solutions | Fields |
|---|---|---|---|
| Quick Ideas | 1 | 3 | title, description, effort, impact, key_risk |
| Deep Analysis | 2 | 5 | title, description, feasibility, complexity, roi_framing, risks, sequencing, ai_central |

---

## Build Status

| Phase | Status |
|---|---|
| Phase 1 & 2 — Scaffold, auth, capture, intake | Complete |
| Phase 3 — LangChain + AI pipeline (Gates 1–5) | In progress |
| Phase 4 — Output generation (PDF, SharePoint) | Not started |
| Phase 5 — Power Automate (Teams + email) | Not started |
| Phase 6 — Integrations & polish | Not started |

**Phase 3 PRs merged:**
- **PR #1** — `consolidationChain`, Gate 1 brief review screen, pipeline button wiring, `client_email` field
- **PR #2** — `quickIdeasChain`, Gate 2 solutions generation UI, `SolutionsPendingSection`
- **PR #3** — `deepAnalysisChain` (two-call), `api/pipeline/deep-analysis.js`, `analysis_mode` routing
- **PR #4** — Gate 2 solutions review screen, `api/pipeline/gate2-approve.js`, numbered status stepper

---

## Key Conventions

- **No TypeScript** — JavaScript/JSX only
- **Cyclomatic complexity max 10** per function — enforced by ESLint, build-blocking
- **All AI pipeline steps use LangChain chains** — no direct API calls in pipeline routes
- **Gate state enforced server-side** — frontend never controls pipeline progression
- **Lazy model instantiation** — `ChatAnthropic` instantiated inside chain lambdas to prevent failures when API key is absent at module load time

See `CLAUDE.md` for the full coding conventions and pipeline rules.  
See `docs/BSE_Instructions_v5.7.md` for the complete project specification.
