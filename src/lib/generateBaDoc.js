import { asIsProcessMapChain } from './chains/asIsProcessMapChain.js'
import { brdChain } from './chains/brdChain.js'
import { stakeholderImpactChain } from './chains/stakeholderImpactChain.js'
import { toBeProcessMapChain } from './chains/toBeProcessMapChain.js'
import { rtmChain } from './chains/rtmChain.js'
import { changeManagementChain } from './chains/changeManagementChain.js'
import { renderAsIsProcessMapHtml } from './renderAsIsProcessMapHtml.js'
import { renderBrdHtml } from './renderBrdHtml.js'
import { renderStakeholderImpactHtml } from './renderStakeholderImpactHtml.js'
import { renderToBeProcessMapHtml } from './renderToBeProcessMapHtml.js'
import { renderRtmHtml } from './renderRtmHtml.js'
import { renderChangeManagementHtml } from './renderChangeManagementHtml.js'
import { generatePdf } from './generatePdf.js'
import { uploadToSharePoint } from './sharepoint.js'

export const DOC_TYPE_CONFIG = {
  asis: {
    chain: asIsProcessMapChain,
    renderer: renderAsIsProcessMapHtml,
    columnName: 'sharepoint_asis_url',
    filenameSuffix: 'AsIsProcessMap',
  },
  brd: {
    chain: brdChain,
    renderer: renderBrdHtml,
    columnName: 'sharepoint_brd_url',
    filenameSuffix: 'BRD',
  },
  sia: {
    chain: stakeholderImpactChain,
    renderer: renderStakeholderImpactHtml,
    columnName: 'sharepoint_sia_url',
    filenameSuffix: 'StakeholderImpactAssessment',
  },
  tobe: {
    chain: toBeProcessMapChain,
    renderer: renderToBeProcessMapHtml,
    columnName: 'sharepoint_tobe_url',
    filenameSuffix: 'ToBeProcessMap',
  },
  rtm: {
    chain: rtmChain,
    renderer: renderRtmHtml,
    columnName: 'sharepoint_rtm_url',
    filenameSuffix: 'RTM',
    jsonColumn: 'rtm_data',
  },
  'change-mgmt': {
    chain: changeManagementChain,
    renderer: renderChangeManagementHtml,
    columnName: 'sharepoint_change_mgmt_url',
    filenameSuffix: 'ChangeManagementPlan',
  },
}

function isSharePointConfigured() {
  const vars = ['MICROSOFT_TENANT_ID', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'SHAREPOINT_SITE_ID', 'SHAREPOINT_DRIVE_ID']
  return vars.every(v => process.env[v])
}

function buildFilename(clientName, filenameSuffix) {
  const date = new Date().toISOString().slice(0, 10)
  const safe = (clientName ?? 'Unknown').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return { filename: `${safe}_${date}_${filenameSuffix}.pdf`, date }
}

async function getFullEngagement(supabaseAdmin, engagementId) {
  const { data, error } = await supabaseAdmin.from('engagements').select('*').eq('id', engagementId).single()
  if (error) throw error
  return data
}

async function tryUpload(buffer, engagement, filenameSuffix) {
  if (!isSharePointConfigured()) {
    console.warn('[BSE] SharePoint upload skipped — Microsoft credentials not configured')
    return null
  }
  const { filename, date } = buildFilename(engagement.client_name, filenameSuffix)
  return uploadToSharePoint({ buffer, filename, clientName: engagement.client_name, date })
}

async function persistResult(supabaseAdmin, engagementId, config, url, docJson) {
  const update = { [config.columnName]: url }
  if (config.jsonColumn) update[config.jsonColumn] = docJson
  const { error } = await supabaseAdmin.from('engagements').update(update).eq('id', engagementId)
  if (error) throw error
}

export async function generateBaDoc(supabaseAdmin, engagementId, docType, chainInput = {}) {
  const config = DOC_TYPE_CONFIG[docType]
  if (!config) return { success: false, warning: `Unknown doc_type: ${docType}` }
  try {
    const engagement = await getFullEngagement(supabaseAdmin, engagementId)
    const docJson = await config.chain({ engagement, ...chainInput })
    const html = config.renderer(docJson)
    const pdfBuffer = await generatePdf(html)
    const url = pdfBuffer !== null ? await tryUpload(pdfBuffer, engagement, config.filenameSuffix) : null
    await persistResult(supabaseAdmin, engagementId, config, url, docJson)
    return { success: true, url }
  } catch (err) {
    const warning = `generateBaDoc(${docType}) failed for ${engagementId}: ${err.message}`
    console.warn(`[BSE] ${warning}`)
    return { success: false, warning }
  }
}
