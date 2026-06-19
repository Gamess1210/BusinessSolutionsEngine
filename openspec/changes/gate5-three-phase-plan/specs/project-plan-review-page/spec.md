## ADDED Requirements

### Requirement: ProjectPlanReview renders a three-phase stepped interface
The system SHALL replace `src/pages/review/ProjectPlanReview.jsx` with a stepped interface showing Phase 1, 2, and 3 panels driven by `engagement.current_plan_phase`.

#### Scenario: Engagement in Phase 1 on mount
- **WHEN** the BA navigates to `/review/:id/project-plan` and `current_plan_phase === 1`
- **THEN** the Phase 1 panel is displayed
- **AND** the phase indicator shows step 1 of 3 active

#### Scenario: Engagement in Phase 2 on mount
- **WHEN** `current_plan_phase === 2`
- **THEN** the Phase 2 panel is displayed
- **AND** Phase 1 is shown as completed in the phase indicator

#### Scenario: Engagement in Phase 3 on mount
- **WHEN** `current_plan_phase === 3`
- **THEN** the Phase 3 panel is displayed with the current epic's story generation interface
- **AND** the phase indicator shows step 3 of 3 active

### Requirement: Phase 1 panel generates, displays, and approves build instructions
The system SHALL display the generated `CLIENT_BUILD_INSTRUCTIONS.md` in an editable view with Generate, Regenerate, and Approve controls.

#### Scenario: BA generates build instructions
- **WHEN** the BA clicks Generate in the Phase 1 panel
- **THEN** the frontend calls `POST /api/pipeline/plan-build-instructions`
- **AND** the returned document is displayed in an editable textarea

#### Scenario: BA edits and regenerates
- **WHEN** the BA clicks Regenerate
- **THEN** a new call is made to `plan-build-instructions`
- **AND** the textarea is updated with the new document

#### Scenario: BA approves Phase 1
- **WHEN** the BA clicks Approve in the Phase 1 panel
- **THEN** the frontend calls `POST /api/pipeline/gate5-approve-instructions`
- **AND** on success the Phase 2 panel is shown

### Requirement: Phase 2 panel handles discovery chat and epic list approval
The system SHALL display a chat interface for epic discovery and an epic list approval control.

#### Scenario: BA sends a discovery message
- **WHEN** the BA types a message and submits in the Phase 2 panel
- **THEN** the frontend calls `POST /api/pipeline/plan-discover-epics` with the message
- **AND** the response is appended to the conversation display

#### Scenario: Claude proposes an epic list
- **WHEN** the response has `type === 'epics'`
- **THEN** the epic list is rendered as editable cards below the chat
- **AND** an Approve Epics button becomes visible

#### Scenario: BA approves the epic list
- **WHEN** the BA clicks Approve Epics
- **THEN** the frontend calls `POST /api/pipeline/gate5-approve-epics` with the current epic list
- **AND** on success the Phase 3 panel is shown

### Requirement: Phase 3 panel iterates through epics with per-epic approval
The system SHALL display story generation output per epic with iteration and approval controls.

#### Scenario: BA generates stories for the current epic
- **WHEN** the Phase 3 panel loads or the BA clicks Generate
- **THEN** the frontend calls `POST /api/pipeline/plan-generate-epic-stories`
- **AND** stories, tasks, and acceptance criteria are rendered for the current epic

#### Scenario: BA requests changes to the current epic
- **WHEN** the BA types a change request and submits
- **THEN** the frontend calls `plan-generate-epic-stories` with the change message
- **AND** the updated epic content is rendered

#### Scenario: BA approves the current epic
- **WHEN** the BA clicks Approve Epic
- **THEN** the frontend calls `POST /api/pipeline/gate5-approve-epic`
- **AND** if `complete === false`, the panel advances to the next epic
- **AND** if `complete === true`, the user is redirected to the next gate

### Requirement: ProjectPlanReview reads current_plan_phase from engagement on every mount
The system SHALL not cache phase in local state across navigations.

#### Scenario: Phase state refreshed on navigation
- **WHEN** the BA navigates away and returns to `/review/:id/project-plan`
- **THEN** `current_plan_phase` is re-read from Supabase on mount
- **AND** the correct phase panel is shown without stale local state

### Requirement: ProjectPlanReview uses Comotion brand palette
The system SHALL style all elements using Tailwind CSS with the Comotion brand tokens.

#### Scenario: Phase indicator uses navy and cgreen
- **WHEN** the page renders the phase indicator
- **THEN** the active step uses `navy` for text/border and `cgreen` for completion markers
- **AND** no non-brand colour classes are used for primary UI elements
