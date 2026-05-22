## ADDED Requirements

### Requirement: repo-setup validates preconditions before creating scaffold
`POST /api/pipeline/repo-setup` SHALL verify engagement status, `github_repo` presence, and skill content completeness before creating the feature branch or committing any files.

#### Scenario: All preconditions met
- **WHEN** `POST /api/pipeline/repo-setup` is called with a valid `engagementId`
- **AND** `engagements.status = 'repo_setup'`
- **AND** `engagements.github_repo` is populated
- **AND** all five `skills` rows have non-null `content`
- **THEN** the route proceeds to scaffold generation

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

### Requirement: repo-setup generates CLAUDE.md using the standard client-repo template
`POST /api/pipeline/repo-setup` SHALL generate the client-repo `CLAUDE.md` by filling a fixed string template — not via a LangChain chain call.

#### Scenario: CLAUDE.md generated
- **WHEN** the scaffold is built
- **THEN** `CLAUDE.md` contains the client name, project name, domain context pointer, tech stack, coding rules, spec paths, and skills paths — filled from engagement data
- **AND** no Anthropic API call is made for this file
- **AND** the file is labelled `// NON-PIPELINE: template fill`

---

### Requirement: repo-setup conditionally commits eslint.config.js
`POST /api/pipeline/repo-setup` SHALL include `eslint.config.js` in the scaffold only if the repo does not already have an ESLint config, as determined by `engagements.eslint_config_exists`.

#### Scenario: No ESLint config in repo
- **WHEN** `engagements.eslint_config_exists = false`
- **THEN** the scaffold includes `eslint.config.js` at the repo root containing the BSE flat config with `complexity: ['error', { max: 10 }]`
- **AND** the file is generated from a fixed template — labelled `// NON-PIPELINE: template fill`

#### Scenario: ESLint config already exists
- **WHEN** `engagements.eslint_config_exists = true`
- **THEN** `eslint.config.js` is NOT included in the scaffold
- **AND** the existing client config is left untouched

---

### Requirement: repo-setup commits OpenSpec configuration files as template fills
`POST /api/pipeline/repo-setup` SHALL commit the files required to initialise OpenSpec in the client repo. All files are template fills — no chain call.

#### Scenario: openspec/config.yaml committed
- **WHEN** the scaffold is built
- **THEN** `openspec/config.yaml` is included containing the project schema (`spec-driven`), client project context (client name, chosen solution summary, domain vocabulary pointer, tech stack), and the standard BSE OpenSpec rules
- **AND** no Anthropic API call is made for this file

#### Scenario: .openspec.yaml committed
- **WHEN** the scaffold is built
- **THEN** `openspec/changes/{engagementId}/.openspec.yaml` is included containing `schema: spec-driven` and `created: {today's date ISO format}`
- **AND** no Anthropic API call is made for this file

#### Scenario: proposal.md committed
- **WHEN** the scaffold is built
- **THEN** `openspec/changes/{engagementId}/proposal.md` is included containing: the engagement problem summary (from `structured_brief`), the chosen solution (from `chosen_solution`), the project plan epic list, and a brief statement of what the code generation will produce
- **AND** no Anthropic API call is made for this file

#### Scenario: tasks.md committed
- **WHEN** the scaffold is built
- **THEN** `openspec/changes/{engagementId}/tasks.md` is included with each epic from `project_plan.epics` as a `## N. {epic name}` heading, and each story within the epic as an unchecked OpenSpec checkbox `- [ ] N.M {story name}`
- **AND** no Anthropic API call is made for this file

---

### Requirement: repo-setup commits skill files from the Skills Registry
`POST /api/pipeline/repo-setup` SHALL commit all five skill files from the `skills` table as `.agents/skills/{name}/SKILL.md`.

#### Scenario: Skill files committed
- **WHEN** the scaffold is built
- **AND** all five `skills` rows have non-null `content`
- **THEN** each skill is committed as `.agents/skills/{name}/SKILL.md` using the content from the `skills` table
- **AND** no Anthropic API call is made for these files

---

### Requirement: repo-setup creates the feature branch and commits scaffold files atomically
`POST /api/pipeline/repo-setup` SHALL use the GitHub Git Data API to create the feature branch and commit all scaffold files in a single atomic commit.

#### Scenario: Successful branch creation and scaffold commit
- **WHEN** all preconditions are met
- **THEN** the route:
  1. Creates a new branch `feature/{client-name}/{engagement-id}` off `baseBranch` via GitHub API
  2. Builds a tree of all scaffold file blobs: `CLAUDE.md`, each `SKILL.md`, `openspec/config.yaml`, `.openspec.yaml`, `proposal.md`, `tasks.md` (and `eslint.config.js` if applicable)
  3. Creates a single commit on the new branch with all scaffold blobs
- **AND** returns `{ branchUrl: '<GitHub branch URL>', commitSha: '<sha>' }`

#### Scenario: Branch already exists (retry scenario)
- **WHEN** the feature branch already exists (prior failed attempt)
- **THEN** the route deletes the existing branch and recreates it before committing

#### Scenario: GITHUB_TOKEN not set
- **WHEN** `process.env.GITHUB_TOKEN` is not set
- **THEN** the route logs a warning, skips all GitHub API calls, still advances status to `spec_pending`
- **AND** returns `{ skipped: true, reason: 'GITHUB_TOKEN not configured' }`

---

### Requirement: repo-setup advances status to spec_pending on success
`POST /api/pipeline/repo-setup` SHALL set `engagements.status = 'spec_pending'` after a successful scaffold commit. It does NOT insert a `gate_approvals` record and does NOT insert a `specifications` record — those are responsibilities of downstream steps.

#### Scenario: Status advances to spec_pending
- **WHEN** the GitHub scaffold commit succeeds (or GITHUB_TOKEN is not set and the step is skipped)
- **THEN** `engagements.status` is set to `spec_pending`

#### Scenario: Error during scaffold commit
- **WHEN** any step in scaffold generation or GitHub commit throws an error
- **THEN** `engagements.status` is set to `'failed'` with `error_log`
- **AND** the failure notification is triggered via Power Automate
- **AND** the route returns HTTP 500