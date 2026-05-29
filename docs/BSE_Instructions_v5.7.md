# Business Solutions Engine (BSE) — Full Project Instructions v5.7

**How to use this document** This is the complete operating manual for the BSE build project. You are a Claude instance in a dedicated build project. Your job is to implement the system described here. Read this document in full before writing any code. When in doubt, refer back here. This document is self-contained and supersedes all previous versions (v1.0, v2.0, v3.0, v4.0, v5.0, v5.1, v5.2, v5.3, v5.4, v5.5, v5.6) and all prior pipeline planning notes.

**What changed from v5.6** Sections 6.2, 6.3, 7.5, 7.7, 9, and 15 updated. Gate 5 redesigned as a three-phase process: Phase 1 — Build Instructions, Phase 2 — Epic Discovery, Phase 3 — Story and Task Generation. New chain: `buildInstructionsChain` (Claude) generates `CLIENT_BUILD_INSTRUCTIONS.md` from engagement data. `projectPlanChain` redesigned to orchestrate the three phases. Six new API routes replace the three v5.6 routes. New schema columns on `engagements`: `build_instructions`, `approved_epics`, `current_plan_phase`. New `gate_approvals` actions: `instructions_approved`, `epics_approved`, `epic_approved`. `plan_pending` status now covers all three phases; `current_plan_phase` tracks the active phase. See the change log at the end of this document for a full summary. [v5.7]

---

## 1. What Is the BSE?

The Business Solutions Engine (BSE) is Comotion's internal operational platform for the Business Solutions division. It solves two distinct but connected problems:

**Problem 1 — The BA workflow problem:** There is no structured system for converting client meeting content into structured problem briefs, generating solution options, and producing client-ready deliverables. Everything downstream of a Fireflies transcript is done manually and inconsistently.

**Problem 2 — The development pipeline problem:** There is no automated, reproducible pipeline for taking a structured specification and converting it into reviewed, tested, production-ready code. Development is ad hoc, review is manual, and quality is inconsistent.

The BSE solves both. It is simultaneously:
- A client engagement platform — capturing problems, generating solutions, producing branded deliverables
- A software development pipeline — orchestrating the full journey from requirements through to deployed, reviewed code

These are not two separate systems. They are two layers of the same platform, unified under one codebase, one data store, and one LangChain orchestration layer.

---

## 2. Who Uses This System

The BSE is operated entirely by Comotion's hybrid BA team. There is no handoff to a separate developer. The same person who captures the client problem at Gate 1 also approves generated code at Gate 7 and signs off on deliverables at Gate 8.

This is intentional. The Business Solutions division role is explicitly hybrid — BA, developer, and client liaison in one. The BSE is designed to support that model end to end.

| Layer | Who operates it | Gates involved |
|---|---|---|
| Capture & Brief | Hybrid BA | Gates 1–2 |
| Proposal | Hybrid BA | Gate 3 |
| Client Decision & Context | Hybrid BA | Gate 4 |
| Project Plan | Hybrid BA | Gate 5 |
| Specification | Hybrid BA | Gate 6 |
| Code Generation & Review | Hybrid BA | Gate 7 |
| Output & Delivery | Hybrid BA | Gate 8 |

Client interaction is limited to the intake form only (`/intake/[token]`). Clients never access the dashboard, review screens, or any internal pipeline view.

---

## 3. Problem Statement

### 3.1 BA Workflow Problems

| # | Problem | Impact |
|---|---|---|
| 1 | No standard process after a Fireflies transcript is captured | HIGH |
| 2 | Solution development is entirely manual and unsupported | HIGH |
| 3 | Document and deliverable creation is time-consuming and inconsistent | HIGH |
| 4 | No central record of engagements or institutional knowledge | MEDIUM |
| 5 | No structured way for clients to submit problems ahead of engagement | MEDIUM |

### 3.2 Development Pipeline Problems

| # | Problem | Impact |
|---|---|---|
| 6 | No automated path from specification to code | HIGH |
| 7 | Code quality review is manual, inconsistent, and often skipped | HIGH |
| 8 | No iterative quality loop — code is written once and shipped | HIGH |
| 9 | AI models used for generation and review are the same, creating bias | MEDIUM |
| 10 | No structured gate between specification approval and development start | MEDIUM |

### 3.3 Root Cause

Both problem sets share the same root cause: the Business Solutions division was stood up without operational infrastructure. The client proposition was correctly prioritised; the internal systems that make that proposition repeatable, scalable, and consistent were not built at the same time. The BSE closes that gap end to end.

---

## 4. Core Design Principles

These are non-negotiable. Every implementation decision must be validated against them.

1. **Human-in-the-loop at every critical step.** AI generates; humans approve. Nothing reaches a client without explicit team member sign-off. No code reaches production without human review of AI-generated quality scores.
2. **Two speeds, one pipeline.** Quick Ideas and Deep Analysis modes produce different output depth but run through identical infrastructure.
3. **Multiple combined inputs, structured output.** Any combination of the four capture input types can feed a single engagement. Output is always clean, consistent, and Comotion-branded regardless of input method.
4. **Separation of concerns in AI roles.** Claude generates; Gemini reviews. The model that writes code does not assess it. This is structural, not optional.
5. **LangChain as the orchestration spine.** All multi-step AI sequences are LangChain chains. Direct AI calls are not permitted for pipeline steps.
6. **Explicit error recovery.** On any chain failure, the engagement reverts to the last approved gate state. No silent failures. No stuck records. The BA always has a clear retry path.
7. **Composable for growth.** Built to add HubSpot, Power Platform extensions, Jira integration, and additional team members without redesigning core architecture.
8. **Comotion-branded end to end.** Every client-facing surface carries Comotion identity.

---

## 5. System Architecture

### 5.1 The Six Layers

```
┌──────────────────────────────────────────────────────────────────┐
│                        CAPTURE LAYER                             │
│  Guided Mode | Brain-dump | Fireflies Transcript | Client Intake │
│           (combinable — any mix for a single engagement)         │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI PROCESSING LAYER                           │
│   LangChain orchestration (inside Next.js / Vercel serverless)  │
│   Claude API — brief structuring + solution generation          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                  PROPOSAL LAYER                     [v5.1 NEW]   │
│   proposalGenerationChain — Claude generates A4 PDF              │
│   Business proposal: problem brief + approved solutions          │
│   BA reviews + sends to client from app via Power Automate       │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                  SPECIFICATION LAYER                             │
│   OpenSpec WHEN/THEN/AND format generated from brief+solutions   │
│   Spec files committed to client repo branch                     │
│   Jira integration deferred — repo is the source of truth        │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                  CODE GENERATION LAYER                           │
│   LangChain chain — Claude generates code via Anthropic API      │
│   OpenSpec files + CONTEXT.md passed as context                  │
│   /tdd skill active — red-green-refactor per user story          │
│   /caveman active — token-efficient generation                   │
│   Fallow hook — blocks commits introducing new dead code         │
│   Code committed to GitHub branch: feature/{client}/{id}         │
│   Preview deploy via Vercel MCP                                  │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                  REVIEW LOOP LAYER                               │
│   Pre-check: lint + ESLint complexity + type-check +             │
│              openspec validate --all --json    [v5.1 CHANGE]     │
│   ESLint CC 21+: pause for human decision      [v5.1 CHANGE]     │
│   LangChain chain — Gemini scores code on 5 dimensions           │
│   Fix loop: /zoom-out + codeFixChain + /caveman                  │
│   Review loop report generated and delivered after loop ends     │
│   At threshold (or max cycles): Gate 7 triggered                 │
└─────────────────────┬────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                OUTPUT + STORAGE LAYER                            │
│   A4 HTML → Puppeteer (@sparticuz/chromium) → PDF                │
│   Microsoft Graph API → SharePoint                               │
│   Power Automate — Teams + email notifications                   │
│   Supabase — all records, state, artefacts, scores, reports      │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Full Data Flow

```
Capture inputs (any combination)
  Guided Mode          ──┐
  Brain-dump           ──┤
  Fireflies Transcript ──┼──▶  Supabase: engagement_inputs table
  Client Intake Form   ──┘
                              │
                              ▼
                    LangChain: Consolidation Chain
                    Claude consolidates all inputs
                    → structured_brief (JSONB)
                              │
                    ┌─────────▼──────────────┐
                    │  GATE 1 — Brief Review │ ◀── BA edits / approves
                    │  Teams: client intake  │
                    │  submissions only      │
                    └─────────┬──────────────┘
                              │ [Approved]
                              ▼
                    LangChain: Solution Generation Chain
                    Claude: Quick Ideas (3) or Deep Analysis (5)
                    → solutions (JSONB)
                              │
                    ┌─────────▼──────────────────┐
                    │  GATE 2 — Solutions Review │ ◀── BA edits / approves
                    └─────────┬──────────────────┘
                              │ [Approved]
                              ▼
                    LangChain: proposalGenerationChain  [v5.1 NEW]
                    Claude generates A4 HTML business
                    proposal: problem brief + solutions
                    Puppeteer → PDF
                    Stored in SharePoint
                              │
                    ┌─────────▼──────────────────────────────────┐
                    │  GATE 3 — Business Proposal Review [v5.1]  │ ◀── BA previews PDF
                    │  BA previews Comotion-branded PDF          │     Approves or rejects
                    │  On approval: BA sends to client_email     │     Sends from app
                    │  via Power Automate                        │
                    └─────────┬──────────────────────────────────┘
                              │ [Approved + Sent]
                              ▼
                    ┌─────────▼──────────────────────────────────┐
                    │  GATE 4 — Client Decision & Context [v5.4] │ ◀── BA selects chosen
                    │  BA selects chosen solution (required)     │     solution; adds
                    │  Supplementary context: brain-dump /       │     context from client
                    │  transcript / guided — all optional        │     conversation
                    │  Or checks no-further-input                │
                    └─────────┬──────────────────────────────────┘
                              │ [Approved → plan_pending]
                              ▼
                    LangChain: projectPlanChain  [v5.6 NEW]
                    Claude asks iterative discovery questions
                    inside BSE chat interface; generates project
                    plan with epics, stories, tasks in markdown
                    and OpenSpec WHEN/THEN/AND format
                    Plan stored in engagements.project_plan
                              │
                    ┌─────────▼──────────────────────────────────┐
                    │  GATE 5 — Project Plan Review  [v5.6 NEW] │ ◀── BA reviews plan,
                    │  Interactive chat session in BSE           │     iterates with Claude,
                    │  BA can request changes; no round limit    │     approves
                    └─────────┬──────────────────────────────────┘
                              │ [Approved → spec_pending]
                              ▼
                    LangChain: CONTEXT.md Generation Chain
                    Claude extracts domain vocabulary from
                    chosen solution + approved brief + inputs
                    + approved project plan
                    → CONTEXT.md committed to client repo branch
                              │
                              ▼
                    LangChain: openspecGenerationChain
                    Claude generates spec in OpenSpec
                    WHEN/THEN/AND format epic by epic
                    from the approved project plan
                    Files committed to client repo branch
                    Spec stored in repo — not Supabase
                              │
                    ┌─────────▼──────────────────────────────────┐
                    │  GATE 6 — Spec Approval         [v5.1]     │ ◀── BA reviews OpenSpec
                    │  BA reviews OpenSpec markdown files        │     files directly
                    │  Epic by epic; per-epic gate_approvals     │     Rejects flag sections
                    └─────────┬──────────────────────────────────┘     for regeneration
                              │ [Approved]
                              ▼
                    Client repo setup:
                    /setup-matt-pocock-skills
                    openspec init + BSE custom schema
                    /git-guardrails installed
                    /to-issues → GitHub issues from epics
                    fallow hooks install --target agent
                              │
                              ▼
                    LangChain: Code Generation Chain
                    Claude generates code via Anthropic API
                    OpenSpec files + CONTEXT.md as context
                    /tdd: red-green-refactor per story
                    /caveman: token-efficient mode
                    Fallow hook: blocks commits with new
                    dead code, unused exports, violations
                    Code committed to branch
                    Version stored in Supabase: code_versions
                              │
                    ┌─────────▼────────────────────────────────────────┐
                    │  PRE-CHECK (automated)                [v5.1]     │
                    │  lint (no API cost)                              │
                    │  ESLint complexity rule:              [v5.1]     │
                    │    CC 1–10: green / warn — pass                  │
                    │    CC 11–20: error — auto-fed to fix loop        │
                    │    CC 21+: untestable — PAUSE, notify BA         │
                    │  type-check (no API cost)                        │
                    │  openspec validate --all --json                  │
                    │  Structural gaps caught before Gemini            │
                    └─────────┬────────────────────────────────────────┘
                              │ [Passed — or BA approves 21+ continuation]
                              ▼
                    ┌─────────▼────────────────────────────────────────┐
                    │  REVIEW LOOP (automated)                         │
                    │  Gemini scores on 5 dimensions                   │
                    │  Scores stored in Supabase: code_reviews         │
                    │  Below threshold → /zoom-out + codeFixChain →    │
                    │  Gemini re-reviews (max cycles: REVIEW_MAX_CYCLES)│
                    │  At threshold OR max cycles → Gate 7 triggered    │
                    │  Review loop report generated → Teams + email     │
                    └─────────┬────────────────────────────────────────┘
                              │ [Gate 7 triggered]
                    ┌─────────▼──────────────────┐
                    │  GATE 7 — Code Review       │ ◀── BA reviews Gemini
                    │  Human reviews scorecard,   │     scorecard + code
                    │  ESLint CC scores per file  │     All merges manual
                    │  review history, code diff  │
                    │  review_escalated flagged   │
                    │  prominently if max cycles  │
                    │  was reached                │
                    └─────────┬──────────────────┘
                              │ [Approved]
                              ▼
                    openspec archive
                    Specs merged into openspec/specs/ in
                    client repo as permanent record
                              │
                              ▼
                    LangChain: Output Generation Chain
                    A4 HTML → Puppeteer → PDF (final client docs)
                    Review loop report → PDF (internal)
                    → SharePoint via Graph API
                              │
                    ┌─────────▼──────────────────────┐
                    │  GATE 8 — Output Review         │ ◀── BA previews
                    │  Teams + email confirmation     │     client docs only
                    │  always fires on approval       │     Scorecard never
                    └─────────┬──────────────────────┘     in client docs
                              │ [Approved]
                              ▼
                    Supabase: status = "complete"
                    Power Automate: Teams + email with SharePoint links
