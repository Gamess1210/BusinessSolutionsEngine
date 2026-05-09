## Context

Gate 6 currently produces two client-facing PDFs (Final Client Brief, Business Proposal already sent at Gate 3) and one internal PDF (Review Loop Report). After Gate 6 approval, a BA has no single document capturing the full engagement history — the approved brief, solutions, gate decisions, code quality scores, and who approved what. This is a gap for internal quality review, retrospectives, and any future audit.

The Project Summary PDF closes this gap. It is a pure data-assembly document: all content already exists in Supabase by the time Gate 6 is reached. No AI call is required. The function reads from six tables, renders to A4 HTML via the `comotion-a4-html-template.html` standard, and uploads to SharePoint using the existing Graph API integration.

## Goals / Non-Goals

**Goals:**
- Implement `generateProjectSummaryPdf(engagementId)` in `src/lib/documents/projectSummary.js` as a pure data-assembly + HTML render + Puppeteer PDF function
- Wire the call into `outputGenerationChain` so the PDF is generated atomically with the other Gate 6 documents
- Add `sharepoint_project_summary_url` to `engagements` and populate it on upload
- Define the SharePoint file path: `Business Solutions/[ClientName]/[YYYY]/[ClientName]_[YYYY-MM-DD]_ProjectSummary.pdf`
- Ensure the document is never included in any client-facing Power Automate flow or Gate 6 notification email

**Non-Goals:**
- No AI content generation — all sections are rendered from Supabase data
- Not a gate for client documents — upload failure never delays the client-facing Gate 6 outputs; it only blocks the engagement reaching `complete`
- Not sent to the client — excluded from all Power Automate flows
- Not displayed in the Gate 6 review UI — the BA sees client documents only at Gate 6

## Decisions

### Decision 1: No AI call — pure Supabase data assembly
**Chosen**: All content sourced from existing Supabase rows; no Claude or Gemini call.
**Why**: All required data (brief, solutions, gate approvals, code reviews, review loop report) is already structured, approved, and stored by the time Gate 6 runs. Adding an AI call would introduce latency, cost, and a new failure mode for no benefit.
**Alternative considered**: Claude summarises the engagement narrative. Rejected — the value of this document is the factual record, not a generated summary.

### Decision 2: Generated inside `outputGenerationChain`, not a separate chain
**Chosen**: `generateProjectSummaryPdf` is called as a step inside `outputGenerationChain`, after the client documents are generated.
**Why**: Gate 6 output generation is already a single Vercel invocation. Adding a separate API route adds a round-trip and a new gate-state dependency for a document that is not client-facing.
**Alternative considered**: Separate `projectSummaryChain`. Rejected — no AI orchestration needed; a plain async function is sufficient.

### Decision 3: Hard failure with three-tier recovery — upload blocks engagement completion
**Chosen**: Upload failure is a blocking condition with an explicit resolution path. Three tiers:
- **Tier 1 — Automatic retry**: up to 3 attempts with 1 s / 2 s / 4 s exponential backoff, within the initial upload call. No BA involvement.
- **Tier 2 — BA retry**: if Tier 1 exhausts, Gate 6 is blocked at `gate6_review`. BA notified via Power Automate Teams. Dedicated route `api/pipeline/retry-project-summary.js` handles BA-triggered retries. Each BA retry increments `engagements.project_summary_upload_attempts`.
- **Tier 3 — Manual escape hatch**: after `project_summary_upload_attempts >= 2`, a "Mark as manually uploaded" button appears. BA confirms with a note. Recorded in `gate_approvals` as `action = 'manual_override'` with note in `edits_made`. Engagement advances to `complete`.

**Why**: A silently missing internal audit document is worse than a blocked gate. The BA must make an active decision (retry or manual override) rather than the system hiding the failure. The three-tier model provides proportionate automation: most transient SharePoint outages resolve within seconds (Tier 1), persistent outages get a human retry (Tier 2), and truly unresolvable situations have an audited escape route (Tier 3).
**Alternative considered**: Soft failure — log and continue. Rejected — the Project Summary is the engagement's complete audit trail; discovering it missing weeks later (e.g., during a client dispute or internal review) has a higher cost than blocking the BA at Gate 6 for a few minutes.

