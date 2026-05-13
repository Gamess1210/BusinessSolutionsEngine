import { createClient } from '@supabase/supabase-js'

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
    .update({ solutions })
    .eq('id', engagementId)
  if (solutionsError) throw solutionsError

  const { error: approvalError } = await supabaseAdmin
    .from('gate_approvals')
    .insert({ engagement_id: engagementId, gate_number: 2, action: 'approved' })
  if (approvalError) throw approvalError

  const { error: statusError } = await supabaseAdmin
    .from('engagements')
    .update({ status: 'proposal_pending' })
    .eq('id', engagementId)
  if (statusError) throw statusError
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

  try {
    if (action === 'approved') {
      await handleApproved(supabaseAdmin, engagementId, solutions)
    } else {
      await handleRejected(supabaseAdmin, engagementId)
    }
    return res.status(200).json({ success: true, engagementId })
  } catch (error) {
    console.error(`[BSE] Gate 2 ${action} failed for engagement ${engagementId}:`, error.message)
    return res.status(500).json({ error: 'Gate approval failed', engagementId })
  }
}