```

---

## 6. LangChain Architecture

### 6.1 Overview

LangChain runs inside the BSE — within the Next.js application, executed via Vercel serverless API routes (`/api/pipeline/...`). There is no separate LangChain service. All chains are defined in `src/lib/chains/`.

**Pinned version:** `langchain@0.3.x` (latest stable 0.3). Required packages:

```
langchain@^0.3.0
@langchain/anthropic@^0.3.0
@langchain/google-genai@^0.3.0
```

Pin these versions explicitly in `package.json`. Do not use `latest` — LangChain has breaking changes between minor versions.

LangChain is used for all multi-step AI sequences. Direct AI API calls are not permitted for any pipeline step. Simple single-call utility functions (e.g. a one-off clarifying question) may call Claude directly but must be clearly labelled with a comment: `// NON-PIPELINE: direct AI call`.

### 6.2 Chains to Implement [v5.1 CHANGE] [v5.5 CHANGE] [v5.6 CHANGE] [v5.7 CHANGE]

`proposalGenerationChain` is added as a new chain between `deepAnalysisChain` and `contextGenerationChain`. Gate numbering updated throughout.

**Gate 4 — no AI chain:** Gate 4 (Client Decision and Context) is pure human input capture. No AI chain runs at this gate. After Gate 4 approval, Gate 5 begins with `buildInstructionsChain` running automatically to produce `CLIENT_BUILD_INSTRUCTIONS.md`. [v5.4] [v5.6 CHANGE] [v5.7 CHANGE]

**Gate 5 — three-phase process:** Gate 5 (Project Plan) is a three-phase process. Phase 1 runs `buildInstructionsChain` to produce `CLIENT_BUILD_INSTRUCTIONS.md`. Phase 2 uses `projectPlanChain` for epic discovery via iterative chat. Phase 3 uses `projectPlanChain` to generate stories and tasks for each approved epic. `current_plan_phase` on `engagements` tracks the active phase. See Section 7.5 for full detail. [v5.6 NEW] [v5.7 REDESIGN]

| Chain | File | Description |
|---|---|---|
| consolidationChain | chains/consolidation.js | Merges all engagement inputs into a structured brief |
| quickIdeasChain | chains/quickIdeas.js | Single-call Quick Ideas solution generation |
| deepAnalysisChain | chains/deepAnalysis.js | Two-call sequential Deep Analysis (brief → solutions) |
| proposalGenerationChain | chains/proposalGeneration.js | Generates A4 HTML business proposal PDF (Document B) from chosen solution + additional context + original structured brief |
| proposalEditChain | chains/proposalEdit.js | Makes targeted edits to an existing proposal based on BA natural language instructions. Does not rewrite — only modifies the specified section or aspect. Uses Claude. [v5.5] |
| buildInstructionsChain | chains/buildInstructions.js | Generates CLIENT_BUILD_INSTRUCTIONS.md from engagement data (structured_brief, chosen_solution, engagement_inputs, industry) [v5.7 NEW] |
| projectPlanChain | chains/projectPlan.js | Redesigned three-phase: generateBuildInstructions, discoverEpics, generateEpicStories [v5.7 REDESIGN] |
| contextGenerationChain | chains/contextGeneration.js | Extracts domain vocabulary from chosen solution + brief + inputs → CONTEXT.md |
| openspecGenerationChain | chains/openspecGeneration.js | Generates spec in OpenSpec WHEN/THEN/AND format epic by epic; commits to client repo |
| codeGenerationChain | chains/codeGeneration.js | Generates code from OpenSpec files via Anthropic API (Claude) |
| codeFixChain | chains/codeFix.js | Applies targeted fixes from Gemini review issues (Claude) |
| codeReviewChain | chains/codeReview.js | Reviews code on 5 dimensions (Gemini) |
| reviewLoopChain | chains/reviewLoop.js | Orchestrates pre-check → Gemini review → fix cycles |
| outputGenerationChain | chains/outputGeneration.js | Generates final A4 HTML documents after Gate 7 approval |

### 6.3 Model Assignment [v5.5 CHANGE] [v5.6 CHANGE] [v5.7 CHANGE]

| Chain | Model | Reason |
|---|---|---|
| consolidationChain | Claude (claude-sonnet-4-20250514) | Structured brief generation |
| quickIdeasChain | Claude (claude-sonnet-4-20250514) | Solution generation |
| deepAnalysisChain | Claude (claude-sonnet-4-20250514) | Deep solution generation |
| proposalGenerationChain | Claude (claude-sonnet-4-20250514) | Business proposal document generation |
| proposalEditChain | Claude (claude-sonnet-4-20250514) | Targeted proposal editing based on BA instructions [v5.5] |
| buildInstructionsChain | Claude (claude-sonnet-4-20250514) | Build instructions document generation [v5.7 NEW] |
| projectPlanChain | Claude (claude-sonnet-4-20250514) | Three-phase project planning — build instructions, epic discovery, story generation [v5.7 REDESIGN] |
| contextGenerationChain | Claude (claude-sonnet-4-20250514) | Domain vocabulary extraction |
| openspecGenerationChain | Claude (claude-sonnet-4-20250514) | OpenSpec file generation |
| codeGenerationChain | Claude (claude-sonnet-4-20250514) | Code generation |
| codeFixChain | Claude (claude-sonnet-4-20250514) | Fix application |
| codeReviewChain | Gemini (gemini-2.0-flash) | Independent review — must never be same model as generator |
| reviewLoopChain | Both | Orchestrates Claude fix → Gemini review cycles |
| outputGenerationChain | Claude (claude-sonnet-4-20250514) | Final document content generation |

**Critical rule:** `codeGenerationChain` and `codeFixChain` always use Claude. `codeReviewChain` always uses Gemini. This separation is structural and non-negotiable. If model assignments change in future, this separation must be explicitly preserved.

### 6.4 Review Loop Logic [v5.1 CHANGE]

ESLint complexity scoring is now added to the pre-check stage. A CC score of 21+ pauses the loop for human decision rather than blocking outright. The Gate 7 review screen displays per-file CC scores alongside the Gemini scorecard.

```
reviewLoopChain:
  1. Receive committed code from codeGenerationChain
  2. Run pre-check:
       a. Lint (no API cost)
       b. ESLint complexity rule (no API cost):          [v5.1 CHANGE]
            CC 1–5:   Simple — green, pass
            CC 6–10:  Moderate — warn, pass
            CC 11–20: Complex — error, auto-fed to fix loop before Gemini
            CC 21+:   Untestable — PAUSE loop, notify BA via Teams
                      BA decides: approve continuation or reject for refactor
                      Pipeline resumes only on explicit BA confirmation
       c. Type-check (no API cost)
       d. openspec validate --all --json (spec alignment check)
       If pre-check fails (lint, type, spec): surface issues to BA, halt loop
       If CC 21+ and BA rejects: codeFixChain targets those files first
       If CC 21+ and BA approves: loop continues to Gemini with flag recorded
  3. Call codeReviewChain (Gemini) → scorecard
  4. Store scorecard in Supabase: code_reviews
  5. Check: all 5 dimension scores ≥ threshold?
     YES → trigger Gate 7 (human approval)
     NO  → enter fix loop:
       a. /zoom-out: re-read codebase for context
       b. Pass scorecard issues to codeFixChain (Claude)
          Fix only flagged issues. Write regression test per fix.
          Do not refactor beyond flagged issues.
       c. /caveman active throughout fix loop
       d. Commit fixed version to same branch
       e. Return to step 2
  6. Max iterations: REVIEW_MAX_CYCLES (default: 5, env var)
     If max reached without threshold:
       → trigger Gate 7 with review_escalated = true
       → flag prominently in Gate 7 UI
  7. On loop completion (threshold met OR max cycles):
       → generate review_loop_report
       → store in Supabase: review_loop_reports table
       → deliver via Power Automate → Teams + Outlook email
```

### 6.5 Review Loop Report

Generated after every review loop completion. Delivered via Power Automate to both Teams and Outlook email. Also saved as an internal PDF to SharePoint alongside client documents.

Contents:
- Total cycle count
- Per-cycle scores for all 5 dimensions
- Per-cycle ESLint CC scores per file (with colour-coded severity) [v5.1 CHANGE]
- Issues identified per cycle
- Fixes applied per cycle
- Final threshold result (met / not met / escalated)
- CC 21+ pause events and BA decisions if any [v5.1 CHANGE]
- Total time taken (loop start to Gate 7 trigger)
- Models used (generator and reviewer)
- `review_escalated` flag if applicable

### 6.6 Review Dimensions and Thresholds

Gemini evaluates code on five dimensions. Each scored 1–10. Default threshold: 7/10 on all dimensions (configurable via `REVIEW_THRESHOLD_DEFAULT` env var, and per-engagement via `specifications.review_thresholds`).

**Precedence:** Per-engagement threshold in `specifications.review_thresholds` takes precedence over the env var default when set.

| Dimension | What Gemini evaluates |
|---|---|
| Complexity / Maintainability | Cyclomatic complexity, naming clarity, modularity, readability |
| Test Coverage | Unit tests present, edge cases covered, test quality |
| Security Vulnerabilities | Injection risks, exposed secrets, auth bypass paths, OWASP top 10 |
| Alignment with Requirements | Code implements what the spec requires, no scope creep, no gaps |
| Performance / Efficiency | Unnecessary re-renders, N+1 queries, unoptimised loops, memory leaks |

ESLint complexity scoring runs independently in pre-check and is displayed separately on the Gate 7 screen — it is not one of Gemini's five dimensions. The two signals are complementary: ESLint gives a per-file objective CC score; Gemini gives a holistic subjective complexity assessment across the full codebase.

**Gemini scorecard JSON:**

```json
{
  "scores": {
    "complexity": 8,
    "test_coverage": 6,
    "security": 9,
    "requirements_alignment": 8,
    "performance": 7
  },
  "issues": [
    {
      "dimension": "test_coverage",
      "severity": "high",
      "description": "string",
      "file": "string",
      "line_range": "string",
      "suggested_fix": "string"
    }
  ],
  "threshold_met": false,
  "summary": "string"
}
```

**ESLint complexity report JSON (stored per pre-check cycle):** [v5.1 CHANGE]

```json
{
  "files": [
    {
      "path": "string",
      "max_cc": 12,
      "severity": "error",
      "functions": [
        {
          "name": "string",
          "cc": 12,
          "line": 42
        }
      ]
    }
  ],
  "has_untestable": false,
  "has_errors": true,
  "summary": "string"
}
```

---

## 7. Component Breakdown

### 7.1 Web Application — Dashboard

**Technology:** React (with Vite), Tailwind CSS, deployed on Vercel

**Pages / Views:**
- `/` — Engagement list. Status, client name, team member, date, mode, input types, link to outputs.
- `/new` — New engagement. Select input types and mode. Capture client email address. [v5.1 CHANGE] **Note:** Deep Analysis is the default mode. Quick Ideas is opt-in — the BA must explicitly select it. [v5.5]
- `/engagements/[id]` — Engagement detail. Full record, gate status, AI outputs, approval controls.
- `/review/[id]/brief` — Gate 1 review.
- `/review/[id]/solutions` — Gate 2 review. Includes supplementary context panel — capture input tabs remain accessible at gate2_review status to allow the BA to add new inputs before Gate 3. A banner prompts re-run of consolidationChain and solution generation if new input is added.
- `/review/[id]/proposal` — Gate 3 review. BA selects chosen solution, adds supplementary context, reviews and edits Document B in a loop until satisfied, then approves. [v5.5 CHANGE]
- `/review/[id]/client-decision` — Gate 4 client decision. BA selects chosen solution from approved options (required, radio button selection), adds supplementary context via brain-dump, transcript, or guided questions (all optional), or checks no-further-input. Advances to plan_pending on approval. [v5.4 NEW]
- `/review/[id]/project-plan` — Gate 5 project plan review. Chat-like interface. BA reviews and iterates on the project plan with Claude. Approves when satisfied. [v5.6 NEW]
- `/review/[id]/spec` — Gate 6 spec review. Renders OpenSpec markdown files. Sections flaggable for regeneration.
- `/review/[id]/code` — Gate 7 code review. Gemini scorecard, ESLint CC scores per file, per-cycle review history, diff view, escalation flag. [v5.1 CHANGE]
- `/review/[id]/outputs` — Gate 8 output preview and final approval. Client documents only — no scorecard.
- `/intake/[token]` — Client intake form (public, token-protected, Comotion-branded).

**Auth:** Supabase Auth. Email/password now; M365 SSO in Phase 6. Client intake form is unauthenticated but requires a valid token.

### 7.2 Capture Module — Four Input Types

All four input types feed into the same Supabase engagement record and can be combined.

**Input Type 1 — Guided Mode**
Multi-step form, one question at a time. Progress saved after each step. 14 questions across 5 sections (A–Context, B–Problem, C–Impact, D–Constraints, E–Success). Questions confirmed for build; team reviews before Phase 3 goes live.

**Input Type 2 — Brain-dump Mode**
Single text area. Free-form input. Claude structures it; asks one clarifying question if ambiguous. Labelled `// NON-PIPELINE: direct AI call`.

**Input Type 3 — Audio Transcript (Fireflies)**
- Phase 3: Paste mode — team member pastes transcript text.
- Phase 6: API mode — auto-retrieve by meeting reference.

**Input Type 4 — Client Intake Form (`/intake/[token]`)**
Token-protected public URL. UUID generated by BA. On submission: Supabase record updated; BA notified via Power Automate → Teams. Gate 1 mandatory before AI processing.

**Input combination logic:** All inputs stored in `engagement_inputs`. On pipeline trigger, all passed to `consolidationChain` with explicit type labelling. Claude produces one consolidated brief.

### 7.3 Gate 3 — Client Decision, Proposal and Confirmation Loop [v5.5]

