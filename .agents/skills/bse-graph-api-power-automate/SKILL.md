# BSE Microsoft Graph API + Power Automate Cheat Sheet

---

## Microsoft Graph API Endpoints

### Upload a file to SharePoint

```
PUT /sites/{site-id}/drives/{drive-id}/root:/{folder-path}/{filename}:/content
```

### Create a folder

```
POST /sites/{site-id}/drives/{drive-id}/root:/{parent-path}:/children
Body: { "name": "FolderName", "folder": {}, "@microsoft.graph.conflictBehavior": "rename" }
```

### Authentication

`@azure/msal-node`, client credentials flow. Server-side only. Store tokens and refresh before expiry. Never expose credentials to frontend.

---

## MSAL Authentication Pattern (`@azure/msal-node`)

```javascript
import { ConfidentialClientApplication } from '@azure/msal-node'

const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  }
}

const cca = new ConfidentialClientApplication(msalConfig)

const tokenResponse = await cca.acquireTokenByClientCredential({
  scopes: ['https://graph.microsoft.com/.default']
})

// Use tokenResponse.accessToken in Authorization header
// Store token and refresh before expiry — do not re-acquire on every request
```

---

## SharePoint File Naming and Folder Structure [v5.1 CHANGE]

```
Business Solutions/
  └── [ClientName]/
        └── [YYYY]/
              ├── [ClientName]_[YYYY-MM-DD]_BusinessProposal.pdf   ← Gate 3
              ├── [ClientName]_[YYYY-MM-DD]_Brief.pdf              ← Gate 6
              ├── [ClientName]_[YYYY-MM-DD]_Proposal.pdf           ← Gate 6
              └── _internal/
                    └── [ClientName]_[YYYY-MM-DD]_ReviewReport.pdf ← internal
```

No client PII in folder paths or file names. Client name only.

---

## Power Automate Trigger Pattern

```
Vercel API route → POST to Power Automate HTTP trigger URL
```

Explicit control over when flows fire. Easy to debug. Never trigger directly from Supabase webhooks.

```javascript
// From a Vercel API route
await fetch(process.env.POWER_AUTOMATE_INTAKE_TRIGGER_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ engagementId, clientName, teamMemberId })
})
```

---

## All Seven Power Automate Flows [v5.1 CHANGE]

### Flow 1 — Client intake notification

| Field | Value |
|---|---|
| Trigger | New `engagement_inputs` with `source = 'client_intake'` |
| Action | Teams card + email to BA with engagement link |

### Flow 2 — Gate 3 — proposal send [v5.1 NEW]

| Field | Value |
|---|---|
| Trigger | BA approves Gate 3 and clicks Send |
| Action | Outlook email to `client_email` with business proposal PDF attached |
| Env var | `POWER_AUTOMATE_PROPOSAL_SEND_TRIGGER_URL` |

### Flow 3 — Review loop report delivery

| Field | Value |
|---|---|
| Trigger | `review_loop_reports` record created |
| Action | Teams message + Outlook email with full report detail |
| Env var | `POWER_AUTOMATE_REVIEW_REPORT_TRIGGER_URL` |

### Flow 4 — CC 21+ pause notification [v5.1 NEW]

| Field | Value |
|---|---|
| Trigger | ESLint pre-check detects CC 21+ file |
| Action | Teams card to BA with file list, CC scores, approve/reject link |
| Env var | `POWER_AUTOMATE_CC_PAUSE_TRIGGER_URL` |

### Flow 5 — Gate 6 approved

| Field | Value |
|---|---|
| Trigger | `gate_approvals`: `gate_number = 6`, `action = 'approved'` |
| Action | Teams + email confirmation with SharePoint links |
| Env var | `POWER_AUTOMATE_GATE6_TRIGGER_URL` |

### Flow 6 — Gate 6 rejected

| Field | Value |
|---|---|
| Trigger | `gate_approvals`: `gate_number = 6`, `action = 'rejected'` |
| Action | Teams + email alert to BA |
| Env var | `POWER_AUTOMATE_GATE6_TRIGGER_URL` |

### Flow 7 — Chain failure

| Field | Value |
|---|---|
| Trigger | `engagements.status = 'failed'` |
| Action | Teams + email alert with error summary and engagement link |
| Env var | `POWER_AUTOMATE_FAILURE_TRIGGER_URL` |

---

## All Power Automate Environment Variables [v5.1 CHANGE]

```bash
# Power Automate
POWER_AUTOMATE_INTAKE_TRIGGER_URL=
POWER_AUTOMATE_PROPOSAL_SEND_TRIGGER_URL=   # Gate 3 client send [v5.1]
POWER_AUTOMATE_CC_PAUSE_TRIGGER_URL=        # ESLint CC 21+ pause notification [v5.1]
POWER_AUTOMATE_REVIEW_REPORT_TRIGGER_URL=
POWER_AUTOMATE_GATE6_TRIGGER_URL=
POWER_AUTOMATE_FAILURE_TRIGGER_URL=
```

---

## Microsoft Graph API Environment Variables

```bash
# Microsoft Graph API
MICROSOFT_TENANT_ID=                  # Server-side only
MICROSOFT_CLIENT_ID=                  # Server-side only
MICROSOFT_CLIENT_SECRET=              # Server-side only
SHAREPOINT_SITE_ID=
SHAREPOINT_DRIVE_ID=
```

---

## Document Generation Pipeline

```
Claude JSON output
  → A4 HTML template render (comotion-a4-html-template.html)
  → Puppeteer (@sparticuz/chromium) → PDF
  → Graph API upload → SharePoint
```

**Critical:** Do not use standard `puppeteer`. Always use `puppeteer-core` + `@sparticuz/chromium`. Standard Puppeteer exceeds Vercel's serverless function size limit and will cause deployment failure.

MSAL, Puppeteer, and pptxgenjs are not edge-compatible — serverless only (not Vercel Edge Functions).

---

## Document Separation — What Goes Where

| Document | Gate | Audience | SharePoint path |
|---|---|---|---|
| Business Proposal PDF | Gate 3 | Client-facing. Delivered by Power Automate email to `client_email`. No internal pipeline data. | `[ClientName]/[YYYY]/[ClientName]_[YYYY-MM-DD]_BusinessProposal.pdf` |
| Final Client Brief PDF | Gate 6 | Client-facing. No scorecard data. | `[ClientName]/[YYYY]/[ClientName]_[YYYY-MM-DD]_Brief.pdf` |
| Review Loop Report PDF | Gate 6 | Internal only. Full review cycle detail including ESLint CC scores. Never sent to clients. | `[ClientName]/[YYYY]/_internal/[ClientName]_[YYYY-MM-DD]_ReviewReport.pdf` |
