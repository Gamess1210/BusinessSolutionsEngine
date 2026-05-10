import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-lg border border-grey-mid border-l-4 border-l-cgreen">
      <div className="px-6 py-5">
        <p className="text-xs font-semibold text-navy uppercase tracking-wide mb-3">{title}</p>
        {children}
      </div>
    </div>
  )
}

function BulletList({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-grey-dark">
          <span className="text-cgreen mt-0.5 flex-shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function StakeholderTable({ stakeholders }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-grey-mid">
          <th className="text-left text-xs font-semibold text-grey-dark uppercase tracking-wide pb-2 pr-4">Role</th>
          <th className="text-left text-xs font-semibold text-grey-dark uppercase tracking-wide pb-2">Impact</th>
        </tr>
      </thead>
      <tbody>
        {stakeholders.map((s, i) => (
          <tr key={i} className="border-b border-grey-mid last:border-0">
            <td className="py-2.5 pr-4 font-medium text-navy align-top">{s.role}</td>
            <td className="py-2.5 text-grey-dark align-top">{s.impact}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GeneratingPlaceholder() {
  return (
    <div className="bg-white rounded-lg border border-grey-mid p-12 text-center">
      <div className="inline-flex items-center gap-3 animate-pulse">
        <div className="w-3 h-3 rounded-full bg-navy" />
        <p className="text-navy font-semibold text-sm">Brief is being generated...</p>
        <div className="w-3 h-3 rounded-full bg-navy" />
      </div>
      <p className="text-grey-dark text-xs mt-3">This usually takes under a minute.</p>
    </div>
  )
}

function NotReadyState({ onBack }) {
  return (
    <div className="bg-white rounded-lg border border-grey-mid p-12 text-center">
      <p className="text-grey-dark text-sm mb-4">This engagement is not ready for brief review.</p>
      <button
        onClick={onBack}
        className="text-grey-dark text-sm hover:text-navy transition-colors"
      >
        ← Back to engagement
      </button>
    </div>
  )
}

function BriefSections({ brief }) {
  return (
    <div className="space-y-4">
      <div className="col-span-2">
        <SectionCard title="Executive Summary">
          <p className="text-sm text-grey-dark leading-relaxed">{brief.executive_summary}</p>
        </SectionCard>
      </div>

      <SectionCard title="Pain Points">
        <BulletList items={brief.pain_points ?? []} />
      </SectionCard>

      <SectionCard title="Root Cause">
        <p className="text-sm text-grey-dark leading-relaxed">{brief.root_cause}</p>
      </SectionCard>

      <SectionCard title="Business Impact">
        <p className="text-sm text-grey-dark leading-relaxed">{brief.business_impact}</p>
      </SectionCard>

      <SectionCard title="Stakeholders">
        <StakeholderTable stakeholders={brief.stakeholders ?? []} />
      </SectionCard>

      <SectionCard title="Constraints">
        <BulletList items={brief.constraints ?? []} />
      </SectionCard>

      {brief.compliance_considerations?.length > 0 && (
        <SectionCard title="Compliance Considerations">
          <BulletList items={brief.compliance_considerations} />
        </SectionCard>
      )}

      <SectionCard title="Success Criteria">
        <p className="text-sm text-grey-dark leading-relaxed">{brief.success_criteria}</p>
      </SectionCard>
    </div>
  )
}

function ActionFooter({ onApprove, onReject, actionLoading }) {
  return (
    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-grey-mid">
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
        {actionLoading === 'approved' ? 'Approving...' : 'Approve Brief'}
      </button>
    </div>
  )
}

async function insertGateApproval(engagementId, action) {
  const { error } = await supabase
    .from('gate_approvals')
    .insert({ engagement_id: engagementId, gate_number: 1, action })
  if (error) throw error
}

async function updateEngagementStatus(engagementId, status) {
  const { error } = await supabase
    .from('engagements')
    .update({ status })
    .eq('id', engagementId)
  if (error) throw error
}

export default function BriefReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [engagement, setEngagement] = useState(null)
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
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchEngagement()
  }, [id])

  async function handleAction(action) {
    const nextStatus = action === 'approved' ? 'solutions_pending' : 'captured'
    setActionLoading(action)
    setError(null)
    try {
      await insertGateApproval(id, action)
      await updateEngagementStatus(id, nextStatus)
      navigate(`/engagements/${id}`)
    } catch (err) {
      setError(err.message)
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div className="text-grey-dark text-sm p-8">Loading engagement...</div>
  }
  if (error && !engagement) {
    return <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3">{error}</div>
  }
  if (!engagement) return null

  if (engagement.status !== 'gate1_review') {
    return (
      <div className="max-w-4xl mx-auto">
        <NotReadyState onBack={() => navigate(`/engagements/${id}`)} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(`/engagements/${id}`)}
        className="text-grey-dark text-sm hover:text-navy transition-colors mb-4 flex items-center gap-1"
      >
        ← Back to engagement
      </button>

      <div className="bg-white rounded-lg border border-grey-mid p-6 mb-6">
        <h1 className="text-2xl font-bold text-navy">Brief Review</h1>
        <p className="text-grey-dark text-sm mt-1">
          {[engagement.client_name, engagement.organisation].filter(Boolean).join(' — ')}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {!engagement.structured_brief
        ? <GeneratingPlaceholder />
        : <BriefSections brief={engagement.structured_brief} />
      }

      {engagement.structured_brief && (
        <ActionFooter
          onApprove={() => handleAction('approved')}
          onReject={() => handleAction('rejected')}
          actionLoading={actionLoading}
        />
      )}
    </div>
  )
}
