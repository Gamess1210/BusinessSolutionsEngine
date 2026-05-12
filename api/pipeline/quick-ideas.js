import { createClient } from '@supabase/supabase-js'
import { quickIdeasChain } from '../../src/lib/chains/quickIdeas.js'

const ALLOWED_STATUSES = ['solutions_pending', 'failed']

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
    .select('id, status, industry, structured_brief, team_member_id')
    .eq('id', engagementId)
    .eq('team_member_id', userId)
    .single()
  return data
}

function validateEngagement(engagement) {
  if (!engagement) return { code: 404, error: 'Engagement not found' }
  if (!ALLOWED_STATUSES.includes(engagement.status)) {
    return {
      code: 409,
      error: 'Engagement is not ready for solution generation',
      status: engagement.status,
    }
  }
  if (!engagement.structured_brief) {
    return { code: 422, error: 'No approved brief found for this engagement' }
  }
  return null
}

function buildErrorLog(error) {
  return {
    message: error.message,
    chain: 'quickIdeasChain',
    timestamp: new Date().toISOString(),
  }
}

async function recoverFromError(supabaseAdmin, engagementId, error) {
  await supabaseAdmin
    .from('engagements')
    .update({
      status: 'failed',
      last_successful_gate: 1,
      error_log: buildErrorLog(error),
    })
    .eq('id', engagementId)
  console.error(`[BSE] Quick ideas failed for engagement ${engagementId}:`, error.message)
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
    const solutions = await quickIdeasChain.invoke({
      structured_brief: engagement.structured_brief,
      industry: engagement.industry,
    })

    await supabaseAdmin
      .from('engagements')
      .update({ solutions, status: 'gate2_review', error_log: null })
      .eq('id', engagementId)

    return res.status(200).json({ success: true, engagementId })
  } catch (error) {
    await recoverFromError(supabaseAdmin, engagementId, error)
    return res.status(500).json({ error: 'Solution generation failed', engagementId })
  }
}
