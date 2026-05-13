## ADDED Requirements

### Requirement: SolutionsReview page renders solution cards in mode-aware layout
The system SHALL provide a `SolutionsReview` page at `src/pages/review/SolutionsReview.jsx`, accessible at `/review/:id/solutions`. The page SHALL fetch the engagement by `id` and render each solution in `engagements.solutions` as a card. When `engagement.analysis_mode` is `deep`, cards SHALL display `title`, `description`, `feasibility`, `complexity`, `roi_framing`, `risks`, `sequencing`, and `ai_central`. When `analysis_mode` is `quick` or absent, cards SHALL display `title`, `description`, `effort`, `impact`, and `key_risk`. The page SHALL be accessible only to authenticated users and SHALL redirect to `/engagements/:id` if `engagement.status` is not `gate2_review`.

#### Scenario: BA opens solutions review for a deep analysis engagement
- **WHEN** the BA navigates to `/review/:id/solutions` and the engagement has `analysis_mode = 'deep'` and status `gate2_review`
- **THEN** the page renders 5 solution cards
- **AND** each card shows `title`, `description`, `feasibility`, `complexity`, `roi_framing`, `risks`, `sequencing`, and `ai_central`

#### Scenario: BA opens solutions review for a quick ideas engagement
- **WHEN** the BA navigates to `/review/:id/solutions` and the engagement has `analysis_mode = 'quick'` and status `gate2_review`
- **THEN** the page renders 3 solution cards
- **AND** each card shows `title`, `description`, `effort`, `impact`, and `key_risk`

#### Scenario: Engagement is not at gate2_review status
- **WHEN** the BA navigates to `/review/:id/solutions` and the engagement status is not `gate2_review`
- **THEN** the page renders a not-ready state with a back link to `/engagements/:id`
- **AND** no solution cards are shown

### Requirement: BA can edit solution titles, descriptions, and notes inline
The system SHALL allow the BA to edit the `title` and `description` of each solution card inline on the SolutionsReview page. The system SHALL provide a `notes` field per solution for BA commentary. Edits SHALL be held in local React state and submitted to the server only on approval. Edits SHALL be discarded on rejection.

#### Scenario: BA edits a solution title
- **WHEN** the BA clicks on a solution title and types a new value
- **THEN** the local state updates with the new title
- **AND** the original value in Supabase is unchanged until approval is submitted

#### Scenario: BA approves with edited solutions
- **WHEN** the BA clicks Approve after editing one or more solutions
- **THEN** the edited solutions array (including all BA changes) is submitted to the approval route
- **AND** the edited solutions are persisted to `engagements.solutions`

#### Scenario: BA rejects after editing
- **WHEN** the BA clicks Reject after editing solutions
- **THEN** the edited values are discarded
- **AND** `engagements.solutions` is not updated

### Requirement: BA can approve or reject at Gate 2
The system SHALL provide Approve and Reject actions on the SolutionsReview page. Approving SHALL POST to `api/pipeline/gate2-approve.js` with `{ engagementId, action: 'approved', solutions }` and navigate to `/engagements/:id` on success. Rejecting SHALL POST with `{ engagementId, action: 'rejected' }` and navigate to `/engagements/:id` on success. Both actions SHALL disable the buttons while in flight.

#### Scenario: BA approves solutions
- **WHEN** the BA clicks Approve
- **THEN** the Approve button shows "Approving..." and both buttons are disabled
- **AND** on success the BA is navigated to `/engagements/:id`
- **AND** the engagement status reflects `proposal_pending`

#### Scenario: BA rejects solutions
- **WHEN** the BA clicks Reject
- **THEN** the Reject button shows "Rejecting..." and both buttons are disabled
- **AND** on success the BA is navigated to `/engagements/:id`
- **AND** the engagement status reflects `solutions_pending`

#### Scenario: Approval API returns an error
- **WHEN** the API route returns a non-2xx response
- **THEN** an error message is displayed on the page
- **AND** the buttons are re-enabled for retry

### Requirement: EngagementDetail surfaces a link to the solutions review page at gate2_review
The system SHALL render a "Review Solutions →" action in `StatusSection` when `engagement.status` is `gate2_review`, replacing the current placeholder. Clicking it SHALL navigate to `/review/:id/solutions`.

#### Scenario: BA views engagement at gate2_review status
- **WHEN** the engagement status is `gate2_review`
- **THEN** the StatusSection shows a card with a "Review Solutions →" button
- **AND** clicking the button navigates to `/review/:id/solutions`

### Requirement: proposal_pending is a recognised status in the Dashboard and status bar
The system SHALL add `proposal_pending` to `STATUS_LABELS` in `Dashboard.jsx` and to `STATUS_STEPS` in `EngagementDetail.jsx`, positioned between `gate2_review` and `gate3_review`.

#### Scenario: Engagement advances to proposal_pending after Gate 2 approval
- **WHEN** an engagement status is updated to `proposal_pending`
- **THEN** the Dashboard badge shows "Proposal Pending"
- **AND** the EngagementDetail status bar highlights the Proposal Pending step
