# BSE Build Backlog
**Last updated:** 22 May 2026
**Instructions version:** v5.7
**Branch:** feature/geoff-gate5-build

This is the living backlog for the BSE build. Items are grouped by priority and type. Update this file after every session.

---

## 🔴 Immediate — Before Next Gate Build

- [ ] **Implement brain-dump clarification prompt (Prompt 10.10)** — braindumpStructuringPrompt.js and api/pipeline/braindump-clarify.js do not yet exist. Prompt 10.10 is defined in BSE Instructions v5.6 Section 10 and bse-prompt-library SKILL.md. Implement as NON-PIPELINE direct AI call. Before saving brain-dump input, check if ambiguous — if so, ask one clarifying question and wait for BA response. If clear, save directly. Label: `// NON-PIPELINE: direct AI call`
- [ ] **Smoke test Gate 5 (three-phase)** — Phase 1: verify CLIENT_BUILD_INSTRUCTIONS.md generates and BA can edit/approve. Phase 2: verify epic discovery questions fire, Claude proposes epic list, BA can reshape and approve. Phase 3: verify per-epic story generation, WHEN/THEN/AND criteria, BA approves each epic before next begins. Verify all phases advance to spec_pending on completion.
- [ ] **Archive gate4b-project-plan OpenSpec change** — Run `/opsx:archive "gate4b-project-plan"` once smoke test passes
- [ ] **Verify contextual re-injection (tasks 6.1–6.5)** — Manual browser verification of supplementary context banner, regeneration flow, voided gate_approvals record
- [ ] **Test richer Document B** — Run full Gate 3 with new proposalGenerationChain, confirm pain points table, stakeholder severity, ROI framing, success criteria all appear

---

## 🟡 Phase 3 — Remaining Build (Geoff's scope)

- [ ] **Gate 5 full implementation** — contextGenerationChain (CONTEXT.md + ADRs), openspecGenerationChain (epic by epic from project_plan), Gate 6 spec review screen replacing placeholder, gate6-approve API route, gate6-regenerate-sections API route
- [ ] **Prompt verification rule** — Add a mandatory step to CLAUDE.md and the OpenSpec apply process: before implementing any chain, Claude Code must read bse-prompt-library/SKILL.md and quote back the exact prompt and schema it will use. Prevents hallucination of prompt schemas mid-implementation.
- [ ] **Brain-dump clarification prompt (Prompt 10.10)** — Implement as NON-PIPELINE direct AI call. Before saving brain-dump input, check if input is ambiguous. If so, ask one clarifying question. If clear, save directly. Label: `// NON-PIPELINE: direct AI call`
- [ ] **vercel.json maxDuration** — Increase to 300s for long-running chains (proposalGenerationChain, deepAnalysisChain, projectPlanChain, outputGenerationChain). Current 60s will timeout. Requires Vercel Pro plan.
- [ ] **Preview button for Document B** — Currently shows "local-dev-skip". Preview route exists but needs smoke testing to confirm HTML renders correctly in browser.

---

## 🟡 Phase 3 — BA Documents Pipeline

- [ ] **Smoke test BA documents** — Gate 1 approval should trigger As-Is Process Map + BRD (non-fatal). Gate 3 send should trigger SIA (non-fatal). Verify all URLs stored as null locally and pipeline is not blocked.
- [ ] **BA document prompts verification** — Read all 6 BA document chain files, confirm prompts match the skeleton documents from BSE_BA_Skeleton_Documents.docx
- [ ] **RTM progressive enrichment** — rtm_data JSONB enriched at Gate 1 (requirements), Gate 6 (OpenSpec links), Gate 7 (test results). Only Gate 1 pass is currently implemented.

---

## 🔵 Phase 4 — Output Generation (Geoff's scope)

- [ ] **Puppeteer + @sparticuz/chromium setup** — Install puppeteer-core + @sparticuz/chromium. Verify generatePdf() works in Vercel serverless. Remove local-dev-skip once confirmed.
- [ ] **Microsoft Graph API + MSAL** — Set up Azure AD app registration (needs Comotion IT). Implement SharePoint folder creation including _internal/ subfolder. Wire all 6 document uploads.
- [ ] **Gate 8 output generation** — outputGenerationChain, Final Client Brief PDF, Review Loop Report PDF, Project Summary PDF. Three-tier upload failure recovery for Project Summary.
- [ ] **Gate 8 review screen** — Replace placeholder OutputsReview.jsx with full implementation.

---

## 🔵 Phase 5 — Power Automate (Geoff's scope)

- [ ] **7 Power Automate flows** — Client intake notification, Document B send, Review loop report delivery, CC 21+ pause, Gate 8 approval, Gate 8 rejection, Chain failure. All triggered via HTTP POST from Vercel API routes.
- [ ] **Wire POWER_AUTOMATE_* env vars** — Add all 6 trigger URLs to .env once flows are built.
- [ ] **Outlook email addresses** — Populate users.outlook_email for all team members before flows go live.

---

## 🟣 Other Developer's Scope (Gates 6–8 technical build)

