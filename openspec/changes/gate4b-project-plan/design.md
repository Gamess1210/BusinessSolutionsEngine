## Context

The BSE pipeline currently jumps from Gate 4 (Client Decision and Context, `gate4_review`) directly to spec generation (`spec_pending`). There is no structured planning step between the BA confirming the chosen solution and the system generating OpenSpec capability folders. This means the scope of work — which epics to build, in what order, with what constraints — is never explicitly agreed by the BA before technical work begins.

Gate 4b introduces an interactive planning session at `plan_pending` / `gate5_review`. Claude conducts a multi-round chat with the BA, asks targeted discovery questions, and generates a project plan with epics, user stories, and tasks. The BA approves the plan before any spec is generated. The approved plan then drives epic-by-epic spec and code generation downstream.

**Current state:** Gate 4 approval → `spec_pending` → `openspecGenerationChain` (all epics at once)
**Target state:** Gate 4 approval → `plan_pending` → `projectPlanChain` (interactive) → `gate5_review` → Gate 4b approval (`plan_pending`) → `spec_pending` → epic-by-epic spec and code generation

---

## Goals / Non-Goals

**Goals:**
- Introduce `plan_pending` and `gate5_review` statuses into the pipeline
- Build `projectPlanChain` (Claude): iterative discovery → structured project plan output
- Build `ProjectPlanReview.jsx`: chat-like BA interface for the planning session
- Build three API routes: `plan-question`, `plan-update`, `gate5-approve`
- Persist approved plan in `engagements.project_plan` (JSONB) and conversation in `engagements.plan_conversation` (JSONB)
- Track epic build progress with `engagements.current_epic_index`
- Update `gate4-approve.js` to advance to `plan_pending` (not `spec_pending`)
- Extend `gate_approvals.gate_number` to 1–8 and add `plan_approved` action

**Non-Goals:**
- Epic-by-epic spec and code generation (downstream of this change — Gate 6 and Gate 7 behaviour is out of scope here)
- Modifying `contextGenerationChain` or `openspecGenerationChain` (their triggers move to after Gate 4b approval — that wiring is part of a later change)
- Power Automate notifications for Gate 4b (no notification flow required at this gate)
- Editing or regenerating the project plan after Gate 4b approval (plan is locked on approval; a new engagement handles significant scope changes)

---

## Decisions

### 1. Three separate API routes rather than a single stateful endpoint

**Decision:** `plan-question`, `plan-update`, and `gate5-approve` are three distinct routes rather than one generic `/plan` endpoint.

**Rationale:** Each has different validation logic, different Supabase writes, and a different response shape. A single endpoint with a `type` discriminator would push branching logic into the handler and push complexity past CC 10. Three thin routes are more testable and easier to gate-enforce independently.

**Alternative considered:** Single `/plan` route with `{ action: 'question' | 'update' | 'approve' }`. Rejected: the handler would require CC > 10 to route all three paths and handle their differing success/error responses.

### 2. Conversation history stored as JSONB on `engagements`, not a separate table

**Decision:** `plan_conversation JSONB` column on `engagements` stores the full Q&A array.

**Rationale:** The planning session is a one-time event per engagement. It will never be queried across engagements or filtered by message. A separate `plan_messages` table would add a join with no query benefit. JSONB on `engagements` follows the existing pattern for `structured_brief`, `solutions`, and `chosen_solution`.

**Alternative considered:** `plan_messages` table with one row per exchange. Rejected: over-engineered for a single-use conversation that is only ever read and written as a unit.

### 3. `projectPlanChain` uses Claude with two distinct call types

**Decision:** The chain exposes two internal functions: `askNextQuestion(conversation, planDraft)` and `generatePlan(conversation)`. Both use Claude (claude-sonnet-4-20250514). `plan-question` calls `askNextQuestion` until Claude signals readiness, then calls `generatePlan`. `plan-update` calls Claude with the existing plan and the BA change request.

**Rationale:** Separating the two call types keeps each function's prompt narrow and CC below 10. The chain file stays under the complexity limit without needing a large branching handler.

**Model:** Claude only. No Gemini involvement at Gate 4b — this is content generation (plan), not code review.

### 4. Plan readiness determined by Claude, not a fixed question count

**Decision:** Claude decides when it has enough context to generate a plan. The `plan-question` route returns `{ type: 'question', content }` while gathering context and `{ type: 'plan', content }` when ready to present a draft.

**Rationale:** The number of questions needed varies by engagement complexity. A fixed count (e.g., "always ask 8 questions") either over-asks for simple engagements or under-asks for complex ones. Delegating readiness to Claude's judgment keeps the interaction natural.

**Risk:** Claude may generate a plan prematurely if context is thin. Mitigation: the system prompt instructs Claude to cover all topic areas before generating and to ask follow-up questions on any area with insufficient detail.

### 5. Gate 4b rejection reverts to `gate4_review`

**Decision:** If the BA rejects the project plan, status reverts to `gate4_review` (back to the Client Decision and Context screen) rather than re-entering the planning session.

**Rationale:** If the plan is fundamentally wrong, the most likely cause is incorrect or insufficient context from Gate 4. Sending the BA back to Gate 4 to revise their context input before re-entering planning is cleaner than looping inside Gate 4b. A `gate_approvals` record with `action: 'rejected'` and `gate_number: 5` is written, and `plan_conversation` is cleared to start fresh.

---

## Risks / Trade-offs

**Long planning sessions may hit Vercel's 60-second serverless timeout**
→ Mitigation: `plan-question` and `plan-update` are designed as short single-call round-trips. Each Claude call processes one exchange (one question or one plan update). There is no long-running loop within a single request. If an individual Claude call takes >55s, the route returns a 504 and the frontend retries.

**JSONB plan_conversation may grow large for complex engagements**
→ Mitigation: Conversation history is append-only during the session and never modified after Gate 4b approval. Size is bounded by the number of planning exchanges (typically 8–15 rounds). No pagination or truncation is needed at current scale.

**Extending gate_number to 1–8 requires a Supabase migration**
→ Mitigation: `ALTER TABLE gate_approvals DROP CONSTRAINT gate_approvals_gate_number_check; ALTER TABLE gate_approvals ADD CONSTRAINT gate_approvals_gate_number_check CHECK (gate_number IN (1,2,3,4,5,6,7,8));` — run manually in Supabase SQL editor before deploying new API routes. All existing records remain valid (they use 1–7).

**Changing Gate 4 approval's status target from `spec_pending` to `plan_pending` is a breaking change for any engagement currently at `gate4_review`**
→ Mitigation: Any engagement at `gate4_review` before this deploy will advance to `plan_pending` on next approval, which is correct. No data migration needed. Engagements already past `gate4_review` are unaffected.

---

## Migration Plan

1. Run Supabase SQL migrations (manually in Supabase SQL editor):
   - Add `plan_pending`, `gate5_review` to `engagements.status` check constraint
   - Add `project_plan jsonb`, `plan_conversation jsonb`, `current_epic_index int default 0` columns to `engagements`
   - Extend `gate_approvals.gate_number` check to 1–8
   - Add `plan_approved` to `gate_approvals.action` check constraint
2. Deploy `src/lib/chains/projectPlan.js`
3. Deploy `api/pipeline/plan-question.js`, `plan-update.js`, `gate5-approve.js`
4. Deploy `src/pages/review/ProjectPlanReview.jsx`
5. Update `src/App.jsx` route for `/review/:id/project-plan`
6. Update `api/pipeline/gate4-approve.js` to advance to `plan_pending`
7. Update `src/pages/review/ClientDecisionReview.jsx` post-approval navigation

**Rollback:** Revert `gate4-approve.js` to advance to `spec_pending`. Disable `/review/:id/project-plan` route. Schema changes can remain — `plan_pending` and `gate5_review` statuses will simply never be set.

---

## Open Questions

| # | Question | Assumption if unresolved |
|---|---|---|
| 1 | Should the planning session be resumable if the BA navigates away mid-session? | Yes — `plan_conversation` is persisted after every round. On return, the frontend rehydrates the chat from `plan_conversation`. |
| 2 | Does the BA need to see the project plan in OpenSpec WHEN/THEN/AND format during review, or is markdown sufficient? | Both formats are generated and stored; the UI renders the markdown view by default with an expandable OpenSpec view. |
| 3 | Is there a maximum number of planning rounds before the BA must accept a plan? | No hard limit. Claude is instructed to produce a draft after covering all topic areas, regardless of round count. |
