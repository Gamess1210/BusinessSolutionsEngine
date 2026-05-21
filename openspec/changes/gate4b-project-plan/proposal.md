## Why

After Gate 4 (Client Decision and Context), the BA currently jumps directly to spec generation with no structured planning step. This means epics are derived ad hoc from the chosen solution rather than from a deliberately scoped and BA-approved project plan. Gate 4b closes this gap: before any spec is written, Claude and the BA co-create a detailed project plan — epics, stories, tasks — through an iterative chat session, giving the BA a concrete scope to approve before the technical pipeline begins.

## What Changes

- New status values: `plan_pending` (after Gate 4 approval) and `gate5_review` (project plan under BA review)
- New interactive review page: `src/pages/review/ProjectPlanReview.jsx` — chat-like interface where Claude asks discovery questions and iterates on the plan until the BA approves
- New LangChain chain: `projectPlanChain` (Claude, claude-sonnet-4-20250514) — conducts iterative discovery and returns a structured project plan in both markdown and OpenSpec WHEN/THEN/AND format
- Three new API routes: `POST /api/pipeline/plan-question`, `POST /api/pipeline/plan-update`, `POST /api/pipeline/gate5-approve`
- Three new columns on `engagements`: `project_plan JSONB`, `plan_conversation JSONB`, `current_epic_index int default 0`
- Gate 4 approval now advances to `plan_pending` (was `spec_pending`)
- Gate 4b approval (`gate_number = 5`, `action = 'plan_approved'`) advances to `spec_pending`
- `gate_approvals.gate_number` check extended from 1–7 to 1–8
- `gate_approvals.action` constraint gains `'plan_approved'`

## Capabilities

### New Capabilities

- `project-plan-session`: Interactive planning session between BA and Claude. Claude asks probing discovery questions (timeline, budget, team, integrations, compliance, delivery approach, MVP vs full scope, technical constraints, success metrics per epic), then generates a project plan containing epics, user stories, and tasks in markdown and OpenSpec WHEN/THEN/AND format. BA iterates until satisfied and approves. Approved plan stored in `engagements.project_plan`; conversation history in `engagements.plan_conversation`.
- `gate5-approve-api`: Server-side route that validates `engagement.status === 'plan_pending'`, inserts a `gate_approvals` record (`gate_number: 5`, `action: 'plan_approved'`), stores the approved plan, and advances status to `spec_pending`.

### Modified Capabilities

- `client-decision-gate`: Gate 4 approval route (`gate4-approve.js`) currently advances status to `spec_pending`. This requirement changes: Gate 4 approval must advance to `plan_pending` instead, and the frontend must redirect to `/review/:id/project-plan` rather than the engagement detail page.

## Impact

- `api/pipeline/gate4-approve.js` — status advance target changes from `spec_pending` to `plan_pending`
- `src/pages/review/ClientDecisionReview.jsx` — post-approval navigation changes to `/review/:id/project-plan`
- `src/App.jsx` — new route `/review/:id/project-plan` → `ProjectPlanReview`
- `src/lib/chains/projectPlan.js` — new file
- `api/pipeline/plan-question.js`, `plan-update.js`, `gate5-approve.js` — new files
- Supabase `engagements` table — three new columns, status constraint updated
- Supabase `gate_approvals` table — gate_number to 1–8, plan_approved action added