Gate 3 is the Client Decision, Proposal and Confirmation Loop. It combines three things: the BA recording the client's chosen solution, capturing additional context from the client conversation, and generating and refining the full Comotion-branded business proposal (Document B) until the BA is satisfied.

**What happens at Gate 3:**

1. BA selects the chosen solution from the approved options (required — radio button selection)
2. BA adds supplementary context from the client conversation via brain-dump, transcript, guided questions, or natural language agent prompts directed at the proposal (all optional)
3. `proposalGenerationChain` generates Document B — full Comotion-branded A4 proposal based on chosen solution + additional context + original structured brief. This replaces the current proposal generation trigger.
4. BA reviews Document B in the app. Can:
   a. Edit inline
   b. Type a natural language instruction (e.g. "emphasise the compliance risk in section 2", "add a paragraph about the integration approach") — `proposalEditChain` makes targeted edits without rewriting the whole document
   c. Add more context and regenerate
5. Loop continues until BA approves
6. On approval: "Send to Client" option available from within BSE — BA decides whether to send from BSE or share externally. Document B filed to SharePoint automatically regardless.
7. Rollback available: if client changes mind after Gate 3, BA can roll back to Gate 2 solutions screen with all original solutions intact. Status reverts to `gate2_review`.

`proposalGenerationChain` input: chosen solution + all `engagement_inputs` + `engagements.structured_brief` (not all solutions — only the chosen one)

### 7.5 Gate 5 — Project Plan [v5.6 NEW] [v5.7 REDESIGN]

Gate 5 is the Project Plan review. It is a three-phase process conducted inside the BSE at `/review/:id/project-plan`. The session begins immediately after Gate 4 approval (status = `plan_pending`, `current_plan_phase = 1`).

**Phase 1 — Build Instructions**

`buildInstructionsChain` runs automatically when the BA opens the Gate 5 screen for the first time. It reads `structured_brief`, `chosen_solution`, all `engagement_inputs`, and `industry` from the engagement and produces `CLIENT_BUILD_INSTRUCTIONS.md` — a structured technical brief that defines the scope, constraints, integration points, and guiding principles for the build. This document is the foundation for epic discovery in Phase 2.

The BA reviews the generated `CLIENT_BUILD_INSTRUCTIONS.md` inline. They can:
- Edit the document directly
- Type a natural language instruction to revise a section (e.g. "expand the integration constraints section", "add a note about regulatory compliance requirements")
- Regenerate the document if the brief was insufficient

On approval: a `gate_approvals` record is inserted (`gate_number = 5`, `action = 'instructions_approved'`). `engagements.build_instructions` is updated with the approved content. `current_plan_phase` advances to `2`.

**Phase 2 — Epic Discovery**

With the approved build instructions as context, `projectPlanChain` enters a chat-like discovery session to identify and define the epics for the engagement. Claude proposes an initial epic list based on the build instructions and chosen solution, then refines it through conversation with the BA.

Topics covered during epic discovery:
- Capability areas required to deliver the chosen solution
- Dependencies between epics and preferred delivery order
- Phased delivery vs big-bang approach
- MVP scope vs full scope per epic
- Technical constraints that affect epic boundaries
- Success metrics per capability area

The BA can:
- Accept Claude's proposed epic list
- Request additions, removals, or merges ("split the data pipeline epic into two", "merge auth and user management")
- Provide additional context that reshapes the epic structure

There is no limit on discovery rounds. Claude proposes; the BA decides.

On approval: a `gate_approvals` record is inserted (`gate_number = 5`, `action = 'epics_approved'`). `engagements.approved_epics` is updated with the final list (`[{title, description, rationale}]`). `current_plan_phase` advances to `3`.

**Phase 3 — Story and Task Generation**

For each epic in `engagements.approved_epics`, `projectPlanChain` generates the detailed user stories and tasks. Epics are processed one at a time. The BA reviews and approves each epic's stories before the next epic is generated.

Each epic generates:
- **User stories** — in standard format (As a / I want / So that)
- **Acceptance criteria** — testable conditions per story
- **Tasks** — implementation-level breakdown within each story
- **OpenSpec scenarios** — WHEN/THEN/AND format, ready for Gate 6 spec generation

The BA can request changes to an epic's stories before approving it ("add a story for bulk import", "split the reporting story — one for dashboards, one for exports"). Claude updates the epic iteratively. There is no limit on rounds per epic.

On approval of each epic: a `gate_approvals` record is inserted (`gate_number = 5`, `action = 'epic_approved'`), with the epic title recorded in `edits_made`. After all epics are approved, status advances to `spec_pending`. The full approved plan (all epics with stories, tasks, and OpenSpec scenarios) is stored in `engagements.project_plan` (JSONB). The full conversation history across all three phases is stored in `engagements.plan_conversation` (JSONB).

**Chains:**
- `buildInstructionsChain` (Claude, claude-sonnet-4-20250514) — Phase 1
- `projectPlanChain` (Claude, claude-sonnet-4-20250514) — Phases 2 and 3

**New API routes:**
- `POST /api/pipeline/plan-build-instructions` — triggers `buildInstructionsChain`; returns generated `CLIENT_BUILD_INSTRUCTIONS.md` content
- `POST /api/pipeline/gate5-approve-instructions` — validates `current_plan_phase === 1`; inserts `gate_approvals` (`gate_number: 5`, `action: 'instructions_approved'`); stores `build_instructions`; advances `current_plan_phase` to 2
- `POST /api/pipeline/plan-discover-epics` — receives BA message during epic discovery; returns Claude's response (proposed epic list or refinement)
- `POST /api/pipeline/gate5-approve-epics` — validates `current_plan_phase === 2`; inserts `gate_approvals` (`gate_number: 5`, `action: 'epics_approved'`); stores `approved_epics`; advances `current_plan_phase` to 3
- `POST /api/pipeline/plan-generate-epic-stories` — generates stories and tasks for the next unprocessed epic in `approved_epics`; returns stories in markdown and OpenSpec format
- `POST /api/pipeline/gate5-approve-epic` — validates `current_plan_phase === 3`; inserts `gate_approvals` (`gate_number: 5`, `action: 'epic_approved'`, epic title in `edits_made`); if all epics approved: stores `project_plan`, stores `plan_conversation`, advances `status` to `spec_pending`

**New page:** `src/pages/review/ProjectPlanReview.jsx` — renders all three phases as a stepped interface; phase indicator shows current phase (1/2/3); each phase has its own panel

After Gate 5 approval, `contextGenerationChain` runs once to produce `CONTEXT.md` and `docs/adr/` entries. Then `openspecGenerationChain` runs epic by epic — one capability folder per epic in the approved project plan. The BA reviews specs one epic at a time at Gate 6.

### 7.4 Gate 6 — Spec Review Detail [v5.6 CHANGE]

Gate 6 reviews OpenSpec files committed to the client repo, not a JSON object stored in Supabase. The BA approves the exact files Claude Code reads. There is no translation step between what is approved and what drives code generation.

Gate 6 is the most consequential technical gate. All code generation is downstream of what is approved here.

**What happens before Gate 6:**

After Gate 5 approval, two chains run in sequence:

`contextGenerationChain` runs once after Gate 5 approval — Claude reads the chosen solution, approved brief, all engagement inputs, and the approved project plan and produces `CONTEXT.md` (domain vocabulary, key terms, architectural decisions) and `docs/adr/` entries for the client repo.

`openspecGenerationChain` generates specs epic by epic from the approved project plan. Each epic in `engagements.project_plan` becomes one capability folder under `openspec/changes/{engagement-id}/specs/`. The BA reviews and approves each epic's spec at Gate 6 before code generation for that epic begins. User stories become `### Requirement:` headers with `#### Scenario:` blocks in WHEN/THEN/AND syntax. Acceptance criteria become scenario steps. Files are committed to the client repo branch. The `specifications` table in Supabase stores `repo_path` and `commit_sha` — not the spec content itself.

**What the BA sees at Gate 6:**
- OpenSpec markdown files rendered in the BSE UI (not a form, not a JSON viewer)
- Each capability folder (epic) rendered as a collapsible section
- Narrative fields in requirements are editable inline
- Each section has a "Regenerate this section" button — flags that section for independent regeneration without affecting approved sections

**Rejection flow:**
1. BA flags one or more sections for regeneration
2. On submission, `openspecGenerationChain` is called only for flagged sections
3. Unflagged sections retain their approved content
4. Gate 6 review screen reloads with regenerated sections highlighted for re-review
5. BA approves or flags again until satisfied

**Approval:** Commits final spec state to branch. Updates `specifications` table with `commit_sha` and `approved_at`. Gate 6 approval records are per-epic — one `gate_approvals` record per approved epic. After the final epic spec is approved, status advances to `code_pending` for the first epic.

### 7.6 Code Generation Layer

Code generation uses the Anthropic API directly with OpenSpec artifact content as context. A pre-check stage (including ESLint complexity), Fallow hook, and Gemini review loop follow.

**Client repo setup (runs once after Gate 6 approval):**

Before code generation begins, the BSE performs client repo setup:

- `openspec init` — scaffolds OpenSpec in the client repo with the BSE-specific schema
- `/setup-matt-pocock-skills` — configures issue tracker, triage label vocabulary, and domain doc layout. This must run before `/to-issues`. Without it, `/to-issues` creates issues without proper metadata silently.
- `/git-guardrails` — installs Claude Code hooks blocking dangerous git operations (push, reset --hard, clean) during generation
- `/to-issues` — converts approved epics into GitHub issues as vertical slices with acceptance criteria and dependency ordering
- `fallow hooks install --target agent` — installs the Fallow PreToolUse gate into `.claude/settings.json`. Intercepts every git commit Claude attempts and runs `fallow audit --changed-since main --format json`. If verdict is `fail` (new dead code, unused exports, circular dependencies, boundary violations introduced), the commit is blocked and findings are fed back to Claude to fix before retrying. Uses `gate=new-only` mode — existing issues in the repo do not penalise generated code.

**Code generation (`codeGenerationChain`):**

Claude generates code modules via the Anthropic API. The OpenSpec files and `CONTEXT.md` are passed as context in the system prompt.

Two skills are active during generation:
- `/tdd` — enforces red-green-refactor per user story. For each requirement, Claude writes a failing test first, then the minimum code to pass it, then refactors. Test coverage is baked into generation rather than added after.
- `/caveman` — activated throughout generation and fix cycles. Reduces token usage approximately 75% by stripping filler while preserving all technical accuracy.

Each module is committed to `feature/{client-name}/{engagement-id}`. The Fallow hook intercepts each commit attempt and blocks any that introduce new dead code or violations. Preview deployed via Vercel MCP. Version metadata stored in `code_versions`.

All merges are manual. The pipeline never merges to any branch. A human decides when and where generated code is merged.

**Pre-check (runs before every Gemini review cycle):** [v5.1 CHANGE]

Before `codeReviewChain` is called, the following run in sequence:
1. Lint (no API cost)
2. ESLint complexity rule (no API cost) — produces per-file CC scores:
   - CC 1–10: pass (green/warn)
   - CC 11–20: error — files fed to `codeFixChain` before Gemini runs. Claude refactors only the flagged functions.
   - CC 21+: untestable — loop pauses. BA notified via Teams with file list and CC scores. BA approves continuation or rejects for refactor. Pipeline does not proceed until explicit BA decision recorded in `gate_approvals` (`gate_number = 7`, `action = 'cc_pause_approved'` or `'cc_pause_rejected'`).
3. Type-check (no API cost)
4. `openspec validate --all --json` — checks structural alignment between code and spec. Catches missing endpoints, unimplemented user stories, schema mismatches.

If pre-check fails (lint, type, spec), the issues are surfaced to the BA and the Gemini review cycle does not run. Structural errors are cheaper to fix before Gemini scores them.

**Epic-by-epic build loop:** Code generation, pre-check, Gemini review, and BA approval all operate per epic. For each epic in `engagements.project_plan`:
1. `codeGenerationChain` generates code for the epic's user stories
2. Pre-check runs (lint + ESLint complexity + type-check + `openspec validate`)
3. Gemini review loop runs
4. Gate 7 is triggered — BA reviews Gemini scorecard, ESLint CC scores, and compares the epic from the project plan with the generated spec AND the code output before approving
5. Each epic has its own `gate_approvals` record (`gate_number = 7`)
6. A full build report is generated after each epic
7. `current_epic_index` on `engagements` tracks which epic is currently being built

Only after all epics are approved does status advance to `output_pending`.

**Fix loop (`/zoom-out` + `codeFixChain`):**

When Gemini scores below threshold:
1. `/zoom-out` is called first — re-reads the codebase to restore full context before applying fixes
2. `codeFixChain` applies fixes: only what Gemini flagged, with a regression test written for each fix
3. No refactoring beyond flagged issues
4. `/caveman` active throughout
5. New version committed to same branch, loop returns to pre-check

`/diagnose` is available to the BA as a manual tool after Gate 7 for deep investigation of specific issues before deciding to approve or reject. It is not used in the automated loop.

### 7.7 Error Recovery

On any chain failure:
1. `engagement.status` → `'failed'`
2. `engagement.last_successful_gate` is set to the last gate number with an approved `gate_approvals` record. Exception: during contextual re-injection regeneration at `gate2_review`, `last_successful_gate` is set to `2` regardless of whether a Gate 2 approval record exists — this correctly signals that Gate 1 is complete and the BA should retry regeneration, not restart from capture.
3. Error details stored in `engagement.error_log` (JSONB)
4. BA notified via Teams with engagement link and error summary
5. BA retries from the dashboard — pipeline resumes from `last_successful_gate`

**State machine with error paths:**

```
captured → brief_pending → gate1_review → solutions_pending → gate2_review
→ proposal_pending → gate3_review → gate4_review
→ plan_pending → gate5_review
→ spec_pending → gate6_review
→ code_pending → code_review → gate7_review
→ output_pending → gate8_review → complete

Any state → failed (on chain error)
failed → [last_successful_gate state] (on BA retry)
```

