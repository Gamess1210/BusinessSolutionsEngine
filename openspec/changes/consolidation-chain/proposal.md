## Why

The BSE pipeline cannot advance from engagement capture to Gate 1 (Brief Review) without a structured brief. The `consolidationChain` is the first mandatory AI step — it reads all raw engagement inputs from Supabase, formats them by type, calls Claude to produce a structured JSON brief, and writes that brief back to `engagements.structured_brief` before setting status to `gate1_review`. Without this chain, Gate 1 has no artefact to review.

## What Changes

- **New**: `src/lib/chains/consolidationChain.js` — LangChain 0.3.x chain that consolidates engagement inputs into a structured brief
- **New**: `src/lib/prompts/consolidationPrompt.js` — prompt template for the consolidation step
- **New**: `api/pipeline/consolidate.js` — Vercel serverless route that triggers the chain and enforces gate pre-conditions
- **Modified**: `engagements` table — requires a `structured_brief` JSONB column and a `last_successful_gate` integer column (if not already present)

## Capabilities

### New Capabilities
- `consolidation-chain`: LangChain chain that merges all engagement inputs (guided answers, brain-dump text, transcript text, client intake form) into a validated structured brief and writes it to `engagements.structured_brief`, then advances status to `gate1_review`.

### Modified Capabilities
<!-- No existing spec-level requirements are changing -->

## Impact

- **`src/lib/chains/`** — new file, no existing files modified
- **`src/lib/prompts/`** — new file
- **`api/pipeline/`** — new serverless route; frontend calls this endpoint after capture is complete
- **Supabase schema** — `engagements` must have `structured_brief JSONB`, `last_successful_gate INTEGER`, and `error_log JSONB` columns
- **Gate 1** — this chain must complete successfully before Gate 1 UI shows a brief to review
- **Dependencies**: `@langchain/anthropic`, `@langchain/core` (already required by BSE; verify installed)
