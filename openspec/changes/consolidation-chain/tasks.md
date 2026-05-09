## 1. Database Migration

- [x] 1.1 [SCHEMA MIGRATION] Write Supabase SQL migration to add `structured_brief JSONB`, `last_successful_gate INTEGER DEFAULT 0`, and `error_log JSONB` columns to `engagements` (nullable, no breaking change)
- [ ] 1.2 Apply migration in Supabase dashboard and verify columns exist

## 2. Consolidation Prompt

- [x] 2.1 [LANGCHAIN] Create `src/lib/prompts/consolidationPrompt.js` — export `consolidationPrompt` as a `ChatPromptTemplate` with `{formattedInputs}` and `{industry}` template variables
- [x] 2.2 Write system message with financial-services branch (when `industry === 'financial_services'`) and general branch fallback
- [x] 2.3 Write user message instructing Claude to return a structured JSON brief matching the BSE v5.1 Section 10.1 schema exactly: `executive_summary`, `stakeholders`, `current_process`, `pain_points`, `root_cause`, `business_impact`, `constraints`, `compliance_considerations`, `success_criteria`

## 3. Input Formatter

- [x] 3.1 [LANGCHAIN] Create `formatEngagementInputs(inputs)` in `src/lib/chains/consolidation.js` — pure function, no AI call
- [x] 3.2 Implement `guided` formatter: numbered list of `<section> — Q: <question> / A: <answer>` pairs
- [x] 3.3 Implement `braindump` formatter: plain text block labelled "Brain Dump"
- [x] 3.4 Implement `transcript` formatter: plain text block labelled "Meeting Transcript"
- [x] 3.5 Implement `client_intake` formatter: labelled fields for all seven client intake fields
- [x] 3.6 Ensure unknown `input_type` logs a warning and is skipped (does not throw)
- [x] 3.7 Verify `formatEngagementInputs` CC ≤ 10 — split per-type helpers if needed

## 4. Consolidation Chain

- [x] 4.1 [LANGCHAIN] Implement `consolidationChain` as `RunnableSequence.from([formatStep, consolidationPrompt, claudeModel, outputParser])` using `@langchain/anthropic` `ChatAnthropic` with model `claude-sonnet-4-20250514`
- [x] 4.2 Add `JsonOutputParser` from `@langchain/core/output_parsers`; add fence-strip fallback for ```json ... ``` blocks
- [x] 4.3 Export `consolidationChain` as named export from `src/lib/chains/consolidation.js`
- [x] 4.4 Verify chain CC ≤ 10 per function; extract helpers if needed

## 5. Vercel API Route — [GATE 1]

- [x] 5.1 Create `api/pipeline/consolidate.js` — Next.js/Vercel serverless route
- [x] 5.2 Authenticate request using Supabase session from `Authorization` header; return 401 if missing
- [x] 5.3 Read engagement by `engagementId`; return 404 if not found or not owned by user
- [x] 5.4 Check engagement status is `captured` or `failed`; return 409 with current status if not
- [x] 5.5 Read all `engagement_inputs` for the engagement using `SUPABASE_SERVICE_ROLE_KEY`
- [x] 5.6 Compute total formatted input length; return 422 if exceeds `CONSOLIDATION_MAX_INPUT_CHARS` (default 40 000)
- [x] 5.7 Invoke `consolidationChain` with formatted inputs and `industry`
- [x] 5.8 Write `structured_brief` to `engagements` and update `status` to `gate1_review`
- [x] 5.9 Return HTTP 200 `{ success: true, engagementId }`
- [x] 5.10 [GATE 1] Implement error recovery: on chain throw, write `status = 'failed'`, `last_successful_gate = 0`, `error_log = { message, chain: 'consolidationChain', timestamp }`; return HTTP 500
- [x] 5.11 Verify route CC ≤ 10 per function; extract `validateEngagement`, `buildErrorLog` helpers if needed

## 6. Environment Variables

- [x] 6.1 Confirm `ANTHROPIC_API_KEY` is set in Vercel environment variables (server-side only)
- [x] 6.2 Confirm `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel environment variables (server-side only, never exposed as `VITE_*`)
- [x] 6.3 Add `CONSOLIDATION_MAX_INPUT_CHARS` to Vercel environment variables (optional, default 40 000)

## 7. Dependency Check

- [x] 7.1 Verify `@langchain/anthropic` and `@langchain/core` are in `package.json`; run `npm install` if missing
- [x] 7.2 Verify `langchain` 0.3.x peer dependency is satisfied

## 8. Smoke Test

- [ ] 8.1 Create a test engagement in Supabase with status `captured` and at least one `engagement_input`
- [ ] 8.2 POST to `api/pipeline/consolidate` with the engagement ID and a valid session token
- [ ] 8.3 Verify `engagements.structured_brief` is populated and `status` is `gate1_review`
- [ ] 8.4 Verify Gate 1 review UI reflects the new status (reads Supabase state, no action needed here)
<!-- Tasks 8.1–8.4 are manual — require Supabase data and a deployed/local Vercel environment -->
