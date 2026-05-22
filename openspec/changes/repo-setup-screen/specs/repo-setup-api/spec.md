## ADDED Requirements

### Requirement: repo-setup validates preconditions before running chains
`POST /api/pipeline/repo-setup` SHALL verify engagement status, github_repo presence, and skill content completeness before running any chain or GitHub operation.

#### Scenario: All preconditions met
- **WHEN** `POST /api/pipeline/repo-setup` is called with a valid `engagementId`
- **AND** `engagements.status = 'repo_setup'`
- **AND** `engagements.github_repo` is populated
- **AND** all five `skills` rows have non-null `content`
- **THEN** the route proceeds to chain execution

#### Scenario: Engagement not at repo_setup
- **WHEN** `engagements.status` is not `repo_setup`
- **THEN** the route returns HTTP 409 with `{ error: 'Engagement is not at repo_setup' }`

#### Scenario: github_repo not set
- **WHEN** `engagements.github_repo` is null or empty
- **THEN** the route returns HTTP 422 with `{ error: 'No GitHub repository connected. Complete Step 1 first.' }`

#### Scenario: One or more skills have no content
- **WHEN** any row in the `skills` table has `content = null`
- **THEN** the route returns HTTP 422 with `{ error: 'Missing skill content', missingSkills: ['<name>', ...] }`

#### Scenario: Unauthenticated request
- **WHEN** the request has no valid Bearer token
- **THEN** the route returns HTTP 401

---

### Requirement: repo-setup runs contextGenerationChain once
`POST /api/pipeline/repo-setup` SHALL invoke `contextGenerationChain` with the engagement's inputs and structured brief to produce `CONTEXT.md` content and ADR files.

#### Scenario: contextGenerationChain succeeds
- **WHEN** `contextGenerationChain` is called with `{ inputs, structuredBrief, industry }`
- **THEN** it returns `{ contextMd: '<string>', adrs: [{ filename, content }] }`
- **AND** the route proceeds to OpenSpec generation

#### Scenario: contextGenerationChain fails
- **WHEN** `contextGenerationChain` throws an error
- **THEN** the route sets `engagements.status = 'failed'` with `error_log` and `last_successful_gate`
- **AND** triggers the failure notification via Power Automate
- **AND** returns HTTP 500

---

### Requirement: repo-setup runs openspecGenerationChain per epic
`POST /api/pipeline/repo-setup` SHALL invoke `openspecGenerationChain` once for each epic in `engagements.project_plan.epics`, collecting spec file content for each.

#### Scenario: openspecGenerationChain runs per epic
- **WHEN** `engagements.project_plan` contains N epics
- **THEN** `openspecGenerationChain` is called N times sequentially, each with `{ epic, projectPlan, contextMd, industry }`
- **AND** each call returns `{ epicSlug, specMd }` which is collected for the commit

#### Scenario: openspecGenerationChain fails on one epic
- **WHEN** `openspecGenerationChain` throws on any epic
- **THEN** the route sets `engagements.status = 'failed'` with `error_log` and `last_successful_gate`
- **AND** triggers the failure notification
- **AND** returns HTTP 500

---

### Requirement: repo-setup creates the feature branch and commits all files atomically
`POST /api/pipeline/repo-setup` SHALL use the GitHub Git Data API to create the feature branch and commit all generated files in a single atomic commit.

#### Scenario: Successful branch creation and commit
- **WHEN** all chains complete successfully
- **THEN** the route:
  1. Creates a new branch `feature/{client-name}/{engagement-id}` off `baseBranch` via GitHub API
  2. Builds a tree of all file blobs: `CLAUDE.md`, `CONTEXT.md`, each ADR, each epic's `spec.md`, each skill's `SKILL.md`
  3. Creates a single commit on the new branch with all file blobs
- **AND** returns `{ branchUrl: '<GitHub branch URL>', commitSha: '<sha>' }`

#### Scenario: Branch already exists (retry scenario)
- **WHEN** the feature branch already exists (prior failed attempt)
- **THEN** the route deletes the existing branch and recreates it before committing

#### Scenario: GITHUB_TOKEN not set
- **WHEN** `process.env.GITHUB_TOKEN` is not set
- **THEN** the route logs a warning, skips all GitHub API calls, and still advances status
- **AND** returns `{ skipped: true, reason: 'GITHUB_TOKEN not configured' }`

