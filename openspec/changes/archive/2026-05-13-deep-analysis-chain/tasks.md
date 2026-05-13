## 1. Prompts

- [x] 1.1 Create `src/lib/prompts/deepAnalysisPrompt.js` — LangChain `ChatPromptTemplate` for Prompt 10.3, accepting `{brief}` and `{industry}` template variables
- [x] 1.2 Create `src/lib/prompts/solutionsPrompt.js` — LangChain `ChatPromptTemplate` for Prompt 10.4, same system/human message pattern as `quickIdeasPrompt.js`: system template uses `{industry}`, human message uses `{brief}` (the Call 1 deep brief output, serialised as JSON)

## 2. Chain (Gate 2 — LangChain)

- [x] 2.1 Create `src/lib/chains/deepAnalysis.js` — `RunnableSequence` with Call 1 (deepAnalysisPrompt → Claude) and Call 2 (solutionsPrompt → Claude)
- [x] 2.2 Implement `stripJsonFences` and `parseJsonWithFallback` helpers in `deepAnalysis.js` (same pattern as `quickIdeas.js`)
- [x] 2.3 Use lazy `ChatAnthropic` instantiation inside `RunnableLambda.from(async (input) => {...})` for both call steps — not at module level
- [x] 2.4 Wire Call 1 output to Call 2 via an intermediate `RunnableLambda` that returns `{ brief: JSON.stringify(call1Output), industry }` — both `{brief}` and `{industry}` are required by Prompt 10.4; `industry` must be carried forward from the original chain input
- [x] 2.5 Export `deepAnalysisChain` from `deepAnalysis.js`

## 3. API Route (Gate 2 — server-side)

- [x] 3.1 Create `api/pipeline/deep-analysis.js` — POST handler, same structure as `quick-ideas.js`
- [x] 3.2 Add `analysis_mode` to the `getEngagement` select fields
- [x] 3.3 Add `validateEngagement` check: return 409 if `engagement.analysis_mode !== 'deep'`
- [x] 3.4 Invoke `deepAnalysisChain` with `{ structured_brief, industry }` inside the try/catch
- [x] 3.5 On success: write `solutions`, set `status = 'gate2_review'`, clear `error_log`
- [x] 3.6 Implement `recoverFromError` writing `status = 'failed'`, `last_successful_gate = 1`, `error_log = { message, chain: 'deepAnalysisChain', timestamp }`
- [x] 3.7 In `api/pipeline/quick-ideas.js`: add `analysis_mode` to the `getEngagement` select fields and add a `validateEngagement` check returning 409 if `engagement.analysis_mode === 'deep'` — ensures the two routes are mutually exclusive server-side

## 4. Frontend (EngagementDetail)

- [x] 4.1 In `SolutionsPendingSection`, branch on `engagement.analysis_mode`: set `endpoint` and button/loading labels based on `analysis_mode === 'deep'`
- [x] 4.2 For deep mode: endpoint = `/api/pipeline/deep-analysis`, idle label = "Run Deep Analysis →", loading label = "Running Deep Analysis..."
- [x] 4.3 For quick mode or absent: endpoint = `/api/pipeline/quick-ideas`, idle label = "Generate Solutions →", loading label = "Generating Solutions..." (no change to existing behaviour)
- [x] 4.4 Confirm `analysis_mode` is included in the engagement query in `EngagementDetail` (it is selected via `*` — verify no field-level select is in use)

## 5. Smoke Test

- [x] 5.1 Create a deep-mode engagement, advance to `solutions_pending`, click "Run Deep Analysis →", confirm status bar pulses
- [x] 5.2 Confirm Supabase `status` advances to `gate2_review` and `solutions` contains 5 solution objects
- [x] 5.3 Confirm a quick-mode engagement at `solutions_pending` still routes to quick-ideas endpoint and produces 3 solutions
- [x] 5.4 Test error recovery: use an invalid API key, confirm `status = 'failed'` is written and "Pipeline error" banner appears