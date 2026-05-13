## Why

Quick Ideas generates 3 solution options in a single Claude call — useful for straightforward problems but insufficient for complex engagements where clients need deeper analysis, ROI framing, and 5 well-differentiated options. The Deep Analysis mode exists in the engagement data model (`analysis_mode = 'deep'`) but has no pipeline implementation yet. This change wires up the two-call chain that fulfils deep mode engagements at Gate 2.

## What Changes

- Add `deepAnalysisChain` in `src/lib/chains/deepAnalysis.js` — a two-call LangChain `RunnableSequence`:
  - Call 1 (Prompt 10.3): expands `structured_brief` into a full deep brief
  - Call 2 (Prompt 10.4): generates exactly 5 solution options with ROI framing from the Call 1 output
- Add `deepAnalysisPrompt` and `solutionsPrompt` in `src/lib/prompts/` for Prompts 10.3 and 10.4
- Add `api/pipeline/deep-analysis.js` Vercel route — enforces `analysis_mode = 'deep'` and `status = 'solutions_pending' or failed` pre-conditions, invokes the chain, persists results, advances status to `gate2_review`
- Extend `SolutionsPendingSection` in `EngagementDetail` to route deep mode engagements to the deep analysis trigger instead of the quick ideas trigger — same `pipelinePhase` pattern, different API endpoint

## Capabilities

### New Capabilities
- `deep-analysis-chain`: Two-call LangChain chain that expands a structured brief into a deep brief (Call 1) then generates 5 ROI-framed solution options (Call 2), stored in `engagements.solutions`
- `deep-analysis-api`: Vercel API route enforcing `analysis_mode = 'deep'` and gate pre-conditions, invoking `deepAnalysisChain` with error recovery

### Modified Capabilities
- `quick-ideas-api`: `SolutionsPendingSection` routing now branches on `analysis_mode` — deep engagements go to the deep analysis trigger, quick engagements go to the quick ideas trigger

## Impact

- New files: `src/lib/chains/deepAnalysis.js`, `src/lib/prompts/deepAnalysisPrompt.js`, `src/lib/prompts/solutionsPrompt.js`, `api/pipeline/deep-analysis.js`
- Modified: `src/pages/EngagementDetail.jsx` — `SolutionsPendingSection` branches on `engagement.analysis_mode`
- No schema changes — `engagements.solutions` and `engagements.status` fields already exist
- New dependency on Prompts 10.3 and 10.4 from the BSE prompt library
- Error recovery writes `status = 'failed'`, `last_successful_gate = 1`, `error_log` — same pattern as `quickIdeasChain`