## Context

After Gate 5 (Project Plan) approval, the BSE currently has no automated way to provision the client GitHub repository. BAs provision repos manually. This design introduces a `repo_setup` status, a two-step UI screen, and three API routes to fully automate the repo provisioning step — including `.gitignore` enforcement, Skills Registry content injection, `contextGenerationChain`, and `openspecGenerationChain` per epic — before Gate 6 (Spec Approval) begins.

The existing `spec_pending` status is removed and replaced by `repo_setup`. Gate 6 becomes a pure review step: it reads specs already committed to the feature branch rather than triggering generation.

## Goals / Non-Goals

**Goals:**
- BA can connect a pre-existing GitHub repo via a simple `org/repo-name` input
- BSE enforces `.agents/` in `.gitignore` on the default branch — hard block with auto-fix button
- Skills Registry gives BAs a central place to manage skill file content; all five skills must have content before setup can proceed
- `contextGenerationChain` runs once; `openspecGenerationChain` runs per epic from `engagements.project_plan`
- All generated files committed to the feature branch in a single GitHub API commit
- Status advances to `gate6_review` only after the commit succeeds

**Non-Goals:**
- Does not install Fallow hooks (Phase 7 setup)
- Does not create GitHub Issues (`/to-issues` runs after Gate 6 approval)
- Does not create the client repo — repo must exist before this screen
- Does not push skill updates to existing feature branches
- Does not merge to any main branch

## Decisions

### 1. Single commit for all files

**Decision:** All generated files (CLAUDE.md, CONTEXT.md, ADRs, OpenSpec files, skill files) are committed in one GitHub API call using the Git Data API (create tree + create commit + update ref).

**Rationale:** Atomic — either everything is on the feature branch or nothing is. Avoids partial states where some files exist but chain output failed midway. The GitHub Contents API (`PUT /contents/{path}`) requires one HTTP call per file and cannot be made atomic.

**Alternative considered:** Sequential PUT calls per file — rejected because a mid-sequence failure leaves the branch in a broken partial state with no clean rollback.

### 2. `.gitignore` hard block with BSE auto-fix

**Decision:** If `.agents/` is absent from `.gitignore`, `repo-validate.js` returns a `gitignoreMissing: true` flag. The UI shows a hard block with a "Fix .gitignore" button. Clicking it calls `repo-validate.js` again with `action: 'fix-gitignore'`, which commits `.agents/` to the default branch. Only after confirmation can Step 2 proceed.

**Rationale:** Writing to the default branch (not the feature branch) ensures all future feature branches inherit the rule permanently. Making it a hard block (not a warning) enforces Comotion's non-negotiable requirement that skill files never appear in a PR.

**Alternative considered:** Soft warning only — rejected because it relied on BA discipline and would inevitably result in skill content appearing in PRs.

### 3. openspecGenerationChain per epic in a loop

**Decision:** `repo-setup.js` reads `engagements.project_plan`, extracts the epics array, and runs `openspecGenerationChain` once per epic in a sequential loop. All outputs are collected before the single commit is made.

**Rationale:** v5.7 specifies one capability folder per epic. Each spec is isolated so a failure on one epic is reported clearly. Sequential (not parallel) to avoid race conditions on shared state and keep chain output deterministic.

**Alternative considered:** Single chain call with all epics — rejected because it produces an oversized prompt and makes epic-level error diagnosis impossible.

### 4. Skills Registry in Supabase with null-content guard

**Decision:** `skills` table stores content as nullable text. `repo-setup.js` reads all five skill rows before proceeding. If any row has `content = null`, the route returns a 400 with the list of missing skills. The UI blocks the "Create Structure" button and names the missing skills.

**Rationale:** Silent `.gitkeep` fallbacks would allow code generation to proceed with missing context, producing lower-quality or incorrect output with no visible signal to the BA. Explicit block at the setup step is safer and more debuggable.

**Alternative considered:** Create `.gitkeep` for missing skills and proceed — rejected per user decision.

### 5. `github_repo` written at validate time, not setup time

**Decision:** `repo-validate.js` writes `engagements.github_repo` on successful validation (Step 1). `repo-setup.js` reads it from the engagement record rather than re-accepting it as an input.

**Rationale:** Separates concerns cleanly. If the BA refreshes between steps, the validated repo is already saved. Prevents `repo-setup.js` from being called with a mismatched repo string.

### 6. CLAUDE.md template generated from hardcoded template, not a chain

**Decision:** The client-repo `CLAUDE.md` is generated by filling a string template in `repo-setup.js` — not a LangChain chain call.

**Rationale:** The content is fixed and structural (tech stack, rules, spec paths). It does not require AI reasoning. A LangChain call would add latency and cost for no quality benefit. This is labelled `// NON-PIPELINE: template fill` in code.

### 7. `repo_setup` replaces `spec_pending`

**Decision:** `spec_pending` is removed from the status check constraint. `repo_setup` takes its place.

**Rationale:** `spec_pending` was a transient state between Gate 5 approval and spec generation. Since spec generation now happens as part of the BA-triggered repo setup action, a separate pending state is not needed. `repo_setup` is the active state where the BA takes action.

**Migration:** `spec_pending` must be dropped from the check constraint and `repo_setup` added in the same migration. Any engagement currently in `spec_pending` status must be manually reviewed — there should be none in production since the feature was not yet built.

## Risks / Trade-offs

- **GitHub API rate limits** → Mitigation: The single-commit approach (tree + commit) uses at most 4 API calls regardless of file count. Rate limiting is unlikely in practice.
- **Large project plans with many epics** → Running `openspecGenerationChain` N times sequentially could time out on Vercel (10s default for serverless). → Mitigation: Use Vercel's `maxDuration = 300` on `repo-setup.js`. Document this in the route file.
- **`GITHUB_TOKEN` not set in local dev** → Mitigation: Route skips all GitHub steps and still advances status, matching the existing pattern in `gate2-approve.js` and `gate3-approve.js`. Log a warning.
- **Skill content update mid-engagement** → A BA updates a skill in the registry after repo setup. The committed skill file on the feature branch is now stale. → By design — skill updates never retroactively modify existing branches. Document this clearly in the Skills page UI.
- **Chain failure after branch creation but before commit** → The feature branch exists with no files. → Mitigation: Error recovery pattern sets `status = 'failed'`. On BA retry, `repo-setup.js` checks if the branch already exists and either deletes and recreates it or force-updates the ref. Simplest approach: delete the branch and start fresh on retry.

## Migration Plan

**Deployment order (strict):**
1. Run Supabase migration:
   - Add `repo_setup` to `engagements.status` check constraint
   - Remove `spec_pending` from constraint
   - Create `skills` table with five seed rows (`content = null`)
   - Add `github_repo text` column to `engagements`
2. Deploy code:
   - `gate5-approve.js` sets status to `repo_setup`
   - New routes and pages live

**Rollback:** Revert code deployment. Re-add `spec_pending` to constraint (additive — no data loss). `repo_setup` can remain in the constraint harmlessly.

## Open Questions

- Should the feature branch deletion-on-retry be automatic or require BA confirmation? (Current assumption: automatic — branch has no meaningful content yet.)
- Should the Skills Registry require all five skills to have content, or allow the BA to mark individual skills as "not required for this engagement"? (Current assumption: all five required.)