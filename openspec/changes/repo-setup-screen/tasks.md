## 1. Database Migration [SCHEMA MIGRATION REQUIRED — run before code deployment]

- [ ] 1.1 Add `repo_setup` to `engagements.status` check constraint in Supabase (keep `spec_pending`)
- [ ] 1.2 Add `github_repo text` column to `engagements` table
- [ ] 1.3 Add `eslint_config_exists boolean DEFAULT false` column to `engagements` table
- [ ] 1.4 Create `skills` table with columns: `id`, `name`, `folder_path`, `content`, `updated_by`, `updated_at`, `created_at`
- [ ] 1.5 Add RLS policy on `skills`: authenticated users can SELECT; INSERT/UPDATE via service role only
- [ ] 1.6 Seed `skills` table with five rows (`content = null`): `bse-prompt-library`, `bse-schema-reference`, `bse-langchain-patterns`, `bse-component-standards`, `bse-openspec-skills-reference` with their `folder_path` values

## 2. gate5-approve.js Update

- [ ] 2.1 Update `api/pipeline/gate5-approve-epic.js` to set `engagements.status = 'repo_setup'` when all epics are approved (currently sets `spec_pending`)

## 3. api/pipeline/repo-validate.js [New API Route]

- [ ] 3.1 Create `api/pipeline/repo-validate.js` — POST handler with auth check and `repo_setup` status gate enforcement
- [ ] 3.2 Call `GET /repos/{owner}/{repo}` via GitHub API to confirm repo exists and token has write access
- [ ] 3.3 Compute and return `proposedBranch` using pattern `feature/{client-name-slug}/{engagement-id}`
- [ ] 3.4 Read `.gitignore` via `GET /repos/{owner}/{repo}/contents/.gitignore` and check for `.agents/` or `.agents`
- [ ] 3.5 Return `{ repoName, defaultBranch, proposedBranch, gitignoreOk, gitignoreMissing }` on success
- [ ] 3.6 Handle `action: 'fix-gitignore'` — append `.agents/` to `.gitignore` on the default branch via GitHub Contents API PUT, return `{ fixed: true, commitSha }`
- [ ] 3.7 Write `engagements.github_repo` and `engagements.eslint_config_exists` to Supabase on successful normal validation (not fix-gitignore)
- [ ] 3.8 Check repo root for recognised ESLint config filenames (`eslint.config.js`, `eslint.config.cjs`, `.eslintrc.json`, `.eslintrc.js`, `.eslintrc.cjs`, `.eslintrc`) via GitHub Contents API and include `eslintConfigExists: true/false` in the validation response
- [ ] 3.9 Return appropriate HTTP error codes (401, 409, 422) for auth, status, and repo failures

## 4. api/pipeline/repo-setup.js [New API Route — scaffold commit only, no chains]

- [ ] 4.1 Create `api/pipeline/repo-setup.js` — POST handler with auth check
- [ ] 4.2 Add precondition checks: status = `repo_setup`, `github_repo` is set, all five skill rows have non-null content — return 422 with `missingSkills` array if any are null
- [ ] 4.3 Read engagement data: `project_plan`, `chosen_solution`, `client_name`, `industry`, `github_repo`, `eslint_config_exists`
- [ ] 4.4 Read all five skill rows from `skills` table
- [ ] 4.5 Generate `CLAUDE.md` by filling the standard client-repo template string with engagement data — label `// NON-PIPELINE: template fill`
- [ ] 4.6 Build scaffold file map: `CLAUDE.md`, each skill as `.agents/skills/{name}/SKILL.md`, `openspec/config.yaml`, `openspec/changes/{engagementId}/.openspec.yaml`, `openspec/changes/{engagementId}/proposal.md`, `openspec/changes/{engagementId}/tasks.md`
- [ ] 4.6a If `eslint_config_exists` is false, add `eslint.config.js` to the file map using the BSE standard flat config template — label `// NON-PIPELINE: template fill`
- [ ] 4.6b Add `openspec/config.yaml` to the file map — template fill with project schema (`spec-driven`), client context (client name, chosen solution summary, domain vocabulary pointer, tech stack), and BSE OpenSpec rules — label `// NON-PIPELINE: template fill`
- [ ] 4.6c Add `openspec/changes/{engagementId}/.openspec.yaml` to the file map — template fill with `schema: spec-driven` and `created: {today ISO date}` — label `// NON-PIPELINE: template fill`
- [ ] 4.6d Add `openspec/changes/{engagementId}/proposal.md` to the file map — template fill from `structured_brief`, `chosen_solution`, and `project_plan.epics` list — label `// NON-PIPELINE: template fill`
- [ ] 4.6e Add `openspec/changes/{engagementId}/tasks.md` to the file map — template fill: each epic as `## N. {epic name}`, each story as `- [ ] N.M {story name}` — label `// NON-PIPELINE: template fill`
- [ ] 4.7 Check if feature branch already exists; if so, delete it before creating fresh
- [ ] 4.8 Create feature branch off `baseBranch` via GitHub Git Data API (`POST /git/refs`)
- [ ] 4.9 Create all scaffold file blobs via GitHub API (`POST /git/blobs`) and build tree
- [ ] 4.10 Create single commit on feature branch with all scaffold blobs (`POST /git/commits`, then `PATCH /git/refs`)
- [ ] 4.11 On `GITHUB_TOKEN` not set: log warning, skip GitHub steps, still advance status to `spec_pending`, return `{ skipped: true }`
- [ ] 4.12 Set `engagements.status = 'spec_pending'`
- [ ] 4.13 Apply error recovery pattern in catch: set `status = 'failed'`, write `error_log`, trigger failure notification

## 5. api/settings/skills-update.js [New API Route]

