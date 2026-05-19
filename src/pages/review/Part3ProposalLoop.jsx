import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function editBtnLabel(loading) { return loading ? 'Updating…' : 'Update Proposal' }
function approveBtnLabel(loading) { return loading ? 'Approving…' : 'Approve Proposal →' }
function resetBtnLabel(loading) { return loading ? 'Resetting…' : 'Yes, change solution' }

async function getToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session?.access_token
}

async function postApi(endpoint, body) {
  const token = await getToken()
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

function mergeEdits(base, edits) {
  const result = { ...base, ...edits }
  if (edits.solution) result.solution = { ...base.solution, ...edits.solution }
  return result
}

const HEADING = 'text-xs font-semibold text-navy uppercase tracking-wide mb-1'

function EditableField({ label, value, onChange, multiline }) {
  const cls = 'w-full border border-grey-mid rounded px-3 py-2 text-sm text-grey-dark focus:outline-none focus:border-navy'
  return (
    <div>
      <p className={HEADING}>{label}</p>
      {multiline ? (
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          rows={4}
          className={`${cls} resize-y min-h-[80px]`}
        />
      ) : (
        <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} className={cls} />
      )}
    </div>
  )
}

function ProposalPreview({ doc, localEdits, onFieldChange }) {
  function field(key) { return localEdits[key] ?? doc[key] ?? '' }
  function solField(key) { return localEdits.solution?.[key] ?? doc.solution?.[key] ?? '' }
  function onSolChange(key, val) {
    onFieldChange('solution', { ...(localEdits.solution ?? {}), [key]: val })
  }

  return (
    <div className="space-y-4 bg-white border border-grey-mid rounded-lg p-6">
      <div className="border-b border-navy pb-4 mb-4 flex items-start justify-between">
        <div>
          <EditableField label="Document Title" value={field('document_title')} onChange={v => onFieldChange('document_title', v)} />
        </div>
        <div className="text-right text-xs text-grey-dark ml-4 flex-shrink-0">
          <p>Comotion Business Solutions</p>
          <EditableField label="Client" value={field('client_name')} onChange={v => onFieldChange('client_name', v)} />
        </div>
      </div>

      <EditableField label="Executive Summary" value={field('executive_summary')} onChange={v => onFieldChange('executive_summary', v)} multiline />
      <EditableField label="Problem Statement" value={field('problem_statement')} onChange={v => onFieldChange('problem_statement', v)} multiline />

      <div>
        <p className={HEADING}>Stakeholder Impact</p>
        {(doc.stakeholder_impact ?? []).map((item, i) => (
          <div key={i} className="flex gap-3 text-sm text-grey-dark py-1 border-b border-grey-mid last:border-0">
            <span className="font-semibold text-navy w-32 flex-shrink-0">{item.role}</span>
            <span>{item.impact}</span>
          </div>
        ))}
        <p className="text-xs text-grey-dark mt-1 italic">Edit stakeholder impact via the instruction field below.</p>
      </div>

      <div className="border border-grey-mid border-l-4 border-l-cgreen rounded p-4 space-y-3">
        <p className={HEADING}>Recommended Solution</p>
        <EditableField label="Title" value={solField('title')} onChange={v => onSolChange('title', v)} />
        <EditableField label="Description" value={solField('description')} onChange={v => onSolChange('description', v)} multiline />
        <div className="grid grid-cols-2 gap-3">
          <EditableField label="Effort" value={solField('effort')} onChange={v => onSolChange('effort', v)} />
          <EditableField label="Impact" value={solField('impact')} onChange={v => onSolChange('impact', v)} />
        </div>
        <EditableField label="Key Risk" value={solField('key_risk')} onChange={v => onSolChange('key_risk', v)} />
        <EditableField label="Sequencing" value={solField('sequencing')} onChange={v => onSolChange('sequencing', v)} />
      </div>

      <EditableField label="Recommended Path Forward" value={field('recommended_path')} onChange={v => onFieldChange('recommended_path', v)} multiline />
      <EditableField label="Footer Note" value={field('footer_note')} onChange={v => onFieldChange('footer_note', v)} />
    </div>
  )
}

