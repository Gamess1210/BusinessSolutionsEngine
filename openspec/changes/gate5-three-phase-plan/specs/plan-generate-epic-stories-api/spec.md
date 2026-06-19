## ADDED Requirements

### Requirement: POST /api/pipeline/plan-generate-epic-stories generates stories for the current epic
The system SHALL provide a `POST /api/pipeline/plan-generate-epic-stories` endpoint that calls `projectPlanChain.generateEpicStories` for the epic at `current_epic_index`.

#### Scenario: Initial story generation for current epic
- **WHEN** a POST request is made with `engagementId` and no prior conversation
- **THEN** the server reads `engagement.current_epic_index` to identify the current epic
- **AND** calls `projectPlanChain.generateEpicStories(engagement, epicIndex)`
- **AND** returns `{ stories: [...], tasks: [...], acceptanceCriteria: [...] }` with HTTP 200

#### Scenario: BA requests changes to generated stories
- **WHEN** a POST request is made with `engagementId` and a `message` requesting changes
- **THEN** the server calls `generateEpicStories` with the prior conversation and change request
- **AND** returns updated stories/tasks/criteria

#### Scenario: Engagement not in phase 3
- **WHEN** the request is made but `engagement.current_plan_phase !== 3`
- **THEN** the server returns HTTP 409
- **AND** no chain call is made

### Requirement: plan-generate-epic-stories uses WHEN/THEN/AND acceptance criteria
The system SHALL ensure acceptance criteria returned by `generateEpicStories` follow OpenSpec WHEN/THEN/AND format.

#### Scenario: Criteria follow WHEN/THEN/AND structure
- **WHEN** the chain returns acceptance criteria
- **THEN** each criterion has `when`, `then`, and optional `and` fields
- **AND** the structure matches the OpenSpec scenario format defined in bse-openspec-skills-reference

### Requirement: plan-generate-epic-stories does not advance current_epic_index
The system SHALL NOT modify `current_epic_index` — only `gate5-approve-epic` may advance it.

#### Scenario: Story generation leaves epic index unchanged
- **WHEN** `plan-generate-epic-stories` completes successfully
- **THEN** `engagements.current_epic_index` is unchanged
- **AND** no `gate_approvals` record is written

### Requirement: plan-generate-epic-stories validates ownership
The system SHALL verify the authenticated user owns the engagement.

#### Scenario: Unauthorised request
- **WHEN** the request is made by a user who does not own the engagement
- **THEN** the server returns HTTP 403