- [ ] **Gate 7 — Code Review** — codeGenerationChain, codeReviewChain (Gemini), codeFixChain, reviewLoopChain, pre-check stage (lint + ESLint CC + type-check + openspec validate), CC 21+ pause logic, Gate 7 review screen
- [ ] **Gate 8 — Output Review** — Full screen replacing placeholder, gate8-approve, gate8-reject
- [ ] **Client repo setup** — openspec init, /setup-matt-pocock-skills, /git-guardrails, /to-issues, fallow hooks install --target agent
- [ ] **GitHub integration** — Commit spec files to feature/{client-name}/{engagement-id} branch. Wire GITHUB_TOKEN and GITHUB_REPO env vars.
- [ ] **Vercel MCP preview deploys** — Wire VERCEL_TOKEN and VERCEL_PROJECT_ID. Preview URL stored in code_versions.vercel_preview_url.

---

## 🟣 Phase 6 — Integrations (Future)

- [ ] **gstack /cso integration** — OWASP + STRIDE audit in Gate 7 pre-check before Gemini review. Spec as separate OpenSpec change when Gate 7 build begins.
- [ ] **gstack /qa integration** — Real browser QA after Gate 7 Gemini approval, before BA review. Spec as separate OpenSpec change.
- [ ] **Fireflies API auto-retrieve** — Phase 6. Paste mode working. API connection deferred.
- [ ] **M365 SSO** — Azure AD via Supabase Auth provider. Phase 6.
- [ ] **Jira integration via Atlassian MCP** — Deferred. Schema accommodates it.
- [ ] **HubSpot integration** — hubspot_deal_id column exists. Not built.
- [ ] **Voice capture** — Infrastructure in Phase 3 (VOICE_CAPTURE_ENABLED=false). Enable when tested.

---

## 🟤 Deferred — BA Documents (Separate Phase)

- [ ] **Full BA documents pipeline integration** — As-Is Process Map, BRD, SIA, To-Be Process Map, RTM, Change Management Plan as proper gate-integrated documents with BA review screens. Currently generating non-fatally in background. Full integration (review screens, BA approval, client-facing delivery) is a separate phase after core pipeline complete.
- [ ] **RTM as Excel workbook** — RTM skeleton specifies Excel format with conditional formatting. Currently generated as PDF. Separate phase.

---

## 🔍 Investigate Before Acting

- [ ] **Prompt file architecture review** — Currently prompts exist in three places: Section 10 of BSE Instructions, src/lib/prompts/*.js files, and bse-prompt-library SKILL.md. This creates drift risk when prompts are updated. Before acting, investigate: (1) whether src/lib/prompts/ should become the single source of truth, (2) whether Section 10 of BSE Instructions should become a reference index only (file locations + purpose, not full text), (3) whether the bse-prompt-library skill should instruct Claude Code to read the live .js file rather than containing a copied version. Risk to assess: Claude Code must be able to read prompt files reliably before this is safe to do. Do not restructure until the investigation is complete and the approach is agreed.
- [ ] **Cross-session and cross-epic context retention for client app generation** — The BSE passes prior_modules and CONTEXT.md with each codeGenerationChain call, but this is not fully designed for multi-session builds or large codebases. Three unresolved questions: (1) how much prior code gets passed when the client app grows across many epics — context window limits mean all files cannot be passed; (2) what happens when code changes after generation (Gemini fix loop, BA rejection + regeneration) — prior_modules context could be stale; (3) cross-epic dependencies — Epic 3 importing from Epic 1 when Epic 1 has changed. Options to investigate before Gate 7 is built: Option A — selective context injection (BSE analyses dependencies and passes only relevant files per epic); Option B — CONTEXT.md as a living contract (every shared interface and exported function signature written into CONTEXT.md as it is generated, grows with the project); Option C — GBrain from gstack (persistent knowledge base, BSE indexes client repo after each epic). Option B is the most practical starting point as it extends existing design. Must be resolved before Gate 7 codeGenerationChain is implemented.

---

## ✅ Completed This Session (21 May 2026)

- [x] BSE Instructions updated to v5.6 (8-gate pipeline, Gate 5 Project Plan)
- [x] Gate 4b renamed to Gate 5 throughout all docs and skills
- [x] Schema migration 003 (v5.2–v5.5 catch-up), 004 (Gate 3), 005 (v5.6 Gate 5 columns), 006 (BA documents)
- [x] Gate 5 (Project Plan) built — projectPlanChain, plan-message.js, gate5-approve.js, ProjectPlanReview.jsx
- [x] Gate 3 Document B enriched — full brief fields, pain points, stakeholder severity, ROI framing, success criteria
- [x] BA documents pipeline built — 6 chains, 6 renderers, generate-ba-docs.js, gate1-approve.js
- [x] Retry gate API + retry button in failed state panel
- [x] Document A failure made non-fatal
- [x] All 4 BSE reference documents rebuilt for v5.6
- [x] 3 new Gates 1–5 documents for project lead (simplified, technical, flow diagram)
- [x] CLAUDE.md updated to 8 gates, 11 documents, full state machine
- [x] BSE skills updated to v5.6

---

## Session Log

| Date | Session summary | Branch |
|---|---|---|
| 21 May 2026 | v5.6 instructions, Gate 5 build, BA documents pipeline, Gate 3 enrichment, retry gate, all docs rebuilt | feature/geoff-gate5-build |

---

*Update this file at the start and end of every session. Add new items as they are identified. Move completed items to the ✅ section with the date.*