**Note:** `plan_pending` covers all three phases of Gate 5 — `current_plan_phase` tracks which phase is active (1 = Build Instructions, 2 = Epic Discovery, 3 = Story and Task Generation). Sub-states plan_phase1, plan_phase2, plan_phase3 are represented by the `current_plan_phase` value within `plan_pending` status. On error recovery, the BA re-enters the same phase they were on — `current_plan_phase` is not reset on retry. [v5.7]

### 7.8 Human-in-the-Loop Gates [v5.1 CHANGE] [v5.4 CHANGE] [v5.5 CHANGE] [v5.6 CHANGE]

Eight mandatory approval gates. Status enforced server-side in every Vercel API route. Frontend only reflects state — never controls it.

| Gate | Trigger | BA Action | Notification |
|---|---|---|---|
| Gate 1 — Brief Review | Claude produces structured brief | Review, edit inline, approve or reject | Teams: client intake only |
| Gate 2 — Solutions Review | Claude generates solutions | Edit, reorder, remove, add notes, approve. Add supplementary inputs at gate2_review if needed; banner offers to regenerate brief and solutions with updated context; Gate 2 approval resets on regeneration. | None |
| Gate 3 — Client Decision, Proposal and Confirmation Loop | Gate 2 approved and Document A generated | Select chosen solution (required); add context via any input method or agent prompt (optional); review and edit Document B in loop until satisfied; approve and optionally send to client | Power Automate: Document B filed to SharePoint on approval; send to client optional from BSE [v5.5] |
| Gate 4 — Client Decision and Context | Gate 3 approved and sent | Select chosen solution from approved options (required); add supplementary context via brain-dump, transcript, or guided questions (all optional); or check no-further-input if no additional context. Advances to plan_pending on approval. | None |
| Gate 5 — Project Plan | Gate 4 approved; status = plan_pending | Review project plan in interactive chat-like interface; iterate with Claude (no round limit); approve | None |
| Gate 6 — Spec Approval | OpenSpec files committed to client repo per epic from approved project plan | Review OpenSpec markdown; flag sections for regeneration; approve | None |
| Gate 7 — Code Review | Review loop completes (threshold or max cycles) | Review Gemini scorecard, ESLint CC scores, build report, code diff; compare epic from project plan against generated spec and code output; approve each epic. `/diagnose` available manually. | Teams: CC 21+ pause events only |
| Gate 8 — Output Review | A4 HTML PDFs generated | Preview client documents; approve or reject | Teams + email always |

**Note:** Rollback to Gate 2 available at Gate 3 if client changes mind after Gate 3 approval. Status reverts to `gate2_review` with all original solutions intact. [v5.5]

### 7.9 Output Generation Layer

**Pipeline:** Claude JSON → A4 HTML template → Puppeteer (`@sparticuz/chromium`) → PDF → Microsoft Graph API → SharePoint

This is a mandatory standard. See Section 11 for full detail.

Before output generation, `openspec archive` runs: BSE calls `openspec archive {engagement-id}`. Spec files from `openspec/changes/` are merged into `openspec/specs/` as the permanent capability record in the client repo. This runs automatically after Gate 7 approval and before `outputGenerationChain`.

**Documents generated per engagement:**
1. **Solution Options Summary PDF** (Document A) — all approved solution options in a clean 1–2 page format. Generated automatically after Gate 2 approval. Filed to SharePoint at `[ClientName]_[YYYY-MM-DD]_SolutionOptions.pdf`. Visible in BSE for BA to share externally however they choose — no forced send. Not a formal branded proposal. Contains: problem summary, all solution options with title, description, effort, impact, key risk, and sequencing. [v5.5 NEW]
2. **Business Proposal PDF** (Document B) — Comotion-branded A4 proposal for the chosen solution. Generated at Gate 3. Client-facing. BA decides whether to send from BSE or share externally. [v5.5 CHANGE]
3. **Final Client Brief PDF** — refined post-spec summary. Generated at Gate 8. Client-facing. No scorecard data.
4. **Review Loop Report PDF** — internal. Full review cycle detail including ESLint CC scores. Stored alongside client docs in SharePoint `_internal/` subfolder. Never sent to clients.
5. **Project Summary PDF** — internal. Complete engagement audit trail including approved brief, approved solutions, gate approval trail with timestamps, Gemini scorecard, ESLint CC summary, review loop summary, and team member name. Generated at Gate 8. Never sent to clients. Stored at `Business Solutions/[ClientName]/[YYYY]/[ClientName]_[YYYY-MM-DD]_ProjectSummary.pdf`. [v5.2 NEW]

**SharePoint upload failure recovery — Project Summary PDF only:** [v5.2 NEW]
Upload failure is a blocking condition with three tiers of recovery:
- **Tier 1 — Automatic retry:** up to 3 attempts with exponential backoff (1s, 2s, 4s). No BA involvement.
- **Tier 2 — BA retry:** if all auto-retries fail, Gate 8 is blocked at `gate8_review`. BA notified via Power Automate Teams with error and link. BA triggers retry from the Gate 8 review screen without rerunning full output generation. Each BA retry increments `engagements.project_summary_upload_attempts`.
- **Tier 3 — Manual escape hatch:** after `project_summary_upload_attempts >= 2`, a "Mark as manually uploaded" button appears. BA confirms with a mandatory note. Recorded in `gate_approvals` with `action = 'manual_override'` and note in `edits_made`. Engagement advances to `complete`. The system is never permanently blocked by a SharePoint outage.

---

## 8. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Device-agnostic; already scaffolded |
| Deployment | Vercel (serverless Node.js) | MSAL, Puppeteer, and pptxgenjs are not edge-compatible — serverless only |
| Database | Supabase (Postgres) | Auth, RLS, real-time — already in stack |
| AI Orchestration | LangChain 0.3.x | Pin exact version — breaking changes between minors |
| Code Generation AI | Claude (claude-sonnet-4-20250514) | Structured output; financial services framing |
| Code Review AI | Gemini (gemini-2.0-flash) | Independent reviewer; must always differ from generator |
| Spec format | OpenSpec (WHEN/THEN/AND) | Spec lives in client repo. BSE-custom schema. See Section 7.4. |
| Code quality — static | Fallow | Commit-level hook; dead code, complexity, boundary violations. See Section 20. |
| Code quality — complexity | ESLint complexity rule | Pre-check stage; CC scoring per file; 21+ pauses for human. See Section 6.4. [v5.1] |
| Agent skills | Matt Pocock skill set | /tdd, /caveman, /zoom-out, /setup-matt-pocock-skills, /git-guardrails, /to-issues |
| PDF Generation | Puppeteer + @sparticuz/chromium | Critical: standard Puppeteer exceeds Vercel function size limit. Must use @sparticuz/chromium — stripped Chromium binary for Lambda environments. |
| File output | Microsoft Graph API → SharePoint | Native M365 |
| Workflow automation | Power Automate | Teams + email notifications; client proposal delivery; filing workflows |
| Transcription | Fireflies.ai | Paste (Phase 3); API (Phase 6) |
| Voice capture | Web Audio API | Feature-flagged; infrastructure Phase 3, enabled when ready |
| Auth | Supabase Auth + Azure AD SSO | Email/password now; M365 SSO Phase 6 |
| Version control | GitHub | Branch per engagement: `feature/{client-name}/{engagement-id}`; all merges manual |
| Project tracking | Jira via Atlassian MCP | Deferred. Not in scope for current build. Schema accommodates future integration. |

---

## 9. Supabase Schema

### Table: engagements [v5.1 CHANGE] [v5.4 CHANGE] [v5.5 CHANGE] [v5.6 CHANGE]

```sql
id                    uuid primary key default gen_random_uuid()
created_at            timestamptz default now()
updated_at            timestamptz default now()
team_member_id        uuid references auth.users(id)
client_name           text not null
client_email          text                -- recipient for business proposal send [v5.1]
organisation          text
department            text
industry              text default 'financial_services'
analysis_mode         text default 'deep' check (analysis_mode in ('quick', 'deep'))  -- [v5.5] default changed to 'deep'; Quick Ideas is opt-in
status                text default 'captured' check (status in (
                        'captured', 'brief_pending', 'gate1_review',
                        'solutions_pending', 'gate2_review',
                        'proposal_pending', 'gate3_review',
                        'gate4_review',
                        'plan_pending', 'gate5_review',
                        'spec_pending', 'gate6_review',
                        'code_pending', 'code_review', 'gate7_review',
                        'output_pending', 'gate8_review', 'complete',
                        'rejected', 'failed'
                      ))
last_successful_gate  int                -- set on failure; used for retry
error_log             jsonb              -- populated on failure; cleared on retry
structured_brief      jsonb
solutions             jsonb
chosen_solution       jsonb              -- the selected solution object from Gate 4 [v5.4]
chosen_solution_context jsonb            -- additional context and agent prompts applied during Gate 3 loop [v5.5]
gate3_rollback_available boolean default false  -- true when Gate 3 has been entered and rollback to Gate 2 is possible [v5.5]
gate4_no_further_input boolean default false  -- true if BA confirmed no additional context [v5.4]
project_plan          jsonb              -- approved project plan: epics, stories, tasks [v5.6]
plan_conversation     jsonb              -- full Q&A history for project plan session [v5.6]
current_epic_index    int default 0      -- tracks which epic is currently being built [v5.6]
build_instructions    text               -- CLIENT_BUILD_INSTRUCTIONS.md content, approved in Phase 1 [v5.7]
approved_epics        jsonb              -- list of approved epics from Phase 2 [{title, description, rationale}] [v5.7]
current_plan_phase    int default 1      -- tracks which phase of Gate 5 is active (1, 2, or 3) [v5.7]
sharepoint_proposal_url text             -- business proposal PDF (Document B) [v5.1]
sharepoint_solution_options_url text     -- solution options summary PDF (Document A) [v5.5]
sharepoint_brief_url  text
sharepoint_deck_url   text
sharepoint_report_url text               -- review loop report PDF
sharepoint_project_summary_url text      -- project summary PDF [v5.2]
project_summary_upload_attempts int default 0  -- tier 2/3 retry counter [v5.2]
hubspot_deal_id       text               -- nullable; reserved for future CRM
notes                 text
```

### Table: engagement_inputs

```sql
id              uuid primary key default gen_random_uuid()
engagement_id   uuid references engagements(id) on delete cascade
input_type      text check (input_type in ('guided', 'braindump', 'transcript', 'client_intake'))
content         jsonb
source          text                     -- 'fireflies', 'manual', 'client_intake'
intake_token    text unique              -- nullable for non-intake types
created_at      timestamptz default now()
```

### Table: gate_approvals [v5.1 CHANGE] [v5.4 CHANGE] [v5.6 CHANGE]

```sql
id              uuid primary key default gen_random_uuid()
engagement_id   uuid references engagements(id) on delete cascade
gate_number     int check (gate_number in (1, 2, 3, 4, 5, 6, 7, 8))
approved_by     uuid references auth.users(id)
approved_at     timestamptz default now()
action          text check (action in (
                  'approved', 'rejected', 'edited_and_approved',
                  'sent',                          -- Gate 3: proposal sent to client
                  'voided',                        -- Gate 2: voided when BA triggers contextual re-injection regeneration
                  'plan_approved',                 -- Gate 5: BA approved the project plan [v5.6]
                  'instructions_approved',         -- Gate 5 Phase 1: build instructions approved [v5.7]
                  'epics_approved',                -- Gate 5 Phase 2: epic list approved [v5.7]
                  'epic_approved',                 -- Gate 5 Phase 3: individual epic stories approved [v5.7]
                  'cc_pause_approved',             -- Gate 7: BA approved continuation after CC 21+
                  'cc_pause_rejected',             -- Gate 7: BA rejected for refactor after CC 21+
                  'manual_override'                -- Gate 8: BA confirmed manual upload after 2 failed retries [v5.2]
                ))
edits_made      jsonb
```

### Table: specifications

```sql
-- spec_content JSONB column is not present. The spec lives in the client repo.
-- Supabase stores pointers only.

id                    uuid primary key default gen_random_uuid()
engagement_id         uuid references engagements(id) on delete cascade
created_at            timestamptz default now()
repo_path             text               -- path to openspec/changes/{engagement-id}/ in client repo
commit_sha            text               -- SHA of the approved spec commit
flagged_sections      text[]             -- capability folder names flagged for regeneration at Gate 6
review_thresholds     jsonb default '{"complexity":7,"test_coverage":7,"security":7,"requirements_alignment":7,"performance":7}'
max_review_cycles     int default 5
approved_at           timestamptz
approved_by           uuid references auth.users(id)
```

### Table: code_versions

```sql
id                  uuid primary key default gen_random_uuid()
engagement_id       uuid references engagements(id) on delete cascade
version_number      int not null
created_at          timestamptz default now()
github_commit_sha   text
github_branch       text                 -- feature/{client-name}/{engagement-id}
vercel_preview_url  text
modules_generated   text[]
generation_chain    text                 -- 'codeGenerationChain' or 'codeFixChain'
```

### Table: code_reviews [v5.1 CHANGE]

```sql
id                  uuid primary key default gen_random_uuid()
engagement_id       uuid references engagements(id) on delete cascade
code_version_id     uuid references code_versions(id)
created_at          timestamptz default now()
review_cycle        int not null
scores              jsonb                -- {complexity, test_coverage, security, requirements_alignment, performance}
issues              jsonb                -- array of issue objects
eslint_cc_report    jsonb                -- per-file CC scores from pre-check [v5.1]
cc_pause_occurred   boolean default false -- true if CC 21+ pause was triggered this cycle [v5.1]
threshold_met       boolean
review_escalated    boolean default false
gemini_model        text
summary             text
```

### Table: review_loop_reports

```sql
id                    uuid primary key default gen_random_uuid()
engagement_id         uuid references engagements(id) on delete cascade
created_at            timestamptz default now()
total_cycles          int
cycle_detail          jsonb              -- per-cycle scores, issues, fixes applied, CC scores
final_threshold_met   boolean
review_escalated      boolean
cc_pauses             jsonb              -- array of {cycle, files, ba_decision} for any CC 21+ events [v5.1]
total_duration_ms     int
generator_model       text
reviewer_model        text
sharepoint_url        text               -- internal PDF location in SharePoint
delivered_at          timestamptz        -- when Teams + email notification was sent
```

