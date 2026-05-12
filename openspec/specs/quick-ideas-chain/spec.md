## Purpose

Defines the behaviour of the Quick Ideas chain — generating 3 solution options from an approved structured brief via Claude, providing a reusable LangChain prompt template, and handling JSON parsing with fence-strip fallback.

## Requirements

### Requirement: quickIdeasChain generates 3 solution options from an approved brief
The system SHALL provide a `quickIdeasChain` implemented as a LangChain 0.3.x `RunnableSequence` in `src/lib/chains/quickIdeas.js`. The chain SHALL accept an object with `structured_brief` (object) and `industry` (string), serialise the brief as JSON, invoke Claude (`claude-sonnet-4-20250514`) via the Quick Ideas prompt (Prompt 10.2), parse the JSON response, and return an object containing `problem_brief` (string) and `solutions` (array of 3 solution objects).

#### Scenario: Successful generation with a valid brief
- **WHEN** `quickIdeasChain` is invoked with a non-null `structured_brief` and a valid `industry`
- **THEN** the chain calls Claude with the serialised brief and industry context
- **AND** returns a parsed object with `problem_brief` as a string and `solutions` as an array
- **AND** each solution object contains `title`, `description`, `effort`, `impact`, and `key_risk` fields

#### Scenario: Claude returns JSON wrapped in a code fence
- **WHEN** Claude's response wraps the JSON in a ```json ... ``` block
- **THEN** the output parser strips the fence and parses the inner JSON
- **AND** the chain returns the parsed object without error

#### Scenario: Claude returns malformed JSON
- **WHEN** Claude's response cannot be parsed as JSON after fence stripping
- **THEN** the chain throws an error with a descriptive message
- **AND** the error propagates to the caller for error recovery handling

### Requirement: Quick Ideas prompt is a reusable LangChain template
The system SHALL provide a `quickIdeasPrompt` exported from `src/lib/prompts/quickIdeasPrompt.js` as a LangChain `ChatPromptTemplate`. The prompt SHALL accept `{brief}` and `{industry}` as template variables and use the exact text from Prompt 10.2 in the BSE prompt library.

#### Scenario: Prompt receives a financial services engagement
- **WHEN** `industry` is `financial_services`
- **THEN** the industry context variable is substituted correctly into the prompt
- **AND** Claude applies financial services framing to the generated solutions

#### Scenario: Prompt receives a general engagement
- **WHEN** `industry` is `general`
- **THEN** the industry context variable is substituted correctly into the prompt
