## 1. Schema Migration

- [ ] 1.1 [SCHEMA MIGRATION] Create `supabase/migrations/002_gate_approvals_void_action.sql` — add `'voided'` to the `gate_approvals.action` check constraint (or confirm the column is unconstrained text). Run in Supabase SQL Editor before deploying any API changes.

## 2. API — Relax Status Guards

- [ ] 2.1 In `api/pipeline/consolidate.js`, add `'gate2_review'` to `CONSOLIDATABLE_STATUSES` (line 4). Add a branch so that when status is `gate2_review`, the route does NOT set status to `brief_pending` or advance to `gate1_review` — it runs `consolidationChain` and writes `structured_brief` only, keeping status as `gate2_review`.
- [ ] 2.2 In `api/pipeline/quick-ideas.js`, add `'gate2_review'` to `ALLOWED_STATUSES` (line 4). Add a branch so that when status is `gate2_review`, the route does NOT update `engagements.status` after writing solutions — status remains `gate2_review`.
- [ ] 2.3 In `api/pipeline/deep-analysis.js`, add `'gate2_review'` to `ALLOWED_STATUSES` (line 4). Apply the same status-preservation branch as in task 2.2.

## 3. API — Regeneration Endpoint

- [ ] 3.1 Create `api/pipeline/regenerate-brief-and-solutions.js`. Scaffold with the standard helper structure: `createAdminClient`, `getAuthenticatedUser`, `getEngagement`, `validateEngagement` (must be `gate2_review`), `buildErrorLog`, `recoverFromError`.
- [ ] 3.2 In the regeneration endpoint, implement `voidGate2Approval(supabaseAdmin, engagementId)` — updates `gate_approvals` where `engagement_id = engagementId AND gate_number = 2` to `action = 'voided'`. No-op if no record exists. [GATE 2]
- [ ] 3.3 In the regeneration endpoint, implement `runConsolidation(supabaseAdmin, engagementId, industry)` — fetches all `engagement_inputs`, invokes `consolidationChain`, writes `structured_brief` to Supabase. [LANGCHAIN: consolidationChain]
- [ ] 3.4 In the regeneration endpoint, implement `runSolutionsChain(supabaseAdmin, engagement)` — branches on `analysis_mode`: invokes `quickIdeasChain` for `'quick'`, `deepAnalysisChain` for `'deep'`; writes result to `engagements.solutions`. [LANGCHAIN: quickIdeasChain / deepAnalysisChain]
- [ ] 3.5 Wire the `handler` function in the regeneration endpoint to call void → consolidation → solutions in sequence, catch any error with `recoverFromError` (sets `status = 'failed'`, `last_successful_gate = 2`, `error_log`), and return appropriate HTTP responses.
- [ ] 3.6 Verify all functions in `regenerate-brief-and-solutions.js` have cyclomatic complexity ≤ 10 (`npm run lint`).

## 4. Component — SupplementaryContextBanner

- [ ] 4.1 Create `src/components/SupplementaryContextBanner.jsx`. Accept props: `engagementId`, `analysisMode`, `onRegenerateComplete`, `onDismiss`. Render the warning banner with the specified message, "Dismiss" button, and "Regenerate Brief & Solutions" button.
- [ ] 4.2 Implement the Dismiss action: call `onDismiss` immediately with no API call.
- [ ] 4.3 Implement the regeneration action: POST to `api/pipeline/regenerate-brief-and-solutions` with the Supabase session token in `Authorization` header and `{ engagementId }` in the body. Show "Regenerating..." and disable both buttons during in-flight.
- [ ] 4.4 On successful regeneration (HTTP 200): call `onRegenerateComplete`. On error (non-2xx): display inline error message and re-enable both buttons for retry.
- [ ] 4.5 Apply Tailwind styling: `grey-light` background, `navy` left border accent, `navy` text, `cred` for error state, `cgreen` for success flash before dismiss.
- [ ] 4.6 Verify `SupplementaryContextBanner.jsx` has cyclomatic complexity ≤ 10 per function (`npm run lint`).

## 5. Page — Gate2ReviewSection in EngagementDetail

- [ ] 5.1 In `src/pages/EngagementDetail.jsx`, add `mode` prop support to `CaptureSection` (or extract a `SupplementaryCapturePanelSection`). When `mode = 'supplementary'`: render the three input tabs and captured inputs list as normal, but omit the `PipelineFooter` component entirely.
- [ ] 5.2 Extend `Gate2ReviewSection` to accept `engagement`, `inputs`, and `onInputAdded` props. Render the "Review Solutions →" link at the top, then render the capture panel in supplementary mode below it.
- [ ] 5.3 In `Gate2ReviewSection`, add `hasPendingSupplementaryInput` state (boolean, default `false`) and `dismissed` state (boolean, default `false`). Set `hasPendingSupplementaryInput = true` in the `onInputAdded` callback.
- [ ] 5.4 Render `SupplementaryContextBanner` in `Gate2ReviewSection` when `hasPendingSupplementaryInput && !dismissed`. Pass `engagementId`, `analysisMode`, `onRegenerateComplete` (clears banner, calls parent re-fetch), and `onDismiss` (sets `dismissed = true`).
- [ ] 5.5 Update `StatusSection` in `EngagementDetail.jsx`: change the `gate2_review` branch (line 206–208) to pass `engagement`, `inputs`, and `onInputAdded` props to `Gate2ReviewSection`.
- [ ] 5.6 Add `isRegenerating` prop or state to disable the capture panel during active regeneration (set during `onRegenerateComplete` callback flow from the banner).
- [ ] 5.7 Verify all modified functions in `EngagementDetail.jsx` have cyclomatic complexity ≤ 10 (`npm run lint`). Refactor any function exceeding CC 10 into smaller helpers.

## 6. Integration Verification

- [ ] 6.1 Start the dev server (`npm run dev`) and open an engagement at `gate2_review` status. Verify the capture tabs are visible and the "Review Solutions →" link is present.
- [ ] 6.2 Save a brain-dump input at `gate2_review`. Verify the `SupplementaryContextBanner` appears with the correct message.
- [ ] 6.3 Dismiss the banner. Verify it disappears and the input remains in the captured inputs list.
- [ ] 6.4 Add another input and click "Regenerate Brief & Solutions". Verify the loading state, then verify the banner closes and solutions are updated on success.
- [ ] 6.5 Confirm that after successful regeneration, the "Review Solutions →" link is still accessible and that the BA must re-approve before Gate 3 proceeds (no `proposal_pending` status without a new `gate_approvals` record).
- [ ] 6.6 Run `npm run lint` on all modified and new files to confirm zero ESLint errors and CC ≤ 10 across all functions.
