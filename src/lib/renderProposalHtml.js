// A4 HTML renderer for Document B — Comotion-branded business proposal

const COLORS = {
  navy: '#1A3B66',
  green: '#8CC240',
  blue: '#4DBFED',
  grey: '#6B7280',
  greyLight: '#F3F4F6',
  greyMid: '#D1D5DB',
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nl2br(str) {
  return escHtml(str).replace(/\n/g, '<br/>')
}

function badge(value, color) {
  return `<span style="display:inline-block;background:${color}1a;color:${color};font-size:8pt;font-weight:600;padding:2px 8px;border-radius:999px;margin-right:4px;">${escHtml(value)}</span>`
}

function renderHeader(doc) {
  return `
    <div style="border-bottom:2pt solid ${COLORS.navy};padding-bottom:10pt;margin-bottom:16pt;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div>
          <h1 style="font-size:16pt;font-weight:700;color:${COLORS.navy};margin:0;">${escHtml(doc.document_title ?? doc.client_name)}</h1>
          <p style="font-size:10pt;color:${COLORS.grey};margin:3pt 0 0 0;">Business Proposal</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:9pt;color:${COLORS.grey};margin:0;">Comotion Business Solutions</p>
          <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">${escHtml(doc.client_name ?? '')}</p>
          <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">${escHtml(doc.date ?? '')}</p>
        </div>
      </div>
    </div>`
}

function renderSection(heading, content) {
  return `
    <div style="margin-bottom:14pt;">
      <h2 style="font-size:10pt;font-weight:700;color:${COLORS.navy};text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4pt 0;">${escHtml(heading)}</h2>
      <p style="font-size:10pt;color:#374151;margin:0;line-height:1.6;">${nl2br(content ?? '')}</p>
    </div>`
}

function renderStakeholderImpact(items) {
  const rows = (items ?? []).map(({ role, impact }) => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:4pt 8pt 4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:30%;">${escHtml(role ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:4pt 0;border-bottom:1pt solid ${COLORS.greyMid};">${escHtml(impact ?? '')}</td>
    </tr>`).join('')
  return `
    <div style="margin-bottom:14pt;">
      <h2 style="font-size:10pt;font-weight:700;color:${COLORS.navy};text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6pt 0;">Stakeholder Impact</h2>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`
}

function renderSolution(solution) {
  const s = solution ?? {}
  return `
    <div style="margin-bottom:14pt;border:1pt solid ${COLORS.greyMid};border-left:4pt solid ${COLORS.green};border-radius:4pt;padding:12pt 14pt;">
      <h2 style="font-size:10pt;font-weight:700;color:${COLORS.navy};text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6pt 0;">Recommended Solution</h2>
      <p style="font-size:11pt;font-weight:700;color:${COLORS.navy};margin:0 0 6pt 0;">${escHtml(s.title ?? '')}</p>
      <p style="font-size:10pt;color:#374151;margin:0 0 8pt 0;line-height:1.6;">${nl2br(s.description ?? '')}</p>
      <div style="margin-bottom:6pt;">
        ${badge('Effort: ' + (s.effort ?? '—'), COLORS.navy)}
        ${badge('Impact: ' + (s.impact ?? '—'), COLORS.green)}
        ${badge('Sequencing: ' + (s.sequencing ?? '—'), COLORS.blue)}
      </div>
      <p style="font-size:9pt;color:${COLORS.grey};margin:4pt 0 2pt 0;font-weight:600;">Key Risk</p>
      <p style="font-size:9pt;color:#374151;margin:0;">${escHtml(s.key_risk ?? '')}</p>
    </div>`
}

function renderFooter(doc) {
  return `
    <div style="position:absolute;bottom:18px;left:40px;right:40px;border-top:1pt solid ${COLORS.greyMid};padding-top:6pt;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:8pt;color:${COLORS.grey};">${escHtml(doc.footer_note ?? 'Comotion Business Solutions — Confidential')}</span>
      <span style="font-size:8pt;color:${COLORS.grey};">${escHtml(doc.client_name ?? '')}</span>
    </div>`
}

export function renderProposalHtml(doc) {
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
  ${renderSection('Executive Summary', doc.executive_summary)}
  ${renderSection('Problem Statement', doc.problem_statement)}
  ${renderStakeholderImpact(doc.stakeholder_impact)}
  ${renderSolution(doc.solution)}
  ${renderSection('Recommended Path Forward', doc.recommended_path)}
  ${renderFooter(doc)}
</div>
</body>
</html>`
}
