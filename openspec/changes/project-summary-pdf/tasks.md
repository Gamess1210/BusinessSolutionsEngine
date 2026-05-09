## 1. Database Migration

- [ ] 1.1 [SCHEMA MIGRATION] Write Supabase SQL migration to add `sharepoint_project_summary_url TEXT` column to `engagements` (nullable, no breaking change)
- [ ] 1.2 [SCHEMA MIGRATION] Add `project_summary_upload_attempts INTEGER DEFAULT 0` column to `engagements` (no breaking change)
- [ ] 1.3 [SCHEMA MIGRATION] Alter `gate_approvals.action` CHECK constraint to include `'manual_override'` — drop existing constraint and recreate with the new value in one transaction
- [ ] 1.4 Apply all three migrations in Supabase dashboard and verify columns and constraint exist

## 2. Data Assembly Function

- [ ] 2.1 Create `src/lib/documents/projectSummary.js` — define `assembleProjectSummaryData(engagementId)` that queries all required tables using `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 2.2 Query `engagements` for structured_brief, solutions, client_name, organisation, client_email, industry, analysis_mode, team_member_id, created_at
- [ ] 2.3 Query `users` to resolve `team_member_id` → `full_name`
- [ ] 2.4 Query `gate_approvals` for all rows ordered by gate_number; construct 6-row array with `{ gate_number, action, approved_by, approved_at }` — fill missing gates with `{ action: 'pending', approved_by: null, approved_at: null }`
- [ ] 2.5 Query `code_reviews` for the most recent row (highest review_cycle); set to null if none exists
- [ ] 2.6 Query `review_loop_reports` for the most recent row; extract total_cycles, review_escalated, final_threshold_met; set to null if none exists
- [ ] 2.7 Query `specifications` for repo_path, commit_sha, approved_at; set to null if none exists
- [ ] 2.8 Verify `assembleProjectSummaryData` CC ≤ 10; extract per-table query helpers if needed

## 3. A4 HTML Renderer

- [ ] 3.1 Implement `renderProjectSummaryHtml(data)` in `src/lib/documents/projectSummary.js` — reads `comotion-a4-html-template.html` as the base template
- [ ] 3.2 Render engagement header section: client name, organisation, industry, analysis_mode, team member full name, engagement date (created_at as YYYY-MM-DD)
- [ ] 3.3 Render approved brief section: executive_summary, pain_points (bullet list), constraints (bullet list), success_criteria
- [ ] 3.4 Render approved solutions section: title, effort, impact per solution (up to 5 rows)
- [ ] 3.5 Render proposal send confirmation section: client_email and Gate 3 approved_at timestamp; show "Not sent" if Gate 3 record absent
- [ ] 3.6 Render spec record section: repo_path and commit_sha; show "No spec generated" if null
- [ ] 3.7 Render code review section: final Gemini scores for all 5 dimensions + ESLint CC summary from eslint_cc_report; show "Code generation not performed" if code_reviews is null
- [ ] 3.8 Render gate approval trail section: 6-row table with gate number, gate name, action, approved_by, approved_at; "Pending" for missing gates
- [ ] 3.9 Render review loop summary section: total_cycles, review_escalated (badge in `--red` if true), final_threshold_met; cap cycle score detail to last 3 cycles with note; show "Not applicable" if null
- [ ] 3.10 Apply Comotion brand colours: `--navy` for section headers, `--green` for accent labels, `--red` for escalation badges
- [ ] 3.11 Wrap sections in `<div class="page">` containers; open a new page when content would overflow rather than compressing font sizes
- [ ] 3.12 Verify `renderProjectSummaryHtml` CC ≤ 10; extract per-section render helpers if needed

## 4. PDF Generation and SharePoint Upload

- [ ] 4.1 Implement `generateProjectSummaryPdf(engagementId)` as the exported function — calls `assembleProjectSummaryData`, `renderProjectSummaryHtml`, Puppeteer conversion, and `uploadWithRetry` in sequence
- [ ] 4.2 Use `puppeteer-core` + `@sparticuz/chromium` for HTML → PDF conversion (reuse browser instance from caller if passed; otherwise launch new)
- [ ] 4.3 Construct SharePoint filename: `[ClientName]_[YYYY-MM-DD]_ProjectSummary.pdf` using `client_name` and `created_at` from engagement
- [ ] 4.4 Implement `uploadWithRetry(pdfBuffer, path)` — attempts Graph API upload up to 3 times with exponential backoff (1 s, 2 s, 4 s); throws on final failure
- [ ] 4.5 On successful upload: write `sharepoint_project_summary_url` to `engagements`; return `{ success: true }`
- [ ] 4.6 On `uploadWithRetry` throwing (all 3 attempts failed): write error to `engagements.error_log` with `{ document: 'projectSummary', message, attempt: 3, timestamp }`; increment `engagements.project_summary_upload_attempts` by 1; throw the error to the caller (outputGenerationChain)
- [ ] 4.7 Verify `generateProjectSummaryPdf` and `uploadWithRetry` CC ≤ 10 each

## 5. outputGenerationChain Integration — [GATE 6]

- [ ] 5.1 [LANGCHAIN] Open `src/lib/chains/outputGeneration.js` and locate the Gate 6 document generation sequence
- [ ] 5.2 Import `generateProjectSummaryPdf` from `src/lib/documents/projectSummary.js`
- [ ] 5.3 Add call to `generateProjectSummaryPdf(engagementId)` after `generateReviewLoopReport` and after Final Client Brief PDF generation
- [ ] 5.4 Guard the call: only invoke when Gate 6 action is `approved`; skip on rejection
- [ ] 5.5 If `generateProjectSummaryPdf` throws (all retries failed): catch the error, trigger Power Automate Teams notification via `POWER_AUTOMATE_FAILURE_TRIGGER_URL` with `{ engagementId, document: 'projectSummary', error, gate6ReviewUrl }`, leave `engagements.status` at `gate6_review`, and return without advancing to `complete`

## 6. BA Retry API Route — [GATE 6]

- [ ] 6.1 Create `api/pipeline/retry-project-summary.js` — Vercel serverless route accepting POST `{ engagementId }`
- [ ] 6.2 Authenticate request; return 401 if missing session
- [ ] 6.3 Read engagement; return 404 if not found or not owned by user; return 409 if `status` is not `gate6_review`
- [ ] 6.4 Call `generateProjectSummaryPdf(engagementId)` (includes its own 3-attempt exponential backoff)
- [ ] 6.5 On success: advance `engagements.status` to `complete`; return HTTP 200 `{ success: true }`
- [ ] 6.6 On failure: error already written to `error_log` and `project_summary_upload_attempts` incremented inside `generateProjectSummaryPdf`; return HTTP 500 `{ success: false, uploadAttempts: <current count> }`
- [ ] 6.7 Verify route CC ≤ 10

## 7. Gate 6 UI — Retry Button and Manual Override — [GATE 6]

- [ ] 7.1 On the Gate 6 review screen (`/review/[id]/outputs`): show a "Project Summary upload failed" status banner when `sharepoint_project_summary_url` is null and `status` is `gate6_review`
- [ ] 7.2 Display "Retry upload" button in the banner; on click POST to `api/pipeline/retry-project-summary`; show loading state while in progress
- [ ] 7.3 On retry success: hide banner, show "Project Summary uploaded" confirmation; engagement advances to `complete`
- [ ] 7.4 On retry failure: show updated error message; keep button active
- [ ] 7.5 When `project_summary_upload_attempts >= 2`: show "Mark as manually uploaded" button alongside "Retry upload"
- [ ] 7.6 "Mark as manually uploaded" opens a confirmation modal requiring a non-empty note field; submit disabled until note is provided
- [ ] 7.7 On confirmation: POST to a new endpoint `api/pipeline/manual-override-project-summary` with `{ engagementId, note }`; route inserts `gate_approvals` record `{ gate_number: 6, action: 'manual_override', edits_made: { note, manual_upload_confirmed_at } }` and updates `engagements.status` to `complete`
- [ ] 7.8 Verify manual override endpoint CC ≤ 10; authenticate and authorise identically to the retry route

## 8. Client Exclusion Verification

- [ ] 8.1 Confirm `sharepoint_project_summary_url` is NOT included in the Gate 6 Power Automate flow payload (`POWER_AUTOMATE_GATE6_TRIGGER_URL` POST body)
- [ ] 8.2 Confirm Gate 6 review UI (`/review/[id]/outputs`) does not render a link or preview for the Project Summary PDF in the client document section

## 9. Smoke Test

- [ ] 9.1 Run a Gate 6 approval on a test engagement that has completed the full pipeline; verify `sharepoint_project_summary_url` is populated and status advances to `complete`
- [ ] 9.2 Open the PDF in SharePoint and verify all 8 sections are present with correct data
- [ ] 9.3 Run a Gate 6 rejection; verify `sharepoint_project_summary_url` remains null and `generateProjectSummaryPdf` was not called
- [ ] 9.4 Simulate a SharePoint upload failure (all 3 auto-retries): verify `error_log` updated, `project_summary_upload_attempts` = 1, `status` remains `gate6_review`, Teams notification triggered
- [ ] 9.5 Trigger BA retry via the Gate 6 UI "Retry upload" button; verify `project_summary_upload_attempts` increments and, on success, status advances to `complete`
- [ ] 9.6 Simulate 2 failed BA retries (`project_summary_upload_attempts` = 2); verify "Mark as manually uploaded" button appears
- [ ] 9.7 Submit manual override with a note; verify `gate_approvals` row with `action = 'manual_override'` and note in `edits_made`; verify status advances to `complete`
- [ ] 9.8 Attempt manual override with an empty note; verify submission is rejected and no `gate_approvals` row is inserted
