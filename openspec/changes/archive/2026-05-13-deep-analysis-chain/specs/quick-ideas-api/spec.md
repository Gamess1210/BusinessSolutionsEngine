## MODIFIED Requirements

### Requirement: Engagement detail surfaces a solutions generation trigger
The system SHALL render a `SolutionsPendingSection` on the engagement detail page when `engagement.status` is `solutions_pending`. This section SHALL display a "Generate Solutions →" button that mirrors the loading, success, and error behaviour of the existing pipeline footer. The section SHALL branch on `engagement.analysis_mode`: when `analysis_mode = 'deep'`, the button SHALL POST to `api/pipeline/deep-analysis.js` and display "Run Deep Analysis →"; when `analysis_mode = 'quick'` or absent, the button SHALL POST to `api/pipeline/quick-ideas.js` and display "Generate Solutions →".

#### Scenario: BA clicks Generate Solutions for a quick engagement
- **WHEN** the engagement status is `solutions_pending`, `analysis_mode` is `quick` or absent, and the BA clicks "Generate Solutions →"
- **THEN** the button shows "Generating Solutions..." and is disabled
- **AND** the status bar updates to reflect the in-progress state
- **AND** on success the page reflects `gate2_review` status

#### Scenario: BA clicks Run Deep Analysis for a deep engagement
- **WHEN** the engagement status is `solutions_pending`, `analysis_mode` is `deep`, and the BA clicks "Run Deep Analysis →"
- **THEN** the button shows "Running Deep Analysis..." and is disabled
- **AND** the status bar updates to reflect the in-progress state
- **AND** on success the page reflects `gate2_review` status

#### Scenario: Generation fails
- **WHEN** the API route returns a non-2xx response
- **THEN** an error message is displayed
- **AND** the button re-enables for retry

#### Scenario: analysis_mode is absent (legacy engagement)
- **WHEN** the engagement status is `solutions_pending` and `analysis_mode` is null or undefined
- **THEN** the section behaves as if `analysis_mode` is `quick`
- **AND** routes to `api/pipeline/quick-ideas.js`