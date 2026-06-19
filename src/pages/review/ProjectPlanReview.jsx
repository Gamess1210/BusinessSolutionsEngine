import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

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

function findPlanDraft(conversation) {
  return [...conversation].reverse().find(m => m.role === 'assistant' && m.type === 'plan') ?? null
}

function MessageBubble({ msg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-navy text-white rounded-lg px-4 py-3 max-w-prose text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    )
  }
  if (msg.type === 'plan') {
    return (
      <div className="flex justify-start mb-3">
        <div className="bg-cgreen text-white rounded-lg px-4 py-3 max-w-prose text-sm">
          Plan draft ready — review below.
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-grey-light text-grey-dark rounded-lg px-4 py-3 max-w-prose text-sm leading-relaxed">
        {msg.content}
      </div>
    </div>
  )
}

function AnswerInput({ value, onChange, onSend, submitting, error }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
  }
  return (
    <div className="mt-4 border-t border-grey-mid pt-4">
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Your answer…"
          disabled={submitting}
          rows={3}
          className="flex-1 border border-grey-mid rounded px-3 py-2 text-sm focus:outline-none focus:border-navy resize-none disabled:opacity-50"
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || submitting}
          className="bg-navy text-white px-5 py-2 rounded text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50 self-end"
        >
          {submitting ? 'Sending…' : 'Send'}
        </button>
      </div>
      {error && <p className="text-cred text-xs mt-2">{error}</p>}
    </div>
  )
}

function PlanViewToggle({ showOpenSpec, onToggle }) {
  const mdClass = `text-xs px-3 py-1 rounded transition-colors ${!showOpenSpec ? 'bg-navy text-white' : 'bg-grey-light text-grey-dark hover:bg-grey-mid'}`
  const osClass = `text-xs px-3 py-1 rounded transition-colors ${showOpenSpec ? 'bg-navy text-white' : 'bg-grey-light text-grey-dark hover:bg-grey-mid'}`
  return (
    <div className="flex gap-1">
      <button onClick={() => onToggle(false)} className={mdClass}>Markdown</button>
      <button onClick={() => onToggle(true)} className={osClass}>OpenSpec</button>
    </div>
  )
}

