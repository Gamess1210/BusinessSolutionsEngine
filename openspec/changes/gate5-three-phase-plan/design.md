## Context

Gate 5 (Project Plan) was previously a single chat session: `plan-message.js` routed between discovery questions and plan updates based on `engagement.status`, and `gate5-approve.js` handled a binary approve/reject. The BA had no intermediate checkpoints — the session ran until Claude decided a plan was ready, then the BA approved or rejected the whole thing.

The three-phase redesign decomposes Gate 5 into three independently approved stages, each with its own chain calls, API routes, and UI panel. The `current_plan_phase` column on `engagements` (int, default 1) is the authoritative phase tracker. Schema migration 007 has already been applied.

**Current state:** `plan_pending` → single chat (plan-message.js) → `gate5_review` → approve/reject (gate5-approve.js) → `spec_pending`

**Target state:** `plan_pending` (phase 1) → build instructions → approve → (phase 2) → epic discovery chat → approve epics → (phase 3) → per-epic stories → approve each epic → `spec_pending`

---

## Goals / Non-Goals

**Goals:**
- Replace `plan-message.js` and `gate5-approve.js` with 6 phase-specific routes
- Build `buildInstructionsChain` as a new chain that generates `CLIENT_BUILD_INSTRUCTIONS.md`
- Redesign `projectPlanChain` to handle Phase 2 discovery and Phase 3 story generation as separate exported functions
- Replace `ProjectPlanReview.jsx` with a stepped three-phase interface
- Delete the three replaced files (`plan-message.js`, `gate5-approve.js`, `projectPlanChain.js`)
- Preserve existing `gate4-approve.js` (no changes needed — already sets `plan_pending`)
- Preserve `project_plan`, `plan_conversation`, `current_epic_index` columns and their usage at final approval

**Non-Goals:**
- Modifying anything downstream of `spec_pending` (Gate 6, 7, 8 are out of scope)
- Changing `contextGenerationChain` or `openspecGenerationChain`
- Power Automate notifications at Gate 5 (no notification flow required)
- Editing or regenerating the plan after all epics are approved (plan locked on completion)
- Additional Supabase migrations (schema already done)

---

## Decisions

### 1. Six thin routes rather than extended plan-message.js

**Decision:** Each phase transition and each AI call type gets its own route file, with no shared routing logic between phases.

**Rationale:** `plan-message.js` branched on `engagement.status` to route between discovery and update — this approach would need a third branch for build instructions, making the handler CC > 10. Six independent routes each stay well under CC 10, have distinct validation logic (e.g. `current_plan_phase === 1` vs `=== 2` vs `=== 3`), and can be tested and deployed independently. Failure in one phase route does not affect routes for other phases.

**Alternative considered:** Extend `plan-message.js` with a `phase` discriminator. Rejected: the three phases have different input shapes, different chain calls, and different Supabase write patterns — a single handler would need excessive branching.

### 2. buildInstructionsChain as a separate chain file, not a function in projectPlan.js

**Decision:** `src/lib/chains/buildInstructions.js` is a standalone chain. `src/lib/chains/projectPlan.js` exports two functions: `discoverEpics(conversation, engagement, message)` and `generateEpicStories(engagement, epicIndex)`.

**Rationale:** `buildInstructionsChain` has a completely different prompt, input shape, and output (a markdown document vs a JSON conversation response). Keeping it separate maintains the one-chain-per-file convention and keeps each file's CC below 10. `projectPlan.js` retains responsibility for the conversational phases (2 and 3) where Claude exchanges messages with the BA.

**Alternative considered:** Single `projectPlan.js` with three exported functions. Rejected: the file would need to import different prompt templates, format inputs differently for each phase, and the complexity would push close to the CC 10 limit.

### 3. Phase tracked by current_plan_phase, not engagement.status

**Decision:** All three phases share the `plan_pending` status. `current_plan_phase` (1/2/3) is the sub-state. Phase-specific API routes validate `current_plan_phase` rather than `status`.

**Rationale:** Adding three new status values (`plan_phase1`, `plan_phase2`, `plan_phase3`) would require a schema migration, updates to the status check constraint, and updates to all status-dependent UI. `current_plan_phase` is already in the schema (Migration 007) and is cheaper to check server-side. The `plan_pending` status already correctly blocks access to Gate 6 routes.

**Alternative considered:** Three new status values. Rejected: schema cost is high; `current_plan_phase` is already present and purpose-built for this.

### 4. Phase 1 document stored as draft first, then confirmed on approval

**Decision:** `plan-build-instructions.js` writes the generated document to `engagements.build_instructions` immediately (as a draft). The BA can edit it in the UI. `gate5-approve-instructions.js` confirms the current value of `build_instructions` as approved — it does not re-read or regenerate.

