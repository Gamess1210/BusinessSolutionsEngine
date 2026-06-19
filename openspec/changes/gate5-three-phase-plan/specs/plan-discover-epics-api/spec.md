## ADDED Requirements

### Requirement: POST /api/pipeline/plan-discover-epics handles Phase 2 discovery Q&A
The system SHALL provide a `POST /api/pipeline/plan-discover-epics` endpoint that forwards BA messages to `projectPlanChain` and returns Claude's response.

#### Scenario: Claude asks a discovery question
- **WHEN** a POST request is made with `engagementId` and `message` and Claude needs more context
- **THEN** the server calls `projectPlanChain.discoverEpics(conversation, engagement, message)`
- **AND** the response returns `{ type: 'question', content: <string> }` with HTTP 200

#### Scenario: Claude proposes an epic list
- **WHEN** Claude has gathered sufficient context and is ready to propose epics
- **THEN** the response returns `{ type: 'epics', content: [{ title, description, rationale }] }` with HTTP 200

#### Scenario: Engagement not in phase 2
- **WHEN** the request is made but `engagement.current_plan_phase !== 2`
- **THEN** the server returns HTTP 409
- **AND** no chain call is made

### Requirement: plan-discover-epics uses approved build_instructions as context
The system SHALL include `engagements.build_instructions` in the context passed to `projectPlanChain`.

#### Scenario: Build instructions included in chain context
- **WHEN** `discoverEpics` is called
- **THEN** the approved `build_instructions`, `structured_brief`, and `chosen_solution` are all passed as context
- **AND** the chain uses them to ground discovery questions

### Requirement: plan-discover-epics validates ownership and phase
The system SHALL reject requests from unauthorised users or when engagement is not in Phase 2.

#### Scenario: Unauthorised request
- **WHEN** the request comes from a user who does not own the engagement
- **THEN** the server returns HTTP 403
