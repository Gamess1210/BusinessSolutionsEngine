## Why

Gate 5 (Project Plan) was built as a single open-ended chat session where Claude asks questions and eventually generates a plan. This produces inconsistent results: the BA has no structure to work against, Claude's readiness signal is opaque, and the resulting plan is not grounded in a formal scoping document. The three-phase redesign replaces this with a deterministic sequence — documented build instructions first, agreed epic list second, per-epic story generation third — giving the BA clear approval checkpoints at each stage before any downstream work begins.

## What Changes

- **BREAKING** `api/pipeline/plan-message.js` deleted — replaced by `plan-build-instructions` and `plan-discover-epics` and `plan-generate-epic-stories`
- **BREAKING** `api/pipeline/gate5-approve.js` deleted — replaced by `gate5-approve-instructions`, `gate5-approve-epics`, and `gate5-approve-epic`
- **BREAKING** `src/lib/chains/projectPlanChain.js` deleted — replaced by `buildInstructions.js` (new) and redesigned `projectPlan.js`
- **BREAKING** `src/pages/review/ProjectPlanReview.jsx` replaced entirely with three-phase stepped interface
- New chain: `buildInstructionsChain` (`src/lib/chains/buildInstructions.js`) — auto-generates `CLIENT_BUILD_INSTRUCTIONS.md` from engagement data
- `projectPlanChain` redesigned to handle Phase 2 (epic discovery chat) and Phase 3 (per-epic story/task generation)
- Six new API routes replace the two deleted routes (see Capabilities)
- Schema already migrated (Migration 007): `build_instructions text`, `approved_epics jsonb`, `current_plan_phase int default 1` on `engagements`; `instructions_approved`, `epics_approved`, `epic_approved` added to `gate_approvals.action` constraint

## Capabilities

### New Capabilities

- `build-instructions-chain`: `buildInstructionsChain` generates `CLIENT_BUILD_INSTRUCTIONS.md` from `structured_brief`, `chosen_solution`, all `engagement_inputs`, and `industry`. Returns structured markdown document covering scope, constraints, integration points, and guiding principles. BA can edit inline and approve.
- `plan-build-instructions-api`: `POST /api/pipeline/plan-build-instructions` — triggers `buildInstructionsChain`, writes result to `engagements.build_instructions` draft, returns document content to frontend.
- `gate5-approve-instructions-api`: `POST /api/pipeline/gate5-approve-instructions` — validates `current_plan_phase === 1`, inserts `gate_approvals` (`gate_number: 5`, `action: 'instructions_approved'`), stores approved `build_instructions`, advances `current_plan_phase` to 2.
- `plan-discover-epics-api`: `POST /api/pipeline/plan-discover-epics` — handles Phase 2 discovery Q&A; `projectPlanChain` uses approved build instructions + brief + chosen solution as context; returns `{ type: 'question', content }` or `{ type: 'epics', content: [{title, description, rationale}] }`.
- `gate5-approve-epics-api`: `POST /api/pipeline/gate5-approve-epics` — validates `current_plan_phase === 2`, inserts `gate_approvals` (`gate_number: 5`, `action: 'epics_approved'`), stores `approved_epics`, advances `current_plan_phase` to 3.
- `plan-generate-epic-stories-api`: `POST /api/pipeline/plan-generate-epic-stories` — generates stories, tasks, and WHEN/THEN/AND acceptance criteria for the epic at `current_epic_index`; BA can request changes (unlimited rounds); returns plan content for that epic.
- `gate5-approve-epic-api`: `POST /api/pipeline/gate5-approve-epic` — inserts `gate_approvals` (`gate_number: 5`, `action: 'epic_approved'`, `edits_made: {epic_title}`); advances `current_epic_index`; if all epics done: populates `project_plan`, populates `plan_conversation`, advances `status` to `spec_pending`.
- `project-plan-review-page`: `src/pages/review/ProjectPlanReview.jsx` — full replacement with three-phase stepped interface. Phase indicator (1/2/3). Phase 1 panel: generated doc with inline edit + approve. Phase 2 panel: discovery chat + epic list approval. Phase 3 panel: per-epic story review with iteration and per-epic approve button.

### Modified Capabilities

## Impact

- `api/pipeline/plan-message.js` — deleted
- `api/pipeline/gate5-approve.js` — deleted
- `src/lib/chains/projectPlanChain.js` — deleted
- `src/lib/chains/buildInstructions.js` — new file
- `src/lib/chains/projectPlan.js` — new file (redesigned chain, not an edit of deleted file)
- `api/pipeline/plan-build-instructions.js` — new file
- `api/pipeline/gate5-approve-instructions.js` — new file
- `api/pipeline/plan-discover-epics.js` — new file
- `api/pipeline/gate5-approve-epics.js` — new file
- `api/pipeline/plan-generate-epic-stories.js` — new file
- `api/pipeline/gate5-approve-epic.js` — new file
- `src/pages/review/ProjectPlanReview.jsx` — replaced entirely
- `api/pipeline/gate4-approve.js` — no change needed (already sets `status: 'plan_pending'`)
- `src/App.jsx` — no change needed (route `/review/:id/project-plan` → `ProjectPlanReview` unchanged)
- Supabase schema: already migrated via Migration 007 — no further migration needed