### Table: users

```sql
id                          uuid references auth.users(id) primary key
full_name                   text
role                        text default 'ba'
power_automate_webhook_url  text
outlook_email               text               -- for review loop report delivery
created_at                  timestamptz default now()
```

### Row Level Security

- Team members read/write own engagements only (`team_member_id = auth.uid()`)
- Gate approvals append-only for owning team member
- Code reviews read-only for team members (written by server-side pipeline only)
- Review loop reports read-only for team members
- Client intake uses service role key server-side — never exposed to frontend
- All tables have RLS enabled

---

## 10. AI Prompt Library

All prompts used verbatim. Only modify when explicitly instructed.

### 10.1 Consolidation Prompt

```
You are an expert Business Analyst at Comotion, a business solutions consultancy.
Your primary focus is financial services clients, but you work across industries.
You will be given problem capture data from one or more sources, labelled by type.
Produce one consolidated structured problem brief from all inputs combined.
Preserve client language where it adds clarity. Resolve contradictions by noting them explicitly.
If industry context is 'financial_services', emphasise compliance, regulatory, and auditability considerations.
Return your response as valid JSON matching this schema:
{
  "executive_summary": "string (2-3 sentences)",
  "stakeholders": [{"role": "string", "impact": "string"}],
  "current_process": "string",
  "pain_points": ["string"],
  "root_cause": "string",
  "business_impact": "string",
  "constraints": ["string"],
  "compliance_considerations": ["string"],
  "success_criteria": "string"
}
Industry context: {{industry}}
```

### 10.2 Quick Ideas Solution Generation Prompt

```
You are an expert Business Analyst at Comotion, a business solutions consultancy.
Your primary focus is financial services clients, but you work across industries.
You will be given a structured problem brief. Generate exactly 3 solution options.
For each option provide a title, one-paragraph description, effort rating, impact rating, and key risk.
Return as valid JSON:
{
  "problem_brief": "string (2-3 paragraph summary)",
  "solutions": [
    {
      "title": "string",
      "description": "string",
      "effort": "Low | Medium | High",
      "impact": "Low | Medium | High",
      "key_risk": "string"
    }
  ]
}
Industry context: {{industry}}
```

### 10.3 Deep Analysis — Call 1 (Full Brief)

```
You are an expert Business Analyst at Comotion, a business solutions consultancy.
Your primary focus is financial services clients, but you work across industries.
You will be given raw problem capture data. Produce a full structured problem brief.
If industry context is 'financial_services', apply compliance, regulatory, and auditability framing throughout.
Return as valid JSON:
{
  "executive_summary": "string",
  "stakeholder_analysis": [{"role": "string", "affected_by": "string", "severity": "High | Medium | Low"}],
  "root_cause_analysis": "string",
  "business_impact": {"description": "string", "quantified_estimate": "string | null"},
  "current_process_detail": "string",
  "constraints_and_dependencies": ["string"],
  "compliance_and_regulatory": ["string"],
  "recommended_focus_areas": ["string"]
}
Industry context: {{industry}}
```

### 10.4 Deep Analysis — Call 2 (Solution Generation)

```
You are an expert Business Analyst at Comotion.
Given the problem brief below, generate exactly 5 solution options.
For each option provide: title, detailed description (3-4 paragraphs), feasibility assessment,
estimated complexity, ROI framing, up to 3 key risks, recommended sequencing position,
and whether AI/automation is central to this solution.
Return as valid JSON:
{
  "solutions": [
    {
      "title": "string",
      "description": "string",
      "feasibility": "string",
      "complexity": "Low | Medium | High | Very High",
      "roi_framing": "string",
      "risks": ["string"],
      "sequencing": "Quick Win | Medium Term | Strategic",
      "ai_central": true | false
    }
  ]
}
Problem brief: {{brief}}
Industry context: {{industry}}
```

### 10.5 Business Proposal Generation Prompt [v5.1 NEW] [v5.5 CHANGE]

Pipeline chain: `proposalGenerationChain`. Produces the A4 HTML business proposal (Document B) for the chosen solution at Gate 3.

```
You are an expert Business Analyst at Comotion, a business solutions consultancy.
Given the chosen solution, any additional context from the BA, and the original structured brief below,
produce content for a Comotion-branded A4 business proposal document.
This document will be sent to the client.
This proposal is for ONE chosen solution — not multiple options.

Return as valid JSON:
{
  "document_title": "string",
  "client_name": "string",
  "date": "string (YYYY-MM-DD)",
  "executive_summary": "string (2-3 paragraphs — clear, non-technical, client-appropriate)",
  "problem_statement": "string (1-2 paragraphs describing the problem in client language)",
  "stakeholder_impact": [
    {
      "role": "string",
      "impact": "string"
    }
  ],
  "solution": {
    "title": "string",
    "description": "string (1-2 paragraphs — non-technical, benefit-focused)",
    "effort": "Low | Medium | High",
    "impact": "Low | Medium | High",
    "key_risk": "string",
    "sequencing": "Quick Win | Medium Term | Strategic"
  },
  "recommended_path": "string (1 paragraph — recommended next steps)",
  "footer_note": "string (brief confidentiality or engagement context note)"
}

Rules:
- Write for a business audience, not a technical one
- Use client language from the brief wherever possible
- Do not include internal Comotion pipeline details, scores, or technical spec content
- Do not reference AI, LangChain, or any internal tooling
- Tone: professional, clear, collaborative

Chosen solution: {{chosen_solution}}
Additional context: {{additional_context}}
Brief: {{brief}}
Client name: {{client_name}}
Industry context: {{industry}}
```

### 10.6 CONTEXT.md Generation Prompt

```
You are an expert Business Analyst and software architect at Comotion.
Given the approved problem brief and solution options below, produce a CONTEXT.md file
for the client project repository. This file will be read by Claude Code before generating
any code — it provides the shared domain vocabulary that ensures generated code uses
consistent, client-appropriate naming throughout.

Return as valid JSON:
{
  "context_md": "string (full CONTEXT.md file content in markdown)",
  "adrs": [
    {
      "filename": "0001-[slug].md",
      "content": "string (full ADR file content in markdown)"
    }
  ]
}

CONTEXT.md must follow this format:
# {Project Name}
{One sentence description of what this project is.}
## Language
**{Term}**: {Concise definition. One sentence max.}
_Avoid_: {synonyms to avoid}
## Relationships
- A **{Term}** {relationship} one or more **{Term}**
## Example dialogue
> A short exchange demonstrating how the terms interact naturally.

Only include terms specific to this client's domain. Do not include general programming concepts.
Extract terms from the client's own language in the brief wherever possible.

ADRs should only be created for decisions that are: hard to reverse, surprising without context,
and the result of a real trade-off. Do not create ADRs for obvious decisions.

Brief: {{brief}}
Solutions: {{solutions}}
Industry context: {{industry}}
```

### 10.7 OpenSpec Generation Prompt

```
You are an expert software architect and business analyst at Comotion.
Given the approved problem brief, solution options, and CONTEXT.md below,
produce a full technical specification in OpenSpec format.

The specification will be committed to the client repo and read directly by Claude Code
to generate application code. It must be precise, unambiguous, and use the domain
vocabulary defined in CONTEXT.md.

Return as valid JSON:
{
  "change_name": "string (kebab-case engagement identifier)",
  "capabilities": [
    {
      "folder_name": "string (kebab-case, maps to epic)",
      "spec_content": "string (full spec.md content in OpenSpec markdown format)"
    }
  ],
  "tasks_md": "string (full tasks.md content listing implementation checklist)",
  "proposal_md": "string (full proposal.md content explaining the change)"
}

Each spec_content must follow OpenSpec format exactly:
## ADDED Requirements
### Requirement: {Clear requirement statement}
The system SHALL {behaviour}.
#### Scenario: {Descriptive scenario name}
- **WHEN** {condition}
- **THEN** {expected outcome}
- **AND** {additional outcome}

Every requirement must have at least one scenario.
Every scenario must use #### Scenario: headers (four hashtags).
Use the vocabulary from CONTEXT.md for all domain terms.
Tech stack context: Next.js, Supabase, Vercel, LangChain

Brief: {{brief}}
Solutions: {{solutions}}
CONTEXT.md: {{context_md}}
```

### 10.8 Code Generation Prompt

```
You are an expert Next.js and Supabase developer at Comotion.
Generate production-quality code for the following module based on the OpenSpec
specification and CONTEXT.md provided.

Follow these rules:
- TypeScript where possible; JavaScript otherwise
- Tailwind CSS for all styling
- Supabase client for all database operations (supabase-js v2)
- All AI calls via LangChain chains — never call Anthropic or Google APIs directly
- All environment variables via process.env — never hardcode
- Error handling on every async operation
- Comments only where logic is non-obvious
- Use domain vocabulary from CONTEXT.md for variable names, function names, and comments
- Write tests first (red), then implementation (green), then refactor
- Keep cyclomatic complexity below 10 per function — split functions that would exceed this

Module to generate: {{module_name}}
OpenSpec requirements for this module: {{spec_content}}
CONTEXT.md: {{context_md}}
Previously generated modules (for context and imports): {{prior_modules}}
Return the complete file content only. No explanation. No markdown fences.
```

### 10.9 Code Fix Prompt

```
You are an expert Next.js and Supabase developer at Comotion.
The code below was reviewed by an independent AI reviewer and the following issues were identified.

Fix all issues listed. Rules:
- Fix ONLY what is explicitly flagged in the issues list
- Do not change any code that was not flagged
- Do not introduce new features
- Do not refactor beyond what is needed to fix the flagged issues
- Write a regression test for each fix before applying it (red-green)
- Use domain vocabulary from CONTEXT.md for any new identifiers introduced
- If fixing a cyclomatic complexity issue, split the function — do not restructure unrelated code

Issues: {{issues}}
Current code: {{code}}
Module: {{module_name}}
CONTEXT.md: {{context_md}}
Return the complete corrected file content only. No explanation. No markdown fences.
```

### 10.10 Brain-dump Structuring Prompt

```
You are an expert Business Analyst at Comotion.
The following is a free-form brain-dump from a team member about a client problem.
It may contain meeting notes, observations, bullet points, or unstructured text in any format.
If the input is clear enough to structure, extract and return:
{
  "structured": true,
  "content": {
    "client_context": "string",
    "problem_description": "string",
    "pain_points": ["string"],
    "constraints": ["string"],
    "success_criteria": "string"
  }
}
If a single clarification would significantly improve the output, return:
{
  "structured": false,
  "clarifying_question": "string (one question only)"
}
Brain-dump: {{text}}
```

### 10.11 Proposal Edit Prompt [v5.5 NEW]

Chain: `proposalEditChain`
Label: PIPELINE (LangChain chain)

```
You are an expert Business Analyst at Comotion.
You have an existing business proposal document and a BA instruction for how to update it.
Make ONLY the change described in the instruction. Do not rewrite sections that were not mentioned.
Do not change the tone, structure, or any content that was not referenced in the instruction.
Return the complete updated proposal JSON with the same schema as the original.

Existing proposal: {{existing_proposal}}
BA instruction: {{instruction}}
Return valid JSON only. No explanation. No markdown fences.
```

---

## 11. Document Generation Standard

This is a mandatory standard. No exceptions.

All documents produced by the BSE use the Comotion A4 HTML document standard. The reference template is `comotion-a4-html-template.html`. Read this file in full before writing any document generation code.

### Key Rules

- Each A4 page is a `<div class="page">` — a sealed container. Content never flows between pages.
- Browser view: `width: 794px; min-height: 1122px`
- Print/PDF: `@media print { width: 210mm; height: 297mm; overflow: hidden; }`
- `@page { size: A4; margin: 0; }` at the top of every stylesheet
- Background colour preservation: `print-color-adjust: exact` applied globally
- Footer: `position: absolute; bottom: 18px` — never `margin-top: auto`
- All font sizes in `pt`. Body text minimum `10pt`. Nothing below `9pt`.
- If content exceeds page height, add a new page — never compress font sizes to fit.
- Available content height = 1122px − 26px (top padding) − 62px (bottom padding) = 1034px per page

### Generation Pipeline

```
Claude structured output (JSON)
  → data passed to document generation function
  → rendered into A4 HTML template
  → Puppeteer (@sparticuz/chromium) converts HTML → PDF
  → PDF uploaded to SharePoint via Microsoft Graph API
```

### Document Separation

- **Solution Options Summary PDF** (Document A) — all approved solution options. Generated after Gate 2 approval. Visible in BSE for BA to share externally — no forced send. Not a formal branded proposal. [v5.5 NEW]
- **Business Proposal PDF** (Document B) — Comotion-branded A4 proposal for the chosen solution. Generated at Gate 3. Client-facing. BA decides whether to send from BSE or share externally. [v5.5 CHANGE]
- **Final Client Brief PDF** — generated at Gate 8 for formal post-engagement delivery. Client-facing. No scorecard data.
- **Review Loop Report PDF** — internal only. Full review cycle detail including ESLint CC scores. Never sent to clients. Stored in SharePoint `_internal/` subfolder.

### Comotion Brand Colours

| Token | Hex | Usage |
|---|---|---|
| `--navy` | `#1A3B66` | Primary — headings, headers, borders |
| `--green` | `#8CC240` | Accent — callouts, highlights, section labels |
| `--blue` | `#4DBFED` | Secondary accent — info callouts, card accents |
| `--red` | `#D61C5E` | Alert — warnings, high-impact tags, numbered badges |

### SharePoint File Naming and Folder Structure [v5.1 CHANGE] [v5.5 CHANGE]

```
Business Solutions/
  └── [ClientName]/
        └── [YYYY]/
              ├── [ClientName]_[YYYY-MM-DD]_SolutionOptions.pdf    ← Gate 2 (Document A) [v5.5]
              ├── [ClientName]_[YYYY-MM-DD]_BusinessProposal.pdf   ← Gate 3 (Document B — from chosen solution) [v5.5]
              ├── [ClientName]_[YYYY-MM-DD]_Brief.pdf              ← Gate 8
              ├── [ClientName]_[YYYY-MM-DD]_Proposal.pdf           ← Gate 8
              ├── [ClientName]_[YYYY-MM-DD]_ProjectSummary.pdf     ← Gate 8 (internal) [v5.2]
              └── _internal/
                    └── [ClientName]_[YYYY-MM-DD]_ReviewReport.pdf ← internal
```

