# BSE Component and Code Standards

---

## Gate Numbering Reference [v5.4 CHANGE] [v5.6 CHANGE]

```
Gate 1  — Brief Review
Gate 2  — Solutions Review
Gate 3  — Client Decision, Proposal and Confirmation Loop
Gate 4  — Client Decision and Context
Gate 5  — Project Plan — three phases: (1) Build Instructions via buildInstructionsChain, (2) Epic Discovery via projectPlanChain chat, (3) Story and Task Generation per epic (v5.7 REDESIGN)
Gate 6  — Spec Approval
Gate 7  — Code Review
Gate 8  — Output Review
```

---

## Server-Side Gate Enforcement

Gate status is always verified in a Vercel API route before the pipeline proceeds. The frontend never controls gate progression — it only reflects state from Supabase.

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

On any chain failure:
1. `engagement.status` → `'failed'`
2. `engagement.last_successful_gate` is set to the last gate number with an approved `gate_approvals` record
3. Error details stored in `engagement.error_log` (JSONB)
4. BA notified via Teams with engagement link and error summary
5. BA retries from the dashboard — pipeline resumes from `last_successful_gate`

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
// CC 11–20: severity = 'error'            — build-blocking, refactor required
// CC 21+:   severity = 'untestable'       — pause for BA decision
```

ESLint complexity scoring runs at the pre-check stage. CC 1–10 passes; CC 11–20 is a build-blocking error requiring refactor; CC 21+ pauses for BA decision.

Never suppress complexity errors with eslint-disable comments.

---

## CC Pause Pattern [v5.1 NEW]

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

## Branch Naming Pattern

```javascript
feature/{client-name}/{engagement-id}
// e.g. feature/acme-bank/550e8400-e29b-41d4-a716
```

All commits go to this branch. Pipeline never merges. Merges are always manual human decisions.

---

## Feature Flag Pattern

```javascript
// FEATURE FLAG: VOICE_CAPTURE
const voiceCaptureEnabled = process.env.VOICE_CAPTURE_ENABLED === 'true'
if (voiceCaptureEnabled) {
  // render voice capture UI
}
```

Infrastructure built, UI hidden until flag is true. All feature-flagged code labelled.

---

## Non-Pipeline AI Call Pattern

```javascript
// NON-PIPELINE: direct AI call — brain-dump clarification only
const response = await anthropic.messages.create({ ... })
```

Any direct API call outside LangChain must be labelled. Used only for single-step utility functions.

---

## Document Generation Pattern

```
Claude JSON output
  → A4 HTML template render (comotion-a4-html-template.html)
  → Puppeteer (@sparticuz/chromium) → PDF
  → Graph API upload → SharePoint
```

HTML is the canonical layout source. No raw Word XML. No Markdown-to-PDF.

**Critical:** Always use `puppeteer-core` + `@sparticuz/chromium`. Never use standard `puppeteer` — it exceeds Vercel's serverless function size limit.

---

## OpenSpec Spec Pattern

```
Spec lives in client repo: openspec/changes/{engagement-id}/specs/{capability}/spec.md
CONTEXT.md lives in client repo root
Supabase holds: repo_path + commit_sha (pointers only)
Gate 4 approval = commit is authoritative
openspec archive runs after Gate 5 approval
Never store spec content in Supabase. The repo is the source of truth from Gate 4 onwards.
```

---

## LangChain Chain Pattern

All chains in `src/lib/chains/`. Each exports one async function. Accepts typed input, returns typed output. No chain calls another chain directly — the calling API route composes chains in sequence.

```javascript
// Example pattern
export async function consolidationChain({ inputs, industry }) {
  // LangChain implementation using @langchain/anthropic
  return { brief: structuredBrief }
}
```

---

## Supabase Async Pattern

Always wrap Supabase calls:

```javascript
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
try {
  setLoading(true)
  const { data, error } = await supabase.from(...).insert(...)
  if (error) throw error
} catch (err) {
  setError(err.message)
} finally {
  setLoading(false)
}
```

---

## Styling — Comotion Brand Palette

Tailwind CSS only. Brand palette defined in `tailwind.config.js`:

| Token | Hex | Usage |
|---|---|---|
| `navy` | `#1A3B66` | Primary — headings, headers, borders |
| `cgreen` | `#8CC240` | Success/accent |
| `cblue` | `#4DBFED` | Info |
| `cred` | `#D61C5E` | Error/danger |
| `grey-light/mid/dark` | — | Backgrounds, borders, body text |

---

## Fallow Hook Pattern

```bash
fallow hooks install --target agent
```

Run once per client repo during setup. Installs a PreToolUse hook that intercepts every Claude git commit attempt. Runs `fallow audit --changed-since main --format json`. Blocks commits where verdict is `fail` (new issues only — `gate=new-only` mode). Feeds structured findings back to Claude for self-correction before retry. Do not add `fallow audit` to the pre-check stage if the hook is installed — it would be redundant.

---

## State Machine — Full Status Values [v5.6 CHANGE]

```
captured → brief_pending → gate1_review → solutions_pending → gate2_review
→ proposal_pending → gate3_review → gate4_review
→ plan_pending → gate5_review
→ spec_pending → gate6_review
→ code_pending → code_review → gate7_review
→ output_pending → gate8_review → complete

Any state → failed (on chain error)
failed → [last_successful_gate state] (on BA retry)
```

---

## Gate Summary [v5.1 CHANGE]

| Gate | Trigger | BA Action | Notification |
|---|---|---|---|
| Gate 1 — Brief Review | Claude produces structured brief | Review, edit inline, approve or reject | Teams: client intake only |
| Gate 2 — Solutions Review | Claude generates solutions | Edit, reorder, remove, add notes, approve | None |
| Gate 3 — Business Proposal | `proposalGenerationChain` produces PDF | Preview PDF; approve and send to client email; or reject | Power Automate: email to client on send |
| Gate 4 — Spec Approval | OpenSpec files committed to client repo | Review OpenSpec markdown; flag sections for regeneration; approve | None |
| Gate 7 — Code Review | Review loop completes | Review ESLint CC scores and code diff; approve or reject. `/diagnose` available manually. | Teams: CC 21+ pause events only |
| Gate 6 — Output Review | A4 HTML PDFs generated | Preview client documents; approve or reject | Teams + email always |
