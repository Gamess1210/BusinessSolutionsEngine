import { createClient } from '@supabase/supabase-js'
import { generateBaDoc } from '../../src/lib/generateBaDoc.js'

function createAdminClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
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

async function recordApproval(supabaseAdmin, engagementId) {
  const { error: approvalError } = await supabaseAdmin
    .from('gate_approvals')
    .insert({ engagement_id: engagementId, gate_number: 1, action: 'approved' })
  if (approvalError) throw approvalError

  const { error: statusError } = await supabaseAdmin
    .from('engagements')
    .update({ status: 'solutions_pending' })
    .eq('id', engagementId)
  if (statusError) throw statusError
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { engagementId } = req.body ?? {}
  if (!engagementId) return res.status(400).json({ error: 'engagementId is required' })

  const supabaseAdmin = createAdminClient()
  const user = await getAuthenticatedUser(supabaseAdmin, req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const engagement = await getEngagement(supabaseAdmin, engagementId, user.id)
  if (!engagement) return res.status(404).json({ error: 'Engagement not found' })
  if (engagement.status !== 'gate1_review') {
    return res.status(409).json({ error: 'Engagement is not at gate1_review', status: engagement.status })
  }

  try {
    await recordApproval(supabaseAdmin, engagementId)
  } catch (err) {
    console.error(`[BSE] Gate 1 approval failed for ${engagementId}:`, err.message)
    return res.status(500).json({ error: 'Gate 1 approval failed', engagementId })
  }

  // BA docs fire in parallel after gate approval is committed — non-fatal individually
  await Promise.allSettled([
    generateBaDoc(supabaseAdmin, engagementId, 'asis'),
    generateBaDoc(supabaseAdmin, engagementId, 'brd'),
    generateBaDoc(supabaseAdmin, engagementId, 'rtm', { phase: 'initial' }),
  ])

  return res.status(200).json({ success: true, engagementId })
}
