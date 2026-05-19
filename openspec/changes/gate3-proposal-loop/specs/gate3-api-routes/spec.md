## ADDED Requirements

### Requirement: gate3-select-solution persists chosen solution
The system SHALL provide `POST /api/pipeline/gate3-select-solution`. The route SHALL verify the engagement exists and has status `gate3_review`. It SHALL persist `chosen_solution` to `engagements` and return 200 on success.

#### Scenario: Valid solution selection
- **WHEN** the route receives `{ engagementId, chosenSolution }` for an engagement at `gate3_review`
- **THEN** `engagements.chosen_solution` is updated with the provided solution object
- **AND** the route returns 200

#### Scenario: Engagement not at gate3_review
- **WHEN** the route receives a request for an engagement not at `gate3_review`
- **THEN** the route returns 409 with an error message
- **AND** no data is written

### Requirement: gate3-generate invokes proposalGenerationChain and persists result
The system SHALL provide `POST /api/pipeline/gate3-generate`. The route SHALL verify the engagement is at `gate3_review` and `chosen_solution` is set. It SHALL persist `chosen_solution_context` (nullable), invoke `proposalGenerationChain`, persist the resulting `proposal_json` to `engagements`, and return 200 with the `proposal_json`.

#### Scenario: Successful proposal generation
- **WHEN** the route receives `{ engagementId, context }` for a valid engagement
- **THEN** `chosen_solution_context` is persisted (null if not provided)
- **AND** `proposalGenerationChain` is invoked and the result stored in `proposal_json`
- **AND** the route returns 200 with `{ proposalJson }`

#### Scenario: proposalGenerationChain fails
- **WHEN** the chain throws an error
- **THEN** the route sets `status = 'failed'`, `last_successful_gate = 3`, populates `error_log`
- **AND** returns 500 with an error message

### Requirement: gate3-edit invokes proposalEditChain and persists updated JSON
The system SHALL provide `POST /api/pipeline/gate3-edit`. The route SHALL verify the engagement is at `gate3_review` and `proposal_json` is set. It SHALL invoke `proposalEditChain` with the current `proposal_json` and the BA's instruction, persist the updated `proposal_json`, and return 200 with the updated JSON.

#### Scenario: Successful edit
- **WHEN** the route receives `{ engagementId, instruction }` for a valid engagement with existing `proposal_json`
- **THEN** `proposalEditChain` is invoked with the current JSON and instruction
- **AND** the updated `proposal_json` is persisted to `engagements`
- **AND** the route returns 200 with `{ proposalJson }`

#### Scenario: proposalEditChain fails
- **WHEN** the chain throws an error
- **THEN** the route sets `status = 'failed'`, `last_successful_gate = 3`, populates `error_log`
- **AND** returns 500 with an error message

### Requirement: gate3-approve converts proposal to PDF, files to SharePoint, and advances status
The system SHALL provide `POST /api/pipeline/gate3-approve`. The route SHALL verify the engagement is at `gate3_review` and `proposal_json` is set. It SHALL render `proposal_json` to A4 HTML using `comotion-a4-html-template.html`, convert to PDF using `puppeteer-core` + `@sparticuz/chromium`, upload to SharePoint via Microsoft Graph API as `[ClientName]_[YYYY-MM-DD]_BusinessProposal.pdf`, set `sharepoint_proposal_url`, and advance `status` to `gate4_review`. It SHALL write a `gate_approvals` record for Gate 3.

#### Scenario: Successful Gate 3 approval
- **WHEN** the route receives `{ engagementId }` for a valid engagement at `gate3_review`
- **THEN** the proposal PDF is generated and uploaded to SharePoint
- **AND** `sharepoint_proposal_url` is set and `status` advances to `gate4_review`
- **AND** a `gate_approvals` record is written for Gate 3
- **AND** the route returns 200

#### Scenario: PDF generation or SharePoint upload fails
- **WHEN** Puppeteer or Microsoft Graph API throws an error
- **THEN** the route sets `status = 'failed'`, `last_successful_gate = 3`, populates `error_log`
- **AND** returns 500 with an error message

### Requirement: gate3-reset-solution clears Gate 3 selection data
The system SHALL provide `POST /api/pipeline/gate3-reset-solution`. The route SHALL clear `chosen_solution`, `chosen_solution_context`, and `proposal_json` on the engagement. The engagement `status` SHALL remain `gate3_review`. It SHALL return 200 on success.

#### Scenario: BA resets solution selection
- **WHEN** the route receives `{ engagementId }` for an engagement at `gate3_review`
- **THEN** `chosen_solution`, `chosen_solution_context`, and `proposal_json` are set to null
- **AND** `status` remains `gate3_review`
- **AND** the route returns 200

### Requirement: gate3-send triggers Power Automate proposal delivery flow
The system SHALL provide `POST /api/pipeline/gate3-send`. The route SHALL verify `sharepoint_proposal_url` is set on the engagement. It SHALL POST `{ engagementId, sharepoint_proposal_url, client_email }` to the `POWER_AUTOMATE_PROPOSAL_SEND_TRIGGER_URL` environment variable, which triggers the Power Automate flow to send Document B via Outlook email to `client_email`. The route SHALL return 200 on success. Calling this route is optional — the engagement advances to Gate 4 regardless of whether it is called.

#### Scenario: BA triggers client send
- **WHEN** the route receives `{ engagementId }` for an engagement with `sharepoint_proposal_url` set
- **THEN** the Power Automate HTTP trigger is called with the engagement ID, SharePoint URL, and `client_email`
- **AND** the route returns 200

#### Scenario: Power Automate trigger fails
- **WHEN** the Power Automate HTTP endpoint returns an error
- **THEN** the route returns 500 with an error message
- **AND** `engagements.status` is NOT changed — the failure is surfaced to the BA for retry

#### Scenario: BA has not set a client_email
- **WHEN** `engagements.client_email` is null and the route is called
- **THEN** the route returns 400 with a message indicating no client email is configured
- **AND** no Power Automate trigger is fired
