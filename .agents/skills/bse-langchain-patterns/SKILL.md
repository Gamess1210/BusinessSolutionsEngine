# BSE LangChain Chain Patterns

Reference before implementing any chain.

**Pinned version:** `langchain@0.3.x` (latest stable 0.3). Required packages:

```
langchain@^0.3.0
@langchain/anthropic@^0.3.0
```

Pin these versions explicitly in `package.json`. Do not use `latest` — LangChain has breaking changes between minor versions.

---

## Chain Composition Pattern

All chains in `src/lib/chains/`. Each exports one async function. Accepts typed input, returns typed output. No chain calls another chain directly — the calling API route composes chains in sequence.

```javascript
// Example pattern
export async function consolidationChain({ inputs, industry }) {
  // LangChain implementation using @langchain/anthropic
  return { brief: structuredBrief }
}
```

LangChain is used for all multi-step AI sequences. Direct AI API calls are not permitted for any pipeline step. Simple single-call utility functions (e.g. a one-off clarifying question) may call Claude directly but must be clearly labelled with a comment: `// NON-PIPELINE: direct AI call`.

---

## Model Assignment Table [v5.1 CHANGE] [v5.6 CHANGE] [v5.7 CHANGE]

**Gate 4 — no AI chain [v5.4]:** Gate 4 (Client Decision and Context) is pure human input capture. No AI chain runs at this gate. After Gate 4 approval, Gate 5 begins with `buildInstructionsChain` running automatically.

| Chain | File | Model | Reason |
|---|---|---|---|
| consolidationChain | chains/consolidation.js | Claude (claude-sonnet-4-20250514) | Structured brief generation |
| quickIdeasChain | chains/quickIdeas.js | Claude (claude-sonnet-4-20250514) | Solution generation |
| deepAnalysisChain | chains/deepAnalysis.js | Claude (claude-sonnet-4-20250514) | Deep solution generation |
| proposalGenerationChain | chains/proposalGeneration.js | Claude (claude-sonnet-4-20250514) | Business proposal document generation |
| buildInstructionsChain | chains/buildInstructions.js | Claude (claude-sonnet-4-20250514) | Generates CLIENT_BUILD_INSTRUCTIONS.md from engagement data — Gate 5 Phase 1 [v5.7 NEW] |
| projectPlanChain | chains/projectPlan.js | Claude (claude-sonnet-4-20250514) | Three-phase: Phase 1 build instructions (buildInstructionsChain), Phase 2 epic discovery chat, Phase 3 per-epic story and task generation [v5.7 REDESIGN] |
| contextGenerationChain | chains/contextGeneration.js | Claude (claude-sonnet-4-20250514) | Domain vocabulary extraction — runs after Gate 5 approval |
| openspecGenerationChain | chains/openspecGeneration.js | Claude (claude-sonnet-4-20250514) | OpenSpec file generation — runs after Gate 5 approval, epic by epic |
| outputGenerationChain | chains/outputGeneration.js | Claude (claude-sonnet-4-20250514) | Final document content generation |

---

## Error Recovery Pattern

```javascript
try {
  // chain execution
} catch (error) {
  await supabase.from('engagements').update({
    status: 'failed',
    last_successful_gate: lastApprovedGate,
    error_log: { message: error.message, chain: chainName, timestamp: new Date() }
  }).eq('id', engagementId)
  await triggerFailureNotification(engagementId, error)
  throw error
}
```

---

## OpenSpec Archive Step

Before output generation, `openspec archive` runs: BSE calls `openspec archive {engagement-id}`. Spec files from `openspec/changes/` are merged into `openspec/specs/` as the permanent capability record in the client repo. This runs automatically after Gate 5 approval and before `outputGenerationChain`.

```
Gate 5 approval
  → openspec archive {engagement-id}
    Spec files: openspec/changes/ → openspec/specs/ (permanent record)
  → outputGenerationChain
```

---

## ESLint Complexity Pattern [v5.1 NEW]

```javascript
// .eslintrc config for BSE itself
{
  "rules": {
    "complexity": ["error", { "max": 10 }]
  }
}

// CC 1–10:  severity = 'green' or 'warn' — pass
// CC 11–20: severity = 'error'            — build-blocking, refactor required
// CC 21+:   severity = 'untestable'       — pause for BA decision
```

---

## proposalGenerationChain Pattern [v5.1 NEW]

`proposalGenerationChain` sits between `deepAnalysisChain` and `contextGenerationChain`.

What it does:
- Claude receives the approved structured brief and solutions
- Generates A4 HTML content following the `comotion-a4-html-template.html` standard
- Puppeteer (`@sparticuz/chromium`) converts HTML → PDF
- PDF uploaded to SharePoint: `Business Solutions/[ClientName]/[YYYY]/[ClientName]_[YYYY-MM-DD]_BusinessProposal.pdf`
- `engagements.sharepoint_proposal_url` is populated
- `engagements.status` → `gate3_review`

Gate 3 is not complete until both approval AND send have occurred. The BA must approve the PDF and click Send. A Power Automate flow fires to deliver the PDF to `engagements.client_email` via Outlook email with a Comotion-branded email wrapper.
