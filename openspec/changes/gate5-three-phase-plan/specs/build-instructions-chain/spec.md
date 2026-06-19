## ADDED Requirements

### Requirement: buildInstructionsChain generates CLIENT_BUILD_INSTRUCTIONS.md
The system SHALL generate a structured markdown document (`CLIENT_BUILD_INSTRUCTIONS.md`) from engagement data using `buildInstructionsChain` in `src/lib/chains/buildInstructions.js`.

#### Scenario: Successful generation from complete engagement data
- **WHEN** `buildInstructionsChain` is called with `structured_brief`, `chosen_solution`, `engagement_inputs`, and `industry`
- **THEN** the chain returns a markdown string covering scope, constraints, integration points, and guiding principles
- **AND** the returned document is titled `CLIENT_BUILD_INSTRUCTIONS.md`

#### Scenario: Chain uses Claude claude-sonnet-4-20250514
- **WHEN** `buildInstructionsChain` executes
- **THEN** it calls Anthropic via `ChatAnthropic` with model `claude-sonnet-4-20250514`
- **AND** no other AI model is used

### Requirement: buildInstructionsChain accepts typed inputs
The system SHALL accept a single object parameter with `structured_brief`, `chosen_solution`, `engagement_inputs`, and `industry` fields.

#### Scenario: All required fields present
- **WHEN** `buildInstructionsChain({ structured_brief, chosen_solution, engagement_inputs, industry })` is called with all fields populated
- **THEN** the chain executes without error and returns the document string

#### Scenario: Single exported async function
- **WHEN** the module `src/lib/chains/buildInstructions.js` is imported
- **THEN** it exports a single async function `buildInstructionsChain`
- **AND** no other exports are present

### Requirement: buildInstructionsChain stays within complexity limit
The system SHALL keep cyclomatic complexity below 10 per function in `buildInstructions.js`.

#### Scenario: ESLint complexity check passes
- **WHEN** ESLint runs against `src/lib/chains/buildInstructions.js`
- **THEN** no function reports CC > 10
