## Why

After Gate 1 approval the engagement has a structured brief but no solution options — there is no automated path from an approved brief to Gate 2 review. The `quickIdeasChain` closes this gap for Quick Ideas mode engagements by generating exactly 3 solution options from the approved brief and advancing the engagement to Gate 2 review for BA sign-off.

## What Changes

- New `quickIdeasChain` LangChain chain in `src/lib/chains/quickIdeas.js` — accepts `structured_brief` and `industry`, calls Claude via Prompt 10.2, returns 3 solution options as structured JSON
- New `src/lib/prompts/quickIdeasPrompt.js` — `ChatPromptTemplate` with `{brief}` and `{industry}` variables
- New Vercel serverless route `api/pipeline/quick-ideas.js` — authenticates user, validates engagement status is `solutions_pending`, invokes `quickIdeasChain`, writes result to `engagements.solutions`, updates status to `gate2_review`
- After Gate 1 approval, engagement detail page redirects to solutions pending state (removes "Gate review screens coming soon" placeholder for `solutions_pending` status)
- Error recovery: on chain failure, status reverts to `solutions_pending`, `error_log` written, `last_successful_gate = 1`

## Capabilities

### New Capabilities
- `quick-ideas-chain`: LangChain chain and prompt that generates 3 solution options from an approved structured brief using Claude (Prompt 10.2)
- `quick-ideas-api`: Vercel API route that orchestrates the quick ideas pipeline step with auth, gate pre-condition checks, and error recovery

### Modified Capabilities
- `consolidation-chain`: No requirement changes — the API route trigger flow is extended (engagement detail now also shows a "Generate Solutions" trigger for `solutions_pending` status), but consolidation chain behaviour is unchanged

## Impact

- `src/lib/chains/quickIdeas.js` — new file
- `src/lib/prompts/quickIdeasPrompt.js` — new file
- `api/pipeline/quick-ideas.js` — new Vercel serverless route
- `src/pages/EngagementDetail.jsx` — add trigger button for `solutions_pending` status (mirrors existing pipeline footer pattern)
- `engagements` table — `solutions JSONB` column already exists (confirmed in Supabase schema)
- No new dependencies required — `@langchain/anthropic` and `langchain` already installed
