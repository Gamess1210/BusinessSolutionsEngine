## MODIFIED Requirements

### Requirement: Consolidation API route enforces gate pre-conditions
The system SHALL provide a Vercel serverless route at `api/pipeline/consolidate.js` that accepts `POST` requests with `{ engagementId }` in the body. The route SHALL verify that the engagement exists, belongs to the authenticated user, and has status `captured`, `failed`, OR `gate2_review` before invoking `consolidationChain`. The route SHALL use `SUPABASE_SERVICE_ROLE_KEY` for all Supabase reads and writes.

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

#### Scenario: Consolidation called from gate2_review for regeneration
- **WHEN** a POST request is sent with a valid `engagementId` and the engagement has status `gate2_review`
- **THEN** the route proceeds identically to a `captured` engagement (consolidationChain is invoked with all inputs)
- **AND** the route does NOT advance status to `gate1_review` — status remains `gate2_review`
- **AND** the returned brief is written to `engagements.structured_brief`
- **AND** returns HTTP 200 with `{ success: true, engagementId }`

#### Scenario: Engagement has disallowed status
- **WHEN** a POST request is sent and the engagement status is not `captured`, `failed`, or `gate2_review`
- **THEN** the route returns HTTP 409 with `{ error: "Engagement is not in a consolidatable state", status: <current status> }`
- **AND** no chain is invoked

#### Scenario: Input character count exceeds threshold
- **WHEN** the total formatted input length exceeds `CONSOLIDATION_MAX_INPUT_CHARS` (default 40 000)
- **THEN** the route returns HTTP 422 with `{ error: "Input too large for consolidation" }`
- **AND** no chain is invoked

#### Scenario: Unauthenticated request
- **WHEN** a POST request is sent without a valid Supabase session
- **THEN** the route returns HTTP 401 with `{ error: "Unauthorized" }`
