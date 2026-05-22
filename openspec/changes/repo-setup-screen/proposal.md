## Why

After Gate 5 (Project Plan) is approved, the BA must manually provision a client GitHub repository — cloning skills, creating folder structures, and configuring files by hand. This is error-prone, time-consuming, and means skill files can go stale or get missed. A dedicated Repository Setup screen automates this entire step: validate the repo, enforce the `.agents/` gitignore rule, pull current skill content from a central registry, generate context and OpenSpec files, and commit everything to the feature branch in one action.

## What Changes

- New `repo_setup` engagement status inserted between `gate5_review` and `gate6_review` — replaces `spec_pending`
- `gate5-approve.js` updated to set status to `repo_setup` instead of `gate6_review`
- New screen at `/review/:id/repo-setup` (RepoSetup.jsx) — two-step UI for connecting a GitHub repo and creating the branch structure
- New settings page at `/settings/skills` (Skills.jsx) — central Skills Registry where BAs upload and manage skill file content
- New API routes: `repo-validate.js`, `repo-setup.js`, `api/settings/skills-update.js`
- New Supabase table: `skills` — stores skill name, folder path, and SKILL.md content
- New column `github_repo text` on `engagements`
- `contextGenerationChain` and `openspecGenerationChain` (per epic) moved from Gate 6 triggering to the repo setup step — Gate 6 becomes pure spec review
- EngagementDetail stepper and Dashboard updated with `repo_setup` status label "Repository Setup"

## Capabilities

### New Capabilities

- `repo-setup-screen`: Two-step BA-facing screen. Step 1 validates GitHub repo access and enforces `.agents/` in `.gitignore` (BSE auto-commits the rule if missing). Step 2 previews folder structure and triggers repo creation — runs chains, commits all files to a new feature branch.
- `skills-registry`: BSE-wide settings page for managing the five BSE skill files. Each skill stores its SKILL.md content in Supabase. Missing skills block repo setup. Updates never propagate to existing branches.
- `repo-validate-api`: Server-side route that confirms repo exists, token has write access, reads `.gitignore`, and optionally commits `.agents/` to the default branch.
- `repo-setup-api`: Server-side route that runs `contextGenerationChain` once and `openspecGenerationChain` per epic, builds all file content, creates the feature branch, and commits everything in one commit.

### Modified Capabilities

- `client-decision-gate`: `gate5-approve.js` status transition changes from advancing to `gate6_review` to advancing to `repo_setup`. **BREAKING** — requires `repo_setup` in the DB check constraint before deployment.

## Impact

- **Schema:** New `skills` table; `github_repo text` on `engagements`; `repo_setup` added to `engagements.status` check constraint; `spec_pending` removed
- **API routes:** 3 new routes (`repo-validate`, `repo-setup`, `settings/skills-update`); `gate5-approve.js` status target updated
- **Chains:** `contextGenerationChain` and `openspecGenerationChain` invoked from `repo-setup.js` — no changes to chain implementations themselves
- **Frontend:** 2 new pages (`RepoSetup.jsx`, `Skills.jsx`); `EngagementDetail.jsx` stepper updated; `Dashboard.jsx` status label updated; `App.jsx` route added
- **Environment:** `GITHUB_TOKEN` already required — no new env vars
- **Deployment order:** DB migration (add `repo_setup` status, create `skills` table) must run before code deployment