---

### Requirement: repo-setup conditionally commits eslint.config.js
`POST /api/pipeline/repo-setup` SHALL include `eslint.config.js` in the commit file map only if the repo does not already have an ESLint config, as determined by `engagements.github_repo` validation data stored during `repo-validate`. The committed config enforces the BSE standard complexity rule.

#### Scenario: No ESLint config in repo
- **WHEN** `repo-validate` previously returned `eslintConfigExists: false` for this engagement
- **THEN** the commit includes `eslint.config.js` at the repo root containing the BSE flat config with `complexity: ['error', { max: 10 }]`
- **AND** the file is generated from a fixed template — label `// NON-PIPELINE: template fill`

#### Scenario: ESLint config already exists
- **WHEN** `repo-validate` previously returned `eslintConfigExists: true`
- **THEN** `eslint.config.js` is NOT included in the commit
- **AND** the existing client config is left untouched

---

### Requirement: repo-setup commits CLAUDE.md using the standard client-repo template
`POST /api/pipeline/repo-setup` SHALL generate the client-repo `CLAUDE.md` by filling a fixed string template — not via a LangChain chain call.

#### Scenario: CLAUDE.md generated
- **WHEN** the commit is built
- **THEN** `CLAUDE.md` contains the client name, project name, domain context pointer, tech stack, coding rules, spec paths, and skills paths — filled from engagement data
- **AND** no Anthropic API call is made for this file

---

### Requirement: repo-setup commits OpenSpec configuration files
`POST /api/pipeline/repo-setup` SHALL commit the files required to initialise OpenSpec in the client repo so that `openspec validate --all --json` can run during the Gate 7 code generation pre-check. All files are template fills — no chain call.

#### Scenario: openspec/config.yaml committed
- **WHEN** the commit is built
- **THEN** `openspec/config.yaml` is included containing the project schema (`spec-driven`), client project context (client name, chosen solution summary, domain vocabulary pointer, tech stack from CONTEXT.md), and the standard BSE OpenSpec rules
- **AND** no Anthropic API call is made for this file

#### Scenario: change .openspec.yaml committed
- **WHEN** the commit is built
- **THEN** `openspec/changes/{engagementId}/.openspec.yaml` is included containing `schema: spec-driven` and `created: {today's date ISO format}`
- **AND** no Anthropic API call is made for this file

---

### Requirement: repo-setup commits proposal.md and tasks.md to the OpenSpec change folder
`POST /api/pipeline/repo-setup` SHALL commit `proposal.md` and `tasks.md` into `openspec/changes/{engagementId}/` as template fills from engagement data — not via a LangChain chain call.

#### Scenario: proposal.md committed
- **WHEN** the commit is built
- **THEN** `openspec/changes/{engagementId}/proposal.md` is included containing: the engagement problem summary (from `structured_brief`), the chosen solution (from `chosen_solution`), the project plan epic list, and a brief statement of what the code generation will produce
- **AND** no Anthropic API call is made for this file

#### Scenario: tasks.md committed
- **WHEN** the commit is built
- **THEN** `openspec/changes/{engagementId}/tasks.md` is included with each epic from `project_plan.epics` as a `## N. {epic name}` heading, and each story within the epic as an unchecked OpenSpec checkbox `- [ ] N.M {story name}`
- **AND** no Anthropic API call is made for this file

---

### Requirement: repo-setup updates Supabase and advances status on success
On successful GitHub commit, `POST /api/pipeline/repo-setup` SHALL insert a `specifications` record, insert a `gate_approvals` record for gate 5, and advance `engagements.status` to `gate6_review`.

#### Scenario: Supabase writes on success
- **WHEN** the GitHub commit succeeds
- **THEN** a row is inserted into `specifications` with `engagement_id`, `repo_path`, `commit_sha`
- **AND** a row is inserted into `gate_approvals` with `engagement_id`, `gate_number: 5`, `action: 'approved'`
- **AND** `engagements.status` is set to `gate6_review`
- **AND** `engagements.github_repo` is confirmed set

#### Scenario: Supabase write fails after GitHub commit
- **WHEN** the GitHub commit succeeds but a Supabase write fails
- **THEN** the route sets `engagements.status = 'failed'` with `error_log`
- **AND** returns HTTP 500 — the BA can retry from the Dashboard