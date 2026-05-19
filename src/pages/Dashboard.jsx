import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = {
  captured: { label: 'Captured', color: 'bg-grey-mid text-grey-dark' },
  brief_pending: { label: 'Brief Pending', color: 'bg-blue-100 text-cblue' },
  gate1_review: { label: 'Gate 1 Review', color: 'bg-yellow-100 text-yellow-700' },
  solutions_pending: { label: 'Solutions Pending', color: 'bg-blue-100 text-cblue' },
  gate2_review: { label: 'Gate 2 Review', color: 'bg-yellow-100 text-yellow-700' },
  proposal_pending: { label: 'Proposal Pending', color: 'bg-blue-100 text-cblue' },
  output_pending: { label: 'Output Pending', color: 'bg-blue-100 text-cblue' },
  gate3_review: { label: 'Gate 3 Review', color: 'bg-yellow-100 text-yellow-700' },
  gate4_review: { label: 'Gate 4 Review', color: 'bg-yellow-100 text-yellow-700' },
  complete: { label: 'Complete', color: 'bg-green-100 text-cgreen' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-cred' },
}

function extractErrorMessage(raw) {
  if (!raw) return 'An error occurred'
  const matches = [...raw.matchAll(/"message":"([^"]+)"/g)]
  if (matches.length > 0) return matches[matches.length - 1][1]
  return raw.length > 80 ? raw.slice(0, 80) + '…' : raw
}

const MODE_LABELS = {
  quick: { label: 'Quick Ideas', color: 'bg-grey-light text-grey-dark' },
  deep: { label: 'Deep Analysis', color: 'bg-navy text-white' },
}

async function generateIntakeToken(engagementId) {
  const token = crypto.randomUUID()
  const { error } = await supabase
    .from('engagement_inputs')
    .insert({
      engagement_id: engagementId,
      input_type: 'client_intake',
      source: 'client_intake',
      intake_token: token,
      content: null,
    })
  if (error) throw error
  return token
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [engagements, setEngagements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchEngagements() {
      try {
        const { data, error } = await supabase
          .from('engagements')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        setEngagements(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchEngagements()
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Engagements</h1>
          <p className="text-grey-dark text-sm mt-1">All active and completed client engagements.</p>
        </div>
        <button
          onClick={() => navigate('/new')}
          className="bg-navy text-white px-5 py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors"
        >
          + New Engagement
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-lg border border-grey-mid p-8 text-center text-grey-dark text-sm">
          Loading engagements...
        </div>
      )}

      {!loading && !error && engagements.length === 0 && (
        <div className="bg-white rounded-lg border border-grey-mid p-12 text-center">
          <p className="text-grey-dark text-sm mb-3">No engagements yet.</p>
          <button
            onClick={() => navigate('/new')}
            className="bg-navy text-white px-5 py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors"
          >
            Create your first engagement
          </button>
        </div>
      )}

      {!loading && engagements.length > 0 && (
        <div className="bg-white rounded-lg border border-grey-mid overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-grey-light border-b border-grey-mid text-xs font-semibold text-grey-dark uppercase tracking-wide">
            <div className="col-span-3">Client</div>
            <div className="col-span-2">Organisation</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Mode</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1"></div>
          </div>

          {engagements.map(eng => {
            const status = eng.status === 'failed'
              ? {
                  label: `Failed (Gate ${(eng.last_successful_gate ?? 0) + 1})`,
                  color: 'bg-red-100 text-cred',
                  tooltip: extractErrorMessage(eng.error_log?.message),
                }
              : STATUS_LABELS[eng.status] || STATUS_LABELS.captured
            const mode = eng.analysis_mode ? MODE_LABELS[eng.analysis_mode] : null
            const date = new Date(eng.created_at).toLocaleDateString('en-ZA', {
              day: '2-digit', month: 'short', year: 'numeric'
            })
            return (
              <div
                key={eng.id}
                onClick={() => navigate(`/engagements/${eng.id}`)}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-grey-mid last:border-0 hover:bg-grey-light cursor-pointer transition-colors"
              >
                <div className="col-span-3">
                  <p className="font-semibold text-navy text-sm">{eng.client_name}</p>
                  {eng.department && <p className="text-xs text-grey-dark mt-0.5">{eng.department}</p>}
                </div>
                <div className="col-span-2 text-sm text-grey-dark self-center">
                  {eng.organisation || '—'}
                </div>
                <div className="col-span-2 self-center">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}
                    title={status.tooltip}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="col-span-2 self-center">
                  {mode && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${mode.color}`}>
                      {mode.label}
                    </span>
                  )}
                </div>
                <div className="col-span-2 text-sm text-grey-dark self-center">{date}</div>
                <div className="col-span-1 self-center text-right flex items-center justify-end gap-2">
                  <IntakeButton engagementId={eng.id} />
                  <span className="text-grey-mid text-lg">›</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function IntakeButton({ engagementId }) {
  const [link, setLink] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerate(e) {
    e.stopPropagation()
    setGenerating(true)
    try {
      const token = await generateIntakeToken(engagementId)
      const url = `${import.meta.env.VITE_APP_URL}/intake/${token}`
      setLink(url)
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy(e) {
    e.stopPropagation()
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (link) return (
    <button
      onClick={handleCopy}
      className="text-xs bg-grey-light border border-grey-mid px-2 py-1 rounded hover:bg-grey-mid transition-colors"
    >
      {copied ? '✓ Copied' : '📋 Copy Link'}
    </button>
  )

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="text-xs text-grey-dark hover:text-navy transition-colors disabled:opacity-50"
    >
      {generating ? '...' : '+ Intake Link'}
    </button>
  )
}