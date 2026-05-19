// A4 HTML renderer for Document A — Solution Options Summary
// Uses Comotion A4 page structure. Not a formal branded proposal.

const COLORS = {
  navy: '#1A3B66',
  green: '#8CC240',
  blue: '#4DBFED',
  grey: '#6B7280',
  greyLight: '#F3F4F6',
  greyMid: '#D1D5DB',
}

function badge(label, value, color) {
  return `<span style="display:inline-block;background:${color}1a;color:${color};font-size:8pt;font-weight:600;padding:2px 8px;border-radius:999px;margin-right:6px;">${label}: ${value}</span>`
}

function renderQuickOption(opt, index) {
  return `
    <div style="border:1pt solid ${COLORS.greyMid};border-left:4pt solid ${COLORS.blue};border-radius:4pt;padding:12pt 14pt;margin-bottom:10pt;break-inside:avoid;">
      <div style="display:flex;align-items:flex-start;gap:10pt;margin-bottom:6pt;">
        <span style="background:${COLORS.navy};color:#fff;font-size:8pt;font-weight:700;border-radius:999px;width:18pt;height:18pt;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${index + 1}</span>
        <strong style="font-size:11pt;color:${COLORS.navy};">${escHtml(opt.title ?? '')}</strong>
      </div>
      <p style="font-size:10pt;color:#374151;margin:0 0 8pt 0;line-height:1.5;">${escHtml(opt.description ?? '')}</p>
      <div>
        ${badge('Effort', opt.effort ?? '—', COLORS.navy)}
        ${badge('Impact', opt.impact ?? '—', COLORS.green)}
        ${badge('Key Risk', opt.key_risk ?? '—', COLORS.grey)}
      </div>
    </div>`
}

function renderRisksList(risks) {
  if (!risks.length) return ''
  const items = risks.map(r => `<li style="font-size:9pt;color:#374151;">${escHtml(r)}</li>`).join('')
  return `<p style="font-size:9pt;color:${COLORS.grey};margin:0 0 2pt 0;font-weight:600;">Risks</p><ul style="margin:4pt 0 0 0;padding-left:14pt;">${items}</ul>`
}

function renderDeepOption(opt, index) {
  const risks = Array.isArray(opt.risks) ? opt.risks : []
  return `
    <div style="border:1pt solid ${COLORS.greyMid};border-left:4pt solid ${COLORS.blue};border-radius:4pt;padding:12pt 14pt;margin-bottom:10pt;break-inside:avoid;">
      <div style="display:flex;align-items:flex-start;gap:10pt;margin-bottom:6pt;">
        <span style="background:${COLORS.navy};color:#fff;font-size:8pt;font-weight:700;border-radius:999px;width:18pt;height:18pt;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${index + 1}</span>
        <strong style="font-size:11pt;color:${COLORS.navy};">${escHtml(opt.title ?? '')}</strong>
      </div>
      <p style="font-size:10pt;color:#374151;margin:0 0 8pt 0;line-height:1.5;">${escHtml(opt.description ?? '')}</p>
      <div style="margin-bottom:6pt;">
        ${badge('Complexity', opt.complexity ?? '—', COLORS.navy)}
        ${badge('Sequencing', opt.sequencing ?? '—', COLORS.green)}
        ${badge('AI Central', opt.ai_central ? 'Yes' : 'No', COLORS.blue)}
      </div>
      <p style="font-size:9pt;color:${COLORS.grey};margin:0 0 2pt 0;font-weight:600;">Feasibility</p>
      <p style="font-size:9pt;color:#374151;margin:0 0 6pt 0;">${escHtml(opt.feasibility ?? '')}</p>
      <p style="font-size:9pt;color:${COLORS.grey};margin:0 0 2pt 0;font-weight:600;">ROI Framing</p>
      <p style="font-size:9pt;color:#374151;margin:0 0 6pt 0;">${escHtml(opt.roi_framing ?? '')}</p>
      ${renderRisksList(risks)}
    </div>`
}

function renderOption(opt, index, isDeep) {
  return isDeep ? renderDeepOption(opt, index) : renderQuickOption(opt, index)
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderDocumentAHtml(docAJson) {
  const { engagement_title, client_name, generated_date, options = [] } = docAJson
  const isDeep = options.length === 5

  const optionsHtml = options.map((opt, i) => renderOption(opt, i, isDeep)).join('')

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
  <!-- Header -->
  <div style="border-bottom:2pt solid ${COLORS.navy};padding-bottom:10pt;margin-bottom:16pt;">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <div>
        <h1 style="font-size:16pt;font-weight:700;color:${COLORS.navy};margin:0;">${escHtml(engagement_title ?? client_name ?? '')}</h1>
        <p style="font-size:10pt;color:${COLORS.grey};margin:3pt 0 0 0;">Solution Options Summary</p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:9pt;color:${COLORS.grey};margin:0;">Comotion Business Solutions</p>
        <p style="font-size:9pt;color:${COLORS.grey};margin:2pt 0 0 0;">${escHtml(generated_date ?? '')}</p>
      </div>
    </div>
  </div>

  <!-- Intro -->
  <p style="font-size:10pt;color:#374151;margin:0 0 14pt 0;line-height:1.5;">
    The following ${options.length} solution option${options.length !== 1 ? 's have' : ' has'} been reviewed and approved for consideration.
    This document is for internal reference and client discussion — it is not a formal proposal.
  </p>

  <!-- Options -->
  ${optionsHtml}

  <!-- Footer -->
  <div style="position:absolute;bottom:18px;left:40px;right:40px;border-top:1pt solid ${COLORS.greyMid};padding-top:6pt;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:8pt;color:${COLORS.grey};">Comotion Business Solutions — Confidential</span>
    <span style="font-size:8pt;color:${COLORS.grey};">${escHtml(client_name ?? '')}</span>
  </div>
</div>
</body>
</html>`
}
