import { createClient } from '@supabase/supabase-js'
import { renderProposalHtml } from '../../src/lib/renderProposalHtml.js'
import { generatePdf } from '../../src/lib/generatePdf.js'
import { uploadToSharePoint } from '../../src/lib/sharepoint.js'

function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function getAuthenticatedUser(supabaseAdmin, req) {
  const authHeader = req.headers['authorization'] ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user ?? null
}

async function getEngagement(supabaseAdmin, engagementId, userId) {
  const { data } = await supabaseAdmin
    .from('engagements')
    .select('id, status, team_member_id, client_name, proposal_json')
    .eq('id', engagementId)
    .eq('team_member_id', userId)
    .single()
  return data
}

async function updateProposalJson(supabaseAdmin, engagementId, proposalJson) {
  const { error } = await supabaseAdmin
    .from('engagements')
    .update({ proposal_json: proposalJson })
    .eq('id', engagementId)
  if (error) throw error
}

function isSharePointConfigured() {
  const vars = ['MICROSOFT_TENANT_ID', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'SHAREPOINT_SITE_ID', 'SHAREPOINT_DRIVE_ID']
  return vars.every(v => process.env[v])
}

async function generateAndUpload(engagement, proposalJson) {
  const html = renderProposalHtml(proposalJson)
  const pdfBuffer = await generatePdf(html)
  if (!isSharePointConfigured()) {
    console.warn('[BSE] SharePoint upload skipped — Microsoft credentials not configured')
    return null
  }
  const date = new Date().toISOString().slice(0, 10)
  const safeName = (engagement.client_name ?? 'Unknown').replace(/[^a-zA-Z0-9_-]/g, '_')
  const filename = `${safeName}_${date}_BusinessProposal.pdf`
  return uploadToSharePoint({ buffer: pdfBuffer, filename, clientName: engagement.client_name, date })
}

async function finalizeApproval(supabaseAdmin, engagementId, url) {
  const { error: updateError } = await supabaseAdmin
    .from('engagements')
    .update({ sharepoint_proposal_url: url, status: 'gate4_review' })
    .eq('id', engagementId)
  if (updateError) throw updateError

  const { error: approvalError } = await supabaseAdmin
    .from('gate_approvals')
    .insert({ engagement_id: engagementId, gate_number: 3, action: 'approved' })
  if (approvalError) throw approvalError
}

async function setFailed(supabaseAdmin, engagementId, err) {
  await supabaseAdmin
    .from('engagements')
    .update({
      status: 'failed',
      last_successful_gate: 3,
      error_log: { message: err.message, chain: 'gate3-approve', timestamp: new Date().toISOString() },
    })
    .eq('id', engagementId)
}

function validateApproveRequest(engagement, submittedJson) {
  if (!engagement) return { code: 404, error: 'Engagement not found' }
  if (engagement.status !== 'gate3_review') return { code: 409, error: 'Engagement is not at gate3_review', status: engagement.status }
  const proposalJson = submittedJson ?? engagement.proposal_json
  if (!proposalJson) return { code: 409, error: 'No proposal JSON — generate the proposal first' }
  return { proposalJson }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { engagementId, proposalJson: submittedJson } = req.body ?? {}
  if (!engagementId) {
    return res.status(400).json({ error: 'engagementId is required' })
  }

  const supabaseAdmin = createAdminClient()
  const user = await getAuthenticatedUser(supabaseAdmin, req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const engagement = await getEngagement(supabaseAdmin, engagementId, user.id)
  const validated = validateApproveRequest(engagement, submittedJson)
  if (validated.error) return res.status(validated.code).json(validated)
  const { proposalJson } = validated

  // Phase 1: persist inline-edited proposalJson if submitted
  if (submittedJson) {
    try {
      await updateProposalJson(supabaseAdmin, engagementId, submittedJson)
    } catch (err) {
      console.error(`[BSE] gate3-approve persist failed for ${engagementId}:`, err.message)
      return res.status(500).json({ error: 'Failed to persist proposal JSON' })
    }
  }

  // Phase 2: generate PDF, upload to SharePoint, advance status
  try {
    const url = await generateAndUpload(engagement, proposalJson)
    await finalizeApproval(supabaseAdmin, engagementId, url)
    return res.status(200).json({ success: true, engagementId, sharepoint_proposal_url: url })
  } catch (err) {
    console.error(`[BSE] gate3-approve PDF/SharePoint failed for ${engagementId}:`, err.message)
    await setFailed(supabaseAdmin, engagementId, err).catch(() => {})
    return res.status(500).json({ error: 'Proposal approval failed', details: err.message })
  }
}
