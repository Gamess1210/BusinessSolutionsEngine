## ADDED Requirements

### Requirement: POST /api/pipeline/plan-build-instructions triggers generation
The system SHALL provide a `POST /api/pipeline/plan-build-instructions` endpoint that calls `buildInstructionsChain` and writes the result to `engagements.build_instructions`.

#### Scenario: Successful generation and draft write
- **WHEN** a POST request is made to `/api/pipeline/plan-build-instructions` with a valid `engagementId`
- **THEN** the server calls `buildInstructionsChain` with engagement data fetched from Supabase
- **AND** the result is written to `engagements.build_instructions`
- **AND** the response returns `{ content: <document string> }` with HTTP 200

#### Scenario: Engagement not in plan_pending status
- **WHEN** the request is made but `engagement.status !== 'plan_pending'`
- **THEN** the server returns HTTP 409 with an error message
- **AND** no chain call is made

#### Scenario: Engagement not in phase 1
- **WHEN** the request is made but `engagement.current_plan_phase !== 1`
- **THEN** the server returns HTTP 409 with an error message
- **AND** `build_instructions` is not overwritten

### Requirement: plan-build-instructions validates engagement ownership
The system SHALL verify that the authenticated user owns the engagement before running the chain.

#### Scenario: Authenticated user is the engagement owner
- **WHEN** the request is made by the BA who owns the engagement
- **THEN** the request proceeds to chain execution

#### Scenario: Unauthenticated or unauthorised request
- **WHEN** the request is made without a valid session or by a different user
- **THEN** the server returns HTTP 401 or HTTP 403
- **AND** no chain call is made

### Requirement: plan-build-instructions handles chain errors
The system SHALL set `engagement.status` to `'failed'` and store error details if `buildInstructionsChain` throws.

#### Scenario: buildInstructionsChain throws
- **WHEN** `buildInstructionsChain` throws an error during execution
- **THEN** the server updates `engagements.status` to `'failed'`
- **AND** stores the error in `engagements.error_log`
- **AND** returns HTTP 500
