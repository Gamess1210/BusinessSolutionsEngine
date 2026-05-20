## Context

Gate 4 sits between Gate 3 (Business Proposal) and Gate 5 (Spec Approval). After the BA delivers the proposal and meets with the client, two things need to land in the system before spec generation can begin:

1. Confirmation that `chosen_solution` (set at Gate 3 Part 1, stored as JSONB on `engagements`) is the final decision.
2. Any supplementary context captured during the post-proposal client conversation — refined constraints, corrected assumptions, new stakeholder requirements.

The chosen solution is already recorded in `engagements.chosen_solution` by `gate3-select-solution`. Gate 4 does not re-select; it displays the value read-only so the BA can verify before committing to spec generation.

No AI chain runs at Gate 4. It is a pure human input gate.

When Gate 4 is approved the downstream Gate 5 chains (`contextGenerationChain`, `openspecGenerationChain`) will read `engagements.chosen_solution`, all `engagement_inputs` rows (including any added at Gate 4), and the `gate4_no_further_input` flag.

## Goals / Non-Goals

**Goals:**
- Display `chosen_solution` read-only so the BA can confirm the correct solution will go to spec
- Accept optional supplementary context in any of three modes: brain-dump, transcript, or guided questions (same JSONB shape as initial capture)
- Accept a "no further input" checkbox when the client conversation produced nothing beyond the solution confirmation
- Record a `gate_approvals` row for gate 4, set `gate4_no_further_input` on `engagements`, advance status to `spec_pending`
- Enforce gate state server-side: the API route rejects any request where `engagement.status !== 'gate4_review'`

**Non-Goals:**
- Solution re-selection — that is a Gate 3 concern handled by `gate3-reset-solution`
- Proposal re-generation — Gate 3 only
- Any AI invocation at this gate
- Forwarding supplementary context to a chain — that is a Gate 5 concern

## Decisions

### 1. Read-only solution display, no re-selection

`chosen_solution` is already persisted. Displaying it read-only signals to the BA that the decision is locked and reduces the risk of accidental changes at this stage.

**Alternative considered**: Allow re-selection at Gate 4. Rejected — re-selection invalidates the approved proposal (Gate 3 output) and would require re-running the proposal chain. If re-selection is needed, the BA should reject Gate 4 (reverting to `proposal_pending`) and use the existing Gate 3 flow.

### 2. Supplementary context stored in `engagement_inputs` with `source: 'gate4_supplement'`

Brain-dump, transcript, and guided-question inputs all write rows to `engagement_inputs` with the existing JSONB content shapes. The `source` field distinguishes Gate 4 rows from initial capture rows. This lets downstream chains query `engagement_inputs` and filter by source if needed, without schema changes to the main query path.

**`source` vocabulary extension:** BSE Instructions v5.5 documents three valid source values for `engagement_inputs.source`: `'fireflies'`, `'manual'`, and `'client_intake'`. There is no `CHECK` constraint on the column, so `'gate4_supplement'` is safe to use at runtime. However, it is an undocumented extension. Downstream chains (`contextGenerationChain`, `openspecGenerationChain`) that query all `engagement_inputs` rows for an engagement will include Gate 4 rows automatically; chains that filter by source must be updated to recognise `'gate4_supplement'`. The `'gate4_supplement'` value should be added to the documented source vocabulary in BSE Instructions at the next schema review pass.

**Alternative considered**: A dedicated `gate4_supplement_context` JSONB column on `engagements`. Rejected — `engagement_inputs` is already the canonical location for multi-modal input rows and handles the three types uniformly.

### 3. Gate 4 guided questions use the same 14-question structure as initial capture

The `mode=supplementary` prop on the guided capture component signals that not all 14 answers are required (the BA only fills in what changed or was clarified). The JSONB shape is identical: `{ answers: [{ section, question, answer, notes }] }`. Downstream chains receive the full `engagement_inputs` set and handle partial guided inputs.

**Alternative considered**: A custom short-form for Gate 4. Rejected — maintaining a separate question set adds complexity without proportional benefit.

### 4. `gate4_no_further_input` boolean on `engagements`

This flag is set to `true` by the approval route when the BA checks the checkbox and submits with no context inputs. It gives downstream chains an explicit signal that no supplementary context exists, rather than requiring them to query `engagement_inputs` filtered by `source: 'gate4_supplement'` and check for empty results.

### 5. Single-step approval (no multi-part wizard)

Gate 4 has two parts displayed on one screen — solution confirmation panel (always visible) and context capture panel (interactive). Approval is a single button that validates and submits. This avoids wizard state management since there is no AI generation step between parts.

**Alternative considered**: Multi-step wizard matching Gate 3 structure. Rejected — Gate 3 needs a wizard because Part 2 triggers an AI generation step before Part 3. Gate 4 has no such step; everything submits together.

## Risks / Trade-offs

- **Guided questions produce potentially large `engagement_inputs` row** — all answers land in a single JSONB `answers` array. Acceptable; the same shape is used at initial capture.
- **Checkbox + context simultaneously** — if the BA checks "no further input" but there is text in a context field, the API should treat it as no-context (checkbox wins). The UI clears the input area when the checkbox is ticked, but server-side validation must enforce this to guard against stale form state.
- **No rollback from `spec_pending`** — once Gate 4 is approved, `contextGenerationChain` will trigger. If the BA realises the wrong context was submitted, there is no self-service undo at this time. This is consistent with the current pipeline pattern; Gate 4 rejection (pre-approval) is the safety valve.

## Migration Plan

1. Add `gate4_no_further_input boolean default false` column to `engagements` via Supabase migration SQL.
2. Deploy `api/pipeline/gate4-approve.js` (no side effects until an engagement reaches `gate4_review`).
3. Replace `src/pages/review/ClientDecisionReview.jsx` placeholder with full implementation.
4. No rollback risk — the column has a default and the old code never references it.

## Open Questions

- Guided questions at Gate 4: should the BA be presented all 14 questions or a filtered subset? Current decision: all 14, with answers optional. Revisit once Gate 5 chain authors report whether partial guided inputs cause issues.

## Schema Annotation Notes

- `engagements.chosen_solution` is annotated in v5.5 as `-- the selected solution object from Gate 4 [v5.4]`. This annotation is stale — the column is written at Gate 3 Part 1 via `gate3-select-solution.js`. Correction deferred to next schema review pass.
- `engagement_inputs.source` should be updated in v5.5 to document `'gate4_supplement'` as a valid value alongside `'fireflies'`, `'manual'`, and `'client_intake'`. No check constraint exists on the column today, so this is a documentation gap only. Deferred to next schema review pass.
