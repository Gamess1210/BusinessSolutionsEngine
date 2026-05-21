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
    .select('id, status, team_member_id, chosen_solution')
    .eq('id', engagementId)
    .eq('team_member_id', userId)
    .single()
  return data
}

function validateApproveRequest(engagement) {
  if (!engagement) return { code: 404, error: 'Engagement not found' }
  if (engagement.status !== 'gate4_review') {
    return { code: 409, error: 'Engagement is not at gate4_review', status: engagement.status }
  }
  return null
}

async function writeSupplementaryInputs(supabaseAdmin, engagementId, contextInputs) {
  if (!contextInputs?.length) return
  const rows = contextInputs.map(({ input_type, content }) => ({
    engagement_id: engagementId,
    input_type,
    source: 'gate4_supplement',
    content,
  }))
  const { error } = await supabaseAdmin.from('engagement_inputs').insert(rows)
  if (error) throw error
}

async function finalizeApproval(supabaseAdmin, engagementId, noFurtherInput) {
  const { error: updateError } = await supabaseAdmin
    .from('engagements')
    .update({ status: 'plan_pending', gate4_no_further_input: !!noFurtherInput })
    .eq('id', engagementId)
  if (updateError) throw updateError

  const { error: approvalError } = await supabaseAdmin
    .from('gate_approvals')
    .insert({ engagement_id: engagementId, gate_number: 4, action: 'approved' })
  if (approvalError) throw approvalError
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { engagementId, contextInputs, noFurtherInput } = req.body ?? {}
  if (!engagementId) {
    return res.status(400).json({ error: 'engagementId is required' })
  }

  const supabaseAdmin = createAdminClient()
  const user = await getAuthenticatedUser(supabaseAdmin, req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const engagement = await getEngagement(supabaseAdmin, engagementId, user.id)
  const validationError = validateApproveRequest(engagement)
  if (validationError) return res.status(validationError.code).json(validationError)

  try {
    if (!noFurtherInput) {
      await writeSupplementaryInputs(supabaseAdmin, engagementId, contextInputs)
    }
    await finalizeApproval(supabaseAdmin, engagementId, noFurtherInput)
    return res.status(200).json({ success: true, engagementId })
  } catch (err) {
    console.error(`[BSE] gate4-approve failed for ${engagementId}:`, err.message)
    return res.status(500).json({ error: 'Gate 4 approval failed', details: err.message })
  }
}
