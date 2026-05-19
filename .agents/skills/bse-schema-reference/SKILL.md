# BSE Supabase Schema Reference

Refer to this before writing any database query.

**Critical note:** The `specifications` table uses `repo_path` (text) and `commit_sha` (text) as pointers only. There is no `spec_content` JSONB column. The spec lives in the client repo. Supabase stores pointers only.

---

## Table: engagements [v5.4 CHANGE]

```sql
id                    uuid primary key default gen_random_uuid()
created_at            timestamptz default now()
updated_at            timestamptz default now()
team_member_id        uuid references auth.users(id)
client_name           text not null
client_email          text                -- recipient for business proposal send [v5.1]
organisation          text
department            text
industry              text default 'financial_services'
analysis_mode         text check (analysis_mode in ('quick', 'deep'))
status                text default 'captured' check (status in (
                        'captured', 'brief_pending', 'gate1_review',
                        'solutions_pending', 'gate2_review',
                        'proposal_pending', 'gate3_review',
                        'gate4_review',
                        'spec_pending', 'gate5_review',
                        'code_pending', 'code_review', 'gate6_review',
                        'output_pending', 'gate7_review', 'complete',
                        'rejected', 'failed'
                      ))
last_successful_gate  int                -- set on failure; used for retry
error_log             jsonb              -- populated on failure; cleared on retry
structured_brief      jsonb
solutions             jsonb
chosen_solution       jsonb              -- the selected solution object from Gate 4 [v5.4]
gate4_no_further_input boolean default false  -- true if BA confirmed no additional context [v5.4]
sharepoint_proposal_url text             -- business proposal PDF [v5.1]
sharepoint_brief_url  text
sharepoint_deck_url   text
sharepoint_report_url text               -- review loop report PDF
hubspot_deal_id       text               -- nullable; reserved for future CRM
notes                 text
```

**New columns in v5.1:**
- `client_email` — captured at new engagement setup, used for Gate 3 proposal delivery
- `sharepoint_proposal_url` — business proposal PDF location in SharePoint

---

## Table: engagement_inputs

```sql
id              uuid primary key default gen_random_uuid()
engagement_id   uuid references engagements(id) on delete cascade
input_type      text check (input_type in ('guided', 'braindump', 'transcript', 'client_intake'))
content         jsonb
source          text                     -- 'fireflies', 'manual', 'client_intake'
intake_token    text unique              -- nullable for non-intake types
created_at      timestamptz default now()
```

`content` JSONB structure varies by `input_type`:
- `guided`: `{ answers: [{ section, question, answer, notes }] }`
- `braindump` / `transcript`: `{ text }`
- `client_intake`: `{ contact_name, contact_email, organisation, department, problem_description, impact_description, constraints }`

---

## Table: gate_approvals [v5.4 CHANGE]

```sql
id              uuid primary key default gen_random_uuid()
engagement_id   uuid references engagements(id) on delete cascade
gate_number     int check (gate_number in (1, 2, 3, 4, 5, 6, 7))
approved_by     uuid references auth.users(id)
approved_at     timestamptz default now()
action          text check (action in (
                  'approved', 'rejected', 'edited_and_approved',
                  'sent',                          -- Gate 3: proposal sent to client
                  'voided',                        -- Gate 2: voided when BA triggers contextual re-injection regeneration
                  'cc_pause_approved',             -- Gate 6: BA approved continuation after CC 21+
                  'cc_pause_rejected'              -- Gate 6: BA rejected for refactor after CC 21+
                ))
edits_made      jsonb
```

**v5.4 changes:**
- `gate_number` check now covers 1–7 (was 1–6)
- `action` adds `'voided'` (Gate 2: contextual re-injection); `cc_pause_approved`/`cc_pause_rejected` comments updated to Gate 6 (was Gate 5)

---

## Table: specifications

```sql
-- spec_content JSONB column is not present. The spec lives in the client repo.
-- Supabase stores pointers only.

id                    uuid primary key default gen_random_uuid()
engagement_id         uuid references engagements(id) on delete cascade
created_at            timestamptz default now()
repo_path             text               -- path to openspec/changes/{engagement-id}/ in client repo
commit_sha            text               -- SHA of the approved spec commit
flagged_sections      text[]             -- capability folder names flagged for regeneration at Gate 4
review_thresholds     jsonb default '{"complexity":7,"test_coverage":7,"security":7,"requirements_alignment":7,"performance":7}'
max_review_cycles     int default 5
approved_at           timestamptz
approved_by           uuid references auth.users(id)
```