function RegenPanel({ engagementId, onProposalUpdated, onClose }) {
  const [tab, setTab] = useState('braindump')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleRegen() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const context = { type: tab, text: text.trim() }
      const result = await postApi('/api/pipeline/gate3-generate', { engagementId, context })
      onProposalUpdated(result.proposalJson)
      onClose()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="bg-grey-light rounded-lg border border-grey-mid p-4 space-y-3">
      <p className="text-sm font-semibold text-navy">Add context and regenerate</p>
      <div className="flex gap-2 text-xs">
        {['braindump', 'transcript'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded font-medium transition-colors ${tab === t ? 'bg-navy text-white' : 'bg-white border border-grey-mid text-grey-dark'}`}>
            {t === 'braindump' ? 'Brain-dump' : 'Transcript'}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        placeholder="Additional context to incorporate into the proposal…"
        className="w-full border border-grey-mid rounded px-3 py-2 text-sm focus:outline-none focus:border-navy resize-none"
      />
      {error && <p className="text-xs text-cred">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="text-sm text-grey-dark hover:text-navy px-3 py-1.5">Cancel</button>
        <button onClick={handleRegen} disabled={!text.trim() || loading}
          className="bg-cblue text-white px-4 py-1.5 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          {loading ? 'Regenerating…' : 'Regenerate Proposal →'}
        </button>
      </div>
    </div>
  )
}

export default function Part3ProposalLoop({ engagement, proposalJson: initialJson, onProposalUpdated, onApproved, onChangeSolution }) {
  const navigate = useNavigate()
  const [proposalJson, setProposalJson] = useState(initialJson)
  const [localEdits, setLocalEdits] = useState({})
  const [instruction, setInstruction] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState(null)
  const [approveLoading, setApproveLoading] = useState(false)
  const [approveError, setApproveError] = useState(null)
  const [showRegenPanel, setShowRegenPanel] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  function handleFieldChange(key, value) {
    setLocalEdits(prev => ({ ...prev, [key]: value }))
  }

  function getMergedJson() {
    return mergeEdits(proposalJson, localEdits)
  }

  async function handleUpdate() {
    if (!instruction.trim()) return
    setEditLoading(true)
    setEditError(null)
    try {
      const result = await postApi('/api/pipeline/gate3-edit', {
        engagementId: engagement.id,
        instruction: instruction.trim(),
      })
      setProposalJson(result.proposalJson)
      setLocalEdits({})
      setInstruction('')
      onProposalUpdated(result.proposalJson)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  async function handleApprove() {
    setApproveLoading(true)
    setApproveError(null)
    try {
      await postApi('/api/pipeline/gate3-approve', {
        engagementId: engagement.id,
        proposalJson: getMergedJson(),
      })
      onApproved()
      navigate(`/engagements/${engagement.id}`)
    } catch (err) {
      setApproveError(err.message)
      setApproveLoading(false)
    }
  }

  function handleRegenUpdated(newJson) {
    setProposalJson(newJson)
    setLocalEdits({})
    onProposalUpdated(newJson)
  }

  async function handleResetConfirmed() {
    setResetLoading(true)
    try {
      await postApi('/api/pipeline/gate3-reset-solution', { engagementId: engagement.id })
      onChangeSolution(true)
    } catch {
      setResetLoading(false)
      setShowResetConfirm(false)
    }
  }

  const allDisabled = approveLoading || editLoading

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-grey-mid p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-navy">Part 3 — Review &amp; Edit Proposal</h2>
          <p className="text-xs text-grey-dark mt-0.5">
            Chosen: <strong>{engagement.chosen_solution?.title}</strong>
          </p>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          disabled={allDisabled}
          className="text-sm text-grey-dark hover:text-navy transition-colors disabled:opacity-50"
        >
          Change solution
        </button>
      </div>

      {showResetConfirm && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-grey-dark">This will discard the current proposal. Continue?</p>
          <div className="flex gap-2">
            <button onClick={() => setShowResetConfirm(false)} className="text-sm text-grey-dark px-3 py-1">Cancel</button>
            <button onClick={handleResetConfirmed} disabled={resetLoading}
              className="bg-cred text-white px-4 py-1 rounded text-sm font-semibold disabled:opacity-50">
              {resetBtnLabel(resetLoading)}
            </button>
          </div>
        </div>
      )}

      <ProposalPreview doc={proposalJson} localEdits={localEdits} onFieldChange={handleFieldChange} />

      <div className="bg-white rounded-lg border border-grey-mid p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-2">
            Edit Instruction
          </label>
          <textarea
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            rows={3}
            placeholder="e.g. Make the executive summary more concise. Emphasise cost savings in the recommended path."
            disabled={allDisabled}
            className="w-full border border-grey-mid rounded px-3 py-2 text-sm focus:outline-none focus:border-navy resize-none disabled:opacity-50"
          />
          {editError && <p className="text-xs text-cred mt-1">{editError}</p>}
          <div className="flex justify-end mt-2">
            <button
              onClick={handleUpdate}
              disabled={!instruction.trim() || allDisabled}
              className="bg-cblue text-white px-5 py-2 rounded font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {editBtnLabel(editLoading)}
            </button>
          </div>
        </div>

        {!showRegenPanel && (
          <button
            onClick={() => setShowRegenPanel(true)}
            disabled={allDisabled}
            className="text-sm text-grey-dark hover:text-navy transition-colors disabled:opacity-50"
          >
            + Add context and regenerate
          </button>
        )}

        {showRegenPanel && (
          <RegenPanel
            engagementId={engagement.id}
            onProposalUpdated={handleRegenUpdated}
            onClose={() => setShowRegenPanel(false)}
          />
        )}
      </div>

      {approveError && (
        <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3">
          {approveError}
        </div>
      )}

      <div className="bg-white rounded-lg border border-grey-mid px-6 py-4 flex items-center justify-end">
        <button
          onClick={handleApprove}
          disabled={allDisabled}
          className="bg-cgreen text-white px-8 py-2 rounded font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {approveBtnLabel(approveLoading)}
        </button>
      </div>
    </div>
  )
}