No client PII in folder paths or file names. Client name only.

---

## 12. Power Platform Integration

Power Automate handles all downstream workflow. The app triggers flows via HTTP trigger URLs from Vercel API routes.

### Flows to Build [v5.1 CHANGE]

| Flow | Trigger | Action |
|---|---|---|
| Client intake notification | New `engagement_inputs` with `source = 'client_intake'` | Teams card + email to BA with engagement link |
| Gate 3 — proposal send | BA approves Gate 3 and clicks Send | Outlook email to `client_email` with business proposal PDF attached |
| Review loop report delivery | `review_loop_reports` record created | Teams message + Outlook email with full report detail |
| CC 21+ pause notification | ESLint pre-check detects CC 21+ file | Teams card to BA with file list, CC scores, approve/reject link |
| Gate 8 approved | `gate_approvals`: `gate_number = 8`, `action = 'approved'` | Teams + email confirmation with SharePoint links |
| Gate 8 rejected | `gate_approvals`: `gate_number = 8`, `action = 'rejected'` | Teams + email alert to BA |
| Chain failure | `engagements.status = 'failed'` | Teams + email alert with error summary and engagement link |

### Trigger Pattern

```
Vercel API route → POST to Power Automate HTTP trigger URL
```

Explicit control over when flows fire. Easy to debug. Never trigger directly from Supabase webhooks.

---

## 13. Microsoft Graph API

**Upload a file to SharePoint:**
```
PUT /sites/{site-id}/drives/{drive-id}/root:/{folder-path}/{filename}:/content
```

**Create a folder:**
```
POST /sites/{site-id}/drives/{drive-id}/root:/{parent-path}:/children
Body: { "name": "FolderName", "folder": {}, "@microsoft.graph.conflictBehavior": "rename" }
```

**Authentication:** `@azure/msal-node`, client credentials flow. Server-side only. Store tokens and refresh before expiry. Never expose credentials to frontend.

---

## 14. Environment Variables [v5.1 CHANGE]

```bash
# Supabase
VITE_SUPABASE_URL=                    # Public — safe for frontend
VITE_SUPABASE_ANON_KEY=               # Public — safe for frontend
SUPABASE_SERVICE_ROLE_KEY=            # Server-side only

# Anthropic
ANTHROPIC_API_KEY=                    # Server-side only

# Google AI (Gemini)
GOOGLE_AI_API_KEY=                    # Server-side only

# Microsoft Graph API
MICROSOFT_TENANT_ID=                  # Server-side only
MICROSOFT_CLIENT_ID=                  # Server-side only
MICROSOFT_CLIENT_SECRET=              # Server-side only
SHAREPOINT_SITE_ID=
SHAREPOINT_DRIVE_ID=

# Power Automate
POWER_AUTOMATE_INTAKE_TRIGGER_URL=
POWER_AUTOMATE_PROPOSAL_SEND_TRIGGER_URL=   # Gate 3 client send [v5.1]
POWER_AUTOMATE_CC_PAUSE_TRIGGER_URL=        # ESLint CC 21+ pause notification [v5.1]
POWER_AUTOMATE_REVIEW_REPORT_TRIGGER_URL=
POWER_AUTOMATE_GATE8_TRIGGER_URL=
POWER_AUTOMATE_FAILURE_TRIGGER_URL=

# Fireflies
FIREFLIES_API_KEY=                    # Optional — Phase 6

# GitHub
GITHUB_TOKEN=                         # For pipeline code commits
GITHUB_REPO=                          # Target repo — org/repo-name

# Vercel MCP (preview deploys)
VERCEL_TOKEN=
VERCEL_PROJECT_ID=

# Application
VITE_APP_URL=                         # Full deployed URL
VOICE_CAPTURE_ENABLED=false           # Feature flag — FEATURE FLAG: VOICE_CAPTURE

# Review loop configuration
REVIEW_THRESHOLD_DEFAULT=7            # Default minimum score per dimension (1-10)
REVIEW_MAX_CYCLES=5                   # Max review cycles before escalation
FALLOW_GATE_MIN_VERSION=2.46.0        # Minimum Fallow version for uncommitted-changes fix
```

---

## 15. Build Sequence

### Current State (Phases 1 & 2 Complete, Phase 3 Partially Complete) [v5.3 CHANGE]

**Phases 1 & 2:**
- React + Vite + Tailwind scaffold ✅
- Vercel deployment ✅
- Supabase schema (original 4 tables) + RLS ✅
- Email/password auth + protected routes ✅
- Comotion branded app shell ✅
- Dashboard with real Supabase data ✅
- New Engagement 3-step form ✅
- Guided Mode (14 questions) ✅
- Brain-dump input ✅
- Transcript input (paste mode) ✅
- Client Intake Form (public, token-protected) ✅
- Intake token generation ✅
- Input review (expandable Q&A) ✅

**Phase 3 — completed so far:** [v5.3 CHANGE]
- LangChain installed and pinned (`langchain@^0.3.0`, `@langchain/anthropic@^0.3.0`, `@langchain/google-genai@^0.3.0`) ✅
- `consolidationChain` implemented (`src/lib/chains/consolidation.js`) ✅
- `quickIdeasChain` implemented (`src/lib/chains/quickIdeas.js`) ✅
- `deepAnalysisChain` implemented — two-call RunnableSequence: Call 1 (Prompt 10.3 → deep brief), Call 2 (Prompt 10.4 → 5 solutions) (`src/lib/chains/deepAnalysis.js`) ✅
- Gate 1 review screen (`/review/:id/brief`) ✅
- Gate 2 review screen (`/review/:id/solutions`) — mode-aware (Quick: 3 cards / Deep: 5 cards), inline editing, approve/reject ✅
- API routes: `api/pipeline/consolidate.js`, `api/pipeline/quick-ideas.js`, `api/pipeline/deep-analysis.js`, `api/pipeline/gate2-approve.js` ✅
- `proposal_pending` status wired into Dashboard, EngagementDetail status stepper, and Supabase ✅
- `analysis_mode` routing: deep engagements → `/api/pipeline/deep-analysis`; quick → `/api/pipeline/quick-ideas`; mutual exclusion enforced server-side ✅

### Phase 3 — LangChain + AI Pipeline

**Schema additions first:** [v5.4 CHANGE] [v5.5 CHANGE] [v5.6 CHANGE]

- Add `specifications`, `code_versions`, `code_reviews`, `review_loop_reports` tables
- `specifications` table: use `repo_path` (text) and `commit_sha` (text) — do not add `spec_content` JSONB
- Add `last_successful_gate`, `error_log`, `sharepoint_proposal_url`, `sharepoint_report_url` columns to `engagements`
- Add `client_email` column to `engagements` [v5.1]
- Add `outlook_email` to `users`
- Extend `engagements.status` with `'proposal_pending'`, `'gate3_review'`, `'gate4_review'`, `'gate8_review'`, `'failed'` states [v5.4]
- Add `plan_pending`, `gate5_review` statuses; rename `gate5_review`→`gate6_review`, `gate6_review`→`gate7_review`, `gate7_review`→`gate8_review` in `engagements.status` check constraint [v5.6]
- Extend `gate_approvals.gate_number` check to cover `1–8` [v5.6]
- Add `plan_approved` to `gate_approvals.action` constraint [v5.6]
- Add `project_plan jsonb`, `plan_conversation jsonb`, `current_epic_index int default 0` to `engagements` [v5.6]
- Add `build_instructions text`, `approved_epics jsonb`, `current_plan_phase int default 1` to `engagements` [v5.7]
- Add `instructions_approved`, `epics_approved`, `epic_approved` to `gate_approvals.action` constraint [v5.7]
- Add `chosen_solution jsonb` and `gate4_no_further_input boolean` to `engagements` [v5.4]
- Add `chosen_solution_context jsonb`, `gate3_rollback_available boolean default false`, and `sharepoint_solution_options_url text` to `engagements` [v5.5]
- Set `analysis_mode default 'deep'` on `engagements` — NewEngagement form must default to Deep Analysis mode; Quick Ideas is opt-in [v5.5]
- Add `flagged_sections` to `specifications`
- Add `eslint_cc_report` and `cc_pause_occurred` to `code_reviews` [v5.1]
- Add `cc_pauses` to `review_loop_reports` [v5.1]

**Then implement:**

- Install and pin LangChain: `langchain@^0.3.0`, `@langchain/anthropic@^0.3.0`, `@langchain/google-genai@^0.3.0`
- Implement `consolidationChain`
- Implement `quickIdeasChain` and `deepAnalysisChain`
- Implement Gate 1 and Gate 2 review screens
- Implement Document A generation after Gate 2 approval: `solutionOptionsSummaryChain` generates Solution Options Summary PDF and files to SharePoint [v5.5]
- Implement `proposalGenerationChain` (produces A4 HTML Document B — chosen solution + additional context + original brief) [v5.1] [v5.5]
- Implement `proposalEditChain` (targeted proposal edits from BA natural language instructions) [v5.5]
- Build Gate 3 Client Decision, Proposal and Confirmation Loop screen — BA selects chosen solution, adds context, reviews/edits Document B in loop until satisfied, approve and optionally send to client [v5.5]
- Wire Power Automate Gate 3 proposal send flow [v5.1]
- Implement Gate 4 client decision screen — BA selects chosen solution from approved options (radio button); supplementary context capture via brain-dump, transcript, or guided questions (all optional); no-further-input checkbox; advances to plan_pending on approval [v5.4]
- Implement `projectPlanChain` (interactive project planning via Claude; discovery questions + plan generation + iterations; stores approved plan in `engagements.project_plan`) [v5.6]
- Build Gate 5 project plan review screen (`/review/:id/project-plan`) — chat-like interface, plan display in markdown and OpenSpec format, approve/iterate [v5.6]
- Implement `/api/pipeline/plan-question`, `/api/pipeline/plan-update`, `/api/pipeline/gate5-approve` routes [v5.6]
- Implement `contextGenerationChain` (produces CONTEXT.md + ADRs)
- Implement `openspecGenerationChain` (produces OpenSpec files in client repo, epic by epic)
- Implement Gate 6 spec review screen — renders OpenSpec markdown files; sections flaggable for regeneration
- Implement `codeGenerationChain` (Claude, via Anthropic API with OpenSpec context)
- Implement pre-check stage: lint + ESLint complexity rule + type-check + `openspec validate --all --json` [v5.1]
- Implement CC 21+ pause logic: halt loop, notify BA via Power Automate, await `gate_approvals` record before resuming [v5.1]
- Implement `codeReviewChain` (Gemini)
- Implement `codeFixChain` (Claude, with `/zoom-out` context + targeted fix + regression test)
- Implement `reviewLoopChain` — pre-check → ESLint → Gemini review → fix cycles; threshold logic, escalation flag, cycle cap
- Implement review loop report generation and storage (include ESLint CC data)
- Build Gate 7 code review screen — Gemini scorecard, ESLint CC scores per file (colour-coded), history, diff view, escalation flag; BA compares epic from project plan against generated spec and code output
- Wire GitHub commits to `feature/{client-name}/{engagement-id}`
- Wire Vercel MCP for preview deploys
- Implement client repo setup: `openspec init` + `/setup-matt-pocock-skills` + `/git-guardrails` + `/to-issues` + `fallow hooks install --target agent`
- Implement `openspec archive` step (runs after Gate 7 approval, before output generation)
- Implement error recovery — status revert to `last_successful_gate` on chain failure
- Wire Power Automate failure notification flow
- Wire Power Automate CC 21+ pause notification flow [v5.1]
- Brain-dump clarification question flow
- Voice capture feature flag infrastructure (disabled, labelled `// FEATURE FLAG: VOICE_CAPTURE`)
- End-to-end test with sample engagement data

### Phase 4 — Output Generation

**Critical:** Do not use standard `puppeteer`. Install `puppeteer-core` + `@sparticuz/chromium`. Standard Puppeteer exceeds Vercel's serverless function size limit and will cause deployment failure.

- Install `puppeteer-core` and `@sparticuz/chromium`
- Implement Microsoft Graph API auth (MSAL, client credentials, `@azure/msal-node`)
- Implement SharePoint folder creation (including `_internal/` subfolder)
- Implement `outputGenerationChain`
- Implement A4 HTML document generation per `comotion-a4-html-template.html`
- Implement Puppeteer PDF conversion (Vercel serverless — not edge)
- Implement Solution Options Summary PDF generation (Document A — after Gate 2 approval) [v5.5]
- Implement business proposal PDF generation (Document B — used at Gate 3, chosen solution only) [v5.1] [v5.5]
- Implement review loop report PDF generation (internal document, includes ESLint CC data) [v5.1]
- Implement PowerPoint generation (`pptxgenjs`) — infrastructure only, PDF is default
- Build Gate 8 review screen — client document preview, approve/reject
- Wire Power Automate Gate 8 flows (approval and rejection)
- End-to-end test including document generation and SharePoint filing

### Phase 5 — Power Platform & Refinement

- Build all Power Automate flows (intake notification, proposal send, CC pause notification, review report delivery, Gate 8 approval/rejection, chain failure alert) [v5.1]
- Wire Power Automate HTTP triggers from Vercel API routes
- Wire review loop report delivery (Teams + Outlook email via Power Automate)
- Review loop tuning — adjust thresholds and max cycles based on real data
- ESLint complexity threshold tuning — validate 11–20 auto-fix vs 21+ pause split works in practice [v5.1]
- Engagement history and search improvements
- Performance monitoring for chain execution times
- Error recovery hardening — edge case testing

### Phase 6 — Integrations & Polish

- Fireflies API connection (auto-retrieve transcripts by meeting reference)
- M365 SSO via Supabase Azure AD provider
- Apply final Comotion branding (swap placeholders when brand assets supplied)
- Voice capture — scope, build, and enable behind feature flag
- Jira integration via Atlassian MCP (if approved for this phase)
- HubSpot integration (if approved for this phase)
- End-to-end test with real engagement data

