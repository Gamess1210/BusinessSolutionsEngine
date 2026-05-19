## ADDED Requirements

### Requirement: Gate 3 review page is accessible at gate3_review status
The system SHALL provide a `ProposalReview` page at `src/pages/review/ProposalReview.jsx`, accessible at `/review/:id/proposal`. The page SHALL fetch the engagement by `id` and render the appropriate part based on the current state of `engagements.chosen_solution` and `engagements.proposal_json`. The page SHALL be accessible only to authenticated users and SHALL redirect to `/engagements/:id` if `engagement.status` is not `gate3_review`.

#### Scenario: BA navigates to Gate 3 with no solution chosen yet
- **WHEN** the BA navigates to `/review/:id/proposal` and `chosen_solution` is null
- **THEN** Part 1 (solution selection) is displayed

#### Scenario: BA navigates to Gate 3 with solution chosen but no proposal yet
- **WHEN** the BA navigates to `/review/:id/proposal` and `chosen_solution` is set but `proposal_json` is null
- **THEN** Part 2 (context capture) is displayed

#### Scenario: BA navigates to Gate 3 with proposal already generated
- **WHEN** the BA navigates to `/review/:id/proposal` and `proposal_json` is set
- **THEN** Part 3 (proposal preview and edit loop) is displayed

#### Scenario: Engagement is not at gate3_review
- **WHEN** the BA navigates to `/review/:id/proposal` and the engagement status is not `gate3_review`
- **THEN** the page redirects to `/engagements/:id`

### Requirement: Part 1 — BA selects one solution from approved options
The system SHALL render Part 1 as a radio-button list of all solutions from `engagements.solutions`. Each option SHALL display the solution `title` and `description`. Selection is required before proceeding. The BA SHALL click a "Next: Add Context →" button to advance to Part 2, which POSTs `{ engagementId, chosenSolution }` to `api/pipeline/gate3-select-solution` and persists `chosen_solution` in Supabase. The button SHALL be disabled until a solution is selected.

#### Scenario: BA selects a solution and proceeds
- **WHEN** the BA selects a solution radio button and clicks "Next: Add Context →"
- **THEN** the button shows a loading state and the request is submitted
- **AND** on success `chosen_solution` is persisted and Part 2 is displayed

#### Scenario: BA attempts to proceed without selecting a solution
- **WHEN** the BA clicks "Next: Add Context →" with no solution selected
- **THEN** the button remains disabled and no request is submitted

### Requirement: Part 2 — BA optionally captures supplementary context
The system SHALL render Part 2 with three input mode tabs (Brain-dump, Transcript, Guided) reusing existing capture components with `mode="supplementary"`, and a "No additional context" checkbox. Either the checkbox must be ticked or an input must be provided before proceeding. Clicking "Generate Proposal →" POSTs `{ engagementId, context }` (or `{ engagementId, context: null }` if no context) to `api/pipeline/gate3-generate`, persists `chosen_solution_context`, invokes `proposalGenerationChain`, and stores the result in `proposal_json`. On success Part 3 is displayed.

#### Scenario: BA submits supplementary brain-dump context
- **WHEN** the BA types notes in the Brain-dump tab and clicks "Generate Proposal →"
- **THEN** the context is submitted and `chosen_solution_context` is persisted
- **AND** `proposalGenerationChain` is invoked and the result stored in `proposal_json`
- **AND** Part 3 is displayed on success

#### Scenario: BA checks "No additional context"
- **WHEN** the BA ticks the "No additional context" checkbox and clicks "Generate Proposal →"
- **THEN** the request is submitted with `context: null`
- **AND** `proposalGenerationChain` is invoked using only the original brief and chosen solution
- **AND** Part 3 is displayed on success

#### Scenario: Proposal generation fails
- **WHEN** `proposalGenerationChain` throws an error
- **THEN** the API returns a non-2xx response
- **AND** an error message is displayed in Part 2
- **AND** the "Generate Proposal →" button is re-enabled for retry

