## Why

After Gate 2 approval the engagement sits at `proposal_pending` with no automated next step — the BA must manually compile solution options and share them. Automating Document A generation removes that manual step, ensures consistent Comotion-branded output, and files the document to SharePoint immediately so it is ready for the BA to share with the client.

## What Changes

- New Vercel API route `POST /api/pipeline/generate-document-a` triggers Document A generation after Gate 2 approval
- `proposalGenerationChain` extended (or a dedicated `documentAGenerationChain` created) to produce solution options JSON for Document A
- A4 HTML render of all approved solution options using `comotion-a4-html-template.html`
- Puppeteer (@sparticuz/chromium) converts HTML → PDF
- Microsoft Graph API uploads PDF to SharePoint as `[ClientName]_[YYYY-MM-DD]_SolutionOptions.pdf`
- `engagements.sharepoint_solution_options_url` column added to store the SharePoint file URL
- Status advances `proposal_pending → gate3_review` on success; on failure `status = failed`, `last_successful_gate = 2`, `error_log` populated
- EngagementDetail UI displays the Document A SharePoint link once available

## Capabilities

### New Capabilities

- `document-a-generation`: Automated generation, HTML render, PDF conversion, and SharePoint filing of the Solution Options Summary (Document A) triggered by Gate 2 approval

### Modified Capabilities

- `gate2-solutions-review`: Approval action must trigger Document A generation pipeline and advance status to `gate3_review` only after successful filing

## Impact

- **API**: new route `api/pipeline/generate-document-a`
- **Chains**: new or extended chain in `src/lib/chains/` for Document A JSON generation
- **Database**: `engagements` table — add `sharepoint_solution_options_url` (text, nullable)
- **Dependencies**: `@sparticuz/chromium`, `puppeteer-core`, `@microsoft/microsoft-graph-client` (already used for Gate 3 proposal)
- **Status machine**: `proposal_pending` now triggers automated generation before `gate3_review`
- **Frontend**: EngagementDetail shows Document A URL when present
