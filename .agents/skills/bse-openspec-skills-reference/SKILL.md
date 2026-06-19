# BSE OpenSpec + Matt Pocock Skills Reference

---

## OpenSpec BSE-Custom Schema

The BSE uses a custom OpenSpec schema that maps BSE engagement structure to OpenSpec artifact format. Define this before Phase 3 begins.

Spec files live in the client repo at:
```
openspec/changes/{engagement-id}/specs/{capability}/spec.md
```

After Gate 7 approval, `openspec archive` runs and moves specs to:
```
openspec/specs/{capability}/spec.md   ← permanent record
```

Supabase `specifications` table stores pointers only:
- `repo_path` — path to `openspec/changes/{engagement-id}/` in client repo
- `commit_sha` — SHA of the approved spec commit

**Never store spec content in Supabase.** The repo is the source of truth from Gate 6 onwards.

---

## OpenSpec WHEN/THEN/AND Format

Each `spec.md` must follow this format exactly:

```markdown
## ADDED Requirements
### Requirement: {Clear requirement statement}
The system SHALL {behaviour}.
#### Scenario: {Descriptive scenario name}
- **WHEN** {condition}
- **THEN** {expected outcome}
- **AND** {additional outcome}
```

Rules:
- Every requirement must have at least one scenario
- Every scenario must use `#### Scenario:` headers (four hashtags)
- Use the vocabulary from `CONTEXT.md` for all domain terms
- Tech stack context: Next.js, Supabase, Vercel, LangChain

---

## OpenSpec CLI Commands Used by BSE

### `openspec init`

Scaffolds OpenSpec in the client repo with the BSE-specific schema. Run once per client repo during Phase C setup (after Gate 6 approval).

### `openspec validate --all --json`

Checks structural alignment between code and spec. Catches missing endpoints, unimplemented user stories, schema mismatches. Runs in the pre-check stage before every Gemini review cycle. Output is JSON — parsed by `reviewLoopChain` to determine if pre-check passes.

### `openspec archive {engagement-id}`

Merges spec files from `openspec/changes/` into `openspec/specs/` as the permanent capability record in the client repo. Runs automatically after Gate 7 approval and before `outputGenerationChain`. Must be called by BSE explicitly — it does not run automatically.

### `openspec schema init`

Initialises the BSE custom schema definition in the client repo. Run as part of the `openspec init` step.

---

## Matt Pocock Skills — Setup Order and Usage

### Setup order (must run in this order after Gate 6 approval)

1. `openspec init` — scaffolds OpenSpec in the client repo with BSE-specific schema
2. `/setup-matt-pocock-skills` — configures issue tracker, triage label vocabulary, and domain doc layout. **Must run before `/to-issues`**. Without it, `/to-issues` creates issues without proper metadata silently.
3. `/git-guardrails` — installs Claude Code hooks blocking dangerous git operations (push, reset --hard, clean) during generation
4. `/to-issues` — converts approved epics into GitHub issues as vertical slices with acceptance criteria and dependency ordering
5. `fallow hooks install --target agent` — installs the Fallow PreToolUse gate into `.claude/settings.json`

### `/setup-matt-pocock-skills`

**Automated.** Must run before `/to-issues`. Configures issue tracker, triage label vocabulary, and domain doc layout. If this is skipped, `/to-issues` creates issues without proper metadata — silently, with no error.

### `/git-guardrails`

**Automated.** Installs Claude Code hooks blocking dangerous git operations (push, reset --hard, clean) during generation. Prevents accidental destructive operations by the code generation pipeline.

### `/to-issues`

**Automated.** Converts approved epics into GitHub issues. Creates vertical slices with acceptance criteria and dependency ordering. Requires `/setup-matt-pocock-skills` to have run first.

### `/tdd`

**Automated — active during code generation and fix cycles.** Enforces red-green-refactor per user story. For each requirement, Claude writes a failing test first, then the minimum code to pass it, then refactors. Test coverage is baked into generation rather than added after.

