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
  if (engagement.status !== 'gate3_review') {
    return res.status(409).json({ error: 'Engagement is not at gate3_review', status: engagement.status })
  }

  try {
    const { error } = await supabaseAdmin
      .from('engagements')
      .update({
        chosen_solution: null,
        chosen_solution_context: null,
        proposal_json: null,
        gate3_rollback_available: false,
      })
      .eq('id', engagementId)
    if (error) throw error
    return res.status(200).json({ success: true, engagementId })
  } catch (err) {
    console.error(`[BSE] gate3-reset-solution failed for ${engagementId}:`, err.message)
    return res.status(500).json({ error: 'Reset failed', details: err.message })
  }
}
