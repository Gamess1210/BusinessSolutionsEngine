## Why

The BSE pipeline captures rich structured data at every gate, but only generates two client documents today (Document A — Solution Options, Document B — Business Proposal). Six BA-standard documents that financial services clients expect — As-Is Process Map, BRD, SIA, To-Be Process Map, RTM, and Change Management Plan — are currently produced manually outside the system, creating inconsistency and rework. All the data required to generate them already exists in the pipeline.

## What Changes

- **New API route** `POST /api/pipeline/generate-ba-docs` — accepts `doc_type` and `engagementId`, generates and files one BA document. Called from gate approval routes at the appropriate gate.
- **Six new LangChain chains** (all Claude, all in `src/lib/chains/`): `asIsProcessMapChain`, `brdChain`, `stakeholderImpactChain`, `toBeProcessMapChain`, `rtmChain`, `changeManagementChain`
- **Six new HTML renderers** (all A4, all following `comotion-a4-html-template.html` standard) in `src/lib/`
- **Six new `engagements` columns** for SharePoint URLs: `sharepoint_asis_url`, `sharepoint_brd_url`, `sharepoint_sia_url`, `sharepoint_tobe_url`, `sharepoint_rtm_url`, `sharepoint_change_mgmt_url`
- **Gate approval routes updated** to fire `generate-ba-docs` at the correct gate — non-fatal (failure logs warning, does not block gate progression)

Trigger schedule:
| Document | Triggered after | doc_type |
|---|---|---|
| As-Is Process Map | Gate 1 approval | `asis` |
| BRD | Gate 1 approval | `brd` |
| SIA | Gate 3 approval | `sia` |
| To-Be Process Map | Gate 6 approval | `tobe` |
| RTM (initial) | Gate 1 approval | `rtm` |
| RTM (update) | Gate 6 approval | `rtm` |
| RTM (final) | Gate 7 approval | `rtm` |
| Change Management Plan | Gate 7 approval | `change-mgmt` |

## Capabilities

### New Capabilities

- `ba-documents-pipeline`: Single API route and six document generation chains for producing and filing BA-standard documents at specific gates. Each chain receives engagement data, generates A4 HTML content via Claude, converts to PDF via Puppeteer, and uploads to SharePoint (skipped locally). All generations are non-fatal.

### Modified Capabilities

- `gate2-approve-api`: No requirement changes — Gate 2 is not a trigger for any BA document.

## Impact

- **New files**: `api/pipeline/generate-ba-docs.js`, six chain files, six renderer files, one shared `generateBaDoc` helper
- **Modified gate routes**: `gate1-approve.js` (fire asis + brd + rtm), `gate3-generate.js` or proposal send route (fire sia), `gate6-approve.js` (fire tobe + rtm update), `gate7-approve.js` (fire rtm final + change-mgmt)
- **Database**: six new nullable text columns on `engagements`
- **No breaking changes** — all additions; existing document generation (Document A, B) unchanged
- **Dependencies**: `@sparticuz/chromium`, `puppeteer-core`, `@langchain/anthropic` (already installed)
