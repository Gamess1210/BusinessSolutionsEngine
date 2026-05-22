const COLORS = {
  navy: '#1A3B66',
  green: '#8CC240',
  blue: '#4DBFED',
  grey: '#6B7280',
  greyLight: '#F3F4F6',
  greyMid: '#D1D5DB',
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

function renderHeader(doc) {
  return `
    <div style="border-bottom:2pt solid ${COLORS.navy};padding-bottom:10pt;margin-bottom:16pt;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div>
          <h1 style="font-size:16pt;font-weight:700;color:${COLORS.navy};margin:0;">${esc(doc.client_name)}</h1>
          <p style="font-size:10pt;color:${COLORS.grey};margin:3pt 0 0 0;">As-Is Process Map</p>
          <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">${esc(doc.process_name ?? '')}</p>
        </div>
        <div style="text-align:right;">
          <p style="font-size:9pt;color:${COLORS.grey};margin:0;">Comotion Business Solutions</p>
          <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">${esc(doc.date ?? '')}</p>
        </div>
      </div>
    </div>`
}

function renderOverview(doc) {
  if (!doc.process_overview) return ''
  return `<div style="margin-bottom:14pt;"><p style="font-size:10pt;color:#374151;margin:0;line-height:1.6;">${esc(doc.process_overview)}</p></div>`
}

function renderStepPainPoints(points) {
  if (!points?.length) return ''
  const items = points.map(p => `<li style="font-size:8pt;color:${COLORS.red};margin-bottom:2pt;">${esc(p)}</li>`).join('')
  return `<ul style="margin:4pt 0 0 0;padding-left:14pt;list-style-type:disc;">${items}</ul>`
}

function renderSteps(steps) {
  if (!steps?.length) return ''
  const rows = steps.map(s => `
    <tr>
      <td style="font-size:8pt;font-weight:700;color:${COLORS.navy};padding:6pt 8pt 6pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:4%;vertical-align:top;text-align:center;">${esc(String(s.step_number ?? ''))}</td>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:6pt 8pt 6pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:18%;vertical-align:top;">${esc(s.title ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:6pt 8pt 6pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:30%;vertical-align:top;">${esc(s.description ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:6pt 8pt 6pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:14%;vertical-align:top;">${esc(s.actor ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:6pt 8pt 6pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:14%;vertical-align:top;">${esc(s.system ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:6pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:20%;vertical-align:top;">${renderStepPainPoints(s.pain_points)}</td>
    </tr>`).join('')
  const header = `<tr>${th('#')}${th('Step')}${th('Description')}${th('Actor')}${th('System')}${th('Pain Points')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Process Steps')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderKpis(kpis) {
  if (!kpis?.length) return ''
  const rows = kpis.map(k => `
    <tr>
      <td style="font-size:9pt;font-weight:600;color:${COLORS.navy};padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:35%;vertical-align:top;">${esc(k.metric ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 8pt 5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:30%;vertical-align:top;">${esc(k.current_value ?? '')}</td>
      <td style="font-size:9pt;color:#374151;padding:5pt 0;border-bottom:1pt solid ${COLORS.greyMid};width:35%;vertical-align:top;">${esc(k.measurement_method ?? '')}</td>
    </tr>`).join('')
  const header = `<tr>${th('KPI')}${th('Current Value')}${th('Measurement Method')}</tr>`
  return `
    <div style="margin-bottom:14pt;">
      ${sectionHeading('Process KPIs (Baseline)')}
      <table style="width:100%;border-collapse:collapse;"><thead>${header}</thead><tbody>${rows}</tbody></table>
    </div>`
}

function renderFooter(doc) {
  return `
    <div style="position:absolute;bottom:18px;left:40px;right:40px;border-top:1pt solid ${COLORS.greyMid};padding-top:6pt;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:8pt;color:${COLORS.grey};">Comotion Business Solutions — Confidential</span>
      <span style="font-size:8pt;color:${COLORS.grey};">${esc(doc.client_name ?? '')} — As-Is Process Map</span>
    </div>`
}

export function renderAsIsProcessMapHtml(doc) {
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
  ${renderOverview(doc)}
  ${renderSteps(doc.steps)}
  ${renderKpis(doc.kpis)}
  ${renderFooter(doc)}
</div>
</body>
</html>`
}
