## Purpose

Defines the Gate 2 approval API route (`api/pipeline/gate2-approve.js`). The route validates engagement state, persists BA-edited solutions, records a `gate_approvals` record, and advances status to `proposal_pending` on approval or reverts to `solutions_pending` on rejection.

## Requirements

### Requirement: Gate 2 approve API route enforces gate pre-conditions
The system SHALL provide a Vercel serverless route at `api/pipeline/gate2-approve.js` that accepts `POST` requests with `{ engagementId, action, solutions }` in the body. The route SHALL verify that the engagement exists, belongs to the authenticated user, and has status `gate2_review` before acting. The route SHALL use `SUPABASE_SERVICE_ROLE_KEY` for all Supabase reads and writes. `action` SHALL be one of `approved` or `rejected`.

#### Scenario: Valid engagement in gate2_review status — approved
- **WHEN** a POST request is sent with `action = 'approved'`, a valid `engagementId` at `gate2_review`, and an edited `solutions` array
- **THEN** the route writes the submitted `solutions` to `engagements.solutions`
- **AND** inserts a record into `gate_approvals` with `gate_number = 2` and `action = 'approved'`
- **AND** updates `engagements.status` to `proposal_pending`
- **AND** returns HTTP 200 with `{ success: true, engagementId }`

#### Scenario: Valid engagement in gate2_review status — rejected
- **WHEN** a POST request is sent with `action = 'rejected'` and a valid `engagementId` at `gate2_review`
- **THEN** the route inserts a record into `gate_approvals` with `gate_number = 2` and `action = 'rejected'`
- **AND** updates `engagements.status` to `solutions_pending`
- **AND** does NOT update `engagements.solutions`
- **AND** returns HTTP 200 with `{ success: true, engagementId }`

#### Scenario: Engagement has disallowed status
- **WHEN** a POST request is sent and the engagement status is not `gate2_review`
- **THEN** the route returns HTTP 409 with `{ error: "Engagement is not ready for Gate 2 review", status: <current status> }`
- **AND** no gate_approvals record is inserted

#### Scenario: Invalid action value
- **WHEN** a POST request is sent with an `action` that is not `approved` or `rejected`
- **THEN** the route returns HTTP 400 with `{ error: "action must be approved or rejected" }`

#### Scenario: Unauthenticated request
- **WHEN** a POST request is sent without a valid Supabase session
- **THEN** the route returns HTTP 401 with `{ error: "Unauthorized" }`

### Requirement: Gate 2 approval persists edited solutions atomically with gate record
The system SHALL, on an `approved` action, write `solutions` to `engagements.solutions` before inserting the `gate_approvals` record. If the `gate_approvals` insert fails, the route SHALL return HTTP 500. The engagement status update SHALL run after the gate_approvals insert. Each step's failure SHALL be reported without rolling back prior steps — the BA can re-submit since `gate2_review` status is preserved on partial failure.

#### Scenario: gate_approvals insert fails after solutions are saved
- **WHEN** the solutions write succeeds but the gate_approvals insert throws
- **THEN** the route returns HTTP 500 with `{ error: "Gate approval failed", engagementId }`
- **AND** the engagement status remains `gate2_review`
- **AND** the BA can re-submit the approval

#### Scenario: Status update fails after gate_approvals insert
- **WHEN** the gate_approvals insert succeeds but the status update throws
- **THEN** the route returns HTTP 500 with `{ error: "Gate approval failed", engagementId }`
- **AND** the engagement status remains `gate2_review`
- **AND** the BA can re-submit the approval (duplicate gate_approvals record is harmless)
