## 1. Database Migrations

- [ ] 1.1 [SCHEMA MIGRATION] Add `plan_pending` and `gate5_review` to `engagements.status` check constraint — run manually in Supabase SQL editor: `ALTER TABLE engagements DROP CONSTRAINT engagements_status_check; ALTER TABLE engagements ADD CONSTRAINT engagements_status_check CHECK (status IN ('captured','brief_pending','gate1_review','solutions_pending','gate2_review','proposal_pending','gate3_review','gate4_review','plan_pending','gate5_review','spec_pending','gate6_review','code_pending','code_review','gate7_review','output_pending','gate8_review','complete','rejected','failed'));`
- [ ] 1.2 [SCHEMA MIGRATION] Add `project_plan JSONB`, `plan_conversation JSONB`, `current_epic_index INT DEFAULT 0` columns to `engagements` — run manually: `ALTER TABLE engagements ADD COLUMN IF NOT EXISTS project_plan jsonb; ADD COLUMN IF NOT EXISTS plan_conversation jsonb; ADD COLUMN IF NOT EXISTS current_epic_index int default 0;`
- [ ] 1.3 [SCHEMA MIGRATION] Extend `gate_approvals.gate_number` check to 1–8 — run manually: `ALTER TABLE gate_approvals DROP CONSTRAINT gate_approvals_gate_number_check; ALTER TABLE gate_approvals ADD CONSTRAINT gate_approvals_gate_number_check CHECK (gate_number IN (1,2,3,4,5,6,7,8));`
- [ ] 1.4 [SCHEMA MIGRATION] Add `plan_approved` to `gate_approvals.action` check constraint — run manually, updating the full action constraint to include `'plan_approved'` alongside existing values

## 2. LangChain Chain — projectPlanChain

- [x] 2.1 [LANGCHAIN] Create `src/lib/chains/projectPlanChain.js` — exports `processMessage(conversation, engagement, message)` and `processPlanUpdate(conversation, engagement, instruction)`. Both use Claude (claude-sonnet-4-20250514) via `@langchain/anthropic`.
- [x] 2.2 Implement `processMessage` — discovery phase; system prompt covers 8 planning dimensions, returns `{ type: 'question', content }` or `{ type: 'plan', content }`. CC ≤ 10.
- [x] 2.3 Implement plan generation — included in `processMessage`; when all dimensions covered Claude returns `{ type: 'plan', content: { markdown, openspec, structured: { epics } } }`.
- [x] 2.4 Implement `processPlanUpdate` — receives existing plan from conversation and BA instruction; returns updated plan in same format. Does not rewrite sections not referenced.
- [x] 2.5 JSON extraction fallback in both functions — `parseJsonWithFallback` strips markdown fences and extracts first valid JSON object if direct parse fails.

## 3. API Route — plan-question

- [x] 3.1 Created `api/pipeline/plan-message.js` (single route replacing plan-question + plan-update) with `createAdminClient`, `getAuthenticatedUser`, and `getEngagement` helpers.
- [x] 3.2 Validates `engagement.status === 'plan_pending'` OR `'gate5_review'` — returns 409 with actual status if neither.
- [x] 3.3 Appends BA message to `plan_conversation` in Supabase (if message is not null) during discovery; replaces plan entry during update.
- [x] 3.4 Branches on status: `plan_pending` → `processMessage` (discovery/generation); `gate5_review` → `processPlanUpdate` (update).
- [x] 3.5 If plan generated: sets `engagements.status = 'gate5_review'`; appends plan to `plan_conversation`; returns `{ type: 'plan', content: { markdown, openspec, structured } }`.
- [x] 3.6 If question: appends question to `plan_conversation`; returns `{ type: 'question', content: '<text>' }`.
- [x] 3.7 Handler: authenticate → validate → branch on status → execute → return response.

## 4. API Route — plan-update

- [x] 4.1 plan-update merged into `api/pipeline/plan-message.js` — `handleUpdate` called when `engagement.status === 'gate5_review'`.
- [x] 4.2 `handleUpdate` calls `processPlanUpdate(conversation, engagement, instruction)` with current plan from `plan_conversation` and BA instruction from request body.
- [x] 4.3 Replaces the plan entry in `plan_conversation` in-place; returns `{ type: 'plan', content: { markdown, openspec, structured } }`.
- [x] 4.4 Wired via `handler` export — status branch determines discovery vs update path.

## 5. API Route — gate5-approve

