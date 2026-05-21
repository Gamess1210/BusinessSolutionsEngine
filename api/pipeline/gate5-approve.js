import { createClient } from '@supabase/supabase-js'

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

function validateRequest(engagement) {
  if (!engagement) return { code: 404, error: 'Engagement not found' }
  if (engagement.status !== 'gate5_review') {
    return { code: 409, error: 'Engagement is not at gate5_review', status: engagement.status }
  }
  return null
}

async function handleApproval(supabaseAdmin, engagementId, projectPlan) {
  const { error: updateError } = await supabaseAdmin
    .from('engagements')
    .update({ status: 'spec_pending', project_plan: projectPlan, current_epic_index: 0 })
    .eq('id', engagementId)
  if (updateError) throw updateError
  const { error: approvalError } = await supabaseAdmin
    .from('gate_approvals')
    .insert({ engagement_id: engagementId, gate_number: 5, action: 'plan_approved' })
  if (approvalError) throw approvalError
}

async function handleRejection(supabaseAdmin, engagementId) {
  const { error: updateError } = await supabaseAdmin
    .from('engagements')
    .update({ status: 'gate4_review', plan_conversation: null })
    .eq('id', engagementId)
  if (updateError) throw updateError
  const { error: approvalError } = await supabaseAdmin
    .from('gate_approvals')
    .insert({ engagement_id: engagementId, gate_number: 5, action: 'rejected' })
  if (approvalError) throw approvalError
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { engagementId, action, projectPlan } = req.body ?? {}
  if (!engagementId || !action) {
    return res.status(400).json({ error: 'engagementId and action are required' })
  }

  const supabaseAdmin = createAdminClient()
  const user = await getAuthenticatedUser(supabaseAdmin, req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const engagement = await getEngagement(supabaseAdmin, engagementId, user.id)
  const validationError = validateRequest(engagement)
  if (validationError) return res.status(validationError.code).json(validationError)

  try {
    if (action === 'plan_approved') {
      await handleApproval(supabaseAdmin, engagementId, projectPlan)
    } else {
      await handleRejection(supabaseAdmin, engagementId)
    }
    return res.status(200).json({ success: true, engagementId })
  } catch (err) {
    console.error(`[BSE] gate5-approve failed for ${engagementId}:`, err.message)
    return res.status(500).json({ error: 'Gate 5 approval failed', details: err.message })
  }
}
