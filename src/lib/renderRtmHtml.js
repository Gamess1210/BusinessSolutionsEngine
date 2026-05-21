const COLORS = {
  navy: '#1A3B66',
  green: '#8CC240',
  grey: '#6B7280',
  greyMid: '#D1D5DB',
  red: '#D61C5E',
  amber: '#D97706',
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
  if (status === 'Pass') return COLORS.green
  if (status === 'Fail') return COLORS.red
  if (status === 'Not Tested') return COLORS.grey
  return COLORS.amber
}

function statusBadge(status) {
  const color = statusColor(status)
  return `<span style="display:inline-block;background:${color}1a;color:${color};font-size:8pt;font-weight:600;padding:2px 8px;border-radius:999px;">${esc(status ?? '')}</span>`
}

function renderHeader(doc) {
  const versionLabel = doc.version === 'final' ? 'Final' : doc.version === 'v2' ? 'v2 — Requirements + Spec' : 'v1 — Requirements Only'
  return `
    <div style="border-bottom:2pt solid ${COLORS.navy};padding-bottom:10pt;margin-bottom:16pt;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div>
          <h1 style="font-size:16pt;font-weight:700;color:${COLORS.navy};margin:0;">${esc(doc.client_name)}</h1>
          <p style="font-size:10pt;color:${COLORS.grey};margin:3pt 0 0 0;">Requirements Traceability Matrix</p>
          <p style="font-size:9pt;color:${COLORS.navy};font-weight:600;margin:2pt 0 0 0;">${esc(versionLabel)}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:9pt;color:${COLORS.grey};margin:0;">Comotion Business Solutions</p>
          <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">${esc(doc.date ?? '')}</p>
        </div>
      </div>
    </div>`
}

function renderEntries(entries) {
  if (!entries?.length) return ''
  const rows = entries.map(e => `
    <tr>
      <td style="font-size:8pt;font-weight:700;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:8%;vertical-align:top;">${esc(e.requirement_id ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:24%;vertical-align:top;">${esc(e.requirement ?? '')}</td>
      <td style="font-size:8pt;color:${COLORS.grey};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:12%;vertical-align:top;">${esc(e.category ?? '')}</td>
      <td style="font-size:8pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(e.openspec_scenario ?? '')}</td>
      <td style="font-size:8pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(e.user_story ?? '')}</td>
      <td style="font-size:8pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:12%;vertical-align:top;">${esc(e.test_case ?? '')}</td>
      <td style="font-size:8pt;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:8%;text-align:center;vertical-align:top;">${statusBadge(e.test_status)}</td>
    </tr>`).join('')
  const header = `<tr>${th('ID')}${th('Requirement')}${th('Category')}${th('OpenSpec Scenario')}${th('User Story')}${th('Test Case')}${th('Status')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Traceability Matrix')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderFooter(doc) {
  const versionLabel = doc.version === 'final' ? 'Final' : doc.version === 'v2' ? 'v2' : 'v1 — Requirements Only'
  return `
    <div style="position:absolute;bottom:18px;left:40px;right:40px;border-top:1pt solid ${COLORS.greyMid};padding-top:6pt;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:8pt;color:${COLORS.grey};">Comotion Business Solutions — Confidential</span>
      <span style="font-size:8pt;color:${COLORS.grey};">${esc(doc.client_name ?? '')} — RTM ${esc(versionLabel)}</span>
    </div>`
}

export function renderRtmHtml(doc) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4 landscape; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .page { width: 1122px; min-height: 794px; position: relative; padding: 26px 40px 62px 40px; background: #fff; }
  @media print { .page { width: 297mm; height: 210mm; overflow: hidden; } }
</style>
</head>
<body>
<div class="page">
  ${renderHeader(doc)}
  ${renderEntries(doc.entries)}
  ${renderFooter(doc)}
</div>
</body>
</html>`
}
