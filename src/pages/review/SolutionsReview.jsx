import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const HEADING = 'text-xs font-semibold text-navy uppercase tracking-wide border-b border-navy/20 pb-0.5 mb-1'

function FieldRow({ label, value }) {
  return (
    <div>
      <p className={HEADING}>{label}</p>
      <p className="text-sm text-grey-dark">{value}</p>
    </div>
  )
}


function BulletList({ label, items }) {
  const list = Array.isArray(items) ? items : []
  return (
    <div>
      <p className={HEADING}>{label}</p>
      <ul className="space-y-1">
        {list.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-grey-dark">
            <span className="text-cgreen mt-0.5 flex-shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function effortColor(value) {
  if (value === 'Low') return 'bg-green-100 text-cgreen'
  if (value === 'Medium') return 'bg-blue-100 text-cblue'
  return 'bg-red-100 text-cred'
}

function impactColor(value) {
  if (value === 'High') return 'bg-green-100 text-cgreen'
  if (value === 'Medium') return 'bg-blue-100 text-cblue'
  return 'bg-red-100 text-cred'
}

function complexityColor(value) {
  if (value === 'Low') return 'bg-green-100 text-cgreen'
  if (value === 'Medium') return 'bg-blue-100 text-cblue'
  return 'bg-red-100 text-cred'
}

function sequencingColor(value) {
  if (value === 'Quick Win') return 'bg-green-100 text-cgreen'
  if (value === 'Medium Term') return 'bg-blue-100 text-cblue'
  return 'bg-navy/10 text-navy'
}

function SmartBadge({ label, value, colorFn }) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-xs font-semibold text-navy uppercase tracking-wide">{label}</p>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorFn(value)}`}>
        {String(value)}
      </span>
    </div>
  )
}

function QuickFields({ solution }) {
  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-grey-mid">
      <div className="flex gap-6">
        <SmartBadge label="Effort" value={solution.effort} colorFn={effortColor} />
        <SmartBadge label="Impact" value={solution.impact} colorFn={impactColor} />
      </div>
      <FieldRow label="Key Risk" value={solution.key_risk} />
    </div>
  )
}

function DeepFields({ solution }) {
  const aiLabel = solution.ai_central ? 'Yes' : 'No'
  const aiColor = solution.ai_central ? 'bg-green-100 text-cgreen' : 'bg-gray-100 text-grey-dark'
  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-grey-mid">
      <div className="flex flex-wrap gap-4">
        <SmartBadge label="Complexity" value={solution.complexity} colorFn={complexityColor} />
        <SmartBadge label="Sequencing" value={solution.sequencing} colorFn={sequencingColor} />
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-navy uppercase tracking-wide">AI Central</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${aiColor}`}>{aiLabel}</span>
        </div>
      </div>
      <FieldRow label="Feasibility" value={solution.feasibility} />
      <FieldRow label="ROI Framing" value={solution.roi_framing} />
      <BulletList label="Risks" items={solution.risks} />
    </div>
  )
}

function SolutionCard({ solution, index, isDeep, onChange }) {
  function handleField(field, value) {
    onChange(index, { ...solution, [field]: value })
  }

  return (
    <div className="bg-white rounded-lg border border-grey-mid border-l-4 border-l-cblue p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-xs font-bold text-white bg-navy rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
            Title
          </label>
          <input
            type="text"
            value={solution.title ?? ''}
            onChange={e => handleField('title', e.target.value)}
            className="w-full border border-grey-mid rounded px-3 py-1.5 text-sm font-semibold text-navy focus:outline-none focus:border-navy"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
          Description
        </label>
        <textarea
          value={solution.description ?? ''}
          onChange={e => handleField('description', e.target.value)}
          rows={4}
          className="w-full border border-grey-mid rounded px-3 py-2 text-sm text-grey-dark focus:outline-none focus:border-navy resize-y min-h-[120px]"
        />
      </div>

      {isDeep ? <DeepFields solution={solution} /> : <QuickFields solution={solution} />}

      <div>
        <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
          BA Notes
        </label>
        <textarea
          value={solution.notes ?? ''}
          onChange={e => handleField('notes', e.target.value)}
          rows={2}
          placeholder="Optional notes for this solution..."
          className="w-full border border-grey-mid rounded px-3 py-2 text-sm text-grey-dark focus:outline-none focus:border-navy resize-none"
        />
      </div>
    </div>
  )
}

