import { createClient } from '@supabase/supabase-js'
import { consolidationChain, formatEngagementInputs } from '../../src/lib/chains/consolidation.js'

const CONSOLIDATABLE_STATUSES = ['captured', 'failed', 'gate2_review']
const DEFAULT_MAX_CHARS = 40_000

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
    .select('id, status, industry, team_member_id')
    .eq('id', engagementId)
    .eq('team_member_id', userId)
    .single()
  return data
}

async function getEngagementInputs(supabaseAdmin, engagementId) {
  const { data } = await supabaseAdmin
    .from('engagement_inputs')
    .select('*')
    .eq('engagement_id', engagementId)
  return data ?? []
}

async function writeBriefResult(supabaseAdmin, engagementId, brief, isRegeneration) {
  const updateFields = { structured_brief: brief, error_log: null }
  if (!isRegeneration) updateFields.status = 'gate1_review'
  await supabaseAdmin
    .from('engagements')
    .update(updateFields)
    .eq('id', engagementId)
}

function buildErrorLog(error) {
  return {
    message: error.message,
    chain: 'consolidationChain',
    timestamp: new Date().toISOString(),
  }
}

async function triggerFailureNotification(engagementId, error) {
  // TODO: implement Teams notification when integration is available
  console.error(`[BSE] Consolidation failed for engagement ${engagementId}:`, error.message)
}

async function recoverFromError(supabaseAdmin, engagementId, error) {
  await supabaseAdmin
    .from('engagements')
    .update({
      status: 'failed',
      last_successful_gate: 0,
      error_log: buildErrorLog(error),
    })
    .eq('id', engagementId)
  await triggerFailureNotification(engagementId, error)
}

function validateEngagement(engagement) {
  if (!engagement) return { code: 404, error: 'Engagement not found' }
  if (!CONSOLIDATABLE_STATUSES.includes(engagement.status)) {
    return {
      code: 409,
      error: 'Engagement is not in a consolidatable state',
      status: engagement.status,
    }
  }
  return null
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

  const inputs = await getEngagementInputs(supabaseAdmin, engagementId)
  const formattedRaw = formatEngagementInputs(inputs)
  const maxChars = parseInt(process.env.CONSOLIDATION_MAX_INPUT_CHARS ?? DEFAULT_MAX_CHARS, 10)

  if (formattedRaw.length > maxChars) {
    return res.status(422).json({ error: 'Input too large for consolidation' })
  }

  const isRegeneration = engagement.status === 'gate2_review'

  if (!isRegeneration) {
    await supabaseAdmin
      .from('engagements')
      .update({ status: 'brief_pending' })
      .eq('id', engagementId)
  }

  try {
    const brief = await consolidationChain.invoke({
      inputs,
      industry: engagement.industry,
    })

    await writeBriefResult(supabaseAdmin, engagementId, brief, isRegeneration)

    return res.status(200).json({ success: true, engagementId })
  } catch (error) {
    await recoverFromError(supabaseAdmin, engagementId, error)
    return res.status(500).json({ error: 'Consolidation failed', engagementId })
  }
}
