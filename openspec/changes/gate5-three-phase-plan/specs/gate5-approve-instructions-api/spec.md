## ADDED Requirements

### Requirement: POST /api/pipeline/gate5-approve-instructions advances Gate 5 to Phase 2
The system SHALL provide a `POST /api/pipeline/gate5-approve-instructions` endpoint that records Phase 1 approval and advances `current_plan_phase` to 2.

#### Scenario: Successful Phase 1 approval
- **WHEN** a POST request is made to `/api/pipeline/gate5-approve-instructions` with a valid `engagementId`
- **THEN** a `gate_approvals` record is inserted with `gate_number: 5` and `action: 'instructions_approved'`
- **AND** `engagements.current_plan_phase` is set to 2
- **AND** the response returns HTTP 200

#### Scenario: Engagement not in phase 1
- **WHEN** the request is made but `engagement.current_plan_phase !== 1`
- **THEN** the server returns HTTP 409 with an error message
- **AND** no `gate_approvals` record is inserted

#### Scenario: build_instructions is empty
- **WHEN** the request is made but `engagement.build_instructions` is null or empty
- **THEN** the server returns HTTP 422 with an error message
- **AND** phase is not advanced

### Requirement: gate5-approve-instructions is idempotency-safe
The system SHALL return an appropriate error if Phase 1 approval is attempted more than once.

#### Scenario: Duplicate approval attempt
- **WHEN** `gate5-approve-instructions` is called for an engagement already in phase 2 or 3
- **THEN** the server returns HTTP 409
- **AND** no duplicate `gate_approvals` record is created

### Requirement: gate5-approve-instructions validates ownership
The system SHALL verify the authenticated user owns the engagement.

#### Scenario: Unauthorised request
- **WHEN** the request is made by a user who does not own the engagement
- **THEN** the server returns HTTP 403
- **AND** no state changes are made
