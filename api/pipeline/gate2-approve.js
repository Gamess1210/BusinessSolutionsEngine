import { createClient } from '@supabase/supabase-js'
import { documentAGenerationChain } from '../../src/lib/chains/documentAGenerationChain.js'
import { renderDocumentAHtml } from '../../src/lib/renderDocumentAHtml.js'
import { generatePdf } from '../../src/lib/generatePdf.js'
import { uploadToSharePoint } from '../../src/lib/sharepoint.js'

const VALID_ACTIONS = ['approved', 'rejected']

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
    .select('id, status, team_member_id')
    .eq('id', engagementId)
    .eq('team_member_id', userId)
    .single()
  return data
}

async function getEngagementForDocumentA(supabaseAdmin, engagementId) {
  const { data } = await supabaseAdmin
    .from('engagements')
    .select('id, client_name, organisation, analysis_mode, solutions')
    .eq('id', engagementId)
    .single()
  return data
}

function validateRequest(engagement, action) {
  if (!VALID_ACTIONS.includes(action)) {
    return { code: 400, error: 'action must be approved or rejected' }
  }
  if (!engagement) return { code: 404, error: 'Engagement not found' }
  if (engagement.status !== 'gate2_review') {
    return {
      code: 409,
      error: 'Engagement is not ready for Gate 2 review',
      status: engagement.status,
    }
  }
  return null
}

async function handleApproved(supabaseAdmin, engagementId, solutions) {
  const { error: solutionsError } = await supabaseAdmin
    .from('engagements')
    .update({ solutions, status: 'proposal_pending' })
    .eq('id', engagementId)
  if (solutionsError) throw solutionsError

  const { error: approvalError } = await supabaseAdmin
    .from('gate_approvals')
    .insert({ engagement_id: engagementId, gate_number: 2, action: 'approved' })
  if (approvalError) throw approvalError
}

async function handleRejected(supabaseAdmin, engagementId) {
  const { error: approvalError } = await supabaseAdmin
    .from('gate_approvals')
    .insert({ engagement_id: engagementId, gate_number: 2, action: 'rejected' })
  if (approvalError) throw approvalError

  const { error: statusError } = await supabaseAdmin
    .from('engagements')
    .update({ status: 'solutions_pending' })
    .eq('id', engagementId)
  if (statusError) throw statusError
}

function isSharePointConfigured() {
  const vars = ['MICROSOFT_TENANT_ID', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'SHAREPOINT_SITE_ID', 'SHAREPOINT_DRIVE_ID']
  return vars.every(v => process.env[v])
}

async function generateDocumentA(engagement) {
  const docAJson = await documentAGenerationChain.invoke({ engagement })
  const html = renderDocumentAHtml(docAJson)
  const pdfBuffer = await generatePdf(html)
  if (pdfBuffer === null) return 'local-dev-skip'
  if (!isSharePointConfigured()) {
    console.warn('[BSE] SharePoint upload skipped — Microsoft credentials not configured')
    return null
  }
  const date = new Date().toISOString().slice(0, 10)
  const filename = `${(engagement.client_name ?? 'Unknown').replace(/[^a-zA-Z0-9_-]/g, '_')}_${date}_SolutionOptions.pdf`
  return uploadToSharePoint({ buffer: pdfBuffer, filename, clientName: engagement.client_name, date })
}

async function finalizeDocumentA(supabaseAdmin, engagementId, url) {
  const { error } = await supabaseAdmin
    .from('engagements')
    .update({ sharepoint_solution_options_url: url, status: 'gate3_review' })
    .eq('id', engagementId)
  if (error) throw error
}

async function setDocumentAFailed(supabaseAdmin, engagementId, err) {
  await supabaseAdmin
    .from('engagements')
    .update({
      status: 'failed',
      last_successful_gate: 2,
      error_log: { message: err.message, chain: 'documentAGenerationChain', timestamp: new Date().toISOString() },
    })
    .eq('id', engagementId)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { engagementId, action, solutions } = req.body ?? {}
  if (!engagementId) {
    return res.status(400).json({ error: 'engagementId is required' })
  }

  const supabaseAdmin = createAdminClient()
  const user = await getAuthenticatedUser(supabaseAdmin, req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const engagement = await getEngagement(supabaseAdmin, engagementId, user.id)
  const validationError = validateRequest(engagement, action)
  if (validationError) return res.status(validationError.code).json(validationError)

  if (action === 'rejected') {
    try {
      await handleRejected(supabaseAdmin, engagementId)
      return res.status(200).json({ success: true, engagementId })
    } catch (error) {
      console.error(`[BSE] Gate 2 rejection failed for ${engagementId}:`, error.message)
      return res.status(500).json({ error: 'Gate rejection failed', engagementId })
    }
  }

  // approved path — phase 1: persist approval
  try {
    await handleApproved(supabaseAdmin, engagementId, solutions)
  } catch (error) {
    console.error(`[BSE] Gate 2 approval persist failed for ${engagementId}:`, error.message)
    return res.status(500).json({ error: 'Gate approval failed', engagementId })
  }

  // approved path — phase 2: generate and file Document A
  try {
    const fullEngagement = await getEngagementForDocumentA(supabaseAdmin, engagementId)
    const url = await generateDocumentA(fullEngagement)
    await finalizeDocumentA(supabaseAdmin, engagementId, url)
    return res.status(200).json({ success: true, engagementId })
  } catch (docError) {
    console.error(`[BSE] Document A generation failed for ${engagementId}:`, docError.message)
    await setDocumentAFailed(supabaseAdmin, engagementId, docError).catch(() => {})
    return res.status(500).json({ error: 'Document A generation failed', engagementId })
  }
}
