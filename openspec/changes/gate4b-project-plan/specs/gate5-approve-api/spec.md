## ADDED Requirements

### Requirement: gate5-approve route validates engagement status before approval
`POST /api/pipeline/gate5-approve` SHALL reject requests where the engagement is not at `gate5_review`.

#### Scenario: Request with correct status
- **WHEN** `POST /api/pipeline/gate5-approve` is called with a valid `engagementId` whose status is `gate5_review`
- **THEN** the route proceeds to write the gate approval record

#### Scenario: Request with wrong status
- **WHEN** `POST /api/pipeline/gate5-approve` is called with an `engagementId` whose status is not `gate5_review`
- **THEN** the route returns HTTP 409 with `{ error: 'Engagement is not at gate5_review', status: '<actual status>' }`

#### Scenario: Unauthenticated request
- **WHEN** `POST /api/pipeline/gate5-approve` is called without a valid Bearer token
- **THEN** the route returns HTTP 401

---

### Requirement: gate5-approve writes gate_approvals and advances status on approval
On successful plan approval, the system SHALL insert a `gate_approvals` record for gate 5 and update `engagements.status` to `spec_pending`.

#### Scenario: Successful plan approval
- **WHEN** `POST /api/pipeline/gate5-approve` is called with `{ engagementId, action: 'plan_approved', projectPlan: { epics: [...] } }`
- **THEN** a row is inserted into `gate_approvals` with `engagement_id`, `gate_number: 5`, `action: 'plan_approved'`
- **AND** `engagements.status` is updated to `spec_pending`
- **AND** `engagements.project_plan` is set to the submitted `projectPlan` JSONB
- **AND** `engagements.current_epic_index` is set to `0`
- **AND** the route returns `{ success: true, engagementId }`

#### Scenario: gate_approvals insert fails
- **WHEN** the `gate_approvals` insert throws an error
- **THEN** the route returns HTTP 500 and `engagements.status` remains `gate5_review`

---

### Requirement: gate5-approve handles plan rejection and reverts to Gate 4
When the BA rejects the project plan, the system SHALL revert the engagement to `gate4_review` and clear the plan conversation.

#### Scenario: BA rejects the project plan
- **WHEN** `POST /api/pipeline/gate5-approve` is called with `{ engagementId, action: 'rejected' }`
- **THEN** a row is inserted into `gate_approvals` with `gate_number: 5`, `action: 'rejected'`
- **AND** `engagements.status` is updated to `gate4_review`
- **AND** `engagements.plan_conversation` is set to null
- **AND** the route returns `{ success: true, engagementId }`

---

### Requirement: gate_approvals gate_number constraint covers 1 to 8
The `gate_approvals` table `gate_number` check constraint SHALL accept values 1 through 8.

#### Scenario: gate_number 5 is valid
- **WHEN** a `gate_approvals` row is inserted with `gate_number: 5`
- **THEN** the insert succeeds without a constraint violation

#### Scenario: gate_number 8 is valid
- **WHEN** a `gate_approvals` row is inserted with `gate_number: 8`
- **THEN** the insert succeeds without a constraint violation

#### Scenario: gate_number 9 is invalid
- **WHEN** a `gate_approvals` row is inserted with `gate_number: 9`
- **THEN** the insert fails with a check constraint violation

---

### Requirement: gate_approvals action constraint includes plan_approved
The `gate_approvals` table `action` check constraint SHALL include `'plan_approved'` as a valid value.

#### Scenario: plan_approved action is valid
- **WHEN** a `gate_approvals` row is inserted with `action: 'plan_approved'`
- **THEN** the insert succeeds without a constraint violation
