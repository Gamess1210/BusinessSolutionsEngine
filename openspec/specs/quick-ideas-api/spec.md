## Purpose

Defines the behaviour of the Quick Ideas API route — enforcing gate pre-conditions server-side, invoking the quickIdeasChain, persisting results to Supabase, and recovering safely from chain failures.

## Requirements

### Requirement: Quick Ideas API route enforces gate pre-conditions
The system SHALL provide a Vercel serverless route at `api/pipeline/quick-ideas.js` that accepts `POST` requests with `{ engagementId }` in the body. The route SHALL verify that the engagement exists, belongs to the authenticated user, and has status `solutions_pending` or `failed` before invoking `quickIdeasChain`. The route SHALL use `SUPABASE_SERVICE_ROLE_KEY` for all Supabase reads and writes.

#### Scenario: Valid engagement in solutions_pending status
- **WHEN** a POST request is sent with a valid `engagementId` and the engagement has status `solutions_pending`
- **THEN** the route reads `structured_brief` and `industry` from the engagement
- **AND** invokes `quickIdeasChain` with the brief and industry
- **AND** writes the returned solutions object to `engagements.solutions`
- **AND** updates `engagements.status` to `gate2_review`
- **AND** returns HTTP 200 with `{ success: true, engagementId }`

#### Scenario: Re-generation after a failed attempt
- **WHEN** a POST request is sent with a valid `engagementId` and the engagement has status `failed`
- **THEN** the route proceeds identically to a `solutions_pending` engagement
- **AND** overwrites the previous `solutions` and resets `error_log` to null

#### Scenario: Engagement has disallowed status
- **WHEN** a POST request is sent and the engagement status is not `solutions_pending` or `failed`
- **THEN** the route returns HTTP 409 with `{ error: "Engagement is not ready for solution generation", status: <current status> }`
- **AND** no chain is invoked

#### Scenario: structured_brief is null
- **WHEN** a POST request is sent but `engagements.structured_brief` is null
- **THEN** the route returns HTTP 422 with `{ error: "No approved brief found for this engagement" }`
- **AND** no chain is invoked

#### Scenario: Unauthenticated request
- **WHEN** a POST request is sent without a valid Supabase session
- **THEN** the route returns HTTP 401 with `{ error: "Unauthorized" }`

### Requirement: Error recovery updates engagement state on chain failure
The system SHALL, when `quickIdeasChain` throws during execution, update `engagements` to set `status = 'failed'`, `last_successful_gate = 1`, and `error_log = { message, chain: 'quickIdeasChain', timestamp }`. The route SHALL then return HTTP 500 with `{ error: "Solution generation failed", engagementId }`.

#### Scenario: Chain throws during Claude invocation
- **WHEN** the Anthropic API returns an error during chain execution
- **THEN** the route catches the error
- **AND** writes `status = 'failed'`, `last_successful_gate = 1`, and `error_log` to the engagement record
- **AND** returns HTTP 500 with `{ error: "Solution generation failed", engagementId }`

#### Scenario: Chain throws during JSON parsing
- **WHEN** the output parser throws a parse error
- **THEN** the same error recovery path fires as for an API error
- **AND** `last_successful_gate` is set to `1` (Gate 1 was the last approved gate)

### Requirement: Engagement detail surfaces a solutions generation trigger
The system SHALL render a `SolutionsPendingSection` on the engagement detail page when `engagement.status` is `solutions_pending`. This section SHALL display a "Generate Solutions →" button that POSTs to `api/pipeline/quick-ideas.js` and mirrors the loading, success, and error behaviour of the existing pipeline footer.

#### Scenario: BA clicks Generate Solutions
- **WHEN** the engagement status is `solutions_pending` and the BA clicks "Generate Solutions →"
- **THEN** the button shows "Generating Solutions..." and is disabled
- **AND** the status bar updates to reflect the in-progress state
- **AND** on success the page reflects `gate2_review` status

#### Scenario: Generation fails
- **WHEN** the API route returns a non-2xx response
- **THEN** an error message is displayed
- **AND** the button re-enables for retry