### Requirement: Part 3 — BA previews proposal and iterates via edit loop
The system SHALL render Part 3 with an A4 HTML preview of the proposal rendered from `proposal_json` using `comotion-a4-html-template.html`. The BA SHALL have four actions: (a) an "Approve Proposal" button that submits to `gate3-approve`; (b) a textarea for a natural-language edit instruction with an "Update Proposal" button that submits to `gate3-edit` and invokes `proposalEditChain` for targeted mutation; (c) inline editing of text fields directly in the rendered proposal preview, held in local React state and only persisted when the BA clicks Approve or Update; (d) an "Add context and regenerate" option that accepts additional brain-dump or transcript input, appends it to `chosen_solution_context`, and submits to `gate3-generate` for a full `proposalGenerationChain` re-run. The loop continues until the BA approves.

#### Scenario: BA approves the proposal
- **WHEN** the BA clicks "Approve Proposal"
- **THEN** the button shows "Approving…" and all action controls are disabled
- **AND** on success the BA is navigated to `/engagements/:id`
- **AND** the engagement status reflects `gate4_review`

#### Scenario: BA submits a natural-language edit instruction
- **WHEN** the BA types an instruction and clicks "Update Proposal"
- **THEN** the button shows "Updating…" and is disabled
- **AND** `proposalEditChain` is invoked and on success `proposal_json` is updated and the HTML preview re-renders
- **AND** the textarea is cleared

#### Scenario: BA edits a text field inline
- **WHEN** the BA directly edits a text field in the proposal preview
- **THEN** the change is held in local React state
- **AND** `proposal_json` in Supabase is not updated until the BA clicks Approve or Update Proposal

#### Scenario: BA clicks Approve after inline edits
- **WHEN** the BA has made inline edits and clicks "Approve Proposal"
- **THEN** the locally edited proposal JSON (merging inline changes) is submitted to `gate3-approve`
- **AND** the persisted `proposal_json` reflects the BA's inline edits

#### Scenario: BA adds context and regenerates
- **WHEN** the BA opens the "Add context and regenerate" panel, enters additional context, and submits
- **THEN** the additional context is appended to `chosen_solution_context`
- **AND** `gate3-generate` is called triggering a full `proposalGenerationChain` re-run
- **AND** on success the HTML preview re-renders with the new proposal

#### Scenario: Edit chain fails
- **WHEN** `proposalEditChain` throws an error
- **THEN** an error message is displayed below the textarea
- **AND** the "Update Proposal" button is re-enabled with the BA's instruction preserved

### Requirement: "Change solution" button is available throughout Gate 3
The system SHALL display a "Change solution" button on all three parts of the Gate 3 review page. Clicking it SHALL POST `{ engagementId }` to `api/pipeline/gate3-reset-solution`, which clears `chosen_solution`, `chosen_solution_context`, and `proposal_json` in Supabase. On success the UI SHALL return to Part 1. The engagement status SHALL remain `gate3_review`.

#### Scenario: BA changes solution from Part 3
- **WHEN** the BA clicks "Change solution" while in Part 3
- **THEN** a confirmation prompt is shown (e.g., "This will discard the current proposal. Continue?")
- **AND** on confirmation `chosen_solution`, `chosen_solution_context`, and `proposal_json` are cleared
- **AND** the UI returns to Part 1 with no solution selected

#### Scenario: BA changes solution from Part 1
- **WHEN** the BA clicks "Change solution" while in Part 1
- **THEN** the UI resets to Part 1 (no-op since no data to clear yet)

### Requirement: "Send to Client" option is available after Gate 3 approval
After Gate 3 approval the system SHALL display a "Send to Client" button in EngagementDetail when `sharepoint_proposal_url` is set and status is `gate4_review`. Clicking it SHALL POST `{ engagementId }` to `api/pipeline/gate3-send`, which triggers the Power Automate `POWER_AUTOMATE_PROPOSAL_SEND_TRIGGER_URL` flow to send Document B via Outlook email to `client_email`. Sending is optional — the BA decides whether to send from the BSE or share externally. The button SHALL be available but not required before the engagement advances.

#### Scenario: BA sends proposal to client from BSE
- **WHEN** the engagement status is `gate4_review`, `sharepoint_proposal_url` is set, and the BA clicks "Send to Client"
- **THEN** `POST /api/pipeline/gate3-send` is called
- **AND** the Power Automate flow sends an Outlook email to `client_email` with Document B attached
- **AND** the button shows a "Sent" confirmation on success

#### Scenario: BA chooses not to send from BSE
- **WHEN** the engagement status is `gate4_review` and the BA does not click "Send to Client"
- **THEN** the engagement remains at `gate4_review` and the BA may share the SharePoint link externally
- **AND** no email is sent by the system
