# BSE LangChain Chain Patterns

Reference before implementing any chain.

**Pinned version:** `langchain@0.3.x` (latest stable 0.3). Required packages:

```
langchain@^0.3.0
@langchain/anthropic@^0.3.0
@langchain/google-genai@^0.3.0
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

## Model Assignment Table [v5.1 CHANGE]

| Chain | File | Model | Reason |
|---|---|---|---|
| consolidationChain | chains/consolidation.js | Claude (claude-sonnet-4-20250514) | Structured brief generation |
| quickIdeasChain | chains/quickIdeas.js | Claude (claude-sonnet-4-20250514) | Solution generation |
| deepAnalysisChain | chains/deepAnalysis.js | Claude (claude-sonnet-4-20250514) | Deep solution generation |
| proposalGenerationChain | chains/proposalGeneration.js | Claude (claude-sonnet-4-20250514) | Business proposal document generation |
| contextGenerationChain | chains/contextGeneration.js | Claude (claude-sonnet-4-20250514) | Domain vocabulary extraction |
| openspecGenerationChain | chains/openspecGeneration.js | Claude (claude-sonnet-4-20250514) | OpenSpec file generation |
| codeGenerationChain | chains/codeGeneration.js | Claude (claude-sonnet-4-20250514) | Code generation |
| codeFixChain | chains/codeFix.js | Claude (claude-sonnet-4-20250514) | Fix application |
| codeReviewChain | chains/codeReview.js | Gemini (gemini-2.0-flash) | Independent review — must never be same model as generator |
| reviewLoopChain | chains/reviewLoop.js | Both | Orchestrates Claude fix → Gemini review cycles |
| outputGenerationChain | chains/outputGeneration.js | Claude (claude-sonnet-4-20250514) | Final document content generation |

**Critical rule:** `codeGenerationChain` and `codeFixChain` always use Claude. `codeReviewChain` always uses Gemini. This separation is structural and non-negotiable. If model assignments change in future, this separation must be explicitly preserved.

---

## Review Loop Logic [v5.1 CHANGE]

ESLint complexity scoring is now added to the pre-check stage. A CC score of 21+ pauses the loop for human decision rather than blocking outright. The Gate 5 review screen displays per-file CC scores alongside the Gemini scorecard.

```
reviewLoopChain:
  1. Receive committed code from codeGenerationChain
  2. Run pre-check:
       a. Lint (no API cost)
       b. ESLint complexity rule (no API cost):          [v5.1 CHANGE]
            CC 1–5:   Simple — green, pass
            CC 6–10:  Moderate — warn, pass
            CC 11–20: Complex — error, auto-fed to fix loop before Gemini
            CC 21+:   Untestable — PAUSE loop, notify BA via Teams
                      BA decides: approve continuation or reject for refactor
                      Pipeline resumes only on explicit BA confirmation
       c. Type-check (no API cost)
       d. openspec validate --all --json (spec alignment check)
       If pre-check fails (lint, type, spec): surface issues to BA, halt loop
       If CC 21+ and BA rejects: codeFixChain targets those files first
       If CC 21+ and BA approves: loop continues to Gemini with flag recorded
  3. Call codeReviewChain (Gemini) → scorecard
  4. Store scorecard in Supabase: code_reviews
  5. Check: all 5 dimension scores ≥ threshold?
     YES → trigger Gate 5 (human approval)
     NO  → enter fix loop:
       a. /zoom-out: re-read codebase for context
       b. Pass scorecard issues to codeFixChain (Claude)
          Fix only flagged issues. Write regression test per fix.
          Do not refactor beyond flagged issues.
       c. /caveman active throughout fix loop
       d. Commit fixed version to same branch
       e. Return to step 2
  6. Max iterations: REVIEW_MAX_CYCLES (default: 5, env var)
     If max reached without threshold:
       → trigger Gate 5 with review_escalated = true
       → flag prominently in Gate 5 UI
  7. On loop completion (threshold met OR max cycles):
       → generate review_loop_report
       → store in Supabase: review_loop_reports table
       → deliver via Power Automate → Teams + Outlook email
