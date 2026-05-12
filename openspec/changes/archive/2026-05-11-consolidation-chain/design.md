## Context

The BSE pipeline requires a structured brief before Gate 1 can be reviewed. Engagements accumulate raw inputs across up to four input types (`guided`, `braindump`, `transcript`, `client_intake`). These inputs live in `engagement_inputs` as JSONB rows with varying shapes. A consultant triggers consolidation after capture is complete; the chain must read all inputs, format them coherently, invoke Claude, parse the structured JSON response, and persist it — all within a single Vercel serverless invocation. Gate state must be enforced server-side so the frontend never controls progression.

## Goals / Non-Goals

**Goals:**
- Implement `consolidationChain` as a LangChain 0.3.x `RunnableSequence` in `src/lib/chains/consolidationChain.js`
- Implement the consolidation prompt in `src/lib/prompts/consolidationPrompt.js` using `ChatPromptTemplate`
- Implement `api/pipeline/consolidate.js` as the Vercel serverless trigger with gate pre-condition checks
- Write `structured_brief` to `engagements` and advance status to `gate1_review`
- Follow the BSE error recovery pattern: on chain failure, set `status = 'failed'`, write `error_log`, trigger failure notification
- Keep every function under cyclomatic complexity 10

**Non-Goals:**
- Solutions generation (`quickIdeasChain` / `deepAnalysisChain`) — separate chains
- Gate 1 UI — this change ends at data persistence; the UI reads Supabase state
- Prompt content iteration — the prompt template ships with a placeholder that will be refined in a follow-up skill

## Decisions

### Decision 1: LangChain `RunnableSequence` over manual chaining
**Chosen**: `RunnableSequence.from([formatInputs, prompt, model, parseResponse])` pattern from LangChain 0.3.x.
**Why**: Matches the BSE `chains/` convention; gives uniform error propagation; allows `.invoke()` with a single engagement context object.
**Alternative considered**: Direct `client.messages.create()` call. Rejected — CLAUDE.md explicitly prohibits direct API calls for pipeline steps.

### Decision 2: Input formatting as a plain function step, not a separate chain
**Chosen**: `formatEngagementInputs(inputs)` is a pure JS function that transforms the `engagement_inputs` array into a prompt-friendly string, called as the first runnable in the sequence.
**Why**: No AI call needed for formatting; keeping it as a chain step avoids an extra LangChain node with no benefit. Complexity stays below CC 10 by splitting per-type formatters.
**Alternative considered**: A separate `inputFormattingChain`. Rejected — unnecessary abstraction.

### Decision 3: Claude model for consolidation
**Model**: `claude-sonnet-4-20250514` via `@langchain/anthropic` `ChatAnthropic`.
**Why**: BSE rule — `consolidationChain` is a generation step; Gemini is reserved for code review only.

### Decision 4: JSON parsing via a dedicated output parser
**Chosen**: Inline `JsonOutputParser` from `@langchain/core/output_parsers`. Falls back to regex extraction if Claude wraps JSON in a code fence.
**Why**: Claude sometimes wraps JSON in ```json ... ``` blocks. A dedicated parser with fence-strip fallback is more robust than `JSON.parse` directly on the raw response.

### Decision 5: Supabase writes from the API route, not inside the chain
**Chosen**: The chain returns the parsed brief object. The Vercel route owns all Supabase reads and writes.
**Why**: Keeps the chain pure and testable. The route holds the gate pre-condition logic and the error recovery write — mixing Supabase calls into the chain would entangle AI logic with DB state.

## Risks / Trade-offs

- **[Risk] Input size exceeds context window** → Mitigation: API route validates total character count of formatted inputs before invoking the chain; rejects with a structured error if above threshold (configurable via `CONSOLIDATION_MAX_INPUT_CHARS` env var, default 40 000).
- **[Risk] Claude returns malformed JSON** → Mitigation: `JsonOutputParser` with fence-strip; if parse still fails, the chain throws and the error recovery pattern fires.
- **[Risk] Supabase RLS blocks the API route write** → Mitigation: API route uses `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never exposed to client); this bypasses RLS for pipeline writes.
- **[Risk] Vercel cold-start timeout** → Mitigation: Serverless function timeout set to 60 s in `vercel.json`; Claude p95 latency for this prompt is well within that.
- **[Trade-off] Single serverless invocation** → If the chain fails mid-way, partial state is not written (Supabase write is atomic after chain completion). This means no partial brief is ever persisted, which is desirable for Gate 1 correctness.

## Migration Plan

1. Add `structured_brief JSONB`, `last_successful_gate INTEGER DEFAULT 0`, and `error_log JSONB` columns to `engagements` in Supabase (SQL migration script in task list).
2. Deploy `api/pipeline/consolidate.js` and chain files.
3. Add `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` to Vercel environment variables.
4. Update frontend `EngagementDetail` page to call `POST /api/pipeline/consolidate` after capture and poll `engagements.status` to detect `gate1_review`.

**Rollback**: Remove the route file and revert the `engagements` schema columns (columns are nullable; existing rows unaffected).

## Open Questions

- Does the BSE prompt library skill define the exact consolidation prompt text, or is a draft prompt acceptable for this change? (Assume draft; prompt refinement is a separate skill invocation.)
- Should `consolidate` be callable more than once per engagement (re-consolidation after editing inputs)? (Assume yes — idempotent; overwrites `structured_brief` if status is `captured` or `failed`.)
