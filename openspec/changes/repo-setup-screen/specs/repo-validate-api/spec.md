## ADDED Requirements

### Requirement: repo-validate confirms repo existence and write access
`POST /api/pipeline/repo-validate` SHALL verify that the given `githubRepo` exists and that `GITHUB_TOKEN` has write access before doing anything else.

#### Scenario: Valid repo with write access
- **WHEN** `POST /api/pipeline/repo-validate` is called with a valid `engagementId` and `githubRepo`
- **AND** the GitHub API returns the repo metadata successfully
- **THEN** the route returns HTTP 200 with `{ repoName, defaultBranch, proposedBranch, gitignoreOk: <bool>, gitignoreMissing: <bool>, eslintConfigExists: <bool> }`

#### Scenario: Repo not found
- **WHEN** the GitHub API returns 404 for the given `org/repo-name`
- **THEN** the route returns HTTP 422 with `{ error: 'Repository not found or not accessible with current token' }`

#### Scenario: No write access
- **WHEN** the GitHub API confirms the repo exists but `GITHUB_TOKEN` has read-only permissions
- **THEN** the route returns HTTP 422 with `{ error: 'GitHub token does not have write access to this repository' }`

#### Scenario: Engagement not at repo_setup
- **WHEN** `POST /api/pipeline/repo-validate` is called and `engagements.status` is not `repo_setup`
- **THEN** the route returns HTTP 409 with `{ error: 'Engagement is not at repo_setup' }`

#### Scenario: Unauthenticated request
- **WHEN** the request has no valid Bearer token
- **THEN** the route returns HTTP 401

---

### Requirement: repo-validate reads .gitignore and checks for .agents/
`POST /api/pipeline/repo-validate` SHALL read the `.gitignore` file from the repo's default branch and return whether `.agents/` is present.

#### Scenario: .agents/ present in .gitignore
- **WHEN** the `.gitignore` file contains a line matching `.agents/` or `.agents`
- **THEN** the response includes `gitignoreOk: true` and `gitignoreMissing: false`

#### Scenario: .agents/ absent from .gitignore
- **WHEN** the `.gitignore` file does not contain `.agents/` or `.agents`
- **THEN** the response includes `gitignoreOk: false` and `gitignoreMissing: true`

#### Scenario: .gitignore does not exist
- **WHEN** the repo has no `.gitignore` file
- **THEN** the response includes `gitignoreOk: false` and `gitignoreMissing: true`

---

### Requirement: repo-validate can auto-commit .agents/ to .gitignore
When called with `action: 'fix-gitignore'`, `POST /api/pipeline/repo-validate` SHALL append `.agents/` to the `.gitignore` on the repo's default branch via the GitHub Contents API.

#### Scenario: Fix succeeds
- **WHEN** `POST /api/pipeline/repo-validate` is called with `{ engagementId, githubRepo, action: 'fix-gitignore' }`
- **AND** the commit to the default branch succeeds
- **THEN** the route returns HTTP 200 with `{ fixed: true, commitSha: '<sha>' }`

#### Scenario: Fix fails
- **WHEN** the commit to `.gitignore` fails (e.g., permissions error or merge conflict)
- **THEN** the route returns HTTP 422 with `{ error: '<reason>' }`

---

### Requirement: repo-validate writes github_repo to engagements on success
On successful validation (not fix-gitignore), `POST /api/pipeline/repo-validate` SHALL write the validated repo identifier to `engagements.github_repo`.

#### Scenario: Validation writes github_repo
- **WHEN** `POST /api/pipeline/repo-validate` succeeds for a normal validation call
- **THEN** `engagements.github_repo` is set to the validated `org/repo-name` string
- **AND** no status change occurs (status remains `repo_setup`)

---

### Requirement: repo-validate checks for an existing ESLint config
`POST /api/pipeline/repo-validate` SHALL check whether any recognised ESLint config file exists in the repo root and return the result so the BA is informed and `repo-setup.js` can decide whether to commit one.

#### Scenario: ESLint config exists
- **WHEN** any of `eslint.config.js`, `eslint.config.cjs`, `.eslintrc.json`, `.eslintrc.js`, `.eslintrc.cjs`, or `.eslintrc` is present in the repo root
- **THEN** the response includes `eslintConfigExists: true`

#### Scenario: No ESLint config found
- **WHEN** none of the recognised ESLint config filenames are present in the repo root
- **THEN** the response includes `eslintConfigExists: false`

---

### Requirement: repo-validate returns proposed feature branch name
The route SHALL compute and return the feature branch name using the pattern `feature/{client-name}/{engagement-id}`.

#### Scenario: Proposed branch computed
- **WHEN** validation succeeds
- **THEN** the response includes `proposedBranch: 'feature/<client_name_slug>/<engagement_id>'`
- **AND** `client_name_slug` is the client name lowercased with spaces replaced by hyphens and non-alphanumeric characters removed