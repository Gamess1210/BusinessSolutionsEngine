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

async function finalizeRejection(supabaseAdmin, engagementId) {
  const { error: approvalError } = await supabaseAdmin
    .from('gate_approvals')
    .insert({ engagement_id: engagementId, gate_number: 4, action: 'rejected' })
  if (approvalError) throw approvalError

  const { error: updateError } = await supabaseAdmin
    .from('engagements')
    .update({ status: 'gate3_review' })
    .eq('id', engagementId)
  if (updateError) throw updateError
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
  if (!engagement) return res.status(404).json({ error: 'Engagement not found' })
  if (engagement.status !== 'gate4_review') {
    return res.status(409).json({ error: 'Engagement is not at gate4_review', status: engagement.status })
  }

  try {
    await finalizeRejection(supabaseAdmin, engagementId)
    return res.status(200).json({ success: true, engagementId })
  } catch (err) {
    console.error(`[BSE] gate4-reject failed for ${engagementId}:`, err.message)
    return res.status(500).json({ error: 'Gate 4 rejection failed', details: err.message })
  }
}
