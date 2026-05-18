## Context

Engagements at `gate2_review` status have a completed brief and generated solutions awaiting BA review. The capture input panel (brain-dump, guided mode, transcript) is currently hidden at this status — `StatusSection` renders `Gate2ReviewSection` with only a link to `/review/:id/solutions`. No sanctioned path exists for a BA to add new context without manually reverting the engagement in the database.

The regeneration flow re-uses existing chains (`consolidationChain`, `quickIdeasChain`, `deepAnalysisChain`). No new AI chains are required. The change is primarily architectural — a new orchestration endpoint, a new UI component, status-guard relaxation, and a Gate 2 void mechanism.

## Goals / Non-Goals

**Goals:**
- Make the capture input panel accessible at `gate2_review` status (brain-dump, guided, transcript tabs)
- Add a `SupplementaryContextBanner` that appears after a new input is saved at `gate2_review`
- Provide a new `api/pipeline/regenerate-brief-and-solutions.js` endpoint that voids Gate 2, reruns `consolidationChain`, and reruns the appropriate solutions chain in a single atomic server-side operation
- Reset Gate 2 approval so the BA must re-review before Gate 3 can proceed
- Follow the standard error recovery pattern — on failure, `status = 'failed'`, `last_successful_gate = 2`

**Non-Goals:**
- Automatic regeneration without BA confirmation
- Unlocking capture input at any gate status other than `captured` and `gate2_review`
- Changing the solutions review UI (`SolutionsReview.jsx`)
- Persisting banner state across page refreshes (intentionally ephemeral)
- Changing the Gate 1 brief review flow
- Adding a new AI chain (existing chains are re-invoked)

## Decisions

### 1. Single orchestration endpoint, not chained HTTP calls

**Decision:** One new endpoint (`api/pipeline/regenerate-brief-and-solutions.js`) handles void → consolidate → solutions in a single server-side execution.

**Rationale:** Chaining the existing `/api/pipeline/consolidate` and `/api/pipeline/quick-ideas` (or `/deep-analysis`) from the frontend would require the frontend to know pipeline sequencing and handle partial failures between steps. The orchestration endpoint is atomic from the client's perspective, keeps sequencing server-side, and allows correct `last_successful_gate` reporting at the right granularity.

**Alternative considered:** Extend `consolidate.js` with a `regenerate` flag and let the frontend make two sequential calls. Rejected because partial success (consolidation succeeds, solutions fail) would leave the engagement in an ambiguous state that the frontend cannot safely resolve.

### 2. `voided` action value on gate_approvals, not delete

**Decision:** Void Gate 2 by updating the existing `gate_approvals` record's `action` to `'voided'` (not deleting it).

**Rationale:** Preserves the audit trail. A deleted record loses the timestamp of the original BA approval. A `voided` record documents that the BA added context and triggered regeneration, which is relevant for compliance and debugging.

**Schema impact:** If the `action` column has a check constraint limiting it to `['approved', 'rejected']`, a migration must add `'voided'`. Migration `supabase/migrations/002_gate_approvals_void_action.sql` covers this. If the column is unconstrained text, the migration is a no-op safe guard.

**Alternative considered:** Delete the record. Rejected to preserve audit trail.

### 3. Status stays at `gate2_review` throughout regeneration

**Decision:** The engagement status does not change during regeneration. It remains `gate2_review` before, during, and after a successful regeneration.

**Rationale:** Avoids a confusing status transition sequence (e.g., briefly showing `brief_pending` or `solutions_pending` while still at Gate 2). The BA is at Gate 2; they added context and chose to regenerate. The output of regeneration is still Gate 2 solutions awaiting review. Status changes only on failure (→ `failed`) or on BA approval (→ `proposal_pending`).

**Trade-off:** The status bar won't animate during regeneration. The `SupplementaryContextBanner` handles the in-progress UI instead.

### 4. `hasPendingSupplementaryInput` as local React state

**Decision:** Track whether a new input was added at `gate2_review` in component state, not a Supabase column or session storage.

