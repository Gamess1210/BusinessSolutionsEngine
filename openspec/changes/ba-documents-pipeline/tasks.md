## 1. Database Migration

- [ ] 1.1 [SCHEMA MIGRATION] Add six SharePoint URL columns to `engagements` — run manually in Supabase SQL editor: `ALTER TABLE engagements ADD COLUMN IF NOT EXISTS sharepoint_asis_url text; ADD COLUMN IF NOT EXISTS sharepoint_brd_url text; ADD COLUMN IF NOT EXISTS sharepoint_sia_url text; ADD COLUMN IF NOT EXISTS sharepoint_tobe_url text; ADD COLUMN IF NOT EXISTS sharepoint_rtm_url text; ADD COLUMN IF NOT EXISTS sharepoint_change_mgmt_url text;`
- [ ] 1.2 [SCHEMA MIGRATION] Add `rtm_data` JSONB column to `engagements` — run manually: `ALTER TABLE engagements ADD COLUMN IF NOT EXISTS rtm_data jsonb;`

## 2. Shared Infrastructure

- [ ] 2.1 Create `src/lib/generateBaDoc.js` — exports `generateBaDoc(supabaseAdmin, engagementId, docType, chainInput)`. Invokes chain, renders HTML, calls `generatePdf`, uploads to SharePoint (skip if null buffer), updates the correct `sharepoint_*_url` column, returns URL or null. Non-fatal: all errors caught and returned as `{ success: false, warning }`.
- [ ] 2.2 Add `DOC_TYPE_CONFIG` map in `generateBaDoc.js` — maps each `doc_type` string to `{ chain, renderer, columnName, filenameSuffix }`. Keeps the route handler free of switch logic.

## 3. LangChain Chains (all Claude, all in `src/lib/chains/`)

- [ ] 3.1 [LANGCHAIN] Create `src/lib/chains/asIsProcessMapChain.js` — accepts `{ engagement }`. System prompt instructs Claude to produce a current-state process map JSON with steps, pain points mapped to steps, and KPIs. Uses `claude-sonnet-4-20250514`. Exports `asIsProcessMapChain`.
- [ ] 3.2 [LANGCHAIN] Create `src/lib/chains/brdChain.js` — accepts `{ engagement }`. System prompt instructs Claude to produce a full BRD JSON (executive summary, business context, scope in/out, stakeholder table, MoSCoW requirements, compliance, success criteria, assumptions, glossary). Exports `brdChain`.
- [ ] 3.3 [LANGCHAIN] Create `src/lib/chains/stakeholderImpactChain.js` — accepts `{ engagement }` (uses `structured_brief`, `chosen_solution`, `solutions`). System prompt instructs Claude to produce SIA JSON (impact summary table, people/process/technology/regulatory dimensions, risk assessment, readiness assessment). Exports `stakeholderImpactChain`.
- [ ] 3.4 [LANGCHAIN] Create `src/lib/chains/toBeProcessMapChain.js` — accepts `{ engagement, openspecContent }`. System prompt instructs Claude to produce a future-state process map JSON (future steps, as-is vs to-be comparison, expected KPI improvements). Exports `toBeProcessMapChain`.
- [ ] 3.5 [LANGCHAIN] Create `src/lib/chains/rtmChain.js` — accepts `{ engagement, priorRtmData, phase }` where phase is `'initial' | 'spec-update' | 'final'`. System prompt adapts instructions per phase. Returns structured RTM JSON. Exports `rtmChain`.
- [ ] 3.6 [LANGCHAIN] Create `src/lib/chains/changeManagementChain.js` — accepts `{ engagement }` (uses `structured_brief`, `chosen_solution`). System prompt instructs Claude to produce a change management plan JSON (change overview, comms plan, training plan, process doc updates, go-live checklist, rollback plan, post go-live support). Exports `changeManagementChain`.

## 4. A4 HTML Renderers (all in `src/lib/`)

- [ ] 4.1 Create `src/lib/renderAsIsProcessMapHtml.js` — renders As-Is process steps table, pain points mapped to steps, KPIs summary. Exports `renderAsIsProcessMapHtml(doc)`.
- [ ] 4.2 Create `src/lib/renderBrdHtml.js` — renders BRD with sections: executive summary, business context, scope table, stakeholder table, MoSCoW requirements table, compliance list, success criteria table, assumptions list, glossary table. Exports `renderBrdHtml(doc)`.
- [ ] 4.3 Create `src/lib/renderStakeholderImpactHtml.js` — renders SIA with impact summary table, dimension sections (people/process/technology/regulatory), risk table, readiness assessment. Exports `renderStakeholderImpactHtml(doc)`.
- [ ] 4.4 Create `src/lib/renderToBeProcessMapHtml.js` — renders future-state steps, side-by-side as-is vs to-be comparison table, KPI improvement table. Exports `renderToBeProcessMapHtml(doc)`.
- [ ] 4.5 Create `src/lib/renderRtmHtml.js` — renders RTM as a multi-column traceability table (requirement → OpenSpec scenario → user story → test case → status). Footer labels version (v1/v2/final). Exports `renderRtmHtml(doc)`.
- [ ] 4.6 Create `src/lib/renderChangeManagementHtml.js` — renders change overview, comms plan table, training plan table, process docs list, go-live checklist, rollback steps, post go-live support. Exports `renderChangeManagementHtml(doc)`.