### `/caveman`

**Automated — active during code generation and fix cycles.** Reduces token usage approximately 75% by stripping filler while preserving all technical accuracy. Active throughout generation and fix loops.

### `/zoom-out`

**Automated — called at the start of each fix cycle.** Re-reads the codebase to restore full context before applying fixes. Called before `codeFixChain` runs in the fix loop.

### `/diagnose`

**Manual — BA-invoked post-Gate 7 only. Not used in the automated loop.** Available to the BA as a manual tool after Gate 7 for deep investigation of specific issues before deciding to approve or reject. If used in the automated loop, it is a bug.

---

## Fallow Hook Pattern

### Installation

```bash
# Run once per client repo during Phase C setup
fallow hooks install --target agent

# To remove
fallow hooks uninstall --target agent

# Preview what would be installed
fallow hooks install --target agent --dry-run
```

### What the Fallow Hook Does

`fallow hooks install --target agent` writes a PreToolUse handler into `.claude/settings.json`. It intercepts every git commit or git push Claude attempts. Before the commit executes, Fallow runs `fallow audit --changed-since main --format json --quiet --explain`. If the verdict is `fail`, the commit is blocked and structured findings (issue type, file, line, suggested fix) are fed back to Claude so it can correct the code and retry.

**Gate mode:** `gate=new-only` — existing issues in the repo do not penalise generated code. Only new issues introduced by the current change are checked.

### What the Fallow Hook Catches

- Unused exports and files generated but not wired up
- Unused `package.json` dependencies introduced
- Circular dependencies between generated modules
- Architecture boundary violations
- Complexity hotspots above threshold
- Code duplication introduced across generated modules

### Important: Do Not Duplicate at the Pre-check Stage

If the Fallow hook is installed at Step 12, do not add `fallow audit` to the pre-check stage. The hook already catches Fallow-detectable issues at commit time. The pre-check stack is: lint + ESLint complexity + type-check + `openspec validate --all --json`. Pick one point and use it there.

### Requirements

The hook requires `jq` on PATH. It falls back to `npx --no-install fallow` if the fallow binary is not on PATH directly.

### Fallow Minimum Version

```bash
FALLOW_GATE_MIN_VERSION=2.46.0    # Minimum Fallow version for uncommitted-changes fix
```

Adjust via `FALLOW_GATE_MIN_VERSION` env var if needed.

### Post Gate 7 — `fallow health` (manual, BA-invoked)

After Gate 7 approval, the BA or client dev team can run `fallow health --format json` in the client repo to get an objective complexity and maintainability picture before merging. This surfaces file health scores, git churn hotspots, and ranked refactoring targets. It is not a pipeline gate — it is a decision support tool.

### What Fallow Does Not Replace

Fallow operates before Gemini in the loop and catches different issues. It does not replace the Gemini 5-dimension scorecard and does not replace the ESLint complexity pre-check. All three tools are complementary:
- Fallow: catches structural/dead-code issues at commit time
- ESLint: catches per-function complexity before Gemini
- Gemini: provides holistic quality scoring across five dimensions

---

## Client Repo Setup — Full Sequence

Run once per client repo after Gate 6 approval, before code generation begins:

```bash
# 1. Scaffold OpenSpec with BSE-specific schema
openspec init

# 2. Configure Matt Pocock skills (must run before /to-issues)
/setup-matt-pocock-skills

# 3. Install git guardrails
/git-guardrails

# 4. Convert approved epics to GitHub issues
/to-issues

# 5. Install Fallow commit-level hook
fallow hooks install --target agent
```

---

## Skills Active During Code Generation

| Skill | When active | Automated? |
|---|---|---|
| `/tdd` | Throughout code generation | Automated |
| `/caveman` | Throughout code generation and fix cycles | Automated |
| `/zoom-out` | Start of each fix cycle (before codeFixChain) | Automated |
| `/diagnose` | Post Gate 7 only, on BA request | Manual |
| Fallow hook | Every git commit attempt | Automated |