- [ ] 5.1 Create `api/settings/skills-update.js` — POST handler with auth check
- [ ] 5.2 Validate `skillName` exists in `skills` table — return 400 if unknown
- [ ] 5.3 Upsert `content`, `updated_by` (from auth token), `updated_at` on matching `skills` row
- [ ] 5.4 Return the updated skill record on success

## 6. Skills Registry Settings Page [src/pages/settings/Skills.jsx]

- [ ] 6.1 Create `src/pages/settings/Skills.jsx` — fetch all five skills from `skills` table on mount
- [ ] 6.2 Render one card per skill showing: name, folder_path, last updated date, updated-by, first 5 lines of content as preview (or "No content uploaded yet" if null)
- [ ] 6.3 Highlight cards with null content to indicate they block repo setup
- [ ] 6.4 Add "Update" button per card — opens a hidden `<input type="file" accept=".md">`, reads file content client-side
- [ ] 6.5 On file selected: call `POST /api/settings/skills-update` with `{ skillName, content }`, update card on success
- [ ] 6.6 Add "View full content" toggle per card — expands to show full `content` text in a pre block
- [ ] 6.7 Show "This update applies to new engagements only. Existing feature branches are not affected." after each successful update
- [ ] 6.8 Add route `/settings/skills` in `App.jsx` pointing to `Skills.jsx` (protected route)

## 7. Repo Setup Screen [src/pages/review/RepoSetup.jsx]

- [ ] 7.1 Create `src/pages/review/RepoSetup.jsx` — fetch engagement on mount, redirect to `/engagements/:id` if status is not `repo_setup`
- [ ] 7.2 Implement Step 1 UI: `org/repo-name` text input with format validation (must contain exactly one `/`), "Connect Repository" button disabled until format is valid
- [ ] 7.3 On "Connect Repository" click: call `POST /api/pipeline/repo-validate`, show loading state
- [ ] 7.4 On validation success: render confirmation panel with repo name, default branch, proposed branch, editable base-branch dropdown
- [ ] 7.5 On validation failure: show inline error message, allow BA to correct and retry
- [ ] 7.6 If `gitignoreMissing: true`: show hard-block warning and "Fix .gitignore" button; disable "Proceed to Step 2" until fix is confirmed
- [ ] 7.7 "Fix .gitignore" button: call `POST /api/pipeline/repo-validate` with `action: 'fix-gitignore'`; on success replace warning with "✓ `.agents/` added to `.gitignore`" and enable "Proceed to Step 2"
- [ ] 7.8 "Proceed to Step 2" button: advance UI to Step 2 (local state only, no API call)
- [ ] 7.9 Implement Step 2 UI: read-only folder structure tree derived from engagement project plan epics and skills list (fetched from Supabase)
- [ ] 7.10 Skills with content show "← from Skills Registry"; skills with null content show a warning indicator
- [ ] 7.11 If any skills have null content: disable "Create Structure" button and show message naming the missing skills with a link to `/settings/skills`
- [ ] 7.12 "Create Structure" button: call `POST /api/pipeline/repo-setup` with `{ engagementId, baseBranch }`, show loading state "Creating repository scaffold…"
- [ ] 7.13 On success: show green confirmation panel with GitHub branch URL, note that OpenSpec generation will run next, and "Back to Dashboard →" button that navigates to `/engagements/:id`
- [ ] 7.14 On failure: show error message with reason; allow retry

## 8. Navigation and Status Wiring

- [ ] 8.1 Fix `STATUS_STEPS` in `EngagementDetail.jsx`: add `plan_pending` (label "Generating Plan") between `gate4_review` and `gate5_review`; rename `gate5_review` label to "Project Plan Review"; add `repo_setup` (label "Repository Setup") between `gate5_review` and `spec_pending`; confirm `spec_pending` label is "Generating Spec"
- [ ] 8.2 Add `/review/:id/repo-setup` route in `App.jsx` pointing to `RepoSetup.jsx`
- [ ] 8.3 Add `repo_setup` and `spec_pending` status labels to the Dashboard engagement status display ("Repository Setup" and "Generating Spec" respectively)
- [ ] 8.4 Add "Settings" nav link or section in `Layout.jsx` pointing to `/settings/skills`

## 9. Smoke Tests

- [ ] 9.1 Run migration in Supabase: confirm `repo_setup` in status constraint, `spec_pending` retained, `github_repo` and `eslint_config_exists` columns present, `skills` table with five seed rows
- [ ] 9.2 Approve a Gate 5 engagement and confirm status advances to `repo_setup` (not `spec_pending`)
- [ ] 9.3 Navigate to `/review/:id/repo-setup` for a `repo_setup` engagement — confirm screen renders
- [ ] 9.4 Navigate to `/review/:id/repo-setup` for a non-`repo_setup` engagement — confirm redirect to `/engagements/:id`
- [ ] 9.5 Enter invalid repo format in Step 1 — confirm button stays disabled
- [ ] 9.6 Navigate to `/settings/skills` — confirm five skill cards render, null-content cards are highlighted
- [ ] 9.7 Upload a SKILL.md file on the Skills page — confirm card updates with preview and updated-at timestamp
- [ ] 9.8 Return to Step 2 of RepoSetup with missing skills — confirm "Create Structure" is blocked and names the missing skills
- [ ] 9.9 With all skills populated, complete Step 2 — confirm feature branch exists in GitHub with all scaffold files committed (CLAUDE.md, skills, openspec config, proposal.md, tasks.md); confirm `engagements.status` advances to `spec_pending`
- [ ] 9.10 Confirm EngagementDetail stepper shows "Repository Setup" as the active step when status is `repo_setup`, and "Generating Spec" when status is `spec_pending`