## 5. API Route

- [ ] 5.1 Create `api/pipeline/generate-ba-docs.js` — POST handler. Authenticates user, verifies engagement ownership, validates `doc_type` against `DOC_TYPE_CONFIG`, fetches full engagement, calls `generateBaDoc`, returns `{ success, url }` or `{ success: false, warning }`. Never returns 5xx on chain/render failure.

## 6. Gate Route Updates

- [ ] 6.0a [PREREQUISITE] Create `api/pipeline/gate1-approve.js` — validates `engagement.status === 'gate1_review'` (409 otherwise), inserts `gate_approvals` record (`gate_number: 1`, `action: 'approved'`), advances status to `solutions_pending`. Must exist before task 6.1 can patch it.
- [ ] 6.1 Update `api/pipeline/gate1-approve.js` — after inserting gate_approval record, fire `Promise.allSettled([generateBaDoc(..., 'asis'), generateBaDoc(..., 'brd'), generateBaDoc(..., 'rtm', { phase: 'initial' })])`. All non-fatal.
- [ ] 6.2 Update `api/pipeline/gate3-send.js` — after `triggerPowerAutomate` succeeds, fire `generateBaDoc(..., 'sia')`. Non-fatal. Note: gate3-send.js does not record a gate_approvals entry; the SIA trigger fires on the successful Power Automate call, not a gate_approvals write.
- [ ] 6.3 Update `api/pipeline/gate6-approve.js` — after inserting gate_approval record, fire `Promise.allSettled([generateBaDoc(..., 'tobe'), generateBaDoc(..., 'rtm', { phase: 'spec-update' })])`. Non-fatal.
- [ ] 6.3a [DEFERRED — other developer scope] `api/pipeline/gate6-approve.js` does not yet exist — task 6.3 cannot be implemented until Gate 6 is built. Whoever builds gate6-approve.js should wire in the `tobe` and `rtm` spec-update calls at that time.
- [ ] 6.4 Update `api/pipeline/gate7-approve.js` — after inserting gate_approval record, fire `Promise.allSettled([generateBaDoc(..., 'rtm', { phase: 'final' }), generateBaDoc(..., 'change-mgmt')])`. Non-fatal.
- [ ] 6.4a [DEFERRED — other developer scope] `api/pipeline/gate7-approve.js` does not yet exist — task 6.4 cannot be implemented until Gate 7 is built. Whoever builds gate7-approve.js should wire in the `rtm` final and `change-mgmt` calls at that time.

## 7. Schema Documentation (deferred)

- [ ] 7.1 At next BSE Instructions schema review: add `sharepoint_asis_url`, `sharepoint_brd_url`, `sharepoint_sia_url`, `sharepoint_tobe_url`, `sharepoint_rtm_url`, `sharepoint_change_mgmt_url`, `rtm_data` to the Supabase Schema Reference skill
- [ ] 7.2 At next BSE Instructions schema review: add `asIsProcessMapChain`, `brdChain`, `stakeholderImpactChain`, `toBeProcessMapChain`, `rtmChain`, `changeManagementChain` to the LangChain Chain Patterns model assignment table
- [ ] 7.3 Update `CLAUDE.md` Document Generation section: change "Five documents per engagement" to "Eleven documents per engagement" and update the document list to include all six new BA documents with their trigger gates and audiences.

## 8. Manual Smoke Tests

- [ ] 8.1 Approve Gate 1 on a test engagement — confirm `sharepoint_asis_url`, `sharepoint_brd_url` are set (or null with warning logged locally) and `rtm_data` is populated
- [ ] 8.2 Send proposal at Gate 3 — confirm `sharepoint_sia_url` is set or warning logged
- [ ] 8.3 Approve Gate 6 — confirm `sharepoint_tobe_url` set and `rtm_data` enriched with spec mappings
- [ ] 8.4 Approve Gate 7 — confirm `sharepoint_rtm_url` updated, `rtm_data` has test status, `sharepoint_change_mgmt_url` set
- [ ] 8.5 POST to `generate-ba-docs` with unknown `doc_type` — confirm 400 response
- [ ] 8.6 Simulate chain failure — confirm gate approval succeeds, warning logged, URL column null