---

## Table: code_versions

```sql
id                  uuid primary key default gen_random_uuid()
engagement_id       uuid references engagements(id) on delete cascade
version_number      int not null
created_at          timestamptz default now()
github_commit_sha   text
github_branch       text                 -- feature/{client-name}/{engagement-id}
vercel_preview_url  text
modules_generated   text[]
generation_chain    text                 -- 'codeGenerationChain' or 'codeFixChain'
```

---

## Table: code_reviews [v5.1 CHANGE]

```sql
id                  uuid primary key default gen_random_uuid()
engagement_id       uuid references engagements(id) on delete cascade
code_version_id     uuid references code_versions(id)
created_at          timestamptz default now()
review_cycle        int not null
scores              jsonb                -- {complexity, test_coverage, security, requirements_alignment, performance}
issues              jsonb                -- array of issue objects
eslint_cc_report    jsonb                -- per-file CC scores from pre-check [v5.1]
cc_pause_occurred   boolean default false -- true if CC 21+ pause was triggered this cycle [v5.1]
threshold_met       boolean
review_escalated    boolean default false
gemini_model        text
summary             text
```

**New columns in v5.1:**
- `eslint_cc_report` — per-file CC scores from pre-check stage
- `cc_pause_occurred` — true if CC 21+ pause was triggered this cycle

---

## Table: review_loop_reports

```sql
id                    uuid primary key default gen_random_uuid()
engagement_id         uuid references engagements(id) on delete cascade
created_at            timestamptz default now()
total_cycles          int
cycle_detail          jsonb              -- per-cycle scores, issues, fixes applied, CC scores
final_threshold_met   boolean
review_escalated      boolean
cc_pauses             jsonb              -- array of {cycle, files, ba_decision} for any CC 21+ events [v5.1]
total_duration_ms     int
generator_model       text
reviewer_model        text
sharepoint_url        text               -- internal PDF location in SharePoint
delivered_at          timestamptz        -- when Teams + email notification was sent
```

**New columns in v5.1:**
- `cc_pauses` — array of `{cycle, files, ba_decision}` for any CC 21+ pause events

---

## Table: users

```sql
id                          uuid references auth.users(id) primary key
full_name                   text
role                        text default 'ba'
power_automate_webhook_url  text
outlook_email               text               -- for review loop report delivery
created_at                  timestamptz default now()
```

---

## Row Level Security

- Team members read/write own engagements only (`team_member_id = auth.uid()`)
- Gate approvals append-only for owning team member
- Code reviews read-only for team members (written by server-side pipeline only)
- Review loop reports read-only for team members
- Client intake uses service role key server-side — never exposed to frontend
- All tables have RLS enabled

---

## ESLint Complexity Report JSON (stored in `code_reviews.eslint_cc_report` per pre-check cycle) [v5.1]

```json
{
  "files": [
    {
      "path": "string",
      "max_cc": 12,
      "severity": "error",
      "functions": [
        {
          "name": "string",
          "cc": 12,
          "line": 42
        }
      ]
    }
  ],
  "has_untestable": false,
  "has_errors": true,
  "summary": "string"
}
```

---

## Gemini Scorecard JSON (stored in `code_reviews.scores` and `code_reviews.issues`)

```json
{
  "scores": {
    "complexity": 8,
    "test_coverage": 6,
    "security": 9,
    "requirements_alignment": 8,
    "performance": 7
  },
  "issues": [
    {
      "dimension": "test_coverage",
      "severity": "high",
      "description": "string",
      "file": "string",
      "line_range": "string",
      "suggested_fix": "string"
    }
  ],
  "threshold_met": false,
  "summary": "string"
}
```

---

## Threshold Precedence

```
specifications.review_thresholds (per-engagement)
  > REVIEW_THRESHOLD_DEFAULT (env var global default)
```

Always check `specifications.review_thresholds` first. Fall back to env var only if not set.
