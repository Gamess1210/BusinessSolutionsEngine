import { createClient } from '@supabase/supabase-js'

function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function validateBody(body) {
  const { token, contact_name, problem_description } = body ?? {}
  if (!token) return 'token is required'
  if (!contact_name?.trim()) return 'contact_name is required'
  if (!problem_description?.trim()) return 'problem_description is required'
  return null
}

async function findIntakeRow(supabaseAdmin, token) {
  const { data, error } = await supabaseAdmin
    .from('engagement_inputs')
    .select('id, content')
    .eq('intake_token', token)
    .eq('input_type', 'client_intake')
    .single()
  if (error || !data) return null
  return data
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const validationError = validateBody(req.body)
  if (validationError) return res.status(400).json({ error: validationError })

  const { token, contact_name, contact_email, organisation, department, problem_description, impact_description, constraints } = req.body
  const supabaseAdmin = createAdminClient()

  const row = await findIntakeRow(supabaseAdmin, token)
  if (!row) return res.status(404).json({ error: 'Invalid or expired token' })
  if (row.content !== null) return res.status(409).json({ error: 'Form already submitted' })

  const { error } = await supabaseAdmin
    .from('engagement_inputs')
    .update({
      content: {
        contact_name,
        contact_email,
        organisation,
        department,
        problem_description,
        impact_description,
        constraints,
        submitted_at: new Date().toISOString(),
      },
    })
    .eq('id', row.id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true })
}
