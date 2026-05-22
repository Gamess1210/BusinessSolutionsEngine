const COLORS = {
  navy: '#1A3B66',
  green: '#8CC240',
  grey: '#6B7280',
  greyMid: '#D1D5DB',
  amber: '#D97706',
  red: '#D61C5E',
}

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function sectionHeading(title) {
  return `<h2 style="font-size:10pt;font-weight:700;color:${COLORS.navy};text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6pt 0;">${esc(title)}</h2>`
}

function th(label) {
  return `<th style="font-size:8pt;font-weight:700;color:${COLORS.grey};text-align:left;padding:4pt 8pt 4pt 0;border-bottom:2pt solid ${COLORS.navy};text-transform:uppercase;letter-spacing:0.04em;">${esc(label)}</th>`
}

function statusColor(status) {
  if (status === 'Complete') return COLORS.green
  if (status === 'In Progress') return COLORS.amber
  return COLORS.grey
}

function badge(label, color) {
  return `<span style="display:inline-block;background:${color}1a;color:${color};font-size:8pt;font-weight:600;padding:2px 8px;border-radius:999px;">${esc(label)}</span>`
}

function renderHeader(doc) {
  return `
    <div style="border-bottom:2pt solid ${COLORS.navy};padding-bottom:10pt;margin-bottom:16pt;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div>
          <h1 style="font-size:16pt;font-weight:700;color:${COLORS.navy};margin:0;">${esc(doc.client_name)}</h1>
          <p style="font-size:10pt;color:${COLORS.grey};margin:3pt 0 0 0;">Business Readiness and Change Management Plan</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:9pt;color:${COLORS.grey};margin:0;">Comotion Business Solutions</p>
          <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">${esc(doc.date ?? '')}</p>
        </div>
      </div>
    </div>`
}

function renderChangeOverview(overview) {
  if (!overview) return ''
  return `
    <div style="margin-bottom:14pt;border:1pt solid ${COLORS.greyMid};border-left:4pt solid ${COLORS.navy};border-radius:4pt;padding:12pt 14pt;">
      ${sectionHeading('Change Overview')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8pt;">
        <div><p style="font-size:8pt;font-weight:700;color:${COLORS.grey};margin:0 0 2pt 0;text-transform:uppercase;">Summary</p><p style="font-size:9pt;color:#374151;margin:0;">${esc(overview.summary ?? '')}</p></div>
        <div><p style="font-size:8pt;font-weight:700;color:${COLORS.grey};margin:0 0 2pt 0;text-transform:uppercase;">Scope</p><p style="font-size:9pt;color:#374151;margin:0;">${esc(overview.scope ?? '')}</p></div>
        <div><p style="font-size:8pt;font-weight:700;color:${COLORS.grey};margin:0 0 2pt 0;text-transform:uppercase;">Timeline</p><p style="font-size:9pt;color:#374151;margin:0;">${esc(overview.timeline ?? '')}</p></div>
        <div><p style="font-size:8pt;font-weight:700;color:${COLORS.grey};margin:0 0 2pt 0;text-transform:uppercase;">Approach</p><p style="font-size:9pt;color:#374151;margin:0;">${esc(overview.approach ?? '')}</p></div>
      </div>
    </div>`
}

function renderCommsPlan(items) {
  if (!items?.length) return ''
  const rows = items.map(c => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:16%;vertical-align:top;">${esc(c.audience ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:30%;vertical-align:top;">${esc(c.message ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(c.channel ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(c.timing ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(c.owner ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('Audience')}${th('Message')}${th('Channel')}${th('Timing')}${th('Owner')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Communication Plan')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderTrainingPlan(items) {
  if (!items?.length) return ''
  const rows = items.map(t => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(t.group ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:32%;vertical-align:top;">${esc(t.content ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(t.format ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:14%;vertical-align:top;">${esc(t.duration ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(t.timing ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('Group')}${th('Content')}${th('Format')}${th('Duration')}${th('Timing')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Training Plan')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderBulletList(heading, items) {
  if (!items?.length) return ''
  const bullets = items.map(item => `<li style="font-size:9pt;color:#374151;margin-bottom:3pt;">${esc(item)}</li>`).join('')
  return `<div style="margin-bottom:14pt;">${sectionHeading(heading)}<ul style="margin:0;padding-left:16pt;list-style-type:disc;">${bullets}</ul></div>`
}

function renderGoLiveChecklist(items) {
  if (!items?.length) return ''
  const rows = items.map(g => `
    <tr>
      <td style="font-size:9pt;color:#374151;padding:4pt 8pt 4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:42%;vertical-align:top;">${esc(g.item ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:4pt 8pt 4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:20%;vertical-align:top;">${esc(g.owner ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:4pt 8pt 4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:20%;vertical-align:top;">${esc(g.due_date ?? '')}</td>
      <td style="font-size:9pt;padding:4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;text-align:center;vertical-align:top;">${badge(g.status ?? 'Not Started', statusColor(g.status))}</td>
    </tr>`).join('')
  const header = `<tr>${th('Item')}${th('Owner')}${th('Due')}${th('Status')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Go-Live Readiness Checklist')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderRollbackPlan(items) {
  if (!items?.length) return ''
  const rows = items.map((r, i) => `
    <tr>
      <td style="font-size:8pt;font-weight:700;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:5%;vertical-align:top;text-align:center;">${i + 1}</td>
      <td style="font-size:9pt;color:${COLORS.red};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:32%;vertical-align:top;font-style:italic;">${esc(r.trigger ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:45%;vertical-align:top;">${esc(r.step ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(r.owner ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('#')}${th('Trigger')}${th('Action')}${th('Owner')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Rollback Plan')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderPostGoLive(items) {
  if (!items?.length) return ''
  const rows = items.map(p => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:45%;vertical-align:top;">${esc(p.activity ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:30%;vertical-align:top;">${esc(p.duration ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:25%;vertical-align:top;">${esc(p.owner ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('Activity')}${th('Duration')}${th('Owner')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Post Go-Live Support')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderFooter(doc) {
  return `
    <div style="position:absolute;bottom:18px;left:40px;right:40px;border-top:1pt solid ${COLORS.greyMid};padding-top:6pt;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:8pt;color:${COLORS.grey};">Comotion Business Solutions — Confidential</span>
      <span style="font-size:8pt;color:${COLORS.grey};">${esc(doc.client_name ?? '')} — Change Management Plan</span>
    </div>`
}

export function renderChangeManagementHtml(doc) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .page { width: 794px; min-height: 1122px; position: relative; padding: 26px 40px 62px 40px; background: #fff; }
  @media print { .page { width: 210mm; height: 297mm; overflow: hidden; } }
</style>
</head>
<body>
<div class="page">
  ${renderHeader(doc)}
  ${renderChangeOverview(doc.change_overview)}
  ${renderCommsPlan(doc.comms_plan)}
  ${renderTrainingPlan(doc.training_plan)}
  ${renderBulletList('Process Documentation Updates', doc.process_docs)}
  ${renderGoLiveChecklist(doc.go_live_checklist)}
  ${renderRollbackPlan(doc.rollback_plan)}
  ${renderPostGoLive(doc.post_golive_support)}
  ${renderFooter(doc)}
</div>
</body>
</html>`
}
