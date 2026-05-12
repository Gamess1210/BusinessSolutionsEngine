## 1. Quick Ideas Prompt

- [x] 1.1 [LANGCHAIN] Create `src/lib/prompts/quickIdeasPrompt.js` — export `quickIdeasPrompt` as a `ChatPromptTemplate` with `{brief}` and `{industry}` template variables
- [x] 1.2 Use the exact system and user message text from Prompt 10.2 in the BSE prompt library (bse-prompt-library skill)
- [x] 1.3 Verify template variables `{brief}` and `{industry}` are correctly declared in the template

## 2. Quick Ideas Chain

- [x] 2.1 [LANGCHAIN] Create `src/lib/chains/quickIdeas.js` — implement `quickIdeasChain` as `RunnableSequence.from([promptStep, claudeModel, outputParser])` using `ChatAnthropic` with model `claude-sonnet-4-20250514`
- [x] 2.2 Add a prompt step that serialises `structured_brief` as `JSON.stringify(brief)` and passes `industry` directly
- [x] 2.3 Add `JsonOutputParser` from `@langchain/core/output_parsers` with fence-strip fallback for ```json ... ``` blocks (reuse pattern from consolidation chain)
- [x] 2.4 Export `quickIdeasChain` as named export from `src/lib/chains/quickIdeas.js`
- [x] 2.5 Verify chain CC ≤ 10 per function; extract helpers if needed

## 3. Vercel API Route — [GATE 2]

- [x] 3.1 Create `api/pipeline/quick-ideas.js` — Vercel serverless route accepting POST `{ engagementId }`
- [x] 3.2 Authenticate request using Supabase session from `Authorization` header; return 401 if missing
- [x] 3.3 Read engagement by `engagementId` using `SUPABASE_SERVICE_ROLE_KEY`; return 404 if not found or not owned by user
- [x] 3.4 Check engagement status is `solutions_pending` or `failed`; return 409 with current status if not
- [x] 3.5 Check `structured_brief` is not null; return 422 if missing
- [x] 3.6 Invoke `quickIdeasChain` with `{ structured_brief, industry }` from the engagement record
- [x] 3.7 Write returned solutions object to `engagements.solutions` and update `status` to `gate2_review`
- [x] 3.8 Return HTTP 200 `{ success: true, engagementId }`
- [x] 3.9 [GATE 2] Implement error recovery: on chain throw, write `status = 'failed'`, `last_successful_gate = 1`, `error_log = { message, chain: 'quickIdeasChain', timestamp }`; return HTTP 500
- [x] 3.10 Verify route CC ≤ 10 per function; extract `validateEngagement`, `buildErrorLog` helpers if needed

## 4. Engagement Detail UI — [GATE 2]

- [x] 4.1 Add `SolutionsPendingSection` component to `src/pages/EngagementDetail.jsx` — renders when `engagement.status === 'solutions_pending'`
- [x] 4.2 Show engagement header and status bar (already rendered by parent)
- [x] 4.3 Add "Generate Solutions →" button that calls `api/pipeline/quick-ideas.js` with a valid session token — mirror the `handleRunPipeline` pattern from `CaptureSection`
- [x] 4.4 Show loading state ("Generating Solutions...") while request is in flight; disable button
- [x] 4.5 On success: show "Solutions generated — review ready" message, then update status to `gate2_review` after 1.5s
- [x] 4.6 On failure: show error message, revert status to `solutions_pending`, re-enable button
- [x] 4.7 Wire `SolutionsPendingSection` into the `EngagementDetail` render — replace the "Gate review screens coming soon" placeholder for `solutions_pending` status

## 5. Smoke Test

- [x] 5.1 Run a full Gate 1 flow on a test engagement and click Approve Brief to reach `solutions_pending`
- [x] 5.2 Confirm "Generate Solutions →" button appears on the engagement detail page
- [x] 5.3 Click the button and verify status bar pulses while generating
- [x] 5.4 Verify `engagements.solutions` is populated in Supabase and status is `gate2_review`
- [x] 5.5 Verify the solutions object contains `problem_brief` and a `solutions` array with 3 items
- [x] 5.6 Test error path: temporarily remove `ANTHROPIC_API_KEY` from `.env` and verify `status = 'failed'` and `error_log` is written
- [x] 5.7 Restore key and retry — verify `failed` engagement can be re-triggered successfully
