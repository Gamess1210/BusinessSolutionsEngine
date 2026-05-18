## ADDED Requirements

### Requirement: Capture input panel is accessible at gate2_review status
The system SHALL render the capture input panel (brain-dump, guided mode, transcript tabs) on `EngagementDetail` when `engagement.status` is `gate2_review`, in addition to the existing `captured` status. The panel SHALL operate in supplementary mode: the "Run AI Pipeline →" footer SHALL NOT be rendered, because pipeline regeneration is triggered via the `SupplementaryContextBanner`, not via the capture panel footer. The existing input sub-components (`BrainDumpInput`, `GuidedModeInput`, `TranscriptInput`) SHALL be rendered without modification. The "Review Solutions →" link SHALL remain visible above the input panel at all times.

#### Scenario: BA views engagement at gate2_review status
- **WHEN** the BA opens `EngagementDetail` and `engagement.status` is `gate2_review`
- **THEN** the capture input panel is rendered with brain-dump, guided mode, and transcript tabs
- **AND** the "Review Solutions →" link is also visible

#### Scenario: Input panel in supplementary mode hides pipeline footer
- **WHEN** the capture panel is rendered at `gate2_review` status
- **THEN** the "Run AI Pipeline →" button is NOT present
- **AND** no call to `api/pipeline/consolidate` is made from the input panel

#### Scenario: BA saves a brain-dump input at gate2_review
- **WHEN** the BA enters text in the brain-dump tab and clicks "Save Input"
- **THEN** the input is saved to `engagement_inputs` with `input_type = 'braindump'`
- **AND** the new input appears in the captured inputs list
- **AND** the `SupplementaryContextBanner` becomes visible

#### Scenario: BA saves a transcript input at gate2_review
- **WHEN** the BA pastes a Fireflies transcript and clicks "Save Transcript"
- **THEN** the input is saved to `engagement_inputs` with `input_type = 'transcript'`
- **AND** the new input appears in the captured inputs list
- **AND** the `SupplementaryContextBanner` becomes visible

#### Scenario: BA completes guided mode at gate2_review
- **WHEN** the BA answers all 14 guided questions and clicks "Submit All →"
- **THEN** the input is saved to `engagement_inputs` with `input_type = 'guided'`
- **AND** the new input appears in the captured inputs list
- **AND** the `SupplementaryContextBanner` becomes visible

#### Scenario: Input panel is disabled during active regeneration
- **WHEN** the BA has triggered regeneration via the `SupplementaryContextBanner` and regeneration is in flight
- **THEN** the capture input tabs are disabled or non-interactive
- **AND** the BA cannot submit another input until regeneration completes or fails
