## 1. Status Labels

- [x] 1.1 Add `proposal_pending: { label: 'Proposal Pending', color: 'bg-blue-100 text-cblue' }` to `STATUS_LABELS` in `Dashboard.jsx`
- [x] 1.2 Add `{ key: 'proposal_pending', label: 'Proposal Pending' }` to `STATUS_STEPS` in `EngagementDetail.jsx`, between `gate2_review` and `gate3_review`

## 2. App Route

- [x] 2.1 Import `SolutionsReview` in `App.jsx` and add route `<Route path="review/:id/solutions" element={<SolutionsReview />} />`

## 3. API Route (Gate 2 — server-side)

- [x] 3.1 Create `api/pipeline/gate2-approve.js` — POST handler with `{ engagementId, action, solutions }` body
- [x] 3.2 Add `getAuthenticatedUser` and `getEngagement` helpers (same pattern as `quick-ideas.js`)
- [x] 3.3 Add `validateRequest` check: return 400 if `action` is not `approved` or `rejected`; return 409 if `engagement.status !== 'gate2_review'`
- [x] 3.4 On `approved`: write `solutions` to `engagements.solutions`, insert `gate_approvals` (`gate_number: 2, action: 'approved'`), update `status` to `proposal_pending`
- [x] 3.5 On `rejected`: insert `gate_approvals` (`gate_number: 2, action: 'rejected'`), update `status` to `solutions_pending`
- [x] 3.6 Return HTTP 200 `{ success: true, engagementId }` on success; HTTP 500 `{ error: 'Gate approval failed', engagementId }` on any write failure

## 4. SolutionsReview Page

- [x] 4.1 Create `src/pages/review/SolutionsReview.jsx` — fetch engagement by `id`, guard on `status !== 'gate2_review'` (show not-ready state with back link)
- [x] 4.2 Initialise local `solutions` state from `engagement.solutions` on load (this is the editable copy)
- [x] 4.3 Create `SolutionCard` component — renders either Quick fields (`effort`, `impact`, `key_risk`) or Deep fields (`feasibility`, `complexity`, `roi_framing`, `risks`, `sequencing`, `ai_central`) based on `analysis_mode` prop
- [x] 4.4 Add inline editing for `title` and `description` on each card — controlled inputs updating local solutions state
- [x] 4.5 Add `notes` field per card — textarea updating local solutions state
- [x] 4.6 Create `ActionFooter` with Approve and Reject buttons — disabled while `actionLoading` is set
- [x] 4.7 Implement `handleAction(action)` — POST to `/api/pipeline/gate2-approve`, pass `solutions` on approve, navigate to `/engagements/:id` on success, show error on failure
- [x] 4.8 Add page header matching BriefReview style: back link, client name, engagement org, "Solutions Review" title

## 5. EngagementDetail — gate2_review action panel

- [x] 5.1 In `StatusSection`, add a branch for `status === 'gate2_review'` that renders a `Gate2ReviewSection` component with a "Review Solutions →" button navigating to `/review/:id/solutions`

## 6. Smoke Test

- [x] 6.1 Advance a quick-mode engagement to `gate2_review`, navigate to `/review/:id/solutions`, confirm 3 solution cards render with Quick fields
- [x] 6.2 Advance a deep-mode engagement to `gate2_review`, confirm 5 solution cards render with Deep fields
- [x] 6.3 Edit a solution title and description, approve — confirm Supabase `solutions` is updated and status moves to `proposal_pending`
- [x] 6.4 Reject — confirm status reverts to `solutions_pending` and solutions are unchanged in Supabase
- [x] 6.5 Confirm Dashboard shows "Proposal Pending" badge and EngagementDetail status bar shows the step correctly
- [x] 6.6 Confirm EngagementDetail at `gate2_review` shows "Review Solutions →" button linking to the review page