---

## 16. Key Conventions and Patterns

### Server-Side Gate Enforcement

Gate status is always verified in a Vercel API route before the pipeline proceeds. The frontend never controls gate progression — it only reflects state from Supabase.

### LangChain Chain Pattern

All chains in `src/lib/chains/`. Each exports one async function. Accepts typed input, returns typed output. No chain calls another chain directly — the calling API route composes chains in sequence.

```javascript
// Example pattern
export async function consolidationChain({ inputs, industry }) {
  // LangChain implementation using @langchain/anthropic
  return { brief: structuredBrief }
}
```

### Model Separation Rule

`codeGenerationChain` and `codeFixChain` always use Claude. `codeReviewChain` always uses Gemini. Enforced in code. If a future change attempts to use the same model for both generation and review, it must be explicitly rejected.

### Error Recovery Pattern

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

### Review Cycle State Machine [v5.1 CHANGE]

```
code_pending
  → pre_check (lint + ESLint complexity + type-check + openspec validate)
    → if lint/type/spec fails → surface to BA, halt
    → if CC 11–20 → codeFixChain targets those files → re-run pre_check
    → if CC 21+ → pause, notify BA via Power Automate
      → if BA rejects → codeFixChain targets CC files → re-run pre_check
      → if BA approves → continue with cc_pause flag recorded
    → if pre_check passes → code_review (Gemini scores)
      → if threshold_met → gate7_review (human)
        → if approved → openspec_archive → output_pending
        → if rejected → code_pending (restart generation)
      → if not threshold_met AND cycles < max → code_pending (zoom-out + Claude fixes) → pre_check
      → if max_cycles reached → gate7_review (human, review_escalated = true)
```

### Gate Numbering Reference [v5.4 CHANGE] [v5.6 CHANGE]

```
Gate 1 — Brief Review
Gate 2 — Solutions Review
Gate 3 — Client Decision, Proposal and Confirmation Loop (NEW v5.5)
Gate 4 — Client Decision and Context (NEW v5.4)
Gate 5 — Project Plan (NEW v5.6)
Gate 6 — Spec Approval (was Gate 5)
Gate 7 — Code Review (was Gate 6)
Gate 8 — Output Review (was Gate 7)
```

### Branch Naming Pattern

```javascript
feature/{client-name}/{engagement-id}
// e.g. feature/acme-bank/550e8400-e29b-41d4-a716
```

All commits go to this branch. Pipeline never merges. Merges are always manual human decisions.

### Threshold Precedence

```
specifications.review_thresholds (per-engagement)
  > REVIEW_THRESHOLD_DEFAULT (env var global default)
```

Always check `specifications.review_thresholds` first. Fall back to env var only if not set.

### ESLint Complexity Pattern [v5.1 NEW]

```javascript
// .eslintrc config for client repos and BSE itself
{
  "rules": {
    "complexity": ["error", { "max": 10 }]
  }
}

// Pre-check reads ESLint JSON output and classifies per file:
// CC 1–10:  severity = 'green' or 'warn' — pass
// CC 11–20: severity = 'error'            — auto-fix via codeFixChain
// CC 21+:   severity = 'untestable'       — pause for BA decision
```

### Feature Flag Pattern

```javascript
// FEATURE FLAG: VOICE_CAPTURE
const voiceCaptureEnabled = process.env.VOICE_CAPTURE_ENABLED === 'true'
if (voiceCaptureEnabled) {
  // render voice capture UI
}
```

Infrastructure built, UI hidden until flag is true. All feature-flagged code labelled.

### Non-Pipeline AI Call Pattern

```javascript
// NON-PIPELINE: direct AI call — brain-dump clarification only
const response = await anthropic.messages.create({ ... })
```

Any direct API call outside LangChain must be labelled. Used only for single-step utility functions.

### Document Generation Pattern

```
Claude JSON output
  → A4 HTML template render (comotion-a4-html-template.html)
  → Puppeteer (@sparticuz/chromium) → PDF
  → Graph API upload → SharePoint
```

HTML is the canonical layout source. No raw Word XML. No Markdown-to-PDF.

### OpenSpec Spec Pattern

```
Spec lives in client repo: openspec/changes/{engagement-id}/specs/{capability}/spec.md
CONTEXT.md lives in client repo root
Supabase holds: repo_path + commit_sha (pointers only)
Gate 6 approval = commit is authoritative
openspec archive runs after Gate 7 approval
Never store spec content in Supabase. The repo is the source of truth from Gate 6 onwards.
```

### Fallow Hook Pattern

```bash
fallow hooks install --target agent
```

Run once per client repo during setup. Installs a PreToolUse handler into `.claude/settings.json` that intercepts every git commit or git push Claude attempts. Before the commit executes, Fallow runs `fallow audit --changed-since main --format json --quiet --explain`. If the verdict is `fail`, the commit is blocked and structured findings (issue type, file, line, suggested fix) are fed back to Claude so it can correct the code and retry. The gate uses `new-only` mode — existing issues in the repo do not penalise generated code.

### CC Pause Pattern [v5.1 NEW]

```javascript
// When ESLint pre-check detects CC 21+ in any file:
await supabase.from('engagements').update({
  status: 'code_review'   // halted state
}).eq('id', engagementId)

await triggerCcPauseNotification(engagementId, ccReport)
// Power Automate → Teams card with file list, CC scores, approve/reject links

// Pipeline resumes only when gate_approvals record inserted:
// gate_number = 7, action = 'cc_pause_approved' OR 'cc_pause_rejected'
// Server-side polling or Supabase realtime subscription monitors for this record
```

---

## 17. Open Questions and Assumptions

| # | Question | Assumption if Unresolved |
|---|---|---|
| 1 | Comotion brand assets — logo, fonts not yet supplied | Build with placeholder branding; swap on asset delivery |
| 2 | SharePoint site URL and Drive ID | Must be supplied before Phase 4 begins |
| 3 | M365 Azure AD app registration (Client ID, secret, tenant ID) | Must be created by Comotion IT before Phase 4 |
| 4 | Power Automate HTTP trigger URLs | Build flows in Phase 5; add URLs to env vars then |
| 5 | Guided discovery questions — 14 proposed, not yet confirmed | Build with these; team reviews before Phase 3 goes live |
| 6 | Client intake token security — UUID in URL accepted? | Yes for now; add email verification for sensitive clients |
| 7 | Fireflies API access | Paste mode in Phase 3; API connection in Phase 6 |
| 8 | Voice capture readiness | Infrastructure Phase 3; scope and enable before Phase 6 |
| 9 | HubSpot integration | `hubspot_deal_id` in schema as nullable; no other HubSpot work in scope |
| 10 | Jira integration | Deferred entirely. No Atlassian MCP in current build. Schema accommodates future integration. |
| 11 | GitHub repo for generated code | Repo name and org to be confirmed before Phase 3 |
| 12 | Gemini API key | Must be available before Phase 3; gemini-2.0-flash assumed |
| 13 | Review thresholds — are 7/10 defaults acceptable? | Yes as defaults; configurable per engagement via `specifications.review_thresholds` |
| 14 | Outlook email addresses for review report delivery | Stored in `users.outlook_email`; must be populated before Phase 5 flows are live |
| 15 | OpenSpec BSE-custom schema definition | Define before Phase 3 begins; maps BSE engagement structure to OpenSpec artifact format |
| 16 | Fallow version floor | Default 2.46.0 (minimum for uncommitted-changes fix); adjust via `FALLOW_GATE_MIN_VERSION` env var if needed |
| 17 | Client email address — is one recipient per engagement sufficient? | Assumed yes for now; multi-recipient CC can be added if needed before Phase 5 |
| 18 | Business proposal — does the BA always send immediately on approval, or queue for later? | Assumed immediate send on approval; queued send can be added if workflow requires it |
| 19 | Contextual re-injection at Gate 2 — feature specced in openspec/changes/contextual-reinjection/proposal.md. Full spec and tasks not yet written. | Supplementary context capture pattern is now also part of Gate 4 design (gate4-client-decision spec). Gate 2 re-injection must be implemented before Gate 3 build begins. Gate 4 client decision screen builds on the same multi-input capture UI. Gate 2 approval must reset on re-injection trigger. |
| 20 | Gate 4 guided questions — same 14 questions as initial capture or a scoped subset? | Assumption: same 14 questions for now. Review before Gate 4 build begins. |

---

## 18. Out of Scope (This Build)

- HubSpot CRM integration (schema-ready, not built)
- Jira integration (deferred to Phase 6 if approved)
- Client portal or client login
- Automated report scheduling
- Multi-language support
- Native mobile application
- Cross-engagement analytics dashboard
- PowerPoint output (pptxgenjs infrastructure ready; PDF is default for all documents)

**Note:** Voice capture is NOT out of scope. It is in scope as a feature-flagged Phase 3 infrastructure item. Build the infrastructure; enable when tested and ready.

---

## 19. Skills to Create in This Project [v5.1 CHANGE]

Create these six Skills before writing any code.

**Skill 1 — BSE Prompt Library**
All prompts from Section 10 verbatim. Include all JSON schemas. Note which prompts are pipeline (LangChain) vs non-pipeline (direct call). Include prompts 10.5 (Business Proposal), 10.6 (CONTEXT.md), 10.7 (OpenSpec), and 10.11 (Proposal Edit). Note that prompt 10.5 now generates for a single chosen solution (not all solutions) and takes `chosen_solution`, `additional_context`, and `brief` as inputs. Note that prompt 10.8 (Code Generation) includes the CC < 10 per function instruction.

**Skill 2 — Supabase Schema Reference**
Full table definitions from Section 9 including all new tables and extended columns. Include RLS policies. Note that `specifications` uses `repo_path` + `commit_sha` — not `spec_content` JSONB. Note new columns: `client_email` on `engagements`; `sharepoint_proposal_url` on `engagements`; `eslint_cc_report` and `cc_pause_occurred` on `code_reviews`; `cc_pauses` on `review_loop_reports`; `chosen_solution` and `gate4_no_further_input` on `engagements` [v5.4]; `chosen_solution_context`, `gate3_rollback_available`, and `sharepoint_solution_options_url` on `engagements` [v5.5]; `analysis_mode` default changed to `'deep'` [v5.5]; `project_plan`, `plan_conversation`, and `current_epic_index` on `engagements` [v5.6]. Note that `gate_approvals.gate_number` now covers 1–8 and `action` includes `'sent'`, `'plan_approved'`, `'cc_pause_approved'`, `'cc_pause_rejected'`. Refer to this before writing any database query.

**Skill 3 — LangChain Chain Patterns**
LangChain 0.3.x patterns for Claude (`@langchain/anthropic`) and Gemini (`@langchain/google-genai`). Chain composition pattern. Input/output typing. Error handling. Retry logic. Model separation rule. Include `proposalGenerationChain` pattern (now takes chosen solution + additional context + brief). Include `proposalEditChain` pattern (targeted edits only — does not rewrite). Include `projectPlanChain` pattern (interactive discovery questions + plan generation + iteration loop). Include the ESLint pre-check stage pattern with CC severity classification. Include the CC 21+ pause/resume pattern. Include the `openspec archive` step. Reference before implementing any chain.

**Skill 4 — Microsoft Graph API + Power Automate Cheat Sheet**
Graph API endpoints (file upload, folder creation including `_internal/` subfolder). MSAL token acquisition snippet (`@azure/msal-node`). Power Automate HTTP trigger invocation from Node.js. All seven flows listed in Section 12 with their trigger conditions. Common error codes. Note the new proposal send flow and CC pause notification flow.

**Skill 5 — Component and Code Standards**
React naming conventions. Tailwind class ordering. Supabase query patterns (`supabase-js` v2). Error handling and recovery pattern. Gate enforcement pattern (always server-side). Gate numbering reference (Gates 1–8) [v5.6]. Feature flag pattern. Model separation rule (Claude generates and fixes, Gemini reviews — never swap). Non-pipeline AI call labelling convention. OpenSpec file structure and WHEN/THEN/AND format. Fallow hook setup pattern. ESLint complexity rule configuration and CC severity classification. CC pause pattern.

**Skill 6 — OpenSpec + Matt Pocock Skills Reference**
OpenSpec BSE-custom schema definition. CLI commands used by BSE (`init`, `validate --all --json`, `archive`, `schema init`). Matt Pocock skills used in pipeline and their setup order: `/setup-matt-pocock-skills` (must run before `/to-issues`), `/git-guardrails`, `/to-issues`, `/tdd`, `/caveman`, `/zoom-out`. `/diagnose` as manual post-Gate-7 tool only — not in automated loop. Fallow hook installation and `gate=new-only` behaviour.

---

## 20. Fallow — Codebase Intelligence Integration

Fallow is a TypeScript/JavaScript static analysis tool that builds a complete module graph and detects dead code, duplication, complexity hotspots, and architecture boundary violations. It is integrated at the commit level in the code generation loop.

### Where Fallow Is Used

**Step 12 — Commit-level hook (automated)**

`fallow hooks install --target agent` is run once per client repo during Phase C setup. It writes a PreToolUse handler into `.claude/settings.json` that intercepts every git commit or git push Claude attempts. Before the commit executes, Fallow runs `fallow audit --changed-since main --format json --quiet --explain`. If the verdict is `fail`, the commit is blocked and structured findings (issue type, file, line, suggested fix) are fed back to Claude so it can correct the code and retry. The gate uses `new-only` mode — existing issues in the repo do not penalise generated code.

**What the hook catches:**
- Unused exports and files generated but not wired up
- Unused `package.json` dependencies introduced
- Circular dependencies between generated modules
- Architecture boundary violations
- Complexity hotspots above threshold
- Code duplication introduced across generated modules

**Post Gate 7 — `fallow health` (manual, BA-invoked)**

After Gate 7 approval, the BA or client dev team can run `fallow health --format json` in the client repo to get an objective complexity and maintainability picture before merging. This surfaces file health scores, git churn hotspots, and ranked refactoring targets. It is not a pipeline gate — it is a decision support tool.

### What Fallow Does Not Replace

