import { createClient } from '@supabase/supabase-js'
import { proposalEditChain } from '../../src/lib/chains/proposalEditChain.js'

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
    .select('id, status, team_member_id, proposal_json')
    .eq('id', engagementId)
    .eq('team_member_id', userId)
    .single()
  return data
}

async function persistProposalJson(supabaseAdmin, engagementId, proposalJson) {
  const { error } = await supabaseAdmin
    .from('engagements')
    .update({ proposal_json: proposalJson })
    .eq('id', engagementId)
  if (error) throw error
}

async function setFailed(supabaseAdmin, engagementId, err) {
  await supabaseAdmin
    .from('engagements')
    .update({
      status: 'failed',
      last_successful_gate: 3,
      error_log: { message: err.message, chain: 'proposalEditChain', timestamp: new Date().toISOString() },
    })
    .eq('id', engagementId)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { engagementId, instruction } = req.body ?? {}
  if (!engagementId || !instruction) {
    return res.status(400).json({ error: 'engagementId and instruction are required' })
  }

  const supabaseAdmin = createAdminClient()
  const user = await getAuthenticatedUser(supabaseAdmin, req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const engagement = await getEngagement(supabaseAdmin, engagementId, user.id)
  if (!engagement) return res.status(404).json({ error: 'Engagement not found' })
  if (engagement.status !== 'gate3_review') {
    return res.status(409).json({ error: 'Engagement is not at gate3_review', status: engagement.status })
  }
  if (!engagement.proposal_json) {
    return res.status(409).json({ error: 'No proposal JSON — generate the proposal first' })
  }

  try {
    const proposalJson = await proposalEditChain.invoke({
      proposalJson: engagement.proposal_json,
      instruction,
    })
    await persistProposalJson(supabaseAdmin, engagementId, proposalJson)
    return res.status(200).json({ proposalJson })
  } catch (err) {
    console.error(`[BSE] gate3-edit failed for ${engagementId}:`, err.message)
    await setFailed(supabaseAdmin, engagementId, err).catch(() => {})
    return res.status(500).json({ error: 'Proposal edit failed', details: err.message })
  }
}
