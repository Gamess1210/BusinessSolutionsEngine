import { createClient } from '@supabase/supabase-js'
import { generateBaDoc } from '../../src/lib/generateBaDoc.js'

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
    .select('id, status, team_member_id, client_email, sharepoint_proposal_url')
    .eq('id', engagementId)
    .eq('team_member_id', userId)
    .single()
  return data
}

async function triggerPowerAutomate(engagementId, sharepointUrl, clientEmail) {
  const triggerUrl = process.env.POWER_AUTOMATE_PROPOSAL_SEND_TRIGGER_URL
  if (!triggerUrl) throw new Error('POWER_AUTOMATE_PROPOSAL_SEND_TRIGGER_URL is not configured')
  const res = await fetch(triggerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ engagementId, sharepoint_proposal_url: sharepointUrl, client_email: clientEmail }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status))
    throw new Error(`Power Automate trigger failed: ${text}`)
  }
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
  if (!engagement.sharepoint_proposal_url) {
    return res.status(409).json({ error: 'Proposal has not been approved and filed yet' })
  }
  if (!engagement.client_email) {
    return res.status(400).json({ error: 'No client email configured for this engagement' })
  }

  try {
    await triggerPowerAutomate(engagementId, engagement.sharepoint_proposal_url, engagement.client_email)
  } catch (err) {
    console.error(`[BSE] gate3-send failed for ${engagementId}:`, err.message)
    return res.status(500).json({ error: 'Send to client failed', details: err.message })
  }

  // SIA fires after successful Power Automate call — non-fatal
  await generateBaDoc(supabaseAdmin, engagementId, 'sia')
  return res.status(200).json({ success: true, engagementId })
}
