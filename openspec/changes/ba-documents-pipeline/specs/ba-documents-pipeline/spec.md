## ADDED Requirements

### Requirement: Generate BA document on request
The system SHALL expose `POST /api/pipeline/generate-ba-docs` accepting `engagementId` and `doc_type`. It SHALL authenticate the requesting user, verify engagement ownership, invoke the appropriate chain, render A4 HTML, produce a PDF, upload to SharePoint (skipped in local dev), persist the URL, and return `{ success: true, url }`. If any step fails the route SHALL log a warning and return `{ success: false, warning }` — it SHALL NOT throw a 5xx or alter engagement status.

#### Scenario: Successful document generation
- **WHEN** a valid `engagementId` and supported `doc_type` are posted by the engagement owner
- **THEN** the system invokes the corresponding chain, renders HTML, produces a PDF, uploads to SharePoint, stores the URL in the appropriate `sharepoint_*_url` column, and returns `{ success: true, url }`

#### Scenario: Generation fails non-fatally
- **WHEN** the chain or PDF render throws an error
- **THEN** the system logs a warning, does NOT update engagement status, and returns `{ success: false, warning: <message> }`

#### Scenario: Unknown doc_type
- **WHEN** `doc_type` is not one of `asis`, `brd`, `sia`, `tobe`, `rtm`, `change-mgmt`
- **THEN** the route returns 400 with `{ error: 'Unknown doc_type' }`

#### Scenario: Unauthenticated request
- **WHEN** no valid Bearer token is provided
- **THEN** the route returns 401

### Requirement: As-Is Process Map generated after Gate 1
After Gate 1 approval the system SHALL fire `asIsProcessMapChain` using `structured_brief` fields (`current_process_detail`, `pain_points`, `stakeholder_analysis`, `constraints_and_dependencies`). The chain SHALL return a JSON document with a step-by-step process description, pain points mapped to steps, and process KPIs. The rendered PDF SHALL be filed as `[ClientName]_[YYYY-MM-DD]_AsIsProcessMap.pdf`.

#### Scenario: As-Is generated after Gate 1 approval
- **WHEN** `gate1-approve.js` records a Gate 1 approval with action `approved`
- **THEN** `generateBaDoc` is called with `doc_type: 'asis'` and `asIsProcessMapChain` is invoked with the engagement's `structured_brief`

#### Scenario: As-Is stored in engagements
- **WHEN** the As-Is PDF is successfully uploaded to SharePoint
- **THEN** `engagements.sharepoint_asis_url` is set to the SharePoint URL

### Requirement: BRD generated after Gate 1
After Gate 1 approval the system SHALL fire `brdChain` using all fields from `structured_brief`. The chain SHALL return a JSON document containing: executive summary, business context, scope in/out, stakeholder table, business requirements with MoSCoW prioritisation, compliance and regulatory requirements, success criteria and KPIs, assumptions and dependencies, glossary. The rendered PDF SHALL be filed as `[ClientName]_[YYYY-MM-DD]_BRD.pdf`.

#### Scenario: BRD generated after Gate 1 approval
- **WHEN** `gate1-approve.js` records a Gate 1 approval
- **THEN** `generateBaDoc` is called with `doc_type: 'brd'` and `brdChain` is invoked with the full `structured_brief`

#### Scenario: BRD stored in engagements
- **WHEN** the BRD PDF is successfully uploaded
- **THEN** `engagements.sharepoint_brd_url` is set

### Requirement: SIA generated after Gate 3 approval
After Gate 3 approval (proposal sent to client) the system SHALL fire `stakeholderImpactChain` using `structured_brief`, `chosen_solution`, and `solutions`. The chain SHALL return a JSON document containing: impact summary table, detailed impact by dimension (people, process, technology, regulatory), risk assessment, readiness assessment. The rendered PDF SHALL be filed as `[ClientName]_[YYYY-MM-DD]_StakeholderImpactAssessment.pdf`.

#### Scenario: SIA generated after Gate 3 approval
- **WHEN** `triggerPowerAutomate` succeeds in `gate3-send.js`
- **THEN** `generateBaDoc` is called with `doc_type: 'sia'`

#### Scenario: SIA stored in engagements
- **WHEN** the SIA PDF is successfully uploaded
- **THEN** `engagements.sharepoint_sia_url` is set

