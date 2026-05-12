## ADDED Requirements

### Requirement: Consolidation chain merges engagement inputs into a structured brief
The system SHALL provide a `consolidationChain` implemented as a LangChain 0.3.x `RunnableSequence` in `src/lib/chains/consolidation.js`. The chain SHALL accept an engagement context object, format all `engagement_inputs` records by input type, invoke Claude (`claude-sonnet-4-20250514`) via the consolidation prompt, parse the JSON response, and return a structured brief object.

#### Scenario: Successful consolidation with mixed input types
- **WHEN** an engagement has inputs of types `guided`, `braindump`, and `client_intake`
- **THEN** the chain formats each input type into a labelled section of the prompt
- **AND** Claude returns a valid JSON structured brief
- **AND** the chain returns the parsed brief object to the caller

#### Scenario: Consolidation with a single guided input
- **WHEN** an engagement has only `guided` inputs
- **THEN** the chain formats the guided answers into numbered Q&A pairs
- **AND** Claude returns a valid JSON structured brief
- **AND** the chain returns the parsed brief object

#### Scenario: Claude returns JSON wrapped in a code fence
- **WHEN** Claude's response wraps the JSON in a ```json ... ``` block
- **THEN** the output parser strips the fence and parses the inner JSON
- **AND** the chain returns the parsed brief object without error

#### Scenario: Claude returns malformed JSON
- **WHEN** Claude's response cannot be parsed as JSON after fence stripping
- **THEN** the chain throws an error with message `"consolidationChain: failed to parse Claude response as JSON"`
- **AND** the error propagates to the caller for error recovery handling

### Requirement: Consolidation prompt is a reusable LangChain template
The system SHALL provide a `consolidationPrompt` exported from `src/lib/prompts/consolidationPrompt.js` as a LangChain `ChatPromptTemplate`. The prompt SHALL accept `{formattedInputs}` and `{industry}` as template variables and instruct Claude to return a structured JSON brief.

#### Scenario: Prompt receives financial services engagement
- **WHEN** `industry` is `financial_services`
- **THEN** the prompt includes financial-services-specific framing in the system message

#### Scenario: Prompt receives general engagement
- **WHEN** `industry` is `general`
- **THEN** the prompt uses general business framing in the system message

### Requirement: Consolidation API route enforces gate pre-conditions
The system SHALL provide a Vercel serverless route at `api/pipeline/consolidate.js` that accepts `POST` requests with `{ engagementId }` in the body. The route SHALL verify that the engagement exists, belongs to the authenticated user, and has status `captured` or `failed` before invoking `consolidationChain`. The route SHALL use `SUPABASE_SERVICE_ROLE_KEY` for all Supabase reads and writes.

#### Scenario: Status transitions through brief_pending before gate1_review
- **WHEN** a POST request is sent with a valid `engagementId` and the engagement has status `captured` or `failed`
- **THEN** the route sets `engagements.status` to `brief_pending` before invoking `consolidationChain`
- **AND** status is only advanced to `gate1_review` after the chain returns successfully

#### Scenario: Valid engagement in captured status
- **WHEN** a POST request is sent with a valid `engagementId` and the engagement has status `captured`
- **THEN** the route reads all `engagement_inputs` for the engagement
- **AND** invokes `consolidationChain`
- **AND** writes the returned brief to `engagements.structured_brief`
- **AND** updates `engagements.status` to `gate1_review`
- **AND** returns HTTP 200 with `{ success: true, engagementId }`

#### Scenario: Re-consolidation of a failed engagement
- **WHEN** a POST request is sent with a valid `engagementId` and the engagement has status `failed`
- **THEN** the route proceeds identically to a `captured` engagement
- **AND** overwrites the previous `structured_brief` and resets `error_log` to null

#### Scenario: Engagement has disallowed status
- **WHEN** a POST request is sent and the engagement status is not `captured` or `failed`
- **THEN** the route returns HTTP 409 with `{ error: "Engagement is not in a consolidatable state", status: <current status> }`
- **AND** no chain is invoked

#### Scenario: Input character count exceeds threshold
- **WHEN** the total formatted input length exceeds `CONSOLIDATION_MAX_INPUT_CHARS` (default 40 000)
- **THEN** the route returns HTTP 422 with `{ error: "Input too large for consolidation" }`
- **AND** no chain is invoked

#### Scenario: Unauthenticated request
- **WHEN** a POST request is sent without a valid Supabase session
- **THEN** the route returns HTTP 401 with `{ error: "Unauthorized" }`

### Requirement: Error recovery updates engagement state on chain failure
The system SHALL, when `consolidationChain` throws during execution, update `engagements` to set `status = 'failed'`, `last_successful_gate = 0`, and `error_log = { message, chain: 'consolidationChain', timestamp }`. The route SHALL then re-throw the error so the HTTP response reflects the failure.

#### Scenario: Chain throws during Claude invocation
- **WHEN** the Anthropic API returns an error during chain execution
- **THEN** the route catches the error
- **AND** writes `status = 'failed'`, `last_successful_gate = 0`, and `error_log` to the engagement record
- **AND** returns HTTP 500 with `{ error: "Consolidation failed", engagementId }`

#### Scenario: Chain throws during JSON parsing
- **WHEN** the output parser throws a parse error
- **THEN** the same error recovery path fires as for an API error
- **AND** the engagement `status` is set to `failed`

#### Scenario: Failure notification is triggered after error state is written
- **WHEN** the chain throws for any reason during execution
- **THEN** `status = 'failed'`, `last_successful_gate = 0`, and `error_log` are written to Supabase first
- **AND** `triggerFailureNotification(engagementId, error)` is called after the Supabase write completes
- **AND** the route returns HTTP 500 with `{ error: "Consolidation failed", engagementId }`

### Requirement: Input formatter handles all four input types
The system SHALL provide a pure `formatEngagementInputs(inputs)` function (exported from `consolidation.js`) that formats an array of `engagement_inputs` records into a human-readable string. Each input type SHALL be formatted as follows:
- `guided`: numbered list of question/answer pairs with section headings
- `braindump`: plain text block labelled "Brain Dump"
- `transcript`: plain text block labelled "Meeting Transcript"
- `client_intake`: labelled fields (contact, organisation, department, problem, impact, constraints)

#### Scenario: Guided answers formatted correctly
- **WHEN** an input of type `guided` is present
- **THEN** each answer is formatted as `<section> — Q: <question> / A: <answer>` in a numbered list

#### Scenario: Client intake formatted correctly
- **WHEN** an input of type `client_intake` is present
- **THEN** the output includes all seven fields with their labels

#### Scenario: Unknown input type is skipped
- **WHEN** an input has an unrecognised `input_type`
- **THEN** the formatter skips it and logs a warning (does not throw)
