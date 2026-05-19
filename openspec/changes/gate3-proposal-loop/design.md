## Context

Gate 3 is currently a placeholder — the engagement reaches `gate3_review` with no BA-facing screen. This change implements the full Gate 3 workflow: a three-part review page where the BA selects the chosen solution, optionally captures supplementary context, then iterates on a Comotion-branded business proposal (Document B) until satisfied. Approval triggers PDF generation and SharePoint filing, advancing the engagement to `gate4_review`.

The page is stateful across three sequential parts. Part 3 involves an unbounded edit loop: the BA can request any number of targeted revisions before approving. The page must recover gracefully from chain failures without losing BA inputs.

## Goals / Non-Goals

**Goals:**
- Three-part Gate 3 UI at `/review/:id/proposal`
- `proposalGenerationChain` (Claude) producing full Document B JSON
- `proposalEditChain` (Claude) applying targeted natural-language edits to existing proposal JSON
- Three API routes enforcing server-side gate state
- Puppeteer PDF + Microsoft Graph SharePoint filing on approval
- "Change solution" reset that does not revert gate status
- Optional "Send to Client" trigger post-approval
- Error recovery: `failed` + `last_successful_gate = 3` on any chain error

**Non-Goals:**
- Automated client email delivery — BA decides whether to send from BSE or externally
- Version history of proposal edits
- Concurrent multi-user editing of the same engagement

## Decisions

### 1. Two chains, not one
**Decision**: `proposalGenerationChain` and `proposalEditChain` are separate chains.

Rationale: Generation builds a full JSON structure from scratch; editing applies targeted mutations to an existing structure. Combining them would require a mode flag that inflates CC and conflates two distinct contracts. Separate chains stay ≤ CC 10 and can evolve independently.

### 2. Proposal stored as JSON in Supabase, not HTML
**Decision**: `engagements.proposal_json` stores the Claude-generated JSON. HTML is rendered client-side from JSON; PDF is rendered server-side from JSON at approval time.

Rationale: Storing raw JSON keeps the data portable and lets the BA preview edits without a round-trip. Storing HTML would make edit diffing fragile and bloat the Supabase row. The A4 HTML template is applied at render time only.

### 3. Edit loop is entirely client-driven
**Decision**: The BA submits natural-language edit instructions via `POST /api/pipeline/gate3-edit`. Each call returns updated `proposal_json`; the client re-renders the HTML preview. There is no loop counter or automatic termination.

Rationale: Proposal quality is a BA judgement call. An automatic iteration limit would frustrate users on complex engagements. The BA terminates the loop by approving.

### 4. "Change solution" reset scope
**Decision**: "Change solution" clears `chosen_solution`, `chosen_solution_context`, and `proposal_json` in Supabase and returns the UI to Part 1. Status remains `gate3_review` — no gate regression.

Rationale: Reverting to `gate2_review` would require re-approving solutions, which is unnecessary overhead. The BA is simply reconsidering within Gate 3.

### 5. Model assignment
- `proposalGenerationChain`: **Claude (claude-sonnet-4-20250514)**
- `proposalEditChain`: **Claude (claude-sonnet-4-20250514)**
- No Gemini involvement at Gate 3 — document generation and editing are not code review tasks.

### 6. Context capture reuses existing input components
The supplementary context UI in Part 2 reuses `BrainDump`, `TranscriptInput`, and `GuidedCapture` components already built for the capture flow, with `mode="supplementary"` prop to suppress the "start engagement" submission path. Input is stored locally until Part 3 is entered.

### 7. PDF generation at approval only
PDF conversion runs once in `gate3-approve` after the BA approves. It never runs during the edit loop — only the JSON and HTML preview update during edits.

## Risks / Trade-offs

- **Vercel timeout on approval** → PDF generation + SharePoint upload must complete within 60s. Mitigation: use streaming Supabase status updates; if timeout is a risk, split into separate `gate3-approve` (persist + advance) and `gate3-file` (PDF + upload) calls triggered sequentially
- **Large proposal JSON** → Deep analysis engagements produce verbose JSON. Mitigation: keep `proposal_json` in Supabase (not in client state) and fetch on each edit to avoid stale state
- **CC limit on ProposalReview component** → Three-part page with conditional rendering risks CC > 10. Mitigation: split into `Part1SolutionSelect`, `Part2ContextCapture`, `Part3ProposalLoop` sub-components
- **BA navigates away mid-loop** → Unsaved edit instruction is lost; `proposal_json` in Supabase is the canonical state and is safe. Mitigation: warn on unsaved instruction text in the edit textarea

## Migration Plan

1. Supabase migration: add `chosen_solution`, `chosen_solution_context`, `proposal_json`, `sharepoint_proposal_url` to `engagements`
2. Deploy chains to `src/lib/chains/`
3. Deploy three API routes to `api/pipeline/`
4. Add `ProposalReview.jsx` page and route in `App.jsx`
5. Add `gate3_review` action card to EngagementDetail

Rollback: failed state triggers existing retry flow. Columns are nullable — no data loss on partial completion.

## Open Questions

- Is there an existing `sendToClient` email helper to reuse for the optional client send, or does that need a new integration?
- Should the HTML preview in Part 3 be a sandboxed `<iframe>` or direct `dangerouslySetInnerHTML`? (Security vs simplicity tradeoff for internal-only BA tool.)