### Decision 4: Top-level year folder, not `_internal/`
**Chosen**: `Business Solutions/[ClientName]/[YYYY]/[ClientName]_[YYYY-MM-DD]_ProjectSummary.pdf`
**Why**: The `_internal/` subfolder is reserved for the Review Loop Report (automated pipeline detail). The Project Summary is a BA-level record and should sit alongside the client documents for easy retrieval, while still being clearly labelled as internal by its filename. It is never sent to the client but is not hidden.

### Decision 5: Multi-page A4 HTML — no content compression
**Chosen**: Each section of the Project Summary is rendered into a `<div class="page">` block. If content overflows, a new page is opened.
**Why**: The `comotion-a4-html-template.html` standard forbids compressing font sizes to fit content. Gate approval trail (6 rows) and review loop cycle detail may require 2–3 pages.
**Cap on review cycle detail**: Display scores for the last 3 cycles only; full data is in the Review Loop Report. This keeps the document to a manageable length.

## Risks / Trade-offs

- **[Risk] Missing data for engagements without code generation** — not all engagements reach Gate 5. → Mitigation: Render code review and review loop sections as "Code generation not performed for this engagement" if `code_reviews` rows are absent.
- **[Risk] Gate approval trail incomplete (e.g., dev shortcuts)** — query returns fewer than 6 `gate_approvals` rows. → Mitigation: Render all 6 gate rows; show "Pending" for any gate without a record.
- **[Risk] `review_loop_reports` not yet written when outputGenerationChain runs** — report is generated in the same chain. → Mitigation: `generateProjectSummaryPdf` is called after `generateReviewLoopReport` within the chain; order is enforced by sequential calls.
- **[Risk] Puppeteer cold-start adds latency to Gate 6** — Puppeteer is already used for other Gate 6 documents. → Mitigation: Reuse the same browser instance within the Vercel function for all three PDF conversions (Proposal, Brief, Project Summary). Do not launch a new browser per document.
- **[Risk] `project_summary_upload_attempts` counter drifts from actual retry history** — if the Vercel function is interrupted between the upload attempt and the counter increment, the count can be off by one. → Mitigation: The counter is a UX threshold signal (show manual override after ≥ 2), not a precise audit log. The error_log array is the authoritative record. Off-by-one in the counter is acceptable; if the BA sees the override button one attempt early or late, the worst outcome is a slightly earlier or later escape option.
- **[Risk] `manual_override` requires a schema migration to `gate_approvals.action` check constraint** — adding a value to a CHECK constraint on a live table requires an `ALTER TABLE`. → Mitigation: Migration script drops and recreates the constraint in one transaction; no data is affected since no existing rows have `action = 'manual_override'`.

## Migration Plan

1. **Schema migrations** (run before any code deployment):
   - Add `sharepoint_project_summary_url TEXT` column to `engagements` (nullable).
   - Add `project_summary_upload_attempts INTEGER DEFAULT 0` column to `engagements`.
   - Add `'manual_override'` to the `gate_approvals.action` CHECK constraint (drop + recreate constraint in one transaction).
2. Implement `src/lib/documents/projectSummary.js` (data assembly, HTML render, Puppeteer, upload with retry).
3. Implement `api/pipeline/retry-project-summary.js` (BA-triggered retry route).
4. Update Gate 6 review UI (`/review/[id]/outputs`) to show retry button and conditional manual override button.
5. Update `outputGenerationChain` to call `generateProjectSummaryPdf` and handle the blocked-gate path.
6. Wire Power Automate Teams notification for upload exhaustion.
7. **Rollback**: all new columns are nullable / have defaults; removing the upload call leaves them unpopulated with no downstream impact. The `manual_override` CHECK constraint change is safe to revert by dropping and recreating without it.

## Open Questions

- Should the Project Summary be visible in the BSE UI after Gate 6 (e.g., as a download link on the engagement detail page)? Assumed no for this change — the URL is stored in Supabase and accessible if needed, but no UI surface is built here.
- Should the document be generated for engagements that were rejected at Gate 6? Assumed no — only generate on approval.
