## MODIFIED Requirements

### Requirement: BA can approve or reject at Gate 2
The system SHALL provide Approve and Reject actions on the SolutionsReview page. Approving SHALL POST to `api/pipeline/gate2-approve.js` with `{ engagementId, action: 'approved', solutions }`. The server SHALL persist the approved solutions, invoke `documentAGenerationChain`, render and upload Document A to SharePoint, populate `engagements.sharepoint_solution_options_url`, and advance status to `gate3_review`. The client SHALL navigate to `/engagements/:id` only after receiving a success response confirming `gate3_review` status. Rejecting SHALL POST with `{ engagementId, action: 'rejected' }` and navigate to `/engagements/:id` on success with status `solutions_pending`. Both actions SHALL disable the buttons while in flight. The Approve button SHALL display "Generating Document A…" while Document A generation is in progress.

#### Scenario: BA approves solutions
- **WHEN** the BA clicks Approve
- **THEN** the Approve button shows "Generating Document A…" and both buttons are disabled
- **AND** on success the BA is navigated to `/engagements/:id`
- **AND** the engagement status reflects `gate3_review`

#### Scenario: BA rejects solutions
- **WHEN** the BA clicks Reject
- **THEN** the Reject button shows "Rejecting…" and both buttons are disabled
- **AND** on success the BA is navigated to `/engagements/:id`
- **AND** the engagement status reflects `solutions_pending`

#### Scenario: Approval API returns an error
- **WHEN** the API route returns a non-2xx response (including Document A generation failure)
- **THEN** an error message is displayed on the page
- **AND** the buttons are re-enabled for retry

#### Scenario: Document A generation fails after approval
- **WHEN** the server successfully persists approval but `documentAGenerationChain` throws an error
- **THEN** the engagement status is set to `failed` with `last_successful_gate = 2`
- **AND** the API returns a non-2xx response
- **AND** the SolutionsReview page displays an error and re-enables the Approve button for retry
