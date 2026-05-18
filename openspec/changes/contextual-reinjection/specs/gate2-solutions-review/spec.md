## MODIFIED Requirements

### Requirement: EngagementDetail surfaces a link to the solutions review page at gate2_review
The system SHALL render a "Review Solutions →" action in `StatusSection` when `engagement.status` is `gate2_review`. Clicking it SHALL navigate to `/review/:id/solutions`. The `Gate2ReviewSection` SHALL also render the supplementary input capture panel (brain-dump, guided mode, transcript tabs) in supplementary mode below the review link. The `Gate2ReviewSection` SHALL render a `SupplementaryContextBanner` when a new input has been added at `gate2_review` status and the BA has not yet dismissed it.

#### Scenario: BA views engagement at gate2_review status
- **WHEN** the engagement status is `gate2_review`
- **THEN** the StatusSection shows a card with a "Review Solutions →" button
- **AND** clicking the button navigates to `/review/:id/solutions`
- **AND** the capture input panel (brain-dump, guided mode, transcript tabs) is visible below the review link
- **AND** no pipeline footer with "Run AI Pipeline →" is visible

#### Scenario: BA adds a supplementary input and banner appears
- **WHEN** the BA saves a new input via the capture panel at `gate2_review`
- **THEN** `hasPendingSupplementaryInput` is set to `true`
- **AND** the `SupplementaryContextBanner` is rendered above the capture panel

#### Scenario: BA dismisses the banner
- **WHEN** the BA clicks "Dismiss" on the `SupplementaryContextBanner`
- **THEN** the banner is removed
- **AND** the "Review Solutions →" link and capture panel remain visible

#### Scenario: BA triggers regeneration from the banner
- **WHEN** the BA clicks "Regenerate Brief & Solutions"
- **THEN** the capture panel is disabled during the in-flight regeneration
- **AND** on success the banner is dismissed and the parent engagement re-fetches so updated solutions are reflected

#### Scenario: Regeneration completes — BA must re-approve before Gate 3
- **WHEN** regeneration succeeds
- **THEN** the engagement remains at `gate2_review`
- **AND** the "Review Solutions →" link is still accessible for the BA to re-review and approve the updated solutions
- **AND** Gate 3 does not proceed until a new Gate 2 approval is recorded