### Requirement: To-Be Process Map generated after Gate 6 approval
After Gate 6 approval (spec approved) the system SHALL fire `toBeProcessMapChain` using OpenSpec files from the client repo, `chosen_solution`, `structured_brief`, and CONTEXT.md. The chain SHALL return a JSON document showing the future state process, as-is vs to-be comparison, and expected KPI improvements. The rendered PDF SHALL be filed as `[ClientName]_[YYYY-MM-DD]_ToBeProcessMap.pdf`.

#### Scenario: To-Be generated after Gate 6 approval
- **WHEN** `gate6-approve.js` records a Gate 6 approval
- **THEN** `generateBaDoc` is called with `doc_type: 'tobe'`

#### Scenario: To-Be stored in engagements
- **WHEN** the To-Be PDF is successfully uploaded
- **THEN** `engagements.sharepoint_tobe_url` is set

### Requirement: RTM generated progressively across Gates 1, 6, and 7
The system SHALL generate the RTM in three passes: (1) after Gate 1 — initial version from BRD requirements; (2) after Gate 6 — updated with OpenSpec scenario mappings; (3) after Gate 7 — finalised with test status from `code_reviews`. Each pass enriches the prior via `engagements.rtm_data` JSONB. The rendered PDF SHALL be filed as `[ClientName]_[YYYY-MM-DD]_RTM.pdf` (same filename; SharePoint URL updated each pass).

#### Scenario: RTM initial version after Gate 1
- **WHEN** Gate 1 is approved
- **THEN** `rtmChain` is called with `structured_brief` requirements and returns initial RTM data stored in `engagements.rtm_data`

#### Scenario: RTM updated after Gate 6
- **WHEN** Gate 6 is approved
- **THEN** `rtmChain` is called with existing `rtm_data` and OpenSpec scenarios, returning an enriched RTM

#### Scenario: RTM finalised after Gate 7
- **WHEN** Gate 7 is approved
- **THEN** `rtmChain` is called with existing `rtm_data` and `code_reviews` test status, returning the finalised RTM; `engagements.sharepoint_rtm_url` is updated

### Requirement: Change Management Plan generated after Gate 7 approval
After Gate 7 approval the system SHALL fire `changeManagementChain` using `structured_brief`, `chosen_solution`, and `engagements.sharepoint_sia_url` reference. The chain SHALL return a JSON document containing: change overview, communication plan, training plan, process documentation updates, go-live readiness checklist, rollback plan, post go-live support. The rendered PDF SHALL be filed as `[ClientName]_[YYYY-MM-DD]_ChangeManagementPlan.pdf`.

#### Scenario: Change Management Plan generated after Gate 7
- **WHEN** `gate7-approve.js` records a Gate 7 approval
- **THEN** `generateBaDoc` is called with `doc_type: 'change-mgmt'`

#### Scenario: Change Management Plan stored in engagements
- **WHEN** the PDF is successfully uploaded
- **THEN** `engagements.sharepoint_change_mgmt_url` is set

### Requirement: Gate 1 BA documents fire in parallel
After Gate 1 approval the system SHALL trigger As-Is Process Map, BRD, and initial RTM in parallel using `Promise.allSettled`. Individual failures SHALL NOT affect each other or gate status.

#### Scenario: All three Gate 1 documents succeed
- **WHEN** Gate 1 is approved and all three chains succeed
- **THEN** `sharepoint_asis_url`, `sharepoint_brd_url`, and `sharepoint_rtm_url` are all set and `engagements.rtm_data` is populated

#### Scenario: One Gate 1 document fails
- **WHEN** Gate 1 is approved and one chain fails
- **THEN** the other two documents complete normally, the failed URL column remains null, and the gate approval is unaffected

### Requirement: New engagements columns for BA document URLs
The `engagements` table SHALL have six new nullable text columns: `sharepoint_asis_url`, `sharepoint_brd_url`, `sharepoint_sia_url`, `sharepoint_tobe_url`, `sharepoint_rtm_url`, `sharepoint_change_mgmt_url`. It SHALL also have one new nullable JSONB column: `rtm_data` (stores progressive RTM structured data between passes).

#### Scenario: Columns default to null
- **WHEN** a new engagement is created
- **THEN** `sharepoint_asis_url`, `sharepoint_brd_url`, `sharepoint_sia_url`, `sharepoint_tobe_url`, `sharepoint_rtm_url`, `sharepoint_change_mgmt_url`, and `rtm_data` are all null

#### Scenario: URL set after successful generation
- **WHEN** a BA document is successfully uploaded to SharePoint
- **THEN** the corresponding `sharepoint_*_url` column is updated to the SharePoint URL
