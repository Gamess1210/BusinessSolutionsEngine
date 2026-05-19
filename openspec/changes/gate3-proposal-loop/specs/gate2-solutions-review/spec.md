## ADDED Requirements

### Requirement: EngagementDetail surfaces a link to the Gate 3 review page at gate3_review
The system SHALL render a "Review Proposal →" action card in `StatusSection` when `engagement.status` is `gate3_review`. Clicking it SHALL navigate to `/review/:id/proposal`.

#### Scenario: BA views engagement at gate3_review status
- **WHEN** the engagement status is `gate3_review`
- **THEN** the StatusSection shows a card with a "Review Proposal →" button
- **AND** clicking the button navigates to `/review/:id/proposal`