function ActionFooter({ onApprove, onReject, actionLoading, error }) {
  return (
    <div className="mt-6 pt-6 border-t border-grey-mid">
      {error && (
        <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3 mb-4">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onReject}
          disabled={!!actionLoading}
          className="px-6 py-2 rounded font-semibold text-sm border border-cred text-cred hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {actionLoading === 'rejected' ? 'Rejecting...' : 'Reject'}
        </button>
        <button
          onClick={onApprove}
          disabled={!!actionLoading}
          className="bg-cgreen text-white px-6 py-2 rounded font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {actionLoading === 'approved' ? 'Generating Document A…' : 'Approve Solutions'}
        </button>
      </div>
    </div>
  )
}

function NotReadyState({ onBack }) {
  return (
    <div className="bg-white rounded-lg border border-grey-mid p-12 text-center">
      <p className="text-grey-dark text-sm mb-4">This engagement is not ready for solutions review.</p>
      <button onClick={onBack} className="text-grey-dark text-sm hover:text-navy transition-colors">
        ← Back to engagement
      </button>
    </div>
  )
}

export default function SolutionsReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [engagement, setEngagement] = useState(null)
  const [solutions, setSolutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    async function fetchEngagement() {
      try {
        const { data, error: fetchError } = await supabase
          .from('engagements')
          .select('*')
          .eq('id', id)
          .single()
        if (fetchError) throw fetchError
        setEngagement(data)
        setSolutions(data.solutions?.solutions ?? [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchEngagement()
  }, [id])

  function handleSolutionChange(index, updated) {
    setSolutions(prev => prev.map((s, i) => i === index ? updated : s))
  }

  async function handleAction(action) {
    setActionLoading(action)
    setError(null)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const token = sessionData.session?.access_token
      const body = { engagementId: id, action }
      if (action === 'approved') body.solutions = { solutions }
      const res = await fetch('/api/pipeline/gate2-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      navigate(`/engagements/${id}`)
    } catch (err) {
      setError(err.message)
      setActionLoading(null)
    }
  }

  if (loading) return <div className="text-grey-dark text-sm p-8">Loading solutions...</div>
  if (error && !engagement) {
    return <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3">{error}</div>
  }
  if (!engagement) return null

  if (!engagement.solutions) {
    return (
      <div className="max-w-4xl mx-auto">
        <NotReadyState onBack={() => navigate(`/engagements/${id}`)} />
      </div>
    )
  }

  const isDeep = engagement.analysis_mode === 'deep'

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(`/engagements/${id}`)}
        className="text-grey-dark text-sm hover:text-navy transition-colors mb-4 flex items-center gap-1"
      >
        ← Back to engagement
      </button>

      <div className="bg-white rounded-lg border border-grey-mid p-6 mb-6">
        <h1 className="text-2xl font-bold text-navy">Solutions Review</h1>
        <p className="text-grey-dark text-sm mt-1">
          {[engagement.client_name, engagement.organisation].filter(Boolean).join(' — ')}
        </p>
        <p className="text-xs text-grey-dark mt-1">
          {isDeep ? 'Deep Analysis — 5 solutions' : 'Quick Ideas — 3 solutions'}
        </p>
      </div>

      <div className="space-y-4">
        {solutions.map((solution, i) => (
          <SolutionCard
            key={i}
            solution={solution}
            index={i}
            isDeep={isDeep}
            onChange={handleSolutionChange}
          />
        ))}
      </div>

      {engagement.status === 'gate2_review' && (
        <ActionFooter
          onApprove={() => handleAction('approved')}
          onReject={() => handleAction('rejected')}
          actionLoading={actionLoading}
          error={error}
        />
      )}
    </div>
  )
}
