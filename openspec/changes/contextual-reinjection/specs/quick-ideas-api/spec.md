## MODIFIED Requirements

### Requirement: Quick Ideas API route enforces gate pre-conditions
The system SHALL provide a Vercel serverless route at `api/pipeline/quick-ideas.js` that accepts `POST` requests with `{ engagementId }` in the body. The route SHALL verify that the engagement exists, belongs to the authenticated user, and has status `solutions_pending`, `failed`, OR `gate2_review` before invoking `quickIdeasChain`. The route SHALL use `SUPABASE_SERVICE_ROLE_KEY` for all Supabase reads and writes.

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

#### Scenario: Solutions chain called from gate2_review for regeneration
- **WHEN** a POST request is sent with a valid `engagementId` and the engagement has status `gate2_review`
- **THEN** the route reads `structured_brief` and `industry` from the engagement
- **AND** invokes `quickIdeasChain` with the brief and industry
- **AND** writes the returned solutions object to `engagements.solutions`
- **AND** does NOT change `engagements.status` (remains `gate2_review`)
- **AND** returns HTTP 200 with `{ success: true, engagementId }`

#### Scenario: Engagement has disallowed status
- **WHEN** a POST request is sent and the engagement status is not `solutions_pending`, `failed`, or `gate2_review`
- **THEN** the route returns HTTP 409 with `{ error: "Engagement is not ready for solution generation", status: <current status> }`
- **AND** no chain is invoked

#### Scenario: structured_brief is null
- **WHEN** a POST request is sent but `engagements.structured_brief` is null
- **THEN** the route returns HTTP 422 with `{ error: "No approved brief found for this engagement" }`
- **AND** no chain is invoked

#### Scenario: Unauthenticated request
- **WHEN** a POST request is sent without a valid Supabase session
- **THEN** the route returns HTTP 401 with `{ error: "Unauthorized" }`