**Rationale:** The banner is intentionally ephemeral. If the BA adds context, is interrupted, refreshes the page, and returns — the input is visible in the inputs list. The banner state being reset on refresh is acceptable: the BA knows what they added. Adding a DB flag would require a migration, a cleanup path, and additional reads on every page load.

**Trade-off:** Banner state is lost on refresh. Documented in Risks.

### 5. Error recovery sets last_successful_gate = 2

**Decision:** When regeneration fails mid-chain, set `last_successful_gate = 2` (not 1).

**Rationale:** At the point regeneration starts, the engagement is at `gate2_review`, meaning Gate 1 (Brief Review) was already approved. If consolidation fails during regeneration, the prior `structured_brief` is still in Supabase from the Gate 1 run. Setting `last_successful_gate = 2` signals that the BA is past Gate 1 and should retry the regeneration, not rerun the full pipeline from the start.

**Note:** If consolidationChain itself fails (before structured_brief is updated), the prior brief remains intact. The error_log will identify `'regenerationChain'` as the failing chain.

### 6. Input panel rendered in supplementary mode via mode prop

**Decision:** Pass a `mode='supplementary'` prop to `CaptureSection` (or an equivalent) when rendering inside `Gate2ReviewSection`, suppressing the "Run AI Pipeline →" footer that would otherwise attempt to run consolidation from `captured` status semantics.

**Rationale:** `CaptureSection` currently shows a pipeline footer that calls `/api/pipeline/consolidate` — appropriate at `captured` status but not at `gate2_review` (where regeneration is triggered via the banner, not the footer). A mode prop is the minimal change: the footer hides in supplementary mode, and the existing input sub-components (`BrainDumpInput`, `GuidedModeInput`, `TranscriptInput`) are reused without modification.

## Risks / Trade-offs

**Banner state lost on page refresh** → The input is still visible in the captured inputs list. The BA can manually trigger the review path or add another input to re-surface the banner. Acceptable trade-off against the cost of a DB flag.

**Consolidation succeeds but solutions chain fails** → `last_successful_gate = 2` and `status = 'failed'` are set. The `structured_brief` was overwritten with the new consolidation output. The BA retries from the failure notification; the retry regenerates solutions only (consolidation output already in DB). No data loss.

**Race condition: BA adds a second input while regeneration is in flight** → The `SupplementaryContextBanner` disables both action buttons during regeneration. The capture input panel should also be disabled during active regeneration. The banner `isRegenerating` state drives both.

**gate_approvals missing a record at void time** → If no Gate 2 approval record exists (e.g., engagement reached `gate2_review` by solutions generation without prior BA approval), the void step finds no record and is a no-op. This is safe; the gate was never formally approved, so there is nothing to void.

**`action` check constraint blocks `voided`** → Migration 002 adds `'voided'` to the constraint before the endpoint is deployed. Deploy order: migration first, then API routes, then frontend.

## Migration Plan

1. Run `supabase/migrations/002_gate_approvals_void_action.sql` in Supabase SQL Editor
2. Deploy `api/pipeline/regenerate-brief-and-solutions.js`
3. Deploy updated `api/pipeline/consolidate.js` and solution routes (relaxed status guards)
4. Deploy frontend changes (`EngagementDetail.jsx`, `SupplementaryContextBanner.jsx`)

**Rollback:** Frontend change is additive — reverting it hides the banner and input panel at `gate2_review`. API changes are additive status-guard relaxations — reverting them rejects regeneration calls. Migration rollback: remove `'voided'` from the check constraint (or drop it if it was newly added).

## Open Questions

- Does the `gate_approvals.action` column currently have a check constraint? The migration adds `'voided'` defensively regardless, but the constraint type determines whether the migration is a no-op or a required schema change. Verify in Supabase Dashboard → Table Editor → gate_approvals before running migration.
- Should the `SupplementaryContextBanner` show a count of pending inputs ("2 new inputs added")? Current design shows a fixed message. Can be added as a polish pass without spec changes.
