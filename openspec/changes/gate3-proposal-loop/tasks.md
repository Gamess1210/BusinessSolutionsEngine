## 1. Database Migration

- [x] 1.1 [SCHEMA MIGRATION] Add `chosen_solution` (jsonb, nullable) to `engagements`
- [x] 1.2 [SCHEMA MIGRATION] Add `chosen_solution_context` (jsonb, nullable) to `engagements`
- [x] 1.3 [SCHEMA MIGRATION] Add `proposal_json` (jsonb, nullable) to `engagements`
- [x] 1.4 [SCHEMA MIGRATION] Add `sharepoint_proposal_url` (text, nullable) to `engagements`
- [x] 1.5 [SCHEMA MIGRATION] Add `gate3_rollback_available` (boolean, default false) to `engagements`

> **Out of scope:** The post-approval rollback from `gate4_review` → `gate2_review` (using `gate3_rollback_available`) is not implemented in this change. It must be handled in the `gate4-client-decision` change, which owns the Gate 4 screen and can expose the rollback action when `gate3_rollback_available = true`.

## 2. Proposal Generation Chain

- [x] 2.1 [CHAIN] Create `src/lib/chains/proposalGenerationChain.js` using Claude (claude-sonnet-4-20250514) — inputs: consolidated brief, chosen solution, optional context; output: Document B JSON
- [x] 2.2 Write LangChain prompt template for Document B JSON generation using the canonical schema fields: `document_title`, `client_name`, `date`, `executive_summary`, `problem_statement`, `stakeholder_impact`, `solution` (with `title`, `description`, `effort`, `impact`, `key_risk`, `sequencing`), `recommended_path`, `footer_note`
- [x] 2.3 Verify `proposalGenerationChain` stays at CC ≤ 10 per function

## 3. Proposal Edit Chain

- [x] 3.1 [CHAIN] Create `src/lib/chains/proposalEditChain.js` using Claude (claude-sonnet-4-20250514) — inputs: existing `proposal_json`, BA instruction string; output: updated `proposal_json` with only targeted sections changed
- [x] 3.2 Write LangChain prompt template that instructs targeted mutation (not full rewrite) of proposal JSON
- [x] 3.3 Verify `proposalEditChain` stays at CC ≤ 10 per function

## 4. HTML Render Helper

- [x] 4.1 Create `src/lib/renderProposalHtml.js` — accepts `proposal_json`, returns A4 HTML string using `comotion-a4-html-template.html`
- [x] 4.2 Verify HTML render covers all Document B JSON fields

## 5. Gate 3 API Routes

- [x] 5.1 Create `api/pipeline/gate3-select-solution.js` — verifies `gate3_review` status, persists `chosen_solution`, sets `gate3_rollback_available = true`, returns 200
- [x] 5.2 Create `api/pipeline/gate3-generate.js` — persists `chosen_solution_context`, invokes `proposalGenerationChain`, persists `proposal_json`, returns 200 with JSON; error recovery: `failed` + `last_successful_gate = 3`
- [x] 5.3 Create `api/pipeline/gate3-edit.js` — invokes `proposalEditChain` with current `proposal_json` + instruction, persists updated JSON, returns 200; error recovery: `failed` + `last_successful_gate = 3`
- [x] 5.4 Create `api/pipeline/gate3-approve.js` — renders HTML, generates PDF via Puppeteer + @sparticuz/chromium, uploads to SharePoint, sets `sharepoint_proposal_url`, advances status to `gate4_review`, writes `gate_approvals` record; error recovery: `failed` + `last_successful_gate = 3`
- [x] 5.5 Create `api/pipeline/gate3-reset-solution.js` — clears `chosen_solution`, `chosen_solution_context`, `proposal_json`; status remains `gate3_review`
- [x] 5.6 Create `api/pipeline/gate3-send.js` — verifies `sharepoint_proposal_url` and `client_email` are set, POSTs to `POWER_AUTOMATE_PROPOSAL_SEND_TRIGGER_URL` with engagement ID, SharePoint URL, and client email; returns 400 if `client_email` is null; status is NOT changed on either success or failure

## 6. Gate 3 Review Page — Scaffold

- [x] 6.1 Create `src/pages/review/ProposalReview.jsx` — fetches engagement, determines which part to show based on `chosen_solution` / `proposal_json` state, redirects if not `gate3_review`
- [x] 6.2 Add route `/review/:id/proposal` in `App.jsx` pointing to `ProposalReview`

## 7. Gate 3 Review Page — Part 1 (Solution Selection)

- [x] 7.1 Create `src/pages/review/Part1SolutionSelect.jsx` — radio list from `engagement.solutions`, "Next: Add Context →" button disabled until selection made
- [x] 7.2 Wire "Next" button to `POST /api/pipeline/gate3-select-solution`, advance to Part 2 on success

## 8. Gate 3 Review Page — Part 2 (Context Capture)

- [x] 8.1 Create `src/pages/review/Part2ContextCapture.jsx` — Brain-dump / Transcript / Guided tabs with `mode="supplementary"` prop, "No additional context" checkbox
- [x] 8.2 Wire "Generate Proposal →" button to `POST /api/pipeline/gate3-generate`, show loading state, advance to Part 3 on success
- [x] 8.3 Display error and re-enable button on API failure

## 9. Gate 3 Review Page — Part 3 (Proposal Loop)

- [x] 9.1 Create `src/pages/review/Part3ProposalLoop.jsx` — A4 HTML preview rendered from `proposal_json` via `renderProposalHtml`; four actions: "Approve Proposal", natural-language instruction textarea + "Update Proposal", inline text field editing, "Add context and regenerate" panel
- [x] 9.2 Wire "Update Proposal" to `POST /api/pipeline/gate3-edit`, re-render preview on success, clear textarea
- [x] 9.3 Wire "Approve Proposal" to `POST /api/pipeline/gate3-approve` (merging any local inline edits into the submitted JSON), navigate to `/engagements/:id` on success
- [x] 9.4 Implement inline editing: text fields in the HTML preview are contenteditable; changes held in local React state and merged into `proposal_json` only on Approve or Update
- [x] 9.5 Implement "Add context and regenerate": Brain-dump / Transcript input panel, submits to `POST /api/pipeline/gate3-generate` with appended context, re-renders on success
- [x] 9.6 Show loading states on all action controls; re-enable on error with message preserved

## 10. "Change Solution" Button

- [x] 10.1 Add "Change solution" button to Part 1, Part 2, and Part 3 components
- [x] 10.2 Wire to `POST /api/pipeline/gate3-reset-solution`; show confirmation prompt before submitting from Part 3; return to Part 1 on success

## 11. EngagementDetail Updates

- [x] 11.1 Add `gate3_review` action card in `StatusSection` with "Review Proposal →" button linking to `/review/:id/proposal`
- [x] 11.2 Add `gate4_review` status label to `STATUS_LABELS` (Dashboard) and `STATUS_STEPS` (EngagementDetail) if not already present
- [x] 11.3 Add "Send to Client" button to EngagementDetail when `sharepoint_proposal_url` is set and status is `gate4_review`; clicking calls `POST /api/pipeline/gate3-send` and shows a "Sent" confirmation on success; also display the SharePoint URL for manual sharing