function EditRequestArea({ value, onChange, onApply, submitting, error }) {
  return (
    <div className="mt-4 border-t border-grey-mid pt-4">
      <label className="text-xs font-semibold text-grey-dark block mb-2">Request a change</label>
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={onChange}
          placeholder="Describe what you'd like to change…"
          disabled={submitting}
          rows={2}
          className="flex-1 border border-grey-mid rounded px-3 py-2 text-sm focus:outline-none focus:border-navy resize-none disabled:opacity-50"
        />
        <button
          onClick={onApply}
          disabled={!value.trim() || submitting}
          className="bg-cblue text-white px-5 py-2 rounded text-sm font-semibold hover:bg-cblue/90 transition-colors disabled:opacity-50 self-end"
        >
          {submitting ? 'Updating…' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-cred text-xs mt-2">{error}</p>}
    </div>
  )
}

function ConversationSection({ conversation, planDraft, inputValue, setInputValue, submitting, onSend, submitError }) {
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [conversation])
  return (
    <div className="bg-white rounded-lg border border-grey-mid p-6 mb-4">
      <h2 className="text-xs font-semibold text-grey-dark uppercase tracking-wide mb-4">Planning Conversation</h2>
      <div className="min-h-32 max-h-96 overflow-y-auto">
        {conversation.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>
      {!planDraft && (
        <AnswerInput
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onSend={onSend}
          submitting={submitting}
          error={submitError}
        />
      )}
    </div>
  )
}

function PlanSection({ planDraft, showOpenSpec, setShowOpenSpec, editRequest, setEditRequest, submitting, onApplyEdit, editError }) {
  const planText = showOpenSpec ? planDraft.openspec : planDraft.markdown
  return (
    <div className="bg-white rounded-lg border border-grey-mid p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-grey-dark uppercase tracking-wide">Project Plan Draft</h2>
        <PlanViewToggle showOpenSpec={showOpenSpec} onToggle={setShowOpenSpec} />
      </div>
      <pre className="text-xs leading-relaxed text-grey-dark whitespace-pre-wrap bg-grey-light rounded p-4 max-h-96 overflow-y-auto font-mono">
        {planText}
      </pre>
      <EditRequestArea
        value={editRequest}
        onChange={e => setEditRequest(e.target.value)}
        onApply={onApplyEdit}
        submitting={submitting}
        error={editError}
      />
    </div>
  )
}

function ActionBar({ planDraft, submitting, onApprove, onReject, submitError }) {
  return (
    <div className="bg-white rounded-lg border border-grey-mid p-4">
      {submitError && (
        <div className="bg-red-50 border border-cred text-cred text-xs rounded px-3 py-2 mb-3">{submitError}</div>
      )}
      <div className="flex items-center justify-between">
        <button
          onClick={onReject}
          disabled={submitting}
          className="text-sm text-grey-dark hover:text-navy transition-colors disabled:opacity-50"
        >
          Reject — return to client decision
        </button>
        <button
          onClick={onApprove}
          disabled={!planDraft || submitting}
          className="bg-navy text-white px-6 py-2 rounded font-semibold text-sm hover:bg-navy/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Approve plan →'}
        </button>
      </div>
    </div>
  )
}

export default function ProjectPlanReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [engagement, setEngagement] = useState(null)
  const [conversation, setConversation] = useState([])
  const [planDraft, setPlanDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [editRequest, setEditRequest] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [editError, setEditError] = useState(null)
  const [showOpenSpec, setShowOpenSpec] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function startSession() {
      const result = await postApi('/api/pipeline/plan-message', { engagementId: id, message: null })
      if (cancelled) return
      setConversation([{ role: 'assistant', type: result.type, content: result.content }])
      if (result.type === 'plan') setPlanDraft(result.content)
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase.from('engagements').select('*').eq('id', id).single()
        if (err) throw err
        if (cancelled) return
        if (!['plan_pending', 'gate5_review'].includes(data.status)) {
          navigate(`/engagements/${id}`)
          return
        }
        setEngagement(data)
        const conv = data.plan_conversation ?? []
        setConversation(conv)
        const plan = findPlanDraft(conv)
        if (plan) setPlanDraft(plan.content)
        if (conv.length === 0) await startSession()
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id, navigate])

  async function handleSend() {
    const msg = inputValue.trim()
    if (!msg || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    setInputValue('')
    setConversation(prev => [...prev, { role: 'user', content: msg }])
    try {
      const result = await postApi('/api/pipeline/plan-message', { engagementId: id, message: msg })
      setConversation(prev => [...prev, { role: 'assistant', type: result.type, content: result.content }])
      if (result.type === 'plan') setPlanDraft(result.content)
    } catch (err) {
      setSubmitError(err.message)
      setConversation(prev => prev.slice(0, -1))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApplyEdit() {
    const instruction = editRequest.trim()
    if (!instruction || submitting) return
    setSubmitting(true)
    setEditError(null)
    setEditRequest('')
    try {
      const result = await postApi('/api/pipeline/plan-message', { engagementId: id, message: instruction })
      setPlanDraft(result.content)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApprove() {
    if (!planDraft || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await postApi('/api/pipeline/gate5-approve', {
        engagementId: id,
        action: 'plan_approved',
        projectPlan: planDraft.structured,
      })
      navigate(`/engagements/${id}`)
    } catch (err) {
      setSubmitError(err.message)
      setSubmitting(false)
    }
  }

  async function handleReject() {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await postApi('/api/pipeline/gate5-approve', { engagementId: id, action: 'rejected' })
      navigate(`/review/${id}/client-decision`)
    } catch (err) {
      setSubmitError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-24">
        <div className="text-grey-dark text-sm">Loading planning session…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3">{error}</div>
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
        <h1 className="text-2xl font-bold text-navy">Gate 5 — Project Plan</h1>
        <p className="text-grey-dark text-sm mt-1">
          {[engagement?.client_name, engagement?.organisation].filter(Boolean).join(' — ')}
        </p>
      </div>

      <ConversationSection
        conversation={conversation}
        planDraft={planDraft}
        inputValue={inputValue}
        setInputValue={setInputValue}
        submitting={submitting}
        onSend={handleSend}
        submitError={submitError}
      />

      {planDraft && (
        <PlanSection
          planDraft={planDraft}
          showOpenSpec={showOpenSpec}
          setShowOpenSpec={setShowOpenSpec}
          editRequest={editRequest}
          setEditRequest={setEditRequest}
          submitting={submitting}
          onApplyEdit={handleApplyEdit}
          editError={editError}
        />
      )}

      <ActionBar
        planDraft={planDraft}
        submitting={submitting}
        onApprove={handleApprove}
        onReject={handleReject}
        submitError={submitError}
      />
    </div>
  )
}
