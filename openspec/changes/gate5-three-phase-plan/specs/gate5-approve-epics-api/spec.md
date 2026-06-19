## ADDED Requirements

### Requirement: POST /api/pipeline/gate5-approve-epics stores approved epics and advances to Phase 3
The system SHALL provide a `POST /api/pipeline/gate5-approve-epics` endpoint that records Phase 2 approval, stores `approved_epics`, and advances `current_plan_phase` to 3.

#### Scenario: Successful Phase 2 approval
- **WHEN** a POST request is made with `engagementId` and `approvedEpics` array
- **THEN** a `gate_approvals` record is inserted with `gate_number: 5` and `action: 'epics_approved'`
- **AND** `engagements.approved_epics` is set to the provided array
- **AND** `engagements.current_plan_phase` is set to 3
- **AND** `engagements.current_epic_index` is set to 0
- **AND** the response returns HTTP 200

#### Scenario: Engagement not in phase 2
- **WHEN** the request is made but `engagement.current_plan_phase !== 2`
- **THEN** the server returns HTTP 409
- **AND** no changes are made

#### Scenario: Empty or invalid approved_epics
- **WHEN** `approvedEpics` is an empty array or missing
- **THEN** the server returns HTTP 422
- **AND** no state changes are made

### Requirement: gate5-approve-epics validates epic shape
The system SHALL require each epic object to have `title`, `description`, and `rationale` fields.

#### Scenario: Epic missing required fields
- **WHEN** any epic in `approvedEpics` is missing `title`, `description`, or `rationale`
- **THEN** the server returns HTTP 422 with a descriptive error
- **AND** `approved_epics` is not written

### Requirement: gate5-approve-epics validates ownership
The system SHALL verify the authenticated user owns the engagement.

#### Scenario: Unauthorised request
- **WHEN** the request is made by a user who does not own the engagement
- **THEN** the server returns HTTP 403
