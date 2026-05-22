import { createClient } from '@supabase/supabase-js'
import { consolidationChain } from '../../src/lib/chains/consolidation.js'
import { quickIdeasChain } from '../../src/lib/chains/quickIdeas.js'
import { deepAnalysisChain } from '../../src/lib/chains/deepAnalysis.js'

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
    .select('id, status, industry, analysis_mode, team_member_id')
    .eq('id', engagementId)
    .eq('team_member_id', userId)
    .single()
  return data
}

function validateEngagement(engagement) {
  if (!engagement) return { code: 404, error: 'Engagement not found' }
  if (engagement.status !== 'gate2_review') {
    return { code: 409, error: 'Engagement is not at gate2_review status' }
  }
  return null
}

function buildErrorLog(error) {
  return {
    message: error.message,
    chain: 'regenerationChain',
    timestamp: new Date().toISOString(),
  }
}

async function recoverFromError(supabaseAdmin, engagementId, error) {
  await supabaseAdmin
    .from('engagements')
    .update({
      status: 'failed',
      last_successful_gate: 2,
      error_log: buildErrorLog(error),
    })
    .eq('id', engagementId)
  console.error(`[BSE] Regeneration failed for engagement ${engagementId}:`, error.message)
}

async function voidGate2Approval(supabaseAdmin, engagementId) {
  await supabaseAdmin
    .from('gate_approvals')
    .update({ action: 'voided' })
    .eq('engagement_id', engagementId)
    .eq('gate_number', 2)
}

async function runConsolidation(supabaseAdmin, engagementId, industry) {
  const { data: inputs } = await supabaseAdmin
    .from('engagement_inputs')
    .select('*')
    .eq('engagement_id', engagementId)

  const brief = await consolidationChain({ inputs: inputs ?? [], industry })

  await supabaseAdmin
    .from('engagements')
    .update({ structured_brief: brief, error_log: null })
    .eq('id', engagementId)

  return brief
}

async function runSolutionsChain(supabaseAdmin, engagement, brief) {
  const chain = engagement.analysis_mode === 'deep' ? deepAnalysisChain : quickIdeasChain
  const solutions = await chain({
    structured_brief: brief,
    industry: engagement.industry,
  })

  await supabaseAdmin
    .from('engagements')
    .update({ solutions })
    .eq('id', engagement.id)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { engagementId } = req.body ?? {}
  if (!engagementId) {
    return res.status(400).json({ error: 'engagementId is required' })
  }

  const supabaseAdmin = createAdminClient()

  const user = await getAuthenticatedUser(supabaseAdmin, req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const engagement = await getEngagement(supabaseAdmin, engagementId, user.id)
  const validationError = validateEngagement(engagement)
  if (validationError) return res.status(validationError.code).json(validationError)

  try {
    await voidGate2Approval(supabaseAdmin, engagementId)
    const brief = await runConsolidation(supabaseAdmin, engagementId, engagement.industry)
    await runSolutionsChain(supabaseAdmin, engagement, brief)
    return res.status(200).json({ success: true, engagementId })
  } catch (error) {
    await recoverFromError(supabaseAdmin, engagementId, error)
    return res.status(500).json({ error: 'Regeneration failed', engagementId })
  }
}
