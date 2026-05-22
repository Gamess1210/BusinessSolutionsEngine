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

function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function sectionHeading(title) {
  return `<h2 style="font-size:10pt;font-weight:700;color:${COLORS.navy};text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6pt 0;">${esc(title)}</h2>`
}

function th(label) {
  return `<th style="font-size:8pt;font-weight:700;color:${COLORS.grey};text-align:left;padding:4pt 8pt 4pt 0;border-bottom:2pt solid ${COLORS.navy};text-transform:uppercase;letter-spacing:0.04em;">${esc(label)}</th>`
}

function moscowColor(moscow) {
  if (moscow === 'Must') return COLORS.red
  if (moscow === 'Should') return COLORS.amber
  if (moscow === 'Could') return COLORS.green
  return COLORS.grey
}

function badge(label, color) {
  return `<span style="display:inline-block;background:${color}1a;color:${color};font-size:8pt;font-weight:600;padding:2px 8px;border-radius:999px;">${esc(label)}</span>`
}

function influenceBadge(level) {
  const color = level === 'High' ? COLORS.red : level === 'Medium' ? COLORS.amber : COLORS.green
  return badge(level ?? '', color)
}

function renderHeader(doc) {
  return `
    <div style="border-bottom:2pt solid ${COLORS.navy};padding-bottom:10pt;margin-bottom:16pt;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div>
          <h1 style="font-size:16pt;font-weight:700;color:${COLORS.navy};margin:0;">${esc(doc.client_name)}</h1>
          <p style="font-size:10pt;color:${COLORS.grey};margin:3pt 0 0 0;">Business Requirements Document</p>
          <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">${esc(doc.organisation ?? '')}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:9pt;color:${COLORS.grey};margin:0;">Comotion Business Solutions</p>
          <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">Version ${esc(doc.version ?? '1.0')}</p>
          <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">${esc(doc.date ?? '')}</p>
        </div>
      </div>
    </div>`
}

function renderSection(heading, text) {
  if (!text) return ''
  return `<div style="margin-bottom:14pt;">${sectionHeading(heading)}<p style="font-size:10pt;color:#374151;margin:0;line-height:1.6;">${esc(text)}</p></div>`
}

function renderScopeTable(scopeIn, scopeOut) {
  if (!scopeIn?.length && !scopeOut?.length) return ''
  const maxRows = Math.max((scopeIn ?? []).length, (scopeOut ?? []).length)
  const rows = Array.from({ length: maxRows }, (_, i) => `
    <tr>
      <td style="font-size:9pt;color:#374151;padding:4pt 8pt 4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:50%;vertical-align:top;">${i < (scopeIn ?? []).length ? esc(scopeIn[i]) : ''}</td>
      <td style="font-size:9pt;color:#374151;padding:4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:50%;vertical-align:top;">${i < (scopeOut ?? []).length ? esc(scopeOut[i]) : ''}</td>
    </tr>`).join('')
  const header = `<tr>${th('In Scope')}${th('Out of Scope')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Scope')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderStakeholders(items) {
  if (!items?.length) return ''
  const rows = items.map(s => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:20%;vertical-align:top;">${esc(s.name ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:20%;vertical-align:top;">${esc(s.role ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:42%;vertical-align:top;">${esc(s.interest ?? '')}</td>
      <td style="font-size:9pt;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;text-align:center;vertical-align:top;">${influenceBadge(s.influence)}</td>
    </tr>`).join('')
  const header = `<tr>${th('Stakeholder')}${th('Role')}${th('Interest')}${th('Influence')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Stakeholders')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderRequirements(items) {
  if (!items?.length) return ''
  const rows = items.map(r => `
    <tr>
      <td style="font-size:8pt;font-weight:700;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:8%;vertical-align:top;">${esc(r.id ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:38%;vertical-align:top;">${esc(r.description ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(r.category ?? '')}</td>
      <td style="font-size:9pt;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:12%;text-align:center;vertical-align:top;">${badge(r.moscow ?? '', moscowColor(r.moscow))}</td>
      <td style="font-size:9pt;color:${COLORS.grey};padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:24%;vertical-align:top;">${esc(r.notes ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('ID')}${th('Requirement')}${th('Category')}${th('MoSCoW')}${th('Notes')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Business Requirements')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderBulletList(heading, items) {
  if (!items?.length) return ''
  const bullets = items.map(item => `<li style="font-size:9pt;color:#374151;margin-bottom:3pt;">${esc(item)}</li>`).join('')
  return `<div style="margin-bottom:14pt;">${sectionHeading(heading)}<ul style="margin:0;padding-left:16pt;list-style-type:disc;">${bullets}</ul></div>`
}

function renderSuccessCriteria(items) {
  if (!items?.length) return ''
  const rows = items.map(s => `
    <tr>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:40%;vertical-align:top;">${esc(s.criterion ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:35%;vertical-align:top;">${esc(s.measure ?? '')}</td>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:25%;vertical-align:top;">${esc(s.target ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('Criterion')}${th('Measure')}${th('Target')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Success Criteria')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderGlossary(items) {
  if (!items?.length) return ''
  const rows = items.map(g => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:4pt 8pt 4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:25%;vertical-align:top;">${esc(g.term ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:4pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:75%;vertical-align:top;">${esc(g.definition ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('Term')}${th('Definition')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Glossary')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderFooter(doc) {
  return `
    <div style="position:absolute;bottom:18px;left:40px;right:40px;border-top:1pt solid ${COLORS.greyMid};padding-top:6pt;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:8pt;color:${COLORS.grey};">Comotion Business Solutions — Confidential</span>
      <span style="font-size:8pt;color:${COLORS.grey};">${esc(doc.client_name ?? '')} — BRD v${esc(doc.version ?? '1.0')}</span>
    </div>`
}

export function renderBrdHtml(doc) {
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
  ${renderSection('Business Context', doc.business_context)}
  ${renderScopeTable(doc.scope_in, doc.scope_out)}
  ${renderStakeholders(doc.stakeholders)}
  ${renderRequirements(doc.requirements)}
  ${renderBulletList('Compliance & Regulatory Requirements', doc.compliance)}
  ${renderSuccessCriteria(doc.success_criteria)}
  ${renderBulletList('Assumptions', doc.assumptions)}
  ${renderGlossary(doc.glossary)}
  ${renderFooter(doc)}
</div>
</body>
</html>`
}
