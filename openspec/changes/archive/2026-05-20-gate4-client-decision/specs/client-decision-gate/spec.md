## ADDED Requirements

### Requirement: Gate 4 screen displays chosen solution read-only
The system SHALL display the `chosen_solution` JSONB from `engagements` in a read-only panel so the BA can confirm the correct solution before committing to spec generation.

#### Scenario: Chosen solution is present
- **WHEN** the BA opens `/review/:id/client-decision` and `engagements.chosen_solution` is populated
- **THEN** the screen renders a read-only panel showing the solution title, description, effort, and impact fields from the JSONB
- **AND** no radio button, edit control, or re-selection UI is visible

#### Scenario: Chosen solution is missing
- **WHEN** the BA opens `/review/:id/client-decision` and `engagements.chosen_solution` is null
- **THEN** the screen displays an error message: "No chosen solution recorded — return to Gate 3 to select a solution"
- **AND** the approval button is disabled

---

### Requirement: Gate 4 screen enforces gate status
The system SHALL redirect the BA away from the Gate 4 screen if the engagement is not at `gate4_review`.

#### Scenario: Engagement not at gate4_review
- **WHEN** the BA navigates to `/review/:id/client-decision`
- **AND** `engagements.status` is any value other than `gate4_review`
- **THEN** the frontend redirects to `/engagements/:id`

---

### Requirement: BA can add supplementary brain-dump context
The system SHALL accept a plain-text brain-dump from the BA, written to `engagement_inputs` with `input_type: 'braindump'`, `source: 'gate4_supplement'`, and `content: { text }`.

#### Scenario: BA submits a brain-dump
- **WHEN** the BA selects the "Brain-dump" tab, enters text, and submits approval
- **THEN** the system inserts one `engagement_inputs` row with `input_type: 'braindump'`, `source: 'gate4_supplement'`, `content: { text: '<entered text>' }`
- **AND** `gate4_no_further_input` is set to `false` on `engagements`

---

### Requirement: BA can add supplementary transcript context
The system SHALL accept a pasted meeting transcript from the BA, written to `engagement_inputs` with `input_type: 'transcript'`, `source: 'gate4_supplement'`, and `content: { text }`.

#### Scenario: BA submits a transcript
- **WHEN** the BA selects the "Transcript" tab, pastes text, and submits approval
- **THEN** the system inserts one `engagement_inputs` row with `input_type: 'transcript'`, `source: 'gate4_supplement'`, `content: { text: '<pasted text>' }`
- **AND** `gate4_no_further_input` is set to `false` on `engagements`

---

### Requirement: BA can add supplementary guided-question context
The system SHALL accept answers to the 14 structured discovery questions (same format as initial guided capture), written to `engagement_inputs` with `input_type: 'guided'`, `source: 'gate4_supplement'`, and `content: { answers: [...] }`. Individual answers are optional.

#### Scenario: BA submits guided answers
- **WHEN** the BA selects the "Guided" tab, fills in one or more answers, and submits approval
- **THEN** the system inserts one `engagement_inputs` row with `input_type: 'guided'`, `source: 'gate4_supplement'`, `content: { answers: [{ section, question, answer, notes }] }` containing only the answered questions

---

### Requirement: BA can declare no further input
The system SHALL accept a "No further input" checkbox submission when the client conversation produced nothing beyond solution confirmation.

#### Scenario: BA checks "No further input" and approves
- **WHEN** the BA ticks the "No further input" checkbox and submits
- **THEN** no `engagement_inputs` row is created
- **AND** `gate4_no_further_input` is set to `true` on `engagements`

#### Scenario: "No further input" checked but text is present in context field
- **WHEN** the BA has entered text in a context input and then checks "No further input"
- **THEN** the context input area is cleared and disabled
- **AND** if the BA submits, the system treats the submission as no-context (checkbox wins)

---

### Requirement: Approval is blocked until the BA has either added context or checked "No further input"
The system SHALL keep the Gate 4 approval button disabled until the submission is in a valid state.

