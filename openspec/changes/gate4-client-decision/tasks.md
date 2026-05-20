## 1. Database Migration

- [ ] 1.1 [SCHEMA MIGRATION] Add `gate4_no_further_input boolean default false` column to `engagements` table via Supabase SQL editor — run manually: `ALTER TABLE engagements ADD COLUMN IF NOT EXISTS gate4_no_further_input boolean default false;`

## 2. API Route — gate4-approve

- [x] 2.1 Create `api/pipeline/gate4-approve.js` with `createAdminClient`, `getAuthenticatedUser`, and `getEngagement` helpers (same pattern as `gate3-approve.js`)
- [x] 2.2 Add `validateApproveRequest` — reject if `engagement.status !== 'gate4_review'`, return 409 with actual status
- [x] 2.3 Add `writeSupplementaryInputs` — insert one `engagement_inputs` row per submitted context entry (`input_type`, `source: 'gate4_supplement'`, `content` JSONB) if `noFurtherInput` is false
- [x] 2.4 Add `finalizeApproval` — update `engagements` (`status: 'spec_pending'`, `gate4_no_further_input`) and insert `gate_approvals` row (`gate_number: 4`, `action: 'approved'`)
- [x] 2.5 Wire `handler` export: authenticate → validate → write inputs → finalize → return `{ success: true, engagementId }`

## 2b. API Route — gate4-reject

- [x] 2b.1 Create `api/pipeline/gate4-reject.js` — validate `engagement.status === 'gate4_review'` (409 otherwise), insert `gate_approvals` row (`gate_number: 4`, `action: 'rejected'`), update `engagements.status` to `gate3_review`, return `{ success: true, engagementId }`

## 3. Frontend — ClientDecisionReview page

- [x] 3.1 Replace the placeholder in `src/pages/review/ClientDecisionReview.jsx` — add `useEffect` to fetch engagement via `supabase.from('engagements').select('*')`, redirect to `/engagements/:id` if `status !== 'gate4_review'`
- [x] 3.2 Add `ChosenSolutionPanel` component in the same file — renders the solution title, description, effort, and impact read-only; shows an error banner if `chosen_solution` is null
- [x] 3.3 Add `ContextCapture` component in the same file — tab bar with "Brain-dump", "Transcript", "Guided" tabs; textarea for brain-dump/transcript; guided questions list for guided tab (all 14 questions, answers optional); "No further input" checkbox that clears and disables the input area when checked
- [x] 3.4 Add `buildContextInputs(tab, text, guidedAnswers, noFurtherInput)` helper — returns array of `{ input_type, content }` objects or empty array when `noFurtherInput` is true
- [x] 3.5 Add `handleApprove` — calls `POST /api/pipeline/gate4-approve` with `{ engagementId, contextInputs, noFurtherInput }`, navigates to `/engagements/:id` on success
- [x] 3.6 Disable the approval button when `!canApprove` (no context text and checkbox not checked, or `chosen_solution` is null)
- [x] 3.7 Add `handleReject` — calls `POST /api/pipeline/gate4-reject` with `{ engagementId }`, navigates to `/engagements/:id` on success

## 4. Route Registration

- [x] 4.1 Verify `src/App.jsx` already has a route for `/review/:id/client-decision` pointing to `ClientDecisionReview` — add it if missing

## 5. Schema Documentation (deferred)

- [ ] 5.1 At next BSE Instructions schema review pass: add `'gate4_supplement'` to the documented `engagement_inputs.source` vocabulary in `docs/BSE_Instructions_v*.md` and in the BSE schema reference skill
- [ ] 5.2 At next BSE Instructions schema review pass: correct `engagements.chosen_solution` annotation from "from Gate 4" to "from Gate 3 Part 1 (gate3-select-solution.js)"

## 6. Manual Smoke Test

- [ ] 6.1 Navigate to an engagement at `gate4_review`, confirm the chosen solution panel shows the correct solution read-only
- [ ] 6.2 Submit with "No further input" checked — confirm `gate4_no_further_input = true`, `status = spec_pending`, and no `engagement_inputs` row with `source = gate4_supplement`
- [ ] 6.3 Submit with brain-dump text — confirm an `engagement_inputs` row exists with `input_type = braindump`, `source = gate4_supplement`
- [ ] 6.4 Submit with transcript text — confirm an `engagement_inputs` row exists with `input_type = transcript`, `source = gate4_supplement`
- [ ] 6.5 Submit with guided answers — confirm an `engagement_inputs` row exists with `input_type = guided`, `source = gate4_supplement`, answers array contains only answered questions
- [ ] 6.6 Attempt to call `gate4-approve` on an engagement not at `gate4_review` — confirm 409 response
- [ ] 6.7 Click Reject at Gate 4 — confirm `status = gate3_review`, a `gate_approvals` row with `action = rejected` and `gate_number = 4` exists, and navigation returns to `/engagements/:id`
