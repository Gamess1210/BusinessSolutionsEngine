import { createClient } from '@supabase/supabase-js'
import { processMessage, processPlanUpdate } from '../../src/lib/chains/projectPlanChain.js'

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
    .select('id, status, team_member_id, plan_conversation, chosen_solution, structured_brief, client_name, organisation, industry')
    .eq('id', engagementId)
    .eq('team_member_id', userId)
    .single()
  return data
}

function validateRequest(engagement) {
  if (!engagement) return { code: 404, error: 'Engagement not found' }
  if (engagement.status !== 'plan_pending' && engagement.status !== 'gate5_review') {
    return { code: 409, error: 'Engagement is not at plan_pending or gate5_review', status: engagement.status }
  }
  return null
}

async function handleDiscovery(supabaseAdmin, engagementId, engagement, message) {
  const conversation = engagement.plan_conversation ?? []
  const result = await processMessage(conversation, engagement, message)
  const userEntries = message ? [{ role: 'user', content: message }] : []
  const assistantEntry = { role: 'assistant', type: result.type, content: result.content }
  const updated = [...conversation, ...userEntries, assistantEntry]
  const patch = { plan_conversation: updated }
  if (result.type === 'plan') patch.status = 'gate5_review'
  const { error } = await supabaseAdmin.from('engagements').update(patch).eq('id', engagementId)
  if (error) throw error
  return { type: result.type, content: result.content }
}

async function handleUpdate(supabaseAdmin, engagementId, engagement, instruction) {
  const conversation = engagement.plan_conversation ?? []
  const result = await processPlanUpdate(conversation, engagement, instruction)
  const updated = conversation.map(m =>
    (m.role === 'assistant' && m.type === 'plan') ? { ...m, content: result.content } : m
  )
  const { error } = await supabaseAdmin.from('engagements').update({ plan_conversation: updated }).eq('id', engagementId)
  if (error) throw error
  return { type: 'plan', content: result.content }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { engagementId, message } = req.body ?? {}
  if (!engagementId) return res.status(400).json({ error: 'engagementId is required' })

  const supabaseAdmin = createAdminClient()
  const user = await getAuthenticatedUser(supabaseAdmin, req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const engagement = await getEngagement(supabaseAdmin, engagementId, user.id)
  const validationError = validateRequest(engagement)
  if (validationError) return res.status(validationError.code).json(validationError)

  try {
    const result = engagement.status === 'gate5_review'
      ? await handleUpdate(supabaseAdmin, engagementId, engagement, message)
      : await handleDiscovery(supabaseAdmin, engagementId, engagement, message)
    return res.status(200).json(result)
  } catch (err) {
    console.error(`[BSE] plan-message failed for ${engagementId}:`, err.message)
    return res.status(500).json({ error: 'Plan message failed', details: err.message })
  }
}
