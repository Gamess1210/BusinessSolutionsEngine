## Context

Gate 1 approval sets `engagements.status = 'solutions_pending'` but nothing currently triggers solution generation. The engagement detail page shows a placeholder for all non-`captured` statuses. The `solutions JSONB` column already exists on the `engagements` table. The `@langchain/anthropic` and `langchain` packages are already installed. The pattern established by `consolidationChain` and `api/pipeline/consolidate.js` is the direct template for this change.

## Goals / Non-Goals

**Goals:**
- Generate exactly 3 solution options from the approved `structured_brief` for Quick Ideas mode engagements
- Follow the identical chain + API route + frontend trigger pattern established by Gate 1
- Store results in `engagements.solutions` and advance status to `gate2_review`
- Implement full error recovery (revert to `solutions_pending` on failure)
- Surface a "Generate Solutions" trigger button on the engagement detail page for `solutions_pending` status

**Non-Goals:**
- Deep Analysis mode solutions (`deepAnalysisChain`) — separate change
- Gate 2 review screen (Solutions Review UI) — separate change
- Power Automate notifications — not triggered at this gate
- Any modification to the consolidation chain or Gate 1 behaviour

## Decisions

**Model: Claude (`claude-sonnet-4-20250514`)**
Consistent with all content generation chains. Gemini is reserved for code review only (Gate 5). No deviation from the model separation rule.

**Chain structure: `RunnableSequence.from([promptStep, claudeModel, outputParser])`**
No input formatting step is needed — `structured_brief` is already a clean JSON object. The prompt receives it serialised as a string. This is simpler than the consolidation chain which required a formatter for mixed input types.

**Brief serialisation: `JSON.stringify(structured_brief)`**
The brief is passed to the prompt as a JSON string. Claude has been instructed (Prompt 10.2) to interpret it as a structured object. This avoids building a custom formatter and keeps the chain minimal.

**Output parser: `JsonOutputParser` with fence-strip fallback**
Same approach as `consolidationChain` — Claude occasionally wraps JSON in ` ```json ``` ` fences. The fallback strips them before parsing.

**API route pre-condition: status must be `solutions_pending` OR `failed`**
`solutions_pending` is set by Gate 1 approval in `BriefReview.jsx`. `failed` is allowed for retry after a previous solutions generation failure. Any other status returns HTTP 409.

**Error recovery: revert to `solutions_pending`, `last_successful_gate = 1`**
Gate 1 was the last approved gate. On failure the engagement should be retryable from the solutions pending state, not from the beginning. `last_successful_gate = 1` correctly reflects this.

**Frontend trigger: extend `EngagementDetail` with a `SolutionsPendingSection`**
The existing `CaptureSection` only renders for `captured` status. A new `SolutionsPendingSection` renders for `solutions_pending` status, showing a "Generate Solutions →" button. This mirrors the `PipelineFooter` pattern exactly.

## Risks / Trade-offs

**Claude returns fewer or more than 3 solutions** → Mitigation: the output parser does not enforce count — the prompt instructs exactly 3. If Claude deviates, the solutions array will have the wrong count. The Gate 2 review screen (built separately) should display however many solutions are returned rather than assuming exactly 3.

**`structured_brief` is null when route is called** → Mitigation: the API route reads the engagement record before invoking the chain and returns HTTP 422 if `structured_brief` is null.

**60-second Vercel function timeout** → Quick Ideas is a single Claude call. Expected duration is 10–20 seconds. No risk at current timeout.

**`solutions_pending` status shown briefly before chain completes** → The frontend sets `solutions_pending` optimistically on button click (same pattern as `brief_pending` in Gate 1). If the user navigates away and back during generation, the 5-second polling will reflect the real status from Supabase.
