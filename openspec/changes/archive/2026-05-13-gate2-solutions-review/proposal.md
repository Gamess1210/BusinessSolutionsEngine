## Why

Solutions are generated at Gate 2 but BAs have no screen to view, edit, or act on them — the engagement detail shows a placeholder for `gate2_review` status. Without this screen the pipeline cannot advance past Gate 2.

## What Changes

- Add `src/pages/review/SolutionsReview.jsx` — Gate 2 review page at `/review/:id/solutions`, reads `engagements.solutions` and renders solution cards. Handles both Quick Ideas shape (3 solutions: `title`, `description`, `effort`, `impact`, `key_risk`) and Deep Analysis shape (5 solutions: `title`, `description`, `feasibility`, `complexity`, `roi_framing`, `risks`, `sequencing`, `ai_central`). BA can edit solution titles, descriptions, and notes inline. BA can approve (advances to `proposal_pending`) or reject (reverts to `solutions_pending` for regeneration).
- Add `api/pipeline/gate2-approve.js` — POST route enforcing `status = gate2_review` pre-condition server-side. Accepts `{ engagementId, action, solutions }`. On approve: saves edited solutions, inserts `gate_approvals` record (`gate_number = 2, action = 'approved'`), sets status to `proposal_pending`. On reject: sets status to `solutions_pending`, inserts `gate_approvals` record (`gate_number = 2, action = 'rejected'`).
- Add `proposal_pending` to `STATUS_LABELS` in `Dashboard.jsx` and `STATUS_STEPS` in `EngagementDetail.jsx`.
- Add `/review/:id/solutions` route to `App.jsx`.
- Update `StatusSection` in `EngagementDetail.jsx` — when status is `gate2_review`, show a "Review Solutions →" button linking to the solutions review page instead of the current placeholder.

## Capabilities

### New Capabilities
- `gate2-solutions-review`: SolutionsReview page component, `/review/:id/solutions` route, mode-aware solution card rendering, inline editing, EngagementDetail gate2_review action panel, proposal_pending status in Dashboard and status bar
- `gate2-approve-api`: Vercel POST route enforcing gate pre-conditions server-side, persisting edited solutions, inserting gate_approvals record, advancing or reverting engagement status

### Modified Capabilities

## Impact

- New files: `src/pages/review/SolutionsReview.jsx`, `api/pipeline/gate2-approve.js`
- Modified: `src/App.jsx` (new route), `src/pages/EngagementDetail.jsx` (gate2_review action + proposal_pending status step), `src/pages/Dashboard.jsx` (proposal_pending status label)
- No schema changes — `gate_approvals` table already exists (used by BriefReview), `engagements.solutions` already exists
- Gate approval is enforced server-side via `api/pipeline/gate2-approve.js` — consistent with BSE pipeline rules (Gate 1 / BriefReview currently bypasses this; that is existing tech debt, not addressed here)
