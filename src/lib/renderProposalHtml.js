// A4 HTML renderer for Document B — Comotion-branded business proposal

const COLORS = {
  navy: '#1A3B66',
  green: '#8CC240',
  blue: '#4DBFED',
  grey: '#6B7280',
  greyLight: '#F3F4F6',
  greyMid: '#D1D5DB',
  red: '#D61C5E',
  amber: '#D97706',
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

function severityBadge(severity) {
  const color = severity === 'High' ? COLORS.red : severity === 'Medium' ? COLORS.amber : COLORS.green
  return badge(severity ?? '', color)
}

function sectionHeading(title) {
  return `<h2 style="font-size:10pt;font-weight:700;color:${COLORS.navy};text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6pt 0;">${escHtml(title)}</h2>`
}

function tableHeaderCell(label) {
  return `<th style="font-size:8pt;font-weight:700;color:${COLORS.grey};text-align:left;padding:4pt 8pt 4pt 0;border-bottom:2pt solid ${COLORS.navy};text-transform:uppercase;letter-spacing:0.04em;">${escHtml(label)}</th>`
}

function tableHeaderCellCenter(label) {
  return `<th style="font-size:8pt;font-weight:700;color:${COLORS.grey};text-align:center;padding:4pt 0;border-bottom:2pt solid ${COLORS.navy};text-transform:uppercase;letter-spacing:0.04em;">${escHtml(label)}</th>`
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
      ${sectionHeading(heading)}
      <p style="font-size:10pt;color:#374151;margin:0;line-height:1.6;">${nl2br(content ?? '')}</p>
    </div>`
}

function renderPainPoints(items) {
  if (!items?.length) return ''
  const rows = items.map(({ title, description, business_impact }) => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:22%;vertical-align:top;">${escHtml(title ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:45%;vertical-align:top;">${escHtml(description ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:33%;vertical-align:top;">${escHtml(business_impact ?? '')}</td>
    </tr>`).join('')
  const headerRow = `<tr>${tableHeaderCell('Issue')}${tableHeaderCell('Description')}${tableHeaderCell('Business Impact')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Pain Points')}
      <table style="width:100%;border-collapse:collapse;"><thead>${headerRow}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderStakeholderImpact(items) {
  if (!items?.length) return ''
  const rows = items.map(({ role, current_situation, impact_of_change, severity }) => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${escHtml(role ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:35%;vertical-align:top;">${escHtml(current_situation ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:35%;vertical-align:top;">${escHtml(impact_of_change ?? '')}</td>
      <td style="font-size:9pt;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:12%;text-align:center;vertical-align:top;">${severityBadge(severity)}</td>
    </tr>`).join('')
  const headerRow = `<tr>${tableHeaderCell('Role')}${tableHeaderCell('Current Situation')}${tableHeaderCell('Impact of Change')}${tableHeaderCellCenter('Severity')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Stakeholder Impact')}
      <table style="width:100%;border-collapse:collapse;"><thead>${headerRow}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderComplianceConsiderations(items) {
  if (!items?.length) return ''
  const bullets = items.map(item => `<li style="font-size:9pt;color:#374151;margin-bottom:3pt;">${escHtml(item)}</li>`).join('')
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Compliance & Regulatory Considerations')}
      <ul style="margin:0;padding-left:16pt;list-style-type:disc;">${bullets}</ul>
    </div>`
}

function renderKeyRisks(risks) {
  if (!risks?.length) return ''
  const rows = risks.map(({ risk, mitigation }) => `
    <tr>
      <td style="font-size:9pt;color:#374151;padding:4pt 8pt 4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:45%;vertical-align:top;">${escHtml(risk ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:55%;vertical-align:top;">${escHtml(mitigation ?? '')}</td>
    </tr>`).join('')
  const headerRow = `<tr>${tableHeaderCell('Risk')}${tableHeaderCell('Mitigation')}</tr>`
  return `<table style="width:100%;border-collapse:collapse;margin-top:4pt;"><thead>${headerRow}</thead><tbody>${rows}</tbody></table>`
}

function renderSolution(solution) {
  const s = solution ?? {}
  return `
    <div style="margin-bottom:14pt;border:1pt solid ${COLORS.greyMid};border-left:4pt solid ${COLORS.green};border-radius:4pt;padding:12pt 14pt;">
      ${sectionHeading('Recommended Solution')}
      <p style="font-size:11pt;font-weight:700;color:${COLORS.navy};margin:0 0 6pt 0;">${escHtml(s.title ?? '')}</p>
      <p style="font-size:10pt;color:#374151;margin:0 0 8pt 0;line-height:1.6;">${nl2br(s.description ?? '')}</p>
      <div style="margin-bottom:8pt;">
        ${badge('Effort: ' + (s.effort ?? '—'), COLORS.navy)}
        ${badge('Impact: ' + (s.impact ?? '—'), COLORS.green)}
        ${badge('Sequencing: ' + (s.sequencing ?? '—'), COLORS.blue)}
      </div>
      <p style="font-size:9pt;color:${COLORS.grey};margin:0 0 3pt 0;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Return on Investment</p>
      <p style="font-size:9pt;color:#374151;margin:0 0 8pt 0;line-height:1.6;">${nl2br(s.roi_framing ?? '')}</p>
      <p style="font-size:9pt;color:${COLORS.grey};margin:0 0 3pt 0;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Key Risks</p>
      ${renderKeyRisks(s.key_risks)}
    </div>`
}

function renderSuccessCriteria(items) {
  if (!items?.length) return ''
  const rows = items.map(({ criterion, measure, target }) => `
    <tr>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:40%;vertical-align:top;">${escHtml(criterion ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:35%;vertical-align:top;">${escHtml(measure ?? '')}</td>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:25%;vertical-align:top;">${escHtml(target ?? '')}</td>
    </tr>`).join('')
  const headerRow = `<tr>${tableHeaderCell('Criterion')}${tableHeaderCell('Measure')}${tableHeaderCell('Target')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Success Criteria')}
      <table style="width:100%;border-collapse:collapse;"><thead>${headerRow}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderAssumptions(items) {
  if (!items?.length) return ''
  const bullets = items.map(item => `<li style="font-size:9pt;color:#374151;margin-bottom:3pt;">${escHtml(item)}</li>`).join('')
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Assumptions')}
      <ul style="margin:0;padding-left:16pt;list-style-type:disc;">${bullets}</ul>
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
  ${renderSection('Current State', doc.current_state)}
  ${renderPainPoints(doc.pain_points)}
  ${renderStakeholderImpact(doc.stakeholder_impact)}
  ${renderComplianceConsiderations(doc.compliance_considerations)}
  ${renderSolution(doc.solution)}
  ${renderSuccessCriteria(doc.success_criteria)}
  ${renderAssumptions(doc.assumptions)}
  ${renderSection('Recommended Path Forward', doc.recommended_path)}
  ${renderFooter(doc)}
</div>
</body>
</html>`
}
