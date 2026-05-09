## Why

Once an engagement reaches Gate 6 there is no single internal document that captures the complete record — what the problem was, what was approved at each gate, what the code review found, and who signed off on everything. The three existing documents (Business Proposal, Final Client Brief, Review Loop Report) together contain this information but are spread across client-facing and internal views. A Project Summary PDF consolidates the full engagement audit trail into one internal artefact for BA records, quality review, and future reference.

## What Changes

- **New**: `src/lib/documents/projectSummary.js` — data assembly and A4 HTML rendering function for the Project Summary PDF (no AI call; all content sourced from Supabase)
- **Modified**: `outputGenerationChain` (`src/lib/chains/outputGeneration.js`) — calls `generateProjectSummaryPdf` after other Gate 6 documents and writes `sharepoint_project_summary_url` to `engagements`
- **Schema addition**: `sharepoint_project_summary_url TEXT` column on `engagements`
- **SharePoint folder structure**: new entry `[ClientName]_[YYYY-MM-DD]_ProjectSummary.pdf` in the top-level year folder alongside client documents (not in `_internal/`)

## Capabilities

### New Capabilities
- `project-summary-pdf`: Assembles complete engagement data from Supabase (structured brief, solutions, proposal send confirmation, spec pointers, Gemini scorecard, ESLint CC summary, gate approval trail for all 6 gates, review loop summary, team member name), renders to multi-page A4 HTML using the `comotion-a4-html-template.html` standard, converts to PDF via Puppeteer (`@sparticuz/chromium`), and uploads to SharePoint. Never sent to clients.

### Modified Capabilities
<!-- No existing specs are changing requirements — outputGenerationChain has no prior spec file -->

## Impact

- **`src/lib/chains/outputGeneration.js`** — new call to `generateProjectSummaryPdf` within Gate 6 output generation sequence
- **`src/lib/documents/projectSummary.js`** — new file; reads from `engagements`, `gate_approvals`, `code_reviews`, `review_loop_reports`, `specifications`, `users` tables
- **`engagements` schema** — new `sharepoint_project_summary_url TEXT` column (nullable; no breaking change)
- **SharePoint folder structure** — new file naming entry added to BSE v5.1 Section 11 standard
- **Gate 6** — Project Summary PDF is generated as part of Gate 6 output; Gate 6 approval does not depend on it (non-blocking), but it must be generated and uploaded before the Gate 6 approval record is written
- **No new dependencies** — uses `puppeteer-core`, `@sparticuz/chromium`, and Microsoft Graph API already in stack
