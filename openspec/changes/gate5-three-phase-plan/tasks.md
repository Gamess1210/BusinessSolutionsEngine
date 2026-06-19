## 1. Delete Old Files

- [ ] 1.1 Delete `api/pipeline/plan-message.js`
- [ ] 1.2 Delete `api/pipeline/gate5-approve.js`
- [ ] 1.3 Delete `src/lib/chains/projectPlanChain.js`

## 2. New Chain — buildInstructionsChain (Gate 5 Phase 1) [LangChain]

- [ ] 2.1 Create `src/lib/chains/buildInstructions.js` — export single async function `buildInstructionsChain({ structured_brief, chosen_solution, engagement_inputs, industry })`
- [ ] 2.2 Wire `ChatAnthropic` with model `claude-sonnet-4-20250514` and `maxTokens`
- [ ] 2.3 Write system prompt that produces `CLIENT_BUILD_INSTRUCTIONS.md` covering scope, constraints, integration points, and guiding principles
- [ ] 2.4 Return document as a plain markdown string
- [ ] 2.5 Verify ESLint CC ≤ 10 for all functions in the file

## 3. Redesign projectPlanChain (Gate 5 Phase 2 + 3) [LangChain]

- [ ] 3.1 Create `src/lib/chains/projectPlan.js` (replaces deleted `projectPlanChain.js`)
- [ ] 3.2 Export `discoverEpics(conversation, engagement, message)` — Phase 2 discovery Q&A; returns `{ type: 'question', content }` or `{ type: 'epics', content: [{title, description, rationale}] }`
- [ ] 3.3 Export `generateEpicStories(engagement, epicIndex, conversation, message)` — Phase 3 per-epic stories; returns `{ stories, tasks, acceptanceCriteria }` with WHEN/THEN/AND criteria
- [ ] 3.4 System prompt for `discoverEpics` must instruct Claude to cover delivery approach, MVP vs full scope, integration constraints, team constraints, and compliance before proposing epics
- [ ] 3.5 System prompt for `generateEpicStories` must produce WHEN/THEN/AND acceptance criteria matching OpenSpec format
- [ ] 3.6 Verify ESLint CC ≤ 10 for all functions in the file

## 4. API Route — plan-build-instructions (Phase 1 generation)

- [ ] 4.1 Create `api/pipeline/plan-build-instructions.js`
- [ ] 4.2 Validate request: authenticated user, engagement exists, `status === 'plan_pending'`, `current_plan_phase === 1`
- [ ] 4.3 Fetch `structured_brief`, `chosen_solution`, all `engagement_inputs`, and `industry` from Supabase
- [ ] 4.4 Call `buildInstructionsChain` with fetched data
- [ ] 4.5 Write result to `engagements.build_instructions`
- [ ] 4.6 Return `{ content }` with HTTP 200
- [ ] 4.7 On chain error: set `status: 'failed'`, write `error_log`, return HTTP 500

## 5. API Route — gate5-approve-instructions (Phase 1 approval)

- [ ] 5.1 Create `api/pipeline/gate5-approve-instructions.js`
- [ ] 5.2 Validate: authenticated, owns engagement, `current_plan_phase === 1`, `build_instructions` not null/empty
- [ ] 5.3 Insert `gate_approvals` record: `gate_number: 5`, `action: 'instructions_approved'`
- [ ] 5.4 Update `engagements.current_plan_phase` to 2
- [ ] 5.5 Return HTTP 200

## 6. API Route — plan-discover-epics (Phase 2 discovery)

- [ ] 6.1 Create `api/pipeline/plan-discover-epics.js`
- [ ] 6.2 Validate: authenticated, owns engagement, `current_plan_phase === 2`
- [ ] 6.3 Accept `{ engagementId, message, conversation }` in request body
- [ ] 6.4 Call `projectPlanChain.discoverEpics(conversation, engagement, message)` — include `build_instructions`, `structured_brief`, `chosen_solution` as context
- [ ] 6.5 Return `{ type, content }` from chain result with HTTP 200

## 7. API Route — gate5-approve-epics (Phase 2 approval)

- [ ] 7.1 Create `api/pipeline/gate5-approve-epics.js`
- [ ] 7.2 Validate: authenticated, owns engagement, `current_plan_phase === 2`, `approvedEpics` non-empty array, each epic has `title`, `description`, `rationale`
- [ ] 7.3 Insert `gate_approvals` record: `gate_number: 5`, `action: 'epics_approved'`
- [ ] 7.4 Update `engagements.approved_epics` with provided array
- [ ] 7.5 Update `engagements.current_plan_phase` to 3
- [ ] 7.6 Update `engagements.current_epic_index` to 0
- [ ] 7.7 Return HTTP 200

## 8. API Route — plan-generate-epic-stories (Phase 3 generation)

- [ ] 8.1 Create `api/pipeline/plan-generate-epic-stories.js`
- [ ] 8.2 Validate: authenticated, owns engagement, `current_plan_phase === 3`
- [ ] 8.3 Read `current_epic_index` from engagement; do NOT accept epicIndex from request body
- [ ] 8.4 Accept `{ engagementId, message, conversation }` in request body
- [ ] 8.5 Call `projectPlanChain.generateEpicStories(engagement, epicIndex, conversation, message)`
- [ ] 8.6 Return `{ stories, tasks, acceptanceCriteria }` with HTTP 200
- [ ] 8.7 Verify `current_epic_index` is NOT modified by this route

## 9. API Route — gate5-approve-epic (Phase 3 per-epic approval)

- [ ] 9.1 Create `api/pipeline/gate5-approve-epic.js`
- [ ] 9.2 Validate: authenticated, owns engagement, `current_plan_phase === 3`, `current_epic_index < approved_epics.length`
- [ ] 9.3 Read `current_epic_index` from Supabase — do NOT accept index from request body
- [ ] 9.4 Insert `gate_approvals` record: `gate_number: 5`, `action: 'epic_approved'`, `edits_made: { epic_title: <title> }`
- [ ] 9.5 If `current_epic_index + 1 < approved_epics.length`: increment `current_epic_index`, return `{ complete: false }`
- [ ] 9.6 If all epics done: populate `engagements.project_plan`, populate `engagements.plan_conversation`, set `status: 'spec_pending'`, return `{ complete: true }`

## 10. Frontend — ProjectPlanReview.jsx (full replacement)

- [ ] 10.1 Replace `src/pages/review/ProjectPlanReview.jsx` entirely — do not edit the old file in-place
- [ ] 10.2 Read `current_plan_phase` from Supabase on every mount — no phase cached in local state across navigations
- [ ] 10.3 Render phase indicator (step 1/2/3) using `navy` and `cgreen` brand tokens
- [ ] 10.4 Phase 1 panel: Generate button → calls `plan-build-instructions`; editable textarea for document; Regenerate button; Approve button → calls `gate5-approve-instructions`
- [ ] 10.5 Phase 2 panel: chat interface; calls `plan-discover-epics` per message; when `type === 'epics'` render editable epic cards; Approve Epics button → calls `gate5-approve-epics`
- [ ] 10.6 Phase 3 panel: shows current epic title; Generate button → calls `plan-generate-epic-stories`; renders stories/tasks/criteria; change-request input; Approve Epic button → calls `gate5-approve-epic`; on `complete === true` redirect to next gate
- [ ] 10.7 Wrap all Supabase and API calls in `try/catch` with `loading` and `error` state per the BSE async pattern
- [ ] 10.8 Tailwind CSS only — no inline styles or CSS modules; use brand palette tokens throughout
- [ ] 10.9 Verify ESLint CC ≤ 10 for all functions in the file