#### Scenario: Neither context nor checkbox is present
- **WHEN** the BA has not entered any context text and has not checked "No further input"
- **THEN** the approval button is disabled

#### Scenario: Context text is present
- **WHEN** the BA has entered at least one non-empty character in a context input
- **THEN** the approval button is enabled

#### Scenario: "No further input" is checked
- **WHEN** the BA has checked "No further input"
- **THEN** the approval button is enabled regardless of whether context fields are empty

---

### Requirement: Gate 4 API route validates status before approval
`POST /api/pipeline/gate4-approve` SHALL reject requests where the engagement is not at `gate4_review`.

#### Scenario: Request with correct status
- **WHEN** `POST /api/pipeline/gate4-approve` is called with a valid `engagementId` whose status is `gate4_review`
- **THEN** the route proceeds to write context inputs and the gate approval record

#### Scenario: Request with wrong status
- **WHEN** `POST /api/pipeline/gate4-approve` is called with an `engagementId` whose status is not `gate4_review`
- **THEN** the route returns HTTP 409 with `{ error: 'Engagement is not at gate4_review', status: '<actual status>' }`

#### Scenario: Unauthenticated request
- **WHEN** `POST /api/pipeline/gate4-approve` is called without a valid Bearer token
- **THEN** the route returns HTTP 401

---

### Requirement: Gate 4 approval writes gate_approvals and advances status
On successful approval, the system SHALL insert a `gate_approvals` record for gate 4 and update `engagements.status` to `spec_pending` in a single logical transaction.

#### Scenario: Successful approval
- **WHEN** `POST /api/pipeline/gate4-approve` succeeds
- **THEN** a row is inserted into `gate_approvals` with `engagement_id`, `gate_number: 4`, `action: 'approved'`
- **AND** `engagements.status` is updated to `spec_pending`
- **AND** `engagements.gate4_no_further_input` reflects the submitted checkbox value

#### Scenario: gate_approvals insert fails
- **WHEN** the `gate_approvals` insert throws an error
- **THEN** the route returns HTTP 500 and `engagements.status` remains `gate4_review`

---

### Requirement: BA can reject at Gate 4 to return to proposal review
The system SHALL allow the BA to reject at Gate 4, reverting the engagement to `gate3_review` so the BA can re-enter the proposal loop before re-presenting to the client. No supplementary context inputs are written on rejection. `POST /api/pipeline/gate4-reject` handles this action.

#### Scenario: BA rejects at Gate 4
- **WHEN** `POST /api/pipeline/gate4-reject` is called with a valid `engagementId` whose status is `gate4_review`
- **THEN** a row is inserted into `gate_approvals` with `engagement_id`, `gate_number: 4`, `action: 'rejected'`
- **AND** `engagements.status` is updated to `gate3_review`
- **AND** no `engagement_inputs` row is created

#### Scenario: Rejection with wrong status
- **WHEN** `POST /api/pipeline/gate4-reject` is called with an `engagementId` whose status is not `gate4_review`
- **THEN** the route returns HTTP 409 with `{ error: 'Engagement is not at gate4_review', status: '<actual status>' }`

#### Scenario: BA navigates back to Gate 3 after Gate 4 rejection
- **WHEN** `engagements.status` is `gate3_review` after Gate 4 rejection
- **THEN** the BA is redirected to `/review/:id/proposal` where the existing proposal and chosen solution are intact
- **AND** the BA can re-enter the proposal loop to refine or re-send before re-approving Gate 3

---

### Requirement: `engagements` table has `gate4_no_further_input` column
The `engagements` table SHALL have a `gate4_no_further_input boolean default false` column to record whether the BA declared no supplementary context at Gate 4.

#### Scenario: New engagement
- **WHEN** a new engagement is created
- **THEN** `gate4_no_further_input` defaults to `false`

#### Scenario: Gate 4 approved with no further input
- **WHEN** Gate 4 is approved with the checkbox checked
- **THEN** `gate4_no_further_input` is `true` on the engagement row
