## ADDED Requirements

### Requirement: Project Summary PDF assembles complete engagement data from Supabase
The system SHALL provide a `generateProjectSummaryPdf(engagementId)` function in `src/lib/documents/projectSummary.js` that reads all required data from Supabase and returns a structured data object ready for HTML rendering. The function SHALL source data from: `engagements` (structured_brief, solutions, client_email, client_name, organisation, industry, analysis_mode), `gate_approvals` (all rows for the engagement, ordered by gate_number), `code_reviews` (most recent row by review_cycle), `review_loop_reports` (most recent row), `specifications` (repo_path, commit_sha, approved_at), and `users` (full_name of team_member_id). No AI call is made.

#### Scenario: All six gate approvals are present
- **WHEN** `generateProjectSummaryPdf` is called for a completed engagement
- **THEN** the function reads all 6 `gate_approvals` rows for the engagement
- **AND** the assembled data object includes gate number, action, approved_by name, and approved_at for each gate

#### Scenario: Fewer than six gate approvals exist
- **WHEN** an engagement has gate_approvals records for fewer than 6 gates
- **THEN** the data object includes a row for each of the 6 gates
- **AND** any gate without a record is represented as `{ gate_number: N, action: 'pending', approved_by: null, approved_at: null }`

#### Scenario: Engagement had no code generation phase
- **WHEN** no `code_reviews` rows exist for the engagement
- **THEN** the assembled data object sets `codeReview: null`
- **AND** the rendered document displays "Code generation not performed for this engagement" in the code review section

#### Scenario: Review loop report exists
- **WHEN** a `review_loop_reports` row exists for the engagement
- **THEN** the data object includes total_cycles, review_escalated, and final_threshold_met from the report

### Requirement: Project Summary PDF renders to multi-page A4 HTML using the comotion template
The system SHALL render the assembled engagement data into A4 HTML following the `comotion-a4-html-template.html` standard. The document SHALL include the following sections in order: engagement header (client name, organisation, industry, analysis_mode, team member, date), approved structured brief summary (executive_summary, pain_points, constraints, success_criteria), approved solutions (title and effort/impact per solution), proposal send confirmation (client_email and Gate 3 approved_at timestamp), spec record (repo_path and commit_sha), code review summary (final scores across all 5 Gemini dimensions and ESLint CC summary), gate approval trail (all 6 gates), and review loop summary (total cycles, whether escalated, final threshold result). Each page SHALL be a `<div class="page">` sealed container. Font sizes SHALL NOT be compressed to fit content — overflow SHALL open a new page.

#### Scenario: Document renders within two pages for a typical engagement
- **WHEN** the engagement has a structured brief, 3–5 solutions, and a straightforward review loop
- **THEN** the rendered HTML produces no more than 3 A4 pages

#### Scenario: Gate approval trail spans section boundary
- **WHEN** the gate approval trail content would overflow the current page
- **THEN** a new `<div class="page">` is opened before the trail content overflows
- **AND** the footer remains at the bottom of each page

#### Scenario: Review cycle detail is capped
- **WHEN** the review loop had more than 3 cycles
- **THEN** only the most recent 3 cycles' scores are displayed in the document
- **AND** a note states "Full cycle detail in Review Loop Report"

