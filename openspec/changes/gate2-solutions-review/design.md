## Context

Solutions are stored in `engagements.solutions` as JSONB after either `quickIdeasChain` or `deepAnalysisChain` runs. The shape differs between modes — Quick Ideas returns `{ solutions: [3 items with effort/impact/key_risk] }` and Deep Analysis returns `{ solutions: [5 items with feasibility/complexity/roi_framing/risks/sequencing/ai_central] }`. The engagement's `analysis_mode` field (`quick` or `deep`) determines which shape to expect.

`BriefReview.jsx` at `/review/:id/brief` is the existing pattern: a standalone page under `/review/:id/`, reads engagement data, renders structured content, and has approve/reject actions. Gate 1 (BriefReview) writes directly to `gate_approvals` and `engagements` from the frontend — a known architecture deviation. Gate 2 corrects this with a server-side route.

## Goals / Non-Goals

**Goals:**
- Render solution cards in a mode-aware layout (Quick vs Deep fields)
- Allow BA to edit solution titles, descriptions, and notes inline before approving
- Enforce gate pre-conditions and write gate_approvals server-side
- Navigate to the review page from EngagementDetail when status is `gate2_review`
- Add `proposal_pending` as a recognised status in the Dashboard and status bar

**Non-Goals:**
- Reordering solutions
- Adding or removing solutions from the set
- Any client-facing view — this screen is internal only
- Fixing the Gate 1 BriefReview frontend-direct pattern (separate tech debt item)
- Building Gate 3 (proposal generation) — approve advances to `proposal_pending` as a holding status

## Decisions

### Edited solutions submitted with the approval request

**Decision:** The `gate2-approve.js` route accepts `{ engagementId, action, solutions }`. On approve it writes the (possibly edited) solutions back to `engagements.solutions` before inserting the gate_approvals record. On reject it does not write solutions.

**Rationale:** Keeps the approval atomic — one POST covers saving edits and advancing state. An auto-save approach (separate Supabase writes on blur) would require the frontend to make direct table writes, which is inconsistent with the server-side gate enforcement pattern.

**Alternative considered:** Auto-save edits directly to Supabase on blur, approve separately. Rejected — introduces a window where edits are saved but approval fails, leaving solutions in an inconsistent state, and requires frontend direct writes.

### Inline editing is local state only until approval

**Decision:** Edits to title, description, and notes are held in local React state and only persisted when the BA clicks Approve. There is no separate "Save" button.

**Rationale:** The BA's primary action is approve or reject. Drafting edits is incidental. Forcing an explicit save before approve adds friction. If the BA rejects, unsaved edits are discarded — which is correct, since rejection reverts to regeneration anyway.

### Mode detection via engagement.analysis_mode

**Decision:** `SolutionsReview` reads `engagement.analysis_mode` to decide which card template to render — Quick (`effort`, `impact`, `key_risk`) vs Deep (`feasibility`, `complexity`, `roi_framing`, `risks`, `sequencing`, `ai_central`). No field-sniffing on the solutions object itself.

**Rationale:** `analysis_mode` is the authoritative source of which chain was used. Sniffing fields on the solutions object is fragile — if a field is missing due to a partial Claude response, the wrong template would render silently.

### Gate pre-condition enforced server-side only

**Decision:** `gate2-approve.js` checks `status = gate2_review` before acting. The frontend does not pre-validate — it just calls the route and handles the response.

**Rationale:** Consistent with the BSE pipeline rule: gate state is always verified server-side. The frontend can navigate away or the status may have changed since the page loaded; server-side enforcement is the only reliable check.

### proposal_pending is a placeholder status

**Decision:** Approving at Gate 2 sets status to `proposal_pending`. No pipeline runs automatically — it is a holding status until Gate 3 (proposal generation) is built.

**Rationale:** Correctly models the pipeline shape without requiring Gate 3 to exist. The status bar and Dashboard will show "Proposal Pending", which is honest. Skipping straight to `gate3_review` would misrepresent the pipeline state.

## Risks / Trade-offs

**BA edits are lost if they reject after editing** → Expected behaviour — rejection means regeneration, so edited solutions are no longer relevant. Documented in the UI with a confirmation prompt on reject if edits are present.

**`analysis_mode` absent on old engagements** → `SolutionsReview` falls back to the Quick Ideas card template when `analysis_mode` is null, same as `SolutionsPendingSection`. No data corruption risk.

**`gate_approvals` insert succeeds but status update fails (partial failure)** → The API route runs both writes sequentially. If status update fails after gate_approvals insert, the engagement stays at `gate2_review` and the BA can re-submit. The duplicate gate_approvals record is harmless — no unique constraint on `engagement_id + gate_number` exists, and the most recent record is what matters.
