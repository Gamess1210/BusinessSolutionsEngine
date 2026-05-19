## Context

After Gate 2 approval the engagement moves to `proposal_pending`. Currently nothing automated happens — the BA must manually compile and share solution options. Document A is a 1–2 page A4 HTML document (using `comotion-a4-html-template.html`, not a formal client-branded proposal) listing all approved solution options for the BA to share with the client before the full proposal is drafted. It must be filed to SharePoint automatically and linked in the BSE so the BA can retrieve and share it with no extra steps.

The existing `gate2-approve` API route already sets status to `proposal_pending`. This change extends that route (or chains a new route) to trigger Document A generation immediately after approval.

## Goals / Non-Goals

**Goals:**
- Automatically generate Document A JSON via a LangChain chain (Claude) after Gate 2 approval
- Render JSON to A4 HTML using `comotion-a4-html-template.html`
- Convert HTML to PDF using Puppeteer + @sparticuz/chromium
- Upload PDF to SharePoint via Microsoft Graph API as `[ClientName]_[YYYY-MM-DD]_SolutionOptions.pdf`
- Store SharePoint URL in `engagements.sharepoint_solution_options_url`
- Advance status to `gate3_review` on success; set `failed` + populate `error_log` on failure
- Surface Document A link in EngagementDetail UI

**Non-Goals:**
- BA approval of Document A — it files automatically
- Sending Document A to the client — BA shares it manually via the displayed link
- Modification of Document A content post-generation

## Decisions

### 1. Separate chain vs extending proposalGenerationChain
**Decision**: New dedicated `documentAGenerationChain` in `src/lib/chains/documentAGenerationChain.js`.

Rationale: Document A (solution options summary) and Document B (business proposal) serve different purposes and audiences. Coupling them in one chain would increase cyclomatic complexity beyond CC 10, violate single-responsibility, and complicate future changes to either document. A dedicated chain keeps both below CC 10 and makes each independently testable.

Alternatives considered: Extending `proposalGenerationChain` with a mode flag — rejected because branching logic inflates CC and obscures the two document contracts.

### 2. Trigger point: same API route vs new route
**Decision**: Extend `api/pipeline/gate2-approve` to call `documentAGenerationChain` after approval persists, then advance to `gate3_review`.

Rationale: The approval is the single trigger event. Keeping it in one API route avoids an extra HTTP hop, makes the state transition atomic from the BA's perspective, and ensures the gate enforcement path is server-side only.

Alternatives considered: A separate `POST /api/pipeline/generate-document-a` called from the frontend after approval — rejected because it would let the frontend control pipeline progression, which violates the gate enforcement rule.

### 3. Model assignment
`documentAGenerationChain` uses **Claude (claude-sonnet-4-20250514)** for JSON generation. No Gemini involvement — Document A is content generation, not code review.

### 4. Database column
`engagements.sharepoint_solution_options_url` — `text`, nullable. Populated only after successful SharePoint upload. NULL means generation has not completed or failed.

### 5. Error recovery
On any chain failure: set `status = 'failed'`, `last_successful_gate = 2`, populate `error_log`. The existing BA retry flow at `failed` → last successful gate state covers re-triggering Document A generation on retry.

## Risks / Trade-offs

- **Puppeteer cold start on Vercel** → Mitigated by using `@sparticuz/chromium` (already a project dependency); keep PDF generation within the 60s Vercel function timeout
- **SharePoint token expiry** → Mitigated by refreshing the Microsoft Graph token at the start of each pipeline invocation; Graph API errors surface in `error_log`
- **Approval latency** → The BA's "Approve" action now blocks on PDF generation + SharePoint upload (~5–10s). The UI must show an in-progress state during this window; do not navigate until `gate3_review` is confirmed
- **CC limit** → Chain functions must stay ≤ CC 10; HTML template rendering extracted to a separate helper if needed

## Migration Plan

1. Add `sharepoint_solution_options_url` column to `engagements` via Supabase migration
2. Deploy `documentAGenerationChain` to `src/lib/chains/`
3. Extend `api/pipeline/gate2-approve` to invoke chain and update status
4. Update `STATUS_LABELS` / `STATUS_STEPS` if `gate3_review` needs a display label update
5. Add Document A link section to EngagementDetail

Rollback: if generation fails, `status = 'failed'` triggers existing retry flow. No data is lost — `sharepoint_solution_options_url` remains NULL and can be regenerated on retry.

## Open Questions

- Is there an existing Microsoft Graph helper in the codebase to reuse, or does one need to be written from scratch?
- Should the BA see a loading indicator on the SolutionsReview approve button while Document A generates, or navigate immediately to EngagementDetail showing `gate3_review`?