- [x] 5.1 Created `api/pipeline/gate5-approve.js` with standard auth and engagement helpers.
- [x] 5.2 `validateRequest` — returns 409 if `engagement.status !== 'gate5_review'`.
- [x] 5.3 `handleApproval` — inserts `gate_approvals` (`gate_number: 5`, `action: 'plan_approved'`); updates engagements (`status: 'spec_pending'`, `project_plan`, `current_epic_index: 0`).
- [x] 5.4 `handleRejection` — inserts `gate_approvals` (`gate_number: 5`, `action: 'rejected'`); updates engagements (`status: 'gate4_review'`, `plan_conversation: null`).
- [x] 5.5 Handler: authenticate → validate → branch on `req.body.action` → approve or reject → return `{ success: true, engagementId }`.

## 6. Frontend — ProjectPlanReview page

- [x] 6.1 Created `src/pages/review/ProjectPlanReview.jsx` — `useEffect` fetches engagement and redirects to `/engagements/:id` if status is not `plan_pending` or `gate5_review`; auto-calls `plan-message` with `message: null` to start fresh sessions.
- [x] 6.2 `ConversationSection` component — renders full chat history; user messages right-aligned (navy), Claude questions left-aligned (grey-light), plan bubbles (cgreen).
- [x] 6.3 `AnswerInput` component — textarea for BA answers; hidden once plan draft is present; "Send" calls `POST /api/pipeline/plan-message`.
- [x] 6.4 `PlanSection` component — renders plan draft; Markdown/OpenSpec toggle (default Markdown); `EditRequestArea` sends changes via `POST /api/pipeline/plan-message` (route branches on gate5_review status).
- [x] 6.5 `handleApprove` — calls `POST /api/pipeline/gate5-approve` with `{ engagementId, action: 'plan_approved', projectPlan: planDraft.structured }`; navigates to `/engagements/:id`.
- [x] 6.6 `handleReject` — calls `POST /api/pipeline/gate5-approve` with `{ engagementId, action: 'rejected' }`; navigates to `/review/:id/client-decision`.
- [x] 6.7 Approve button `disabled={!planDraft || submitting}` — disabled until plan draft is present.

## 7. Route Registration and Navigation

- [x] 7.1 Added route `review/:id/project-plan` → `ProjectPlanReview` in `src/App.jsx` with import.
- [x] 7.2 Updated `src/pages/review/ClientDecisionReview.jsx` — `handleApprove` now navigates to `/review/${id}/project-plan`.

## 8. Gate 4 API Update

- [x] 8.1 Updated `api/pipeline/gate4-approve.js` — `finalizeApproval` now sets `status: 'plan_pending'` (was `'spec_pending'`).

## 9. Schema Documentation (deferred)

- [ ] 9.1 At next BSE Instructions schema review: add `'plan_approved'` to the documented `gate_approvals.action` vocabulary
- [ ] 9.2 At next BSE Instructions schema review: add `project_plan`, `plan_conversation`, `current_epic_index` to Supabase Schema Reference skill

## 10. Manual Smoke Tests

- [ ] 10.1 Approve a Gate 4 engagement — confirm status advances to `plan_pending` (not `spec_pending`) and navigation lands on `/review/:id/project-plan`
- [ ] 10.2 Answer the first question — confirm a second question is returned and `plan_conversation` has two entries (question + answer)
- [ ] 10.3 Continue answering until a plan draft appears — confirm `engagements.status` is `gate5_review` and the plan is rendered in both markdown and OpenSpec views
- [ ] 10.4 Request a plan change — confirm the updated plan replaces the prior draft in `plan_conversation` and is re-rendered in the UI
- [ ] 10.5 Approve the plan — confirm `gate_approvals` row with `gate_number: 5`, `action: 'plan_approved'`; `engagements.status = 'spec_pending'`; `engagements.project_plan` populated; `current_epic_index = 0`; navigation to `/engagements/:id`
- [ ] 10.6 Reject the plan — confirm `gate_approvals` row with `gate_number: 5`, `action: 'rejected'`; `engagements.status = 'gate4_review'`; `plan_conversation = null`; navigation to `/review/:id/client-decision`
- [ ] 10.7 Navigate to `/review/:id/project-plan` on an engagement not at `plan_pending` or `gate5_review` — confirm redirect to `/engagements/:id`
- [ ] 10.8 Call `POST /api/pipeline/gate5-approve` on an engagement not at `gate5_review` — confirm 409 response with actual status
