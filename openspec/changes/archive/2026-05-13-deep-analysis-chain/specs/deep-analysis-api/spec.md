## ADDED Requirements

### Requirement: Deep Analysis API route enforces gate pre-conditions and analysis_mode
The system SHALL provide a Vercel serverless route at `api/pipeline/deep-analysis.js` that accepts `POST` requests with `{ engagementId }` in the body. The route SHALL verify that the engagement exists, belongs to the authenticated user, has `analysis_mode = 'deep'`, and has status `solutions_pending` or `failed` before invoking `deepAnalysisChain`. The route SHALL use `SUPABASE_SERVICE_ROLE_KEY` for all Supabase reads and writes.

#### Scenario: Valid deep engagement in solutions_pending status
- **WHEN** a POST request is sent with a valid `engagementId`, the engagement has `analysis_mode = 'deep'` and status `solutions_pending`
- **THEN** the route reads `structured_brief` and `industry` from the engagement
- **AND** invokes `deepAnalysisChain` with the brief and industry
- **AND** writes the returned solutions object to `engagements.solutions`
- **AND** updates `engagements.status` to `gate2_review`
- **AND** clears `error_log` to null
- **AND** returns HTTP 200 with `{ success: true, engagementId }`

#### Scenario: Re-generation after a failed deep analysis attempt
- **WHEN** a POST request is sent with a valid `engagementId`, the engagement has `analysis_mode = 'deep'` and status `failed`
- **THEN** the route proceeds identically to a `solutions_pending` engagement
- **AND** overwrites the previous `solutions` and resets `error_log` to null

#### Scenario: Engagement has disallowed status
- **WHEN** a POST request is sent and the engagement status is not `solutions_pending` or `failed`
- **THEN** the route returns HTTP 409 with `{ error: "Engagement is not ready for solution generation", status: <current status> }`
- **AND** no chain is invoked

#### Scenario: Engagement has analysis_mode other than deep
- **WHEN** a POST request is sent and the engagement has `analysis_mode != 'deep'`
- **THEN** the route returns HTTP 409 with `{ error: "Engagement is not a deep analysis engagement" }`
- **AND** no chain is invoked

#### Scenario: structured_brief is null
- **WHEN** a POST request is sent but `engagements.structured_brief` is null
- **THEN** the route returns HTTP 422 with `{ error: "No approved brief found for this engagement" }`
- **AND** no chain is invoked

#### Scenario: Unauthenticated request
- **WHEN** a POST request is sent without a valid Supabase session
- **THEN** the route returns HTTP 401 with `{ error: "Unauthorized" }`

### Requirement: Deep Analysis error recovery updates engagement state on chain failure
The system SHALL, when `deepAnalysisChain` throws during execution, update `engagements` to set `status = 'failed'`, `last_successful_gate = 1`, and `error_log = { message, chain: 'deepAnalysisChain', timestamp }`. The route SHALL then return HTTP 500 with `{ error: "Solution generation failed", engagementId }`.

#### Scenario: Chain throws during Call 1 (Anthropic API error)
- **WHEN** the Anthropic API returns an error during Call 1
- **THEN** the route catches the error
- **AND** writes `status = 'failed'`, `last_successful_gate = 1`, and `error_log` to the engagement record
- **AND** returns HTTP 500 with `{ error: "Solution generation failed", engagementId }`

#### Scenario: Chain throws during Call 2
- **WHEN** Call 1 succeeds but Call 2 throws
- **THEN** the same error recovery path fires as for a Call 1 failure
- **AND** `last_successful_gate` is set to `1` (Gate 1 was the last approved gate)

#### Scenario: Chain throws during JSON parsing
- **WHEN** the output parser throws a parse error on Call 2 output
- **THEN** the same error recovery path fires
- **AND** `last_successful_gate` is set to `1`