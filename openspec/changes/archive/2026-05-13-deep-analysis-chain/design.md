## Context

Quick Ideas runs a single Claude call and returns 3 solution options — sufficient for straightforward engagements. Deep Analysis engagements require a two-call sequence: first expand the structured brief into a richer deep brief (Call 1, Prompt 10.3), then generate 5 ROI-framed solution options from that output (Call 2, Prompt 10.4). The `analysis_mode = 'deep'` field exists on `engagements` and the `solutions` column already holds chain output, but no pipeline wires them up yet.

The existing `quickIdeasChain` and `api/pipeline/quick-ideas.js` define the patterns this change mirrors: `RunnableSequence`, lazy `ChatAnthropic` instantiation, `recoverFromError`, gate pre-condition enforcement, and `pipelinePhase` state in `SolutionsPendingSection`.

## Goals / Non-Goals

**Goals:**
- Implement `deepAnalysisChain` as a two-call `RunnableSequence` using Prompts 10.3 and 10.4
- Add `api/pipeline/deep-analysis.js` enforcing `analysis_mode = 'deep'` and `status in (solutions_pending, failed)`
- Route deep-mode engagements at `solutions_pending` to the new endpoint in `EngagementDetail`
- Match the error recovery pattern (status = `failed`, `last_successful_gate = 1`) and polling behaviour from `quickIdeasChain`

**Non-Goals:**
- Changes to the Gate 2 Solutions Review screen — it already reads `engagement.solutions`
- Prompt text authoring — Prompts 10.3 and 10.4 come from the BSE prompt library
- Any change to the `engagements` schema — `solutions`, `status`, `analysis_mode` already exist

## Decisions

### Two-call chain as a single RunnableSequence

**Decision:** Implement both calls in one `RunnableSequence` rather than two separate chains called sequentially in the API route.

**Rationale:** A single chain keeps error recovery centralised — one `try/catch` in the API route handles both call failures. Two separate chain invocations would require guarding each call independently and deciding what state to write if Call 1 succeeds but Call 2 fails. A sequence makes the data flow explicit and keeps the API route thin.

**Alternative considered:** Two independent chains invoked in sequence in the route handler. Rejected because error recovery becomes ambiguous mid-sequence (partial success state) and the API route grows in complexity.

### Intermediate deep brief is not persisted

**Decision:** The Call 1 output (deep brief) is passed directly to Call 2 as chain input and is not written to Supabase.

**Rationale:** No downstream consumer needs the intermediate deep brief — only the 5 solutions are displayed and acted on. Persisting it would require a schema change and adds no value at Gate 2. If diagnostics are needed later, the `error_log` column already captures chain name and timestamp.

**Alternative considered:** Adding a `deep_brief` JSONB column to `engagements`. Rejected — schema changes require migration coordination and the proposal explicitly calls out no schema changes.

### Lazy ChatAnthropic instantiation

**Decision:** Instantiate `new ChatAnthropic(...)` inside `RunnableLambda.from(async (input) => {...})` for both chain steps, not at module level.

**Rationale:** Module-level instantiation throws synchronously if `ANTHROPIC_API_KEY` is absent (not just invalid), which happens before the `try/catch` in the route handler — meaning `recoverFromError` never runs. Lazy instantiation defers the throw to invoke time, inside the guarded try/catch. This fix was already applied to `quickIdeasChain` for the same reason.

### analysis_mode routing in SolutionsPendingSection

**Decision:** Branch on `engagement.analysis_mode` inside `SolutionsPendingSection` to select the API endpoint and button label. No new component.

**Rationale:** The `pipelinePhase` state machine, error handling, and polling pattern are identical for both modes. Duplicating `SolutionsPendingSection` would split identical logic. A single branching point (`analysis_mode === 'deep' ? '/api/pipeline/deep-analysis' : '/api/pipeline/quick-ideas'`) keeps the component cohesive.

**Alternative considered:** A separate `DeepAnalysisPendingSection` component. Rejected — it would be an exact copy of `SolutionsPendingSection` with one line changed.

### Model assignment

Both calls in `deepAnalysisChain` use Claude (`claude-sonnet-4-20250514`). Gemini is not involved — it is used only for code review (Gate 5), not for solution generation at Gate 2.

## Risks / Trade-offs

**Two sequential Claude calls (~5min total latency)** → Mitigation: the `pipelinePhase` running state already drives a pulsing status bar. Users are informed the process is in progress. No timeout change is needed at Vercel's default (30s for hobby, 60s for pro) — long-running generation may need `maxDuration` set in the route config if deployments target Vercel Pro.

**Call 2 receives Call 1 output as input — if Call 1 returns unexpected structure, Call 2 prompt may produce low-quality output** → Mitigation: Prompt 10.4 is designed to accept the deep brief format from Prompt 10.3; both are from the same BSE prompt library and are designed to pair. JSON parse fallback (fence-strip) is applied on Call 2 output, same as `quickIdeasChain`.

**`analysis_mode` absent on older engagements** → Mitigation: `SolutionsPendingSection` treats `null` or `undefined` `analysis_mode` as `quick` — the existing default behaviour is preserved.