## MODIFIED Requirements

### Requirement: Gate 4 approval writes gate_approvals and advances status
On successful approval, the system SHALL insert a `gate_approvals` record for gate 4 and update `engagements.status` to `plan_pending` in a single logical transaction.

#### Scenario: Successful approval
- **WHEN** `POST /api/pipeline/gate4-approve` succeeds
- **THEN** a row is inserted into `gate_approvals` with `engagement_id`, `gate_number: 4`, `action: 'approved'`
- **AND** `engagements.status` is updated to `plan_pending`
- **AND** `engagements.gate4_no_further_input` reflects the submitted checkbox value

#### Scenario: gate_approvals insert fails
- **WHEN** the `gate_approvals` insert throws an error
- **THEN** the route returns HTTP 500 and `engagements.status` remains `gate4_review`
