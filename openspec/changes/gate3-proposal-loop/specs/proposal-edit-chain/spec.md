## ADDED Requirements

### Requirement: proposalEditChain applies targeted edits to existing proposal JSON
The system SHALL provide `proposalEditChain` in `src/lib/chains/proposalEditChain.js`. The chain SHALL use Claude (claude-sonnet-4-20250514) to apply targeted mutations to an existing `proposal_json` object based on a BA-provided natural-language instruction. The chain SHALL return an updated `proposal_json` that preserves all unchanged sections. The chain SHALL NOT regenerate the entire proposal from scratch — only the sections relevant to the instruction SHALL be modified.

#### Scenario: BA instruction targets one section
- **WHEN** `proposalEditChain` is called with existing `proposal_json` and the instruction "Make the executive summary more concise"
- **THEN** the chain returns an updated `proposal_json` where only `executive_summary` is changed
- **AND** all other sections are identical to the input

#### Scenario: BA instruction targets multiple sections
- **WHEN** `proposalEditChain` is called with an instruction that affects multiple sections
- **THEN** the chain returns an updated `proposal_json` with only the relevant sections modified

#### Scenario: Chain encounters an AI error
- **WHEN** the Claude API call fails or returns malformed JSON
- **THEN** the chain throws an error
- **AND** the calling API route catches it, sets `status = 'failed'`, `last_successful_gate = 3`, and populates `error_log`
