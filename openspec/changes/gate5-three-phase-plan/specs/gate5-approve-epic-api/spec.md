## ADDED Requirements

### Requirement: POST /api/pipeline/gate5-approve-epic records per-epic approval and advances index
The system SHALL provide a `POST /api/pipeline/gate5-approve-epic` endpoint that inserts a `gate_approvals` record for the current epic and advances `current_epic_index`.

#### Scenario: Epic approved, more epics remain
- **WHEN** a POST request is made with `engagementId` and there are remaining unapproved epics
- **THEN** a `gate_approvals` record is inserted with `gate_number: 5`, `action: 'epic_approved'`, and `edits_made: { epic_title: <title> }`
- **AND** `engagements.current_epic_index` is incremented by 1
- **AND** the response returns `{ complete: false }` with HTTP 200

#### Scenario: Final epic approved — Gate 5 completes
- **WHEN** a POST request is made and `current_epic_index + 1 >= approved_epics.length`
- **THEN** a `gate_approvals` record is inserted for the final epic
- **AND** `engagements.project_plan` is populated with the full assembled plan
- **AND** `engagements.plan_conversation` is populated with accumulated conversation
- **AND** `engagements.status` is set to `'spec_pending'`
- **AND** the response returns `{ complete: true }` with HTTP 200

#### Scenario: Engagement not in phase 3
- **WHEN** the request is made but `engagement.current_plan_phase !== 3`
- **THEN** the server returns HTTP 409
- **AND** no state changes are made

### Requirement: gate5-approve-epic is server-authoritative on epic ordering
The system SHALL use `current_epic_index` from Supabase — the client MUST NOT send an epic index.

#### Scenario: Request body does not include an epic index
- **WHEN** `gate5-approve-epic` processes a request
- **THEN** it reads `current_epic_index` from the engagement record in Supabase
- **AND** ignores any `epicIndex` field in the request body

### Requirement: gate5-approve-epic prevents index overrun
The system SHALL guard against `current_epic_index` advancing past the end of `approved_epics`.

#### Scenario: Index at or beyond approved_epics length
- **WHEN** `current_epic_index >= approved_epics.length`
- **THEN** the server returns HTTP 409 with an error indicating Gate 5 is already complete

### Requirement: gate5-approve-epic validates ownership
The system SHALL verify the authenticated user owns the engagement.

#### Scenario: Unauthorised request
- **WHEN** the request is made by a user who does not own the engagement
- **THEN** the server returns HTTP 403
