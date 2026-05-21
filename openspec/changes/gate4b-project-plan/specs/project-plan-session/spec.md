## ADDED Requirements

### Requirement: Planning session begins on navigation to project plan review
The system SHALL load the existing planning conversation from `engagements.plan_conversation` when the BA navigates to `/review/:id/project-plan`, and resume the session from where it left off. If no conversation exists, the session begins fresh.

#### Scenario: BA opens project plan review with no prior conversation
- **WHEN** the BA navigates to `/review/:id/project-plan`
- **AND** `engagements.plan_conversation` is null or empty
- **THEN** the frontend calls `POST /api/pipeline/plan-question` with `{ engagementId, answer: null }`
- **AND** Claude returns the first discovery question
- **AND** the question is displayed in the chat interface

#### Scenario: BA opens project plan review with an existing conversation
- **WHEN** the BA navigates to `/review/:id/project-plan`
- **AND** `engagements.plan_conversation` contains prior exchanges
- **THEN** the frontend renders the full conversation history in the chat interface
- **AND** if no plan draft exists yet, the chat is in question-asking state
- **AND** if a plan draft exists, the plan is displayed for BA review

#### Scenario: Engagement not at plan_pending or gate5_review
- **WHEN** the BA navigates to `/review/:id/project-plan`
- **AND** `engagements.status` is any value other than `plan_pending` or `gate5_review`
- **THEN** the frontend redirects to `/engagements/:id`

---

### Requirement: Claude asks iterative discovery questions
`POST /api/pipeline/plan-question` SHALL receive the BA's answer to the previous question, append it to `plan_conversation`, call `projectPlanChain` to determine the next question or to generate a plan draft, and return either the next question or the plan draft.

#### Scenario: Claude returns the next question
- **WHEN** `POST /api/pipeline/plan-question` is called with `{ engagementId, answer: '<BA text>' }`
- **AND** `projectPlanChain` determines more context is needed
- **THEN** the route appends the answer to `engagements.plan_conversation`
- **AND** returns `{ type: 'question', content: '<next question text>' }`
- **AND** the new question is appended to `plan_conversation`

#### Scenario: Claude generates a plan draft
- **WHEN** `POST /api/pipeline/plan-question` is called with `{ engagementId, answer: '<BA text>' }`
- **AND** `projectPlanChain` determines sufficient context has been gathered
- **THEN** the route appends the answer to `engagements.plan_conversation`
- **AND** `projectPlanChain` generates the project plan (markdown + OpenSpec WHEN/THEN/AND format)
- **AND** returns `{ type: 'plan', content: { markdown: '...', openspec: '...' } }`
- **AND** `engagements.plan_conversation` is updated with the plan draft
- **AND** `engagements.status` advances to `gate5_review`

#### Scenario: Engagement not at plan_pending
- **WHEN** `POST /api/pipeline/plan-question` is called
- **AND** `engagements.status` is not `plan_pending`
- **THEN** the route returns HTTP 409 with `{ error: 'Engagement is not at plan_pending', status: '<actual status>' }`

#### Scenario: Unauthenticated request
- **WHEN** `POST /api/pipeline/plan-question` is called without a valid Bearer token
- **THEN** the route returns HTTP 401

---

### Requirement: Discovery questions cover all required planning dimensions
`projectPlanChain` SHALL ask questions that cover all of the following dimensions before generating a plan draft. Follow-up questions on any dimension are permitted.

#### Scenario: All dimensions are covered before plan generation
- **WHEN** `projectPlanChain` evaluates the conversation history
- **AND** all of the following have been addressed: timeline and budget constraints, team size and available skills, integration dependencies, regulatory and compliance requirements, phased vs big-bang delivery, MVP scope vs full scope, technical constraints, success metrics per epic
- **THEN** `projectPlanChain` generates the plan draft
- **AND** does not generate the draft if any dimension has not been addressed

---

### Requirement: BA can request changes to the plan draft
`POST /api/pipeline/plan-update` SHALL receive a BA change instruction, call `projectPlanChain` to produce an updated plan, persist the updated plan in `plan_conversation`, and return the updated plan.

#### Scenario: BA requests a plan change
- **WHEN** `POST /api/pipeline/plan-update` is called with `{ engagementId, instruction: '<change text>' }`
- **AND** `engagements.status` is `gate5_review`
- **THEN** `projectPlanChain` generates an updated plan incorporating the instruction
- **AND** the updated plan replaces the previous draft in `engagements.plan_conversation`
- **AND** the route returns `{ type: 'plan', content: { markdown: '...', openspec: '...' } }`

#### Scenario: Engagement not at gate5_review
- **WHEN** `POST /api/pipeline/plan-update` is called
- **AND** `engagements.status` is not `gate5_review`
- **THEN** the route returns HTTP 409 with `{ error: 'Engagement is not at gate5_review', status: '<actual status>' }`

---

### Requirement: BA can approve the project plan
The approval button on the project plan review screen SHALL be enabled only when a plan draft is present. On approval, `POST /api/pipeline/gate5-approve` is called.

#### Scenario: Approval button is disabled with no plan draft
- **WHEN** the BA is on the project plan review screen
- **AND** no plan draft exists in the current session (still in question-asking phase)
- **THEN** the approval button is disabled

#### Scenario: Approval button is enabled with a plan draft
- **WHEN** a plan draft has been generated and is displayed
- **THEN** the approval button is enabled

#### Scenario: BA rejects the project plan
- **WHEN** the BA clicks Reject on the project plan review screen
- **THEN** `POST /api/pipeline/gate5-approve` is called with `{ engagementId, action: 'rejected' }`
- **AND** a `gate_approvals` row is inserted with `gate_number: 5`, `action: 'rejected'`
- **AND** `engagements.status` reverts to `gate4_review`
- **AND** `engagements.plan_conversation` is cleared
- **AND** the frontend navigates to `/review/:id/client-decision`

---

### Requirement: Project plan is stored in structured format on approval
On Gate 4b approval, the system SHALL store the approved plan in `engagements.project_plan` as structured JSONB containing epics, stories, and tasks.

#### Scenario: Approved plan structure
- **WHEN** `POST /api/pipeline/gate5-approve` is called with `action: 'plan_approved'`
- **THEN** `engagements.project_plan` is set to a JSONB object with the structure:
  ```json
  {
    "epics": [
      {
        "name": "string",
        "description": "string",
        "stories": [
          {
            "name": "string",
            "description": "string",
            "tasks": ["string"]
          }
        ]
      }
    ]
  }
  ```
- **AND** `engagements.current_epic_index` is set to `0`

---

### Requirement: `engagements` table has project plan columns
The `engagements` table SHALL have `project_plan JSONB`, `plan_conversation JSONB`, and `current_epic_index int default 0` columns.

#### Scenario: New engagement has default values
- **WHEN** a new engagement is created
- **THEN** `project_plan` is null
- **AND** `plan_conversation` is null
- **AND** `current_epic_index` is 0

---

### Requirement: `engagements.status` includes plan_pending and gate5_review
The `engagements` status check constraint SHALL include `'plan_pending'` and `'gate5_review'` as valid values.

#### Scenario: Status advances to plan_pending after Gate 4 approval
- **WHEN** `POST /api/pipeline/gate4-approve` succeeds
- **THEN** `engagements.status` is set to `plan_pending`

#### Scenario: Status advances to gate5_review when plan draft is generated
- **WHEN** `projectPlanChain` generates a plan draft
- **THEN** `engagements.status` is set to `gate5_review`
