import { createClient } from '@supabase/supabase-js'

const GATE_STATUS_MAP = {
  1: 'gate1_review',
  2: 'gate2_review',
  3: 'gate3_review',
  4: 'gate4_review',
  5: 'gate5_review',
}

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
    .select('id, status, last_successful_gate, team_member_id')
    .eq('id', engagementId)
    .eq('team_member_id', userId)
    .single()
  return data
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
  if (engagement.status !== 'failed') {
    return res.status(409).json({ error: 'Engagement is not in failed state', status: engagement.status })
  }

  const newStatus = GATE_STATUS_MAP[engagement.last_successful_gate] ?? 'gate1_review'

  try {
    const { error } = await supabaseAdmin
      .from('engagements')
      .update({ status: newStatus, error_log: null })
      .eq('id', engagementId)
    if (error) throw error
    return res.status(200).json({ success: true, status: newStatus })
  } catch (err) {
    console.error(`[BSE] Retry gate failed for ${engagementId}:`, err.message)
    return res.status(500).json({ error: 'Failed to reset engagement status' })
  }
}
