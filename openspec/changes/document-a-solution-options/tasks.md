## 1. Database Migration

- [x] 1.1 [SCHEMA MIGRATION] Add `sharepoint_solution_options_url` (text, nullable) column to `engagements` table via a new Supabase migration file

## 2. Document A Generation Chain

- [x] 2.1 [CHAIN] Create `src/lib/chains/documentAGenerationChain.js` — LangChain chain using Claude (claude-sonnet-4-20250514) that accepts engagement data and returns structured Document A JSON
- [x] 2.2 Write the LangChain prompt template for Document A JSON generation, covering both `quick` (3 options, effort/impact/key_risk) and `deep` (5 options, full fields) analysis modes
- [x] 2.3 Ensure `documentAGenerationChain` stays at CC ≤ 10 per function — extract mode-branching logic to a helper if needed

## 3. HTML Render and PDF Conversion

- [x] 3.1 Create `src/lib/renderDocumentAHtml.js` — accepts Document A JSON and returns A4 HTML string using `comotion-a4-html-template.html`
- [x] 3.2 Create `src/lib/generatePdf.js` (or reuse existing helper if present) — accepts HTML string, converts to PDF buffer using `puppeteer-core` + `@sparticuz/chromium`
- [x] 3.3 Verify PDF filename format: `[ClientName]_[YYYY-MM-DD]_SolutionOptions.pdf`

## 4. SharePoint Upload

- [x] 4.1 Create or identify `src/lib/sharepoint.js` — Microsoft Graph API helper to upload a file buffer and return the SharePoint URL
- [x] 4.2 Confirm Graph API credentials/env vars are documented in `.env.example` (e.g., `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `SHAREPOINT_SITE_ID`, `SHAREPOINT_DRIVE_ID`)

## 5. Gate 2 Approve API Route Extension

- [x] 5.1 Extend `api/pipeline/gate2-approve.js` to invoke `documentAGenerationChain`, render HTML, generate PDF, and upload to SharePoint after persisting approval
- [x] 5.2 On successful upload: set `sharepoint_solution_options_url` and advance `status` to `gate3_review`
- [x] 5.3 On any failure: set `status = 'failed'`, `last_successful_gate = 2`, populate `error_log` with `{ message, chain: 'documentAGenerationChain', timestamp }`, and return non-2xx response
- [x] 5.4 Ensure the approval action stays server-side — no pipeline state change originates from the frontend

## 6. Frontend — SolutionsReview Page Update

- [x] 6.1 Update Approve button loading label to "Generating Document A…" while request is in flight
- [x] 6.2 Navigate to `/engagements/:id` only after receiving `gate3_review` confirmation from the API (not on `proposal_pending`)
- [x] 6.3 Display error message and re-enable Approve button if the API returns a non-2xx response

## 7. Frontend — EngagementDetail Document A Link

- [x] 7.1 Add a "Solution Options Summary" section to EngagementDetail that shows when `engagement.sharepoint_solution_options_url` is not null
- [x] 7.2 Render the SharePoint URL as an anchor that opens in a new tab
- [x] 7.3 Hide the section entirely when `sharepoint_solution_options_url` is null

## 8. Status Labels

- [x] 8.1 Confirm `gate3_review` has a display label in `STATUS_LABELS` (Dashboard) and `STATUS_STEPS` (EngagementDetail); add if missing