#### Scenario: Comotion brand colours applied
- **WHEN** the document is rendered
- **THEN** section headers use `--navy` (#1A3B66), accent labels use `--green` (#8CC240), and alert badges (e.g., review_escalated = true) use `--red` (#D61C5E)

### Requirement: Project Summary PDF is uploaded to SharePoint with automatic retry
The system SHALL upload the generated PDF to SharePoint at `Business Solutions/[ClientName]/[YYYY]/[ClientName]_[YYYY-MM-DD]_ProjectSummary.pdf` using the Microsoft Graph API, and SHALL write the resulting SharePoint URL to `engagements.sharepoint_project_summary_url`. If the initial upload fails, the system SHALL automatically retry up to 3 times with exponential backoff (delays: 1 s, 2 s, 4 s). If all 3 automatic retries fail, the system SHALL write the error to `engagements.error_log`, increment `engagements.project_summary_upload_attempts` by 1, keep `engagements.status` at `gate6_review`, and block Gate 6 — the engagement SHALL NOT advance to `complete` until the upload succeeds or the BA invokes the manual override.

#### Scenario: Successful upload on first attempt
- **WHEN** the PDF is generated and the Graph API upload succeeds on the first attempt
- **THEN** `engagements.sharepoint_project_summary_url` is populated with the SharePoint file URL
- **AND** the file appears at the expected path in SharePoint

#### Scenario: Upload succeeds on an automatic retry
- **WHEN** the initial upload fails and a subsequent automatic retry succeeds
- **THEN** `engagements.sharepoint_project_summary_url` is populated on the successful attempt
- **AND** no error is written to `engagements.error_log`

#### Scenario: All automatic retries exhausted — Gate 6 blocked
- **WHEN** all 3 automatic retry attempts fail
- **THEN** the error is written to `engagements.error_log` with `{ document: 'projectSummary', message, attempt: 3, timestamp }`
- **AND** `engagements.project_summary_upload_attempts` is incremented by 1
- **AND** `engagements.status` remains `gate6_review`
- **AND** the engagement cannot proceed to `complete`

#### Scenario: File naming uses engagement date
- **WHEN** the PDF is uploaded
- **THEN** the filename uses `engagements.created_at` formatted as YYYY-MM-DD (not the current date)

### Requirement: Upload failure notifies BA and allows retry from Gate 6 screen
When automatic retries are exhausted, the system SHALL trigger a Power Automate Teams notification to the BA containing the error details and a link to the Gate 6 review screen. The Gate 6 review screen SHALL display a "Retry upload" button when `sharepoint_project_summary_url` is null and `engagements.status` is `gate6_review`. Each BA-triggered retry SHALL invoke `api/pipeline/retry-project-summary.js`, which re-runs the upload function including its own 3-attempt exponential backoff and increments `engagements.project_summary_upload_attempts`. If the BA retry succeeds, `engagements.status` advances to `complete`. If it fails, the button remains available.

#### Scenario: Power Automate Teams notification sent on automatic retry exhaustion
- **WHEN** all 3 automatic retries fail during `outputGenerationChain`
- **THEN** the system triggers `POWER_AUTOMATE_FAILURE_TRIGGER_URL` with `{ engagementId, document: 'projectSummary', error, gate6ReviewUrl }`
- **AND** the BA receives a Teams card with the error detail and a direct link to the Gate 6 review screen

#### Scenario: Retry button visible when upload has failed
- **WHEN** the BA views the Gate 6 review screen and `sharepoint_project_summary_url` is null
- **THEN** a "Retry upload" button is displayed in the Project Summary status area
- **AND** the button is distinct from the Gate 6 client document approval controls

#### Scenario: BA triggers retry and upload succeeds
- **WHEN** the BA clicks "Retry upload" and the upload function succeeds
- **THEN** `engagements.sharepoint_project_summary_url` is populated
- **AND** `engagements.project_summary_upload_attempts` is incremented by 1
- **AND** `engagements.status` advances to `complete`

#### Scenario: BA retry also fails
- **WHEN** the BA-triggered retry exhausts all 3 automatic attempts
- **THEN** the error is appended to `engagements.error_log`
- **AND** `engagements.project_summary_upload_attempts` is incremented by 1
- **AND** the "Retry upload" button remains visible
- **AND** `engagements.status` remains `gate6_review`

### Requirement: Manual override escape hatch available after two failed BA retry attempts
After `engagements.project_summary_upload_attempts` reaches 2, the Gate 6 screen SHALL display a "Mark as manually uploaded" button alongside the retry button. When the BA confirms they have manually uploaded the document and provides a non-empty note, the system SHALL insert a `gate_approvals` record with `gate_number = 6`, `action = 'manual_override'`, and `edits_made = { note: <BA note>, manual_upload_confirmed_at: <ISO timestamp> }`. The engagement `status` SHALL then advance to `complete`. The `gate_approvals.action` check constraint SHALL include `'manual_override'` as a valid value — this requires a schema migration.

#### Scenario: Manual override button appears after 2 upload attempts
- **WHEN** `engagements.project_summary_upload_attempts` is 2 or greater
- **THEN** both "Retry upload" and "Mark as manually uploaded" buttons are visible on the Gate 6 screen
- **AND** "Mark as manually uploaded" requires a confirmation step before proceeding

#### Scenario: BA confirms manual upload with a note
- **WHEN** the BA confirms manual upload and provides a non-empty note
- **THEN** a `gate_approvals` record is inserted with `gate_number = 6`, `action = 'manual_override'`, and `edits_made = { note: <BA note>, manual_upload_confirmed_at: <ISO timestamp> }`
- **AND** `engagements.status` is updated to `complete`
- **AND** `engagements.sharepoint_project_summary_url` remains null

#### Scenario: Manual override requires a non-empty note
- **WHEN** the BA attempts to confirm manual upload with an empty note
- **THEN** the system rejects the submission and displays a validation error
- **AND** no `gate_approvals` record is inserted

#### Scenario: Manual override recorded in gate approval trail
- **WHEN** the engagement detail page or gate approval trail is viewed after a manual override
- **THEN** Gate 6 shows `action = 'manual_override'` with the BA note and confirmed timestamp

### Requirement: Project Summary PDF generation is invoked by outputGenerationChain at Gate 6
The system SHALL call `generateProjectSummaryPdf` within `outputGenerationChain` (`src/lib/chains/outputGeneration.js`) after `generateReviewLoopReport` and after the Final Client Brief PDF are generated. The Project Summary PDF SHALL be generated only when the Gate 6 `gate_approvals` action is `approved`. It SHALL NOT be generated on Gate 6 rejection.

#### Scenario: Gate 6 approved — all three documents generated
- **WHEN** Gate 6 is approved and `outputGenerationChain` runs
- **THEN** the chain generates the Final Client Brief PDF, the Review Loop Report PDF, and the Project Summary PDF in sequence
- **AND** all three SharePoint URLs are written to `engagements` before the chain returns

#### Scenario: Gate 6 rejected — Project Summary not generated
- **WHEN** Gate 6 action is `rejected`
- **THEN** `generateProjectSummaryPdf` is NOT called
- **AND** `engagements.sharepoint_project_summary_url` remains null

#### Scenario: Project Summary generated after Review Loop Report
- **WHEN** `outputGenerationChain` executes
- **THEN** `generateReviewLoopReport` completes before `generateProjectSummaryPdf` is called
- **AND** the Project Summary can reference the review loop data already written to `review_loop_reports`

### Requirement: Project Summary PDF is never included in client-facing communications
The system SHALL ensure that `sharepoint_project_summary_url` is never included in any Power Automate flow payload, Gate 6 approval notification, or any other client-facing output. The document is internal to Comotion only.

#### Scenario: Gate 6 approval Power Automate payload excludes Project Summary URL
- **WHEN** Gate 6 is approved and the Power Automate Gate 6 flow is triggered
- **THEN** the flow payload includes `sharepoint_brief_url` and `sharepoint_deck_url` only
- **AND** `sharepoint_project_summary_url` is NOT present in the payload

#### Scenario: Project Summary not visible in Gate 6 review UI
- **WHEN** the BA views the Gate 6 output review screen
- **THEN** only client-facing documents are displayed for preview
- **AND** no link or reference to the Project Summary PDF is shown
