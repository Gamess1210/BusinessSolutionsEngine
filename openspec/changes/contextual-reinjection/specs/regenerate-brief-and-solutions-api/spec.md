## ADDED Requirements

### Requirement: Regeneration API route orchestrates void, consolidation, and solutions in sequence
The system SHALL provide a Vercel serverless route at `api/pipeline/regenerate-brief-and-solutions.js` that accepts `POST` requests with `{ engagementId }` in the body. The route SHALL verify that the engagement exists, belongs to the authenticated user, and has status `gate2_review`. The route SHALL then: (1) void the existing Gate 2 approval record, (2) invoke `consolidationChain` with all engagement inputs, (3) write the returned brief to `engagements.structured_brief`, (4) invoke the appropriate solutions chain (`quickIdeasChain` for `analysis_mode = 'quick'`, `deepAnalysisChain` for `analysis_mode = 'deep'`), and (5) write the returned solutions to `engagements.solutions`. The engagement status SHALL remain `gate2_review` throughout and after a successful run. The route SHALL use `SUPABASE_SERVICE_ROLE_KEY` for all Supabase reads and writes. All helper functions (auth, validation, void, chain execution, error recovery) SHALL have cyclomatic complexity ≤ 10.

#### Scenario: Successful regeneration for a quick ideas engagement
- **WHEN** a POST request is sent with a valid `engagementId`, the engagement has status `gate2_review`, and `analysis_mode = 'quick'`
- **THEN** the route voids the Gate 2 approval record
- **AND** invokes `consolidationChain` with all engagement inputs
- **AND** writes the returned brief to `engagements.structured_brief`
- **AND** invokes `quickIdeasChain` with the new brief and industry
- **AND** writes the returned solutions to `engagements.solutions`
- **AND** keeps `engagements.status` as `gate2_review`
- **AND** returns HTTP 200 with `{ success: true, engagementId }`

#### Scenario: Successful regeneration for a deep analysis engagement
- **WHEN** a POST request is sent with a valid `engagementId`, the engagement has status `gate2_review`, and `analysis_mode = 'deep'`
- **THEN** the route invokes `deepAnalysisChain` (not `quickIdeasChain`) for the solutions step
- **AND** all other steps are identical to the quick ideas scenario

#### Scenario: Engagement is not at gate2_review
- **WHEN** a POST request is sent and the engagement status is not `gate2_review`
- **THEN** the route returns HTTP 409 with `{ error: "Engagement is not at gate2_review status" }`
- **AND** no chains are invoked and no records are modified

#### Scenario: Unauthenticated request
- **WHEN** a POST request is sent without a valid Supabase session
- **THEN** the route returns HTTP 401 with `{ error: "Unauthorized" }`

#### Scenario: Engagement not found or belongs to another user
- **WHEN** a POST request is sent with an `engagementId` that does not exist or belongs to a different user
- **THEN** the route returns HTTP 404 with `{ error: "Engagement not found" }`

### Requirement: Gate 2 approval record is voided before regeneration runs
The system SHALL update the `gate_approvals` record where `engagement_id = engagementId` AND `gate_number = 2` to set `action = 'voided'`. If no such record exists, the void step SHALL be a no-op (not an error). The void SHALL complete before `consolidationChain` is invoked.

#### Scenario: Existing Gate 2 approval record is voided
- **WHEN** a Gate 2 `gate_approvals` record exists with `action = 'approved'`
- **THEN** the route updates it to `action = 'voided'`
- **AND** the void completes before consolidationChain is called

#### Scenario: No Gate 2 approval record exists
- **WHEN** no `gate_approvals` record exists for `gate_number = 2` and the given engagement
- **THEN** the void step completes without error
- **AND** regeneration proceeds normally

### Requirement: Error recovery on chain failure during regeneration
The system SHALL, when any chain throws during regeneration, update `engagements` to set `status = 'failed'`, `last_successful_gate = 2`, and `error_log = { message, chain: 'regenerationChain', timestamp }`. The route SHALL return HTTP 500 with `{ error: "Regeneration failed", engagementId }`. The Gate 2 void is not reversed on failure — the record remains `voided`.

#### Scenario: consolidationChain throws during regeneration
- **WHEN** `consolidationChain` throws during the regeneration run
- **THEN** the route catches the error
- **AND** writes `status = 'failed'`, `last_successful_gate = 2`, and `error_log` to the engagement
- **AND** returns HTTP 500 with `{ error: "Regeneration failed", engagementId }`
- **AND** the prior `structured_brief` remains in place (consolidation output not yet written)

#### Scenario: solutions chain throws after consolidation succeeds
- **WHEN** `consolidationChain` succeeds and `structured_brief` is written, but the solutions chain throws
- **THEN** the route catches the error
- **AND** writes `status = 'failed'`, `last_successful_gate = 2`, and `error_log` to the engagement
- **AND** the new `structured_brief` is already written to Supabase
- **AND** returns HTTP 500 with `{ error: "Regeneration failed", engagementId }`
