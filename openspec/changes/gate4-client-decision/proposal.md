## Why

After the business proposal is delivered at Gate 3, the BA meets with the client to walk through the options and a preferred solution is chosen. Currently there is no structured point in the pipeline to record that decision before technical specification begins. The BA also frequently captures additional context during this client conversation — refined constraints, corrected assumptions, new stakeholder requirements — that should inform the OpenSpec files but has nowhere to land. Without a dedicated capture step, this context either gets lost or must be injected informally, producing specs that do not fully reflect what the client actually decided.

## What Changes

A new **Gate 4 — Client Decision and Context** is inserted between the current Gate 3 (Business Proposal) and the current Gate 4 (Spec Approval). All subsequent gates are renumbered:

| Old number | New number | Name |
|---|---|---|
| — | Gate 4 | Client Decision and Context (new) |
| Gate 4 | Gate 5 | Spec Approval |
| Gate 5 | Gate 6 | Code Review |
| Gate 6 | Gate 7 | Output Review |

### What Gate 4 captures

1. **Chosen solution** (required) — BA selects one solution from the approved options via radio button. Stored as `chosen_solution JSONB` on the `engagements` table.
2. **Supplementary context** (any combination, all optional):
   - Brain-dump — free text notes from the client conversation
   - Transcript — paste a Fireflies or other meeting transcript
   - Guided questions — the same 14-question structured format used at initial capture
3. **No further input checkbox** — if the client conversation produced nothing beyond the solution choice, the BA checks this box. Required when no supplementary context is provided. Stored as `gate4_no_further_input boolean` on `engagements`.

No AI runs at Gate 4. This is pure human input capture.

### What gets passed to Gate 5 spec generation

At Gate 5, `contextGenerationChain` and `openspecGenerationChain` receive:

- `chosen_solution` from `engagements.chosen_solution`
- The original structured brief from the consolidation chain
- All `engagement_inputs` rows, including any added at Gate 4
- The `gate4_no_further_input` flag

### Schema changes

- **`engagements` table**: add `chosen_solution JSONB`, add `gate4_no_further_input boolean default false`
- **`engagements.status`**: add `gate4_review` (Client Decision); rename existing statuses — `gate4_review` → `gate5_review`, `gate5_review` → `gate6_review`, `gate6_review` → `gate7_review`; add `spec_pending` as the transitional status after Gate 4 approval
- **`gate_approvals.gate_number` check constraint**: extend from `(1,2,3,4,5,6)` to `(1,2,3,4,5,6,7)`

## Approval Flow

1. Client receives proposal (Gate 3 complete, status `proposal_sent`).
2. BA meets with client, returns to BSE, opens the engagement at `gate4_review`.
3. BA selects the chosen solution from the approved options.
4. BA optionally adds one or more supplementary context inputs, or checks **No further input**.
5. BA submits — a `gate_approvals` record is written for `gate_number: 4`, status advances to `spec_pending`.
6. Gate 5 chains run using the chosen solution and all combined context.

## Rejection Flow

BA rejects Gate 4 — status reverts to `proposal_pending`. From there the BA can either:

- **Resend the proposal** — re-deliver the same business proposal to the client for further discussion.
- **Return to Gate 2** — revise the solution options before re-issuing the proposal.

No chain re-runs on rejection; all existing inputs and the current structured brief are preserved.
