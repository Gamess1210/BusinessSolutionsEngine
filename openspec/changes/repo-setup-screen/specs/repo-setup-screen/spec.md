## ADDED Requirements

### Requirement: Screen is accessible only at repo_setup status
The system SHALL render RepoSetup.jsx at `/review/:id/repo-setup` only when `engagements.status = 'repo_setup'`. Any other status redirects the BA to `/engagements/:id`.

#### Scenario: Engagement at repo_setup
- **WHEN** the BA navigates to `/review/:id/repo-setup`
- **AND** `engagements.status` is `repo_setup`
- **THEN** the screen renders with Step 1 active

#### Scenario: Engagement not at repo_setup
- **WHEN** the BA navigates to `/review/:id/repo-setup`
- **AND** `engagements.status` is any value other than `repo_setup`
- **THEN** the frontend redirects to `/engagements/:id`

---

### Requirement: Step 1 accepts a GitHub repo in org/repo-name format
The system SHALL provide an input field accepting a repo identifier in `org/repo-name` format and a "Connect Repository" button that triggers validation.

#### Scenario: Valid format entered
- **WHEN** the BA enters a value matching the pattern `<org>/<repo>` and clicks "Connect Repository"
- **THEN** the system calls `POST /api/pipeline/repo-validate` with `{ engagementId, githubRepo }`

#### Scenario: Invalid format entered
- **WHEN** the BA enters a value that does not contain exactly one `/`
- **THEN** the "Connect Repository" button is disabled
- **AND** an inline hint reads "Format: org/repo-name"

---

### Requirement: Step 1 shows confirmation panel on successful validation
The system SHALL display a confirmation panel after successful repo validation showing the repo details and proposed branch name.

#### Scenario: Validation succeeds
- **WHEN** `POST /api/pipeline/repo-validate` returns success
- **THEN** the UI displays:
  - "✓ Repository confirmed" with the repo name
  - Default branch (from API response)
  - Proposed feature branch: `feature/{client-name}/{engagement-id}`
  - A "Base branch" dropdown defaulting to the default branch, editable by the BA
  - ESLint status row: "✓ ESLint config found — existing config will be used at Gate 7" if `eslintConfigExists: true`, or "⚠ No ESLint config found — BSE standard config will be added to the scaffold" if `eslintConfigExists: false`
- **AND** the "Connect Repository" button is replaced by a "Proceed to Step 2" button

#### Scenario: Validation fails
- **WHEN** `POST /api/pipeline/repo-validate` returns an error
- **THEN** an inline error message shows the reason (e.g., "Repository not found", "No write access")
- **AND** the BA can correct the input and retry

---

### Requirement: Step 1 hard-blocks if .agents/ is absent from .gitignore
The system SHALL prevent the BA from proceeding to Step 2 if `.agents/` is not present in the repo's `.gitignore`.

#### Scenario: .agents/ is missing from .gitignore
- **WHEN** `POST /api/pipeline/repo-validate` returns `gitignoreMissing: true`
- **THEN** the confirmation panel shows a hard-block warning: "`.agents/` is not in this repo's `.gitignore`. Skill files must not appear in PRs."
- **AND** a "Fix .gitignore" button is shown
- **AND** the "Proceed to Step 2" button is disabled until the fix is confirmed

#### Scenario: BA clicks "Fix .gitignore"
- **WHEN** the BA clicks the "Fix .gitignore" button
- **THEN** the system calls `POST /api/pipeline/repo-validate` with `{ engagementId, githubRepo, action: 'fix-gitignore' }`
- **AND** on success, the warning is replaced with "✓ `.agents/` added to `.gitignore`"
- **AND** the "Proceed to Step 2" button becomes enabled

#### Scenario: .agents/ already in .gitignore
- **WHEN** `POST /api/pipeline/repo-validate` returns `gitignoreOk: true`
- **THEN** no warning is shown and "Proceed to Step 2" is enabled immediately after validation

---

### Requirement: Step 2 shows a read-only folder structure preview
The system SHALL display the full folder structure that will be created before the BA commits to creation.

#### Scenario: BA reaches Step 2
- **WHEN** the BA clicks "Proceed to Step 2"
- **THEN** the screen advances to Step 2 showing a read-only tree of all files to be created, grouped by: root files, openspec files per epic, and .agents/skills per skill
- **AND** skills with content in the registry show "← from Skills Registry"
- **AND** any skill with `content = null` shows a warning indicator

#### Scenario: One or more skills have no content
- **WHEN** the BA reaches Step 2 and one or more skill rows in the `skills` table have `content = null`
- **THEN** the "Create Structure" button is disabled
- **AND** the UI shows: "N skill(s) have no content: [skill names]. Upload them in Settings → Skills before proceeding."

---

### Requirement: Step 2 creates the repository structure on confirmation
The system SHALL call `POST /api/pipeline/repo-setup` when the BA clicks "Create Structure", showing progress and a success state with a link to the feature branch.

#### Scenario: Creation succeeds
- **WHEN** the BA clicks "Create Structure"
- **AND** `POST /api/pipeline/repo-setup` returns success
- **THEN** the button enters a loading state during the operation
- **AND** on completion the screen shows a green confirmation panel with the GitHub feature branch URL
- **AND** a "Proceed to Spec Review →" button navigates to `/engagements/:id`

#### Scenario: Creation fails
- **WHEN** `POST /api/pipeline/repo-setup` returns an error
- **THEN** an error message is shown with the failure reason
- **AND** the engagement remains at `repo_setup` status so the BA can retry

---

### Requirement: repo_setup status is reflected in the EngagementDetail stepper
The system SHALL show "Repository Setup" as a labelled step in the EngagementDetail status stepper between Gate 5 and Gate 6.

#### Scenario: Engagement at repo_setup
- **WHEN** `engagements.status` is `repo_setup`
- **THEN** the stepper shows "Repository Setup" as the active step (navy pill)
- **AND** Gate 5 is shown as completed (green circle with checkmark)

---

### Requirement: repo_setup status is displayed on the Dashboard
The system SHALL show a human-readable label for `repo_setup` status on the Dashboard engagement list.

#### Scenario: Engagement at repo_setup on Dashboard
- **WHEN** an engagement has `status = 'repo_setup'`
- **THEN** the Dashboard displays the label "Repository Setup"