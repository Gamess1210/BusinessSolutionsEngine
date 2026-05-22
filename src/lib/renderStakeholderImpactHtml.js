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

function impactColor(level) {
  if (level === 'High') return COLORS.red
  if (level === 'Medium') return COLORS.amber
  return COLORS.green
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
          <p style="font-size:10pt;color:${COLORS.grey};margin:3pt 0 0 0;">Stakeholder Impact Assessment</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:9pt;color:${COLORS.grey};margin:0;">Comotion Business Solutions</p>
          <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">${esc(doc.date ?? '')}</p>
        </div>
      </div>
    </div>`
}

function renderImpactSummary(items) {
  if (!items?.length) return ''
  const rows = items.map(s => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:22%;vertical-align:top;">${esc(s.stakeholder_group ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:15%;vertical-align:top;">${esc(s.count ?? '')}</td>
      <td style="font-size:9pt;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:13%;text-align:center;vertical-align:top;">${badge(s.impact_level ?? '', impactColor(s.impact_level))}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:50%;vertical-align:top;">${esc(s.key_changes ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('Stakeholder Group')}${th('Count')}${th('Impact')}${th('Key Changes')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Impact Summary')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderDimension(heading, text) {
  if (!text) return ''
  return `
    <div style="margin-bottom:10pt;padding:10pt 14pt;border-left:4pt solid ${COLORS.navy};background:${COLORS.navy}08;border-radius:2pt;">
      <p style="font-size:9pt;font-weight:700;color:${COLORS.navy};margin:0 0 4pt 0;text-transform:uppercase;letter-spacing:0.04em;">${esc(heading)}</p>
      <p style="font-size:9pt;color:#374151;margin:0;line-height:1.5;">${esc(text)}</p>
    </div>`
}

function renderDimensions(doc) {
  const hasDimension = doc.people_impact || doc.process_impact || doc.technology_impact || doc.regulatory_impact
  if (!hasDimension) return ''
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Impact by Dimension')}
      ${renderDimension('People', doc.people_impact)}
      ${renderDimension('Process', doc.process_impact)}
      ${renderDimension('Technology', doc.technology_impact)}
      ${renderDimension('Regulatory', doc.regulatory_impact)}
    </div>`
}

function renderRisks(items) {
  if (!items?.length) return ''
  const rows = items.map(r => `
    <tr>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:40%;vertical-align:top;">${esc(r.risk ?? '')}</td>
      <td style="font-size:9pt;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:12%;text-align:center;vertical-align:top;">${badge(r.impact ?? '', impactColor(r.impact))}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:48%;vertical-align:top;">${esc(r.mitigation ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('Risk')}${th('Impact')}${th('Mitigation')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Risk Assessment')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderReadiness(items) {
  if (!items?.length) return ''
  const rows = items.map(r => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(r.area ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:27%;vertical-align:top;">${esc(r.current_state ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:27%;vertical-align:top;">${esc(r.target_state ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:28%;vertical-align:top;">${esc(r.gap ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('Area')}${th('Current State')}${th('Target State')}${th('Gap')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Readiness Assessment')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderFooter(doc) {
  return `
    <div style="position:absolute;bottom:18px;left:40px;right:40px;border-top:1pt solid ${COLORS.greyMid};padding-top:6pt;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:8pt;color:${COLORS.grey};">Comotion Business Solutions — Confidential</span>
      <span style="font-size:8pt;color:${COLORS.grey};">${esc(doc.client_name ?? '')} — Stakeholder Impact Assessment</span>
    </div>`
}

export function renderStakeholderImpactHtml(doc) {
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
  ${renderImpactSummary(doc.impact_summary)}
  ${renderDimensions(doc)}
  ${renderRisks(doc.risks)}
  ${renderReadiness(doc.readiness)}
  ${renderFooter(doc)}
</div>
</body>
</html>`
}