Fallow operates before Gemini in the loop and catches different issues. It does not replace the Gemini 5-dimension scorecard and does not replace the ESLint complexity pre-check. All three tools are complementary: Fallow catches structural/dead-code issues at commit time; ESLint catches per-function complexity before Gemini; Gemini provides holistic quality scoring across five dimensions.

### Setup

```bash
# Run once per client repo during Phase C setup
fallow hooks install --target agent

# To remove
fallow hooks uninstall --target agent

# Preview what would be installed
fallow hooks install --target agent --dry-run
```

The hook requires `jq` on PATH. It falls back to `npx --no-install fallow` if the fallow binary is not on PATH directly.

### Important: Do Not Duplicate at the Pre-check Stage

If the Fallow hook is installed at Step 12, do not add `fallow audit` to the pre-check stage. The hook already catches Fallow-detectable issues at commit time. The pre-check stack is: lint + ESLint complexity + type-check + `openspec validate --all --json`. Pick one point and use it there.

---

## v5.1 Change Log

| # | Section affected | Change | Type |
|---|---|---|---|
| 1 | 2, 5.1, 5.2, 6.2, 7.7, 9, 12, 15, 16, 19 | Gate renumbering: Gates 1–5 become Gates 1–6. Gate 3 (Business Proposal) inserted. Former Gate 3 (Spec) becomes Gate 4. Former Gate 4 (Code Review) becomes Gate 5. Former Gate 5 (Output) becomes Gate 6. | Renumbering |
| 2 | 5.1, 5.2, 6.2, 7.3, 9, 10.5, 11, 12, 14, 15 | Gate 3 — Business Proposal added. `proposalGenerationChain` generates Comotion-branded A4 PDF from approved brief + solutions. BA reviews and sends to `client_email` from within the app via Power Automate. | New gate + chain |
| 3 | 9 (engagements table) | `client_email` column added. Captured at new engagement setup. Used for Gate 3 proposal delivery. | Schema addition |
| 4 | 6.4, 7.5, 9 (code_reviews, review_loop_reports), 10.8, 10.9, 12, 14, 15, 16, 19 | ESLint complexity rule added to pre-check stage. CC 1–10: pass. CC 11–20: auto-fed to fix loop. CC 21+: loop pauses, BA notified via Power Automate, human decision required before proceeding. CC scores displayed on Gate 7 review screen. | New quality layer |

---

## v5.2 Change Log

| # | Section affected | Change | Type |
|---|---|---|---|
| 1 | 7.8, 11, 9 (engagements, gate_approvals) | Project Summary PDF added as fourth document generated at Gate 8. Internal only. Complete engagement audit trail: brief, solutions, gate approval trail with timestamps, Gemini scorecard, ESLint CC summary, review loop summary, team member name. Stored at `[ClientName]_[YYYY-MM-DD]_ProjectSummary.pdf` alongside client docs. Never sent to clients. | New document |
| 2 | 7.8, 9 (engagements, gate_approvals) | Three-tier SharePoint upload failure recovery added for Project Summary PDF. Tier 1: 3 auto-retries with exponential backoff. Tier 2: BA retry from Gate 8 screen, gate blocked until resolved. Tier 3: manual override escape hatch after 2 failed BA retries, recorded as `action = 'manual_override'` in `gate_approvals`. New columns: `sharepoint_project_summary_url`, `project_summary_upload_attempts`. New action value: `manual_override`. | Resilience pattern |

---

## v5.3 Change Log

| # | Section affected | Change | Type |
|---|---|---|---|
| 1 | 15 | Current State heading updated to reflect Phase 3 partial completion. | Progress update |
| 2 | 15 | Phase 3 completed items listed with ✅: LangChain install, `consolidationChain`, `quickIdeasChain`, `deepAnalysisChain`, Gate 1 and Gate 2 review screens, four API pipeline routes, `proposal_pending` status wiring, `analysis_mode` routing with server-side mutual exclusion. | Progress update |

---

## v5.4 Change Log

| # | Section affected | Change | Type |
|---|---|---|---|
| 1 | 2, 5.2, 6.2, 7.1, 7.7, 9, 15, 16, 17 | Gate 4 (Client Decision and Context) inserted between Gate 3 (Business Proposal) and the former Gate 4 (Spec Approval). Former gates 4, 5, 6 renumbered to 5, 6, 7. Pipeline is now a 7-gate pipeline. | New gate + renumbering |
| 2 | 5.2 | Data flow updated: Gate 4 human input capture block inserted between Gate 3 and the chains. `contextGenerationChain` and `openspecGenerationChain` now run after Gate 4 approval, not Gate 3. "Gate 5 triggered" in review loop block updated to Gate 6. GATE 5/6 boxes renamed to GATE 6/7. | Data flow update |
| 3 | 6.2 | Note added: Gate 4 is pure human input capture — no AI chain runs at this gate. `contextGenerationChain` and `openspecGenerationChain` run after Gate 4 approval before Gate 5. | Architecture note |
| 4 | 7.1 | `/review/[id]/client-decision` page added. Gate 4 captures chosen solution (required), optional supplementary context (brain-dump / transcript / guided questions), and no-further-input flag. Former `/review/[id]/spec`, `/review/[id]/code`, `/review/[id]/outputs` relabelled as Gate 5, 6, 7 respectively. | New page |
| 5 | 7.4 | Section renamed from Gate 4 to Gate 5 Spec Review Detail. All internal Gate 4 references updated to Gate 5. "After Gate 3 approval" updated to "After Gate 4 approval" to reflect new gate sequence. | Renaming |
| 6 | 7.7 | Gate 4 row added to human-in-the-loop gates table. Former Gates 4/5/6 renamed to 5/6/7. Section header marked [v5.4 CHANGE]. | Table update |
| 7 | 9 (engagements) | `chosen_solution jsonb` and `gate4_no_further_input boolean default false` columns added. Status check constraint updated: `gate4_review` added as Client Decision status; `gate5_review`, `gate6_review`, `gate7_review` replace former `gate4_review`, `gate5_review`, `gate6_review`. | Schema change |
| 8 | 9 (gate_approvals) | `gate_number` check constraint extended from `(1,2,3,4,5,6)` to `(1,2,3,4,5,6,7)`. Action comments updated: cc_pause references updated from Gate 5 to Gate 6; manual_override reference updated from Gate 6 to Gate 7. | Schema change |
| 9 | 15 | Gate 4 client decision screen added to Phase 3 build list. Gate 5 spec screen, Gate 6 code review, Gate 7 output review renamed from former Gate 4/5/6. Schema additions updated: `gate7_review` status added, gate_number check extended to 1–7, new columns listed. Phase 4 and Phase 5 gate references updated. | Build sequence update |
| 10 | 16 | Gate numbering reference updated to show all 7 gates. Gate 5 approval pattern and openspec archive reference updated from Gate 4/5 to Gate 5/6. CC pause pattern gate_number updated from 5 to 6. | Reference update |
| 11 | 17 | Item 19 updated to note supplementary context capture pattern is now part of Gate 4 design, and Gate 4 screen builds on same multi-input UI. Item 20 added: Gate 4 guided questions assumption. | Open questions update |

---

## v5.5 Change Log

| # | Section affected | Change | Type |
|---|---|---|---|
| 1 | 7.1, 9 (engagements), 15 | Default analysis mode changed to Deep Analysis. `analysis_mode` column now has `default 'deep'`. Quick Ideas is opt-in — the BA must explicitly select it. NewEngagement form must default to Deep Analysis mode. Note added to `/new` page description in Section 7.1. | Default behaviour change |
| 2 | 7.8, 9 (engagements), 11 | Document A (Solution Options Summary PDF) added as a new document generated automatically after Gate 2 approval. Contains: problem summary, all solution options with title, description, effort, impact, key risk, and sequencing. Filed to SharePoint at `[ClientName]_[YYYY-MM-DD]_SolutionOptions.pdf`. Visible in BSE for BA to share externally — no forced send. Not a formal branded proposal. `sharepoint_solution_options_url text` column added to `engagements`. SharePoint folder structure updated. | New document |
| 3 | 7.3, 6.2, 6.3, 9 (engagements) | Gate 3 redesigned as the Client Decision, Proposal and Confirmation Loop. BA selects chosen solution (required), adds supplementary context via any input method or agent prompt (optional), reviews and edits Document B in a loop until satisfied. Rollback to Gate 2 available if client changes mind after Gate 3 approval. `proposalEditChain` added for targeted proposal editing. `chosen_solution_context jsonb` column added to `engagements` to capture additional context and agent prompts applied during Gate 3 loop. | Gate redesign + new chain |
| 4 | 7.7 | Gate 3 row in human-in-the-loop gates table updated to reflect new trigger, BA action, and notification. Trigger is now "Gate 2 approved and Document A generated". Rollback note added. | Table update |
| 5 | 9 (engagements) | `gate3_rollback_available boolean default false` added to `engagements`. Set to `true` when Gate 3 has been entered. Enables rollback to Gate 2 (`gate2_review`) if client changes mind. | Schema addition |
| 6 | 10.5 | Business Proposal Generation Prompt updated. Inputs changed from "Brief + Solutions" to "Chosen solution + additional context + original brief". Prompt instruction updated to state this generates for ONE chosen solution. JSON output schema updated: `solutions` array removed; replaced with single `solution` object. Input variables changed to `chosen_solution`, `additional_context`, `brief`, `client_name`, `industry`. | Prompt update |
| 7 | 10.11 (new) | Proposal Edit Prompt added as new Section 10.11. Chain: `proposalEditChain`. PIPELINE (LangChain chain). Instructs Claude to make ONLY the change described in the BA instruction, not rewrite the document. Returns complete updated proposal JSON with same schema as original. | New prompt |
| 8 | 11 | Document Separation section updated to reference Document A (Solution Options Summary) and Document B (Business Proposal for chosen solution). SharePoint folder structure updated: `SolutionOptions.pdf` added after Gate 2; `BusinessProposal.pdf` annotated as Document B from chosen solution. | Document standard update |

---

## v5.6 Change Log

| # | Section affected | Change | Type |
|---|---|---|---|
| 1 | 2, 5.2, 6.2, 6.3, 7.1, 7.8, 9, 15, 16, 19 | Gate renumbering: Gates 5, 6, 7 become Gates 6, 7, 8. Gate 5 (Project Plan) inserted between Gate 4 and Gate 6. Pipeline is now eight gates. | Renumbering |
| 2 | 7.5 (new), 6.2, 7.1, 9, 15 | Gate 5 — Project Plan added. `projectPlanChain` conducts interactive discovery, generates project plan (epics, stories, tasks) in markdown and OpenSpec format, iterates until BA approves. New API routes: plan-question, plan-update, gate5-approve. New page: ProjectPlanReview.jsx. New status: `plan_pending` (after gate4_review) and `gate5_review` (project plan review). Approved plan stored in `engagements.project_plan`. | New gate + chain |
| 3 | 7.4 | Gate 6 (formerly Gate 5) — Spec Approval updated. Specs are now generated epic by epic from the approved project plan. Each epic becomes one capability folder. `contextGenerationChain` runs once after Gate 5 approval; `openspecGenerationChain` runs per epic. BA reviews specs one epic at a time. Gate 6 approval records are per-epic. | Gate redesign |
| 4 | 7.6 | Gate 7 (formerly Gate 6) — Code Review updated. Epic-by-epic build loop: for each epic, code generation → pre-check → Gemini review loop → BA approval before next epic begins. Each epic has its own `gate_approvals` record. BA compares epic from project plan with generated spec and code output before approving. Full build report generated per epic. Status advances to `output_pending` only after all epics approved. | Gate redesign |
| 5 | 9 (engagements) | `project_plan jsonb`, `plan_conversation jsonb`, `current_epic_index int default 0` added to `engagements`. Status check constraint updated: `plan_pending` and `gate5_review` added; `gate5_review`→`gate6_review`, `gate6_review`→`gate7_review`, `gate7_review`→`gate8_review`. | Schema addition |
| 6 | 9 (gate_approvals) | `gate_number` check extended from (1–7) to (1–8). `plan_approved` added to `action` constraint — used when BA approves the project plan at Gate 5. cc_pause and manual_override gate comments updated from Gate 6/7 to Gate 7/8. | Schema change |

---

## v5.7 Change Log

| # | Section affected | Change | Type |
|---|---|---|---|
| 1 | 6.2, 6.3, 7.5, 15 | `buildInstructionsChain` added. Generates `CLIENT_BUILD_INSTRUCTIONS.md` from engagement data (`structured_brief`, `chosen_solution`, `engagement_inputs`, `industry`). Runs automatically at the start of Gate 5 Phase 1. Claude (claude-sonnet-4-20250514). | New chain |
| 2 | 6.2, 7.5, 15 | `projectPlanChain` redesigned as a three-phase orchestrator. Phase 1 (Build Instructions): `buildInstructionsChain` produces `CLIENT_BUILD_INSTRUCTIONS.md`. Phase 2 (Epic Discovery): iterative chat session to identify and agree epics. Phase 3 (Story and Task Generation): per-epic generation of stories, acceptance criteria, tasks, and OpenSpec scenarios. | Chain redesign |
| 3 | 7.5 | Gate 5 fully redesigned as a three-phase process. Six API routes replace the three v5.6 routes: `plan-build-instructions`, `gate5-approve-instructions`, `plan-discover-epics`, `gate5-approve-epics`, `plan-generate-epic-stories`, `gate5-approve-epic`. `ProjectPlanReview.jsx` updated to stepped three-phase interface. | Gate redesign |
| 4 | 7.7 | State machine note added: `plan_pending` covers all three Gate 5 phases; `current_plan_phase` (1/2/3) tracks active phase. Error recovery re-enters the same phase — `current_plan_phase` is not reset on retry. | Architecture note |
| 5 | 9 (engagements) | Three new columns added: `build_instructions text` (approved Phase 1 document), `approved_epics jsonb` (approved Phase 2 epic list), `current_plan_phase int default 1` (active Gate 5 phase). | Schema addition |
| 6 | 9 (gate_approvals) | Three new action values added: `instructions_approved` (Phase 1 approval), `epics_approved` (Phase 2 approval), `epic_approved` (Phase 3 per-epic approval). | Schema change |

