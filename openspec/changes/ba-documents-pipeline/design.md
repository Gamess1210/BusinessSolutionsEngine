## Context

BSE currently auto-generates two documents: Document A (Solution Options PDF, after Gate 2) and Document B (Business Proposal PDF, at Gate 3). Six additional BA-standard documents are required by financial services clients. All source data (structured_brief, chosen_solution, solutions, OpenSpec files, code_reviews) already exists in the pipeline at the relevant gates. The generation pattern — LangChain chain → A4 HTML render → Puppeteer PDF → SharePoint upload — is established and reused from the existing document generation code.

## Goals / Non-Goals

**Goals:**
- Generate six BA documents automatically at their respective gate triggers
- Each generation is non-fatal: failure logs a warning and does not block gate progression
- SharePoint URLs stored on `engagements` for downstream display
- RTM generated progressively across three gates (1, 6, 7) with each version enriching the prior

**Non-Goals:**
- Frontend display of the six new document URLs (out of scope for this change)
- Email delivery of BA documents via Power Automate
- Document versioning or diff history beyond RTM progressive enrichment
- Backfilling documents for engagements that have already passed the trigger gates

## Decisions

**Single route with `doc_type` parameter vs one route per document**
Chosen: single `POST /api/pipeline/generate-ba-docs` with a `doc_type` param (`asis`, `brd`, `sia`, `tobe`, `rtm`, `change-mgmt`). All six documents follow identical orchestration logic — the only variation is which chain, renderer, filename, and engagements column is used. A doc-type dispatch map keeps this DRY. Six separate routes would be identical boilerplate.

**Non-fatal fire-and-forget from gate approval routes**
Each gate approval route calls `generateBaDoc(supabaseAdmin, engagementId, docType)` inside a `try/catch` after the gate_approval record is inserted — same pattern as `tryGenerateDocumentA` in `gate2-approve.js`. Failures are logged as warnings. Gate status never depends on BA document generation succeeding.

**Parallel generation at Gate 1 (three documents)**
As-Is map, BRD, and initial RTM all trigger after Gate 1 approval. They are fired with `Promise.allSettled` so all three run in parallel and individual failures do not affect each other or gate status.

**RTM progressive enrichment**
The RTM chain is called three times. After Gate 1: generates the initial requirements matrix from BRD requirements. After Gate 6: re-invoked with OpenSpec scenarios to map requirements to spec. After Gate 7: re-invoked with `code_reviews` data to add test status. Each call receives the prior version's structured data from `engagements.rtm_data` (new JSONB column) so it can enrich rather than regenerate. Final PDF replaces prior SharePoint file; `sharepoint_rtm_url` updated.

**All Claude, no Gemini**
All six chains use `claude-sonnet-4-20250514`. These are BA documents, not code — Gemini is only used for code review (structural constraint).

**Six explicit columns vs single JSONB**
Six nullable text columns (`sharepoint_asis_url`, etc.) are consistent with the existing column-per-document pattern (`sharepoint_proposal_url`, `sharepoint_solution_options_url`). One JSONB column would be more compact but breaks the established schema convention and makes RLS/column-level grants harder.

**SIA timing: Gate 3 send vs Gate 4 approval**
Chosen: SIA fires after `triggerPowerAutomate` succeeds in `gate3-send.js`. At that point `chosen_solution` is already set on the engagement (written by `gate3-select-solution.js` earlier in the Gate 3 flow). Firing at Gate 3 send is correct because: (a) the proposal the client receives is based on `chosen_solution`, so the SIA for that solution is relevant immediately; (b) `gate3-send.js` is the only place in the Gate 3 flow that confirms the proposal has been dispatched to the client.

Accepted limitation: `gate4-approve.js` does not currently update `chosen_solution` (it captures supplementary context only). If Gate 4 is extended in future to allow solution re-selection, a SIA re-generation trigger must be added to `gate4-approve.js` at that time.

## Risks / Trade-offs

- **Vercel timeout at Gate 1** — three documents fire in parallel. Each involves a Claude call + PDF render. Mitigation: `Promise.allSettled` so one slow/failing chain does not cascade; Vercel Pro function timeout is 60s which should be sufficient for three parallel Claude calls.
- **RTM completeness at Gate 1** — initial RTM has no test data or spec mappings. Mitigation: first version is explicitly labelled "v1 — Requirements Only" in the document footer.
- **Sparse brief fields** — if `structured_brief` is incomplete, document quality degrades. Mitigation: chains include explicit null-safe fallbacks; missing sections render as placeholder text rather than crashing.
- **To-Be Process Map requires OpenSpec** — `toBeProcessMapChain` reads OpenSpec files from the client repo. If the repo is inaccessible, generation fails. Mitigation: non-fatal; failure logs the error and clears the URL column.

## Migration Plan

1. **Schema migration** — add six nullable text columns + `rtm_data` JSONB column to `engagements` via Supabase SQL editor (no downtime; nullable additions are safe on live tables).
2. **Deploy** — new route, chains, and renderers deploy as part of normal Vercel build; existing gate routes are patched to fire the generate calls.
3. **No backfill required** — BA documents will generate for all new engagements going forward; existing engagements retain null URLs, which the UI handles gracefully.
