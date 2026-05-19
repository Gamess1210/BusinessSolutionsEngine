## Why

Gate 3 currently has no implementation — after Document A is filed the engagement sits at `gate3_review` with no screen for the BA to act on it. This change delivers the full Gate 3 workflow: solution selection, supplementary context capture, AI-generated proposal with an iterative edit loop, and automatic PDF filing to SharePoint, advancing the engagement to `gate4_review`.

## What Changes

- New Gate 3 review screen at `/review/:id/proposal` with three sequential parts
- New `proposalGenerationChain` (Claude) — generates full Document B JSON from chosen solution + context + original brief
- New `proposalEditChain` (Claude) — makes targeted edits to existing Document B JSON from BA natural-language instruction
- New API routes: `POST /api/pipeline/gate3-generate`, `POST /api/pipeline/gate3-edit`, `POST /api/pipeline/gate3-approve`
- `engagements` table additions: `chosen_solution` (jsonb, nullable), `chosen_solution_context` (jsonb, nullable), `proposal_json` (jsonb, nullable), `sharepoint_proposal_url` (text, nullable)
- Puppeteer PDF conversion + Microsoft Graph API filing on Gate 3 approval
- Optional "Send to Client" action surfaced after approval (BA-initiated, not automated)
- "Change solution" button resets solution selection without reverting gate status
- Error recovery: `status = failed`, `last_successful_gate = 3`, `error_log` populated on any chain failure

## Capabilities

### New Capabilities

- `gate3-proposal-screen`: Three-part Gate 3 review UI — solution selection, supplementary context capture, proposal generation and edit loop
- `proposal-generation-chain`: LangChain chain (Claude) that generates structured Document B JSON
- `proposal-edit-chain`: LangChain chain (Claude) that applies targeted BA-instructed edits to existing proposal JSON
- `gate3-api-routes`: Three server-side Vercel API routes enforcing Gate 3 state transitions

### Modified Capabilities

- `gate2-solutions-review`: `gate3_review` is now a recognised status that routes the BA to `/review/:id/proposal` from EngagementDetail

## Impact

- **API**: three new routes under `api/pipeline/`
- **Chains**: two new chains in `src/lib/chains/`
- **Database**: four new columns on `engagements` (`chosen_solution`, `chosen_solution_context`, `proposal_json`, `sharepoint_proposal_url`)
- **Frontend**: new page `src/pages/review/ProposalReview.jsx`; EngagementDetail adds `gate3_review` action card
- **Dependencies**: `@sparticuz/chromium`, `puppeteer-core`, `@microsoft/microsoft-graph-client` (all existing)
- **Status machine**: `gate3_review → gate4_review` on approval; `gate3_review → failed` on chain error with `last_successful_gate = 3`
