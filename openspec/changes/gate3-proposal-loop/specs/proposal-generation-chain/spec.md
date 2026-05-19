## ADDED Requirements

### Requirement: proposalGenerationChain produces structured Document B JSON
The system SHALL provide `proposalGenerationChain` in `src/lib/chains/proposalGenerationChain.js`. The chain SHALL use Claude (claude-sonnet-4-20250514) to generate a structured JSON object representing a full Comotion-branded business proposal (Document B). Inputs SHALL be: the engagement's consolidated brief, the chosen solution object, and optional supplementary context. The JSON SHALL match the canonical schema exactly: `document_title` (string), `client_name` (string), `date` (string, YYYY-MM-DD), `executive_summary` (string, 2–3 paragraphs), `problem_statement` (string, 1–2 paragraphs), `stakeholder_impact` (array of `{ role, impact }`), `solution` (object with `title`, `description`, `effort`, `impact`, `key_risk`, `sequencing`), `recommended_path` (string, 1 paragraph), and `footer_note` (string).

#### Scenario: Chain invoked with chosen solution and supplementary context
- **WHEN** `proposalGenerationChain` is called with a consolidated brief, chosen solution, and supplementary context
- **THEN** the chain returns a Document B JSON object matching the canonical schema
- **AND** the `solution` object reflects the chosen solution's title, description, effort, impact, key risk, and sequencing
- **AND** supplementary context is incorporated into the relevant sections

#### Scenario: Chain invoked with no supplementary context
- **WHEN** `proposalGenerationChain` is called with a consolidated brief and chosen solution but no context
- **THEN** the chain returns a complete Document B JSON object using only the brief and chosen solution

#### Scenario: Chain encounters an AI error
- **WHEN** the Claude API call fails or returns malformed JSON
- **THEN** the chain throws an error
- **AND** the calling API route catches it, sets `status = 'failed'`, `last_successful_gate = 3`, and populates `error_log`
