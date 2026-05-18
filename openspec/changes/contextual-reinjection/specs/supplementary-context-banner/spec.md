## ADDED Requirements

### Requirement: SupplementaryContextBanner component renders when new input is added at gate2_review
The system SHALL provide a `SupplementaryContextBanner` component at `src/components/SupplementaryContextBanner.jsx`. The component SHALL accept props: `engagementId` (string), `analysisMode` ('quick' | 'deep'), `onRegenerateComplete` (callback), and `onDismiss` (callback). The banner SHALL render with a warning-style appearance using the `grey-light` background and `navy` border, and SHALL display the message: *"New context added. The current brief and solutions do not reflect this input. Regenerate to update them before proceeding to Gate 3."* The banner SHALL provide two actions: a "Dismiss" button and a "Regenerate Brief & Solutions" button.

#### Scenario: Banner appears after first supplementary input is saved
- **WHEN** `onInputAdded` fires in `Gate2ReviewSection` at `gate2_review` status
- **THEN** `hasPendingSupplementaryInput` is set to `true` in `Gate2ReviewSection`
- **AND** `SupplementaryContextBanner` is rendered

#### Scenario: BA dismisses the banner
- **WHEN** the BA clicks "Dismiss"
- **THEN** `onDismiss` is called
- **AND** the banner is removed from the DOM
- **AND** the engagement proceeds with the existing brief and solutions unchanged
- **AND** no API call is made

#### Scenario: Banner is dismissed but input is preserved
- **WHEN** the BA dismisses the banner
- **THEN** the supplementary input remains in `engagement_inputs`
- **AND** the "Review Solutions →" link remains accessible

### Requirement: SupplementaryContextBanner handles the regeneration loading state
The banner SHALL display a loading state while the regeneration API call is in flight. During loading, both the "Dismiss" and "Regenerate Brief & Solutions" buttons SHALL be disabled. The "Regenerate Brief & Solutions" button SHALL display "Regenerating..." during the in-flight state.

#### Scenario: BA confirms regeneration
- **WHEN** the BA clicks "Regenerate Brief & Solutions"
- **THEN** the button shows "Regenerating..." and is disabled
- **AND** the "Dismiss" button is also disabled
- **AND** a POST request is sent to `api/pipeline/regenerate-brief-and-solutions` with `{ engagementId }`

#### Scenario: Regeneration completes successfully
- **WHEN** the API returns HTTP 200
- **THEN** `onRegenerateComplete` is called
- **AND** the banner is removed from the DOM
- **AND** the parent re-fetches the engagement so updated solutions are displayed

#### Scenario: Regeneration fails
- **WHEN** the API returns a non-2xx response
- **THEN** an inline error message is displayed within the banner
- **AND** both buttons are re-enabled for retry
- **AND** the banner remains visible (not dismissed)

#### Scenario: Multiple supplementary inputs added before regeneration
- **WHEN** the BA saves a second supplementary input while the banner is still showing
- **THEN** the banner remains visible (already in pending state)
- **AND** the regeneration will incorporate all inputs when triggered