```

---

## Review Cycle State Machine [v5.1 CHANGE]

```
code_pending
  → pre_check (lint + ESLint complexity + type-check + openspec validate)
    → if lint/type/spec fails → surface to BA, halt
    → if CC 11–20 → codeFixChain targets those files → re-run pre_check
    → if CC 21+ → pause, notify BA via Power Automate
      → if BA rejects → codeFixChain targets CC files → re-run pre_check
      → if BA approves → continue with cc_pause flag recorded
    → if pre_check passes → code_review (Gemini scores)
      → if threshold_met → gate5_review (human)
        → if approved → openspec_archive → output_pending
        → if rejected → code_pending (restart generation)
      → if not threshold_met AND cycles < max → code_pending (zoom-out + Claude fixes) → pre_check
      → if max_cycles reached → gate5_review (human, review_escalated = true)
```

---

## CC Pause/Resume Pattern [v5.1 NEW]

```javascript
// When ESLint pre-check detects CC 21+ in any file:
await supabase.from('engagements').update({
  status: 'code_review'   // halted state
}).eq('id', engagementId)

await triggerCcPauseNotification(engagementId, ccReport)
// Power Automate → Teams card with file list, CC scores, approve/reject links

// Pipeline resumes only when gate_approvals record inserted:
// gate_number = 5, action = 'cc_pause_approved' OR 'cc_pause_rejected'
// Server-side polling or Supabase realtime subscription monitors for this record
```

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
// .eslintrc config for client repos and BSE itself
{
  "rules": {
    "complexity": ["error", { "max": 10 }]
  }
}

// Pre-check reads ESLint JSON output and classifies per file:
// CC 1–10:  severity = 'green' or 'warn' — pass
// CC 11–20: severity = 'error'            — auto-fix via codeFixChain
// CC 21+:   severity = 'untestable'       — pause for BA decision
```

---

## Threshold Precedence

```
specifications.review_thresholds (per-engagement)
  > REVIEW_THRESHOLD_DEFAULT (env var global default)
```

Always check `specifications.review_thresholds` first. Fall back to env var only if not set.

---

## Review Dimensions and Thresholds

Gemini evaluates code on five dimensions. Each scored 1–10. Default threshold: 7/10 on all dimensions (configurable via `REVIEW_THRESHOLD_DEFAULT` env var, and per-engagement via `specifications.review_thresholds`).

| Dimension | What Gemini evaluates |
|---|---|
| Complexity / Maintainability | Cyclomatic complexity, naming clarity, modularity, readability |
| Test Coverage | Unit tests present, edge cases covered, test quality |
| Security Vulnerabilities | Injection risks, exposed secrets, auth bypass paths, OWASP top 10 |
| Alignment with Requirements | Code implements what the spec requires, no scope creep, no gaps |
| Performance / Efficiency | Unnecessary re-renders, N+1 queries, unoptimised loops, memory leaks |

ESLint complexity scoring runs independently in pre-check and is displayed separately on the Gate 5 screen — it is not one of Gemini's five dimensions. The two signals are complementary: ESLint gives a per-file objective CC score; Gemini gives a holistic subjective complexity assessment across the full codebase.

---

## Review Loop Report Contents

Generated after every review loop completion. Delivered via Power Automate to both Teams and Outlook email. Also saved as an internal PDF to SharePoint alongside client documents.

- Total cycle count
- Per-cycle scores for all 5 dimensions
- Per-cycle ESLint CC scores per file (with colour-coded severity) [v5.1]
- Issues identified per cycle
- Fixes applied per cycle
- Final threshold result (met / not met / escalated)
- CC 21+ pause events and BA decisions if any [v5.1]
- Total time taken (loop start to Gate 5 trigger)
- Models used (generator and reviewer)
- `review_escalated` flag if applicable

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
