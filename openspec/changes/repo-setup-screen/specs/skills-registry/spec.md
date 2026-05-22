## ADDED Requirements

### Requirement: Skills Registry settings page lists all five skills
The system SHALL render a settings page at `/settings/skills` listing all five BSE skill records from the `skills` table. Any authenticated BA can access this page.

#### Scenario: Page loads with skills
- **WHEN** an authenticated BA navigates to `/settings/skills`
- **THEN** the page displays one card per skill showing: skill name, folder path, last updated date, updated-by name, and the first 5 lines of content as a preview
- **AND** an "Update" button and a "View full content" toggle are shown on each card

#### Scenario: Skill has no content yet
- **WHEN** a skill row has `content = null`
- **THEN** the card shows "No content uploaded yet" in place of the preview
- **AND** the card is visually highlighted to indicate it is blocking repo setup

---

### Requirement: BA can upload a SKILL.md file to update a skill
The system SHALL allow the BA to upload a `SKILL.md` file from their local machine and save its content to the `skills` table via `POST /api/settings/skills-update`.

#### Scenario: BA uploads a valid file
- **WHEN** the BA clicks "Update" on a skill card
- **AND** selects a `.md` file from their file system
- **THEN** the BSE reads the file content client-side and calls `POST /api/settings/skills-update` with `{ skillName, content }`
- **AND** on success the card updates showing the new preview, updated-at timestamp, and the current user's name as updated-by

#### Scenario: File upload fails
- **WHEN** `POST /api/settings/skills-update` returns an error
- **THEN** an inline error is shown on the card
- **AND** the previous content is unchanged

---

### Requirement: Skills Registry update does not affect existing feature branches
The system SHALL document clearly in the UI that skill updates only apply to new engagements, not existing feature branches.

#### Scenario: BA updates a skill
- **WHEN** a skill update is saved
- **THEN** the UI displays: "This update applies to new engagements only. Existing feature branches are not affected."

---

### Requirement: skills table has five seed rows
The `skills` table SHALL be seeded with one row per BSE skill on migration, with `content = null`, so repo setup always finds all five rows regardless of whether content has been uploaded.

#### Scenario: Fresh BSE deployment
- **WHEN** the migration runs
- **THEN** the `skills` table contains exactly five rows with names: `bse-prompt-library`, `bse-schema-reference`, `bse-langchain-patterns`, `bse-component-standards`, `bse-openspec-skills-reference`
- **AND** all five have `content = null`

---

### Requirement: skills-update API upserts skill content
`POST /api/settings/skills-update` SHALL upsert the skill content for the given skill name and record `updated_by` and `updated_at`.

#### Scenario: Successful upsert
- **WHEN** `POST /api/settings/skills-update` is called with a valid `skillName` and `content` string
- **THEN** the matching `skills` row is updated with the new `content`, current `updated_at`, and authenticated user's id as `updated_by`
- **AND** the route returns the updated skill record

#### Scenario: Unknown skill name
- **WHEN** `POST /api/settings/skills-update` is called with a `skillName` not present in the `skills` table
- **THEN** the route returns HTTP 400 with `{ error: 'Unknown skill name' }`

#### Scenario: Unauthenticated request
- **WHEN** `POST /api/settings/skills-update` is called without a valid Bearer token
- **THEN** the route returns HTTP 401