**Rationale:** The BA may want to regenerate Phase 1 before approving. Storing the draft in `build_instructions` immediately means the frontend can display it without a separate draft column. The approval route simply records the approval record — the document is already in the column.

**Risk:** BA could navigate away mid-edit and lose unsaved changes. Mitigation: the frontend autosaves `build_instructions` on blur (textarea change event triggers a PATCH to a lightweight save endpoint, or the BA explicitly clicks Save before Approve).

### 5. Phase 3 epic iteration uses current_epic_index, not an epic ID in the request

**Decision:** `plan-generate-epic-stories.js` and `gate5-approve-epic.js` always operate on `engagements.current_epic_index`. The frontend does not send an epic index — it reads the current index from engagement state.

**Rationale:** Prevents the frontend from advancing or skipping epics out of sequence. The server is authoritative about which epic is being worked on. The BA cannot approve epic 3 before epic 2 is approved.

**Alternative considered:** Accepting `epicIndex` in the request body. Rejected: allows out-of-order approval if the frontend has a bug. Server-side ordering is safer.

### 6. plan_conversation accumulated across all three phases

**Decision:** `plan_conversation` JSONB accumulates messages from all three phases — Phase 1 generates no conversation entries (build instructions are a document, not a chat), Phase 2 appends discovery Q&A, Phase 3 appends per-epic iteration exchanges. Written to `engagements.plan_conversation` only on final epic approval alongside `project_plan`.

**Rationale:** Matches the existing pattern where `plan_conversation` is written once at Gate 5 completion. Avoids incremental writes per phase to keep the column update atomic. Phase 2 and 3 intermediate state is held in the conversation arrays within the route handlers and passed as `conversation` parameter to chain functions on each round-trip.

---

## Risks / Trade-offs

**Phase 1 regeneration after partial Phase 2 progress** → Mitigation: Phase 1 approval is locked once `current_plan_phase` advances to 2. The BA cannot return to Phase 1 without rejecting the whole Gate 5 session (status reverts to `gate4_review`, `current_plan_phase` resets to 1, `plan_conversation` cleared). This is intentional — Phase 2 discovery is grounded in the Phase 1 instructions.

**Vercel 60-second timeout on buildInstructionsChain** → Mitigation: `plan-build-instructions.js` is a single Claude call (not a loop). Typical response time is under 30s. If it times out, the frontend surfaces the error and the BA can retry the generation. No partial state is written on timeout.

**current_epic_index advancing past the end of approved_epics** → Mitigation: `gate5-approve-epic.js` checks `current_epic_index + 1 >= approved_epics.length` before deciding whether to finalise or increment. Server-side guard prevents index overrun.

**Large approved_epics or plan_conversation JSONB** → Mitigation: The number of epics per engagement is typically 4–8. Per-epic story generation produces structured JSON, not long prose. No pagination is needed at current scale.

**Frontend shows wrong phase after navigation** → Mitigation: `ProjectPlanReview.jsx` always reads `current_plan_phase` from the engagement record on mount. It does not cache phase in local state across navigations.

---

## Migration Plan

Schema is already done (Migration 007). No further migrations needed.

Deployment order:
1. Deploy new chain files: `src/lib/chains/buildInstructions.js`, `src/lib/chains/projectPlan.js`
2. Deploy 6 new API routes
3. Deploy new `ProjectPlanReview.jsx`
4. Delete `api/pipeline/plan-message.js`, `api/pipeline/gate5-approve.js`
5. Delete `src/lib/chains/projectPlanChain.js`

**Rollback:** Restore the three deleted files from git. The `plan_pending` / `gate5_review` status flow is unchanged — restored routes will work for any engagement still in the old flow. Engagements that have advanced past Phase 1 using the new routes cannot be trivially rolled back (their `current_plan_phase` is 2 or 3); these should be rejected at Gate 5 to restart.

---

## Open Questions

| # | Question | Assumption if unresolved |
|---|---|---|
| 1 | Should the BA be able to regenerate Phase 1 build instructions after viewing them (before approving)? | Yes — a "Regenerate" button calls `plan-build-instructions.js` again, overwrites `build_instructions` draft. |
| 2 | Does Phase 2 discovery need a minimum question count before Claude proposes epics, or is Claude's judgment sufficient? | Claude's judgment. System prompt instructs it to cover delivery approach, MVP vs full scope, integration constraints, team constraints, and compliance before proposing. |
| 3 | What happens if the BA rejects Gate 5 mid-Phase 3 (some epics approved, some not)? | Rejection reverts status to `gate4_review`, clears `current_plan_phase` to 1, clears `plan_conversation` and `approved_epics`. All per-epic `epic_approved` gate_approvals records remain but the engagement restarts from Phase 1. |
