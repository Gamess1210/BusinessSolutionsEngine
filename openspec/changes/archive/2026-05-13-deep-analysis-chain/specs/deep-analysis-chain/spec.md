## ADDED Requirements

### Requirement: deepAnalysisChain produces a deep brief and 5 ROI-framed solutions from an approved structured brief
The system SHALL provide a `deepAnalysisChain` implemented as a LangChain 0.3.x `RunnableSequence` in `src/lib/chains/deepAnalysis.js`. The chain SHALL accept an object with `structured_brief` (object) and `industry` (string). Call 1 SHALL invoke Claude (`claude-sonnet-4-20250514`) using Prompt 10.3, passing the serialised `structured_brief` and `industry`, and returning a deep brief object. Call 2 SHALL invoke Claude (`claude-sonnet-4-20250514`) using Prompt 10.4, passing the Call 1 output, and returning an object with `problem_brief` (string) and `solutions` (array of exactly 5 solution objects). The intermediate deep brief SHALL NOT be persisted to Supabase.

#### Scenario: Successful two-call generation with a valid brief
- **WHEN** `deepAnalysisChain` is invoked with a non-null `structured_brief` and a valid `industry`
- **THEN** the chain invokes Claude with Prompt 10.3 and the serialised brief as Call 1
- **AND** passes the Call 1 output to Claude with Prompt 10.4 as Call 2
- **AND** returns a parsed object with `solutions` as an array of exactly 5 objects
- **AND** each solution object contains `title`, `description`, `feasibility`, `complexity`, `roi_framing`, `risks`, `sequencing`, and `ai_central` fields

#### Scenario: Claude returns JSON wrapped in a code fence
- **WHEN** Claude's Call 2 response wraps the JSON in a ```json ... ``` block
- **THEN** the output parser strips the fence and parses the inner JSON
- **AND** the chain returns the parsed object without error

#### Scenario: Call 1 fails
- **WHEN** the Anthropic API returns an error during Call 1
- **THEN** the chain throws the error immediately without invoking Call 2
- **AND** the error propagates to the caller for error recovery handling

#### Scenario: Call 2 fails after Call 1 succeeds
- **WHEN** Call 1 completes successfully but Call 2 throws
- **THEN** the chain throws the Call 2 error
- **AND** the error propagates to the caller for error recovery handling
- **AND** the Call 1 intermediate output is not persisted

#### Scenario: Claude returns malformed JSON on Call 2
- **WHEN** Call 2 output cannot be parsed as JSON after fence stripping
- **THEN** the chain throws an error with a descriptive message
- **AND** the error propagates to the caller for error recovery handling

### Requirement: deepAnalysisChain uses lazy model instantiation
The system SHALL instantiate `ChatAnthropic` inside `RunnableLambda.from(async (input) => {...})` for both call steps — not at module level. This ensures constructor errors (e.g. absent API key) are thrown at invoke time inside the route's try/catch, not at module load time before error recovery can run.

#### Scenario: ANTHROPIC_API_KEY is absent at module load
- **WHEN** the `deepAnalysis.js` module is imported and `ANTHROPIC_API_KEY` is not set
- **THEN** the module loads without throwing
- **AND** the error is deferred until `deepAnalysisChain.invoke(...)` is called
- **AND** the route's catch block can execute `recoverFromError`

### Requirement: Deep Analysis prompts are reusable LangChain templates
The system SHALL provide a `deepAnalysisPrompt` exported from `src/lib/prompts/deepAnalysisPrompt.js` as a LangChain `ChatPromptTemplate` accepting `{brief}` and `{industry}` as template variables (Prompt 10.3). The system SHALL provide a `solutionsPrompt` exported from `src/lib/prompts/solutionsPrompt.js` as a LangChain `ChatPromptTemplate` accepting `{brief}` and `{industry}` as template variables (Prompt 10.4), following the same system/human message pattern as `quickIdeasPrompt`. Both prompts SHALL use exact text from the BSE prompt library.

#### Scenario: Deep analysis prompt receives a financial services engagement
- **WHEN** `industry` is `financial_services`
- **THEN** the industry context variable is substituted correctly into Prompt 10.3
- **AND** Claude applies financial services framing to the deep brief

#### Scenario: Solutions prompt receives deep brief output
- **WHEN** Call 1 output is serialised and passed to `solutionsPrompt` as `{brief}` alongside the original `{industry}`
- **THEN** both template variables are substituted correctly
- **AND** Claude generates exactly 5 solutions with ROI framing