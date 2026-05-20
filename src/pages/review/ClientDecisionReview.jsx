import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const GUIDED_QUESTIONS = [
  { section: 'A — Context', q: 'Who is the client, and which organisation and department are we working with?' },
  { section: 'A — Context', q: 'Who are the key people affected by this problem — what roles are involved?' },
  { section: 'A — Context', q: 'Are there any regulatory, compliance, or data sensitivity considerations we should know about upfront?' },
  { section: 'B — Problem', q: "In your own words, what is the core problem or inefficiency you're experiencing?" },
  { section: 'B — Problem', q: 'Walk us through the current process step by step — what actually happens today?' },
  { section: 'B — Problem', q: 'Where does it break down, slow down, or cause the most frustration?' },
  { section: 'C — Impact', q: 'How long has this been an issue, and what has been the cost — in time, money, or risk?' },
  { section: 'C — Impact', q: 'Who feels the most pain from this — staff on the ground, clients, management, or regulators?' },
  { section: 'C — Impact', q: 'What happens if nothing changes — what does the next 12 months look like?' },
  { section: 'D — Constraints', q: 'What systems and tools are currently in use in this area?' },
  { section: 'D — Constraints', q: "Have any solutions been tried before? What worked, and what didn't?" },
  { section: 'D — Constraints', q: 'Are there budget, timeline, or organisational constraints we should factor in?' },
  { section: 'E — Success', q: 'What does a successful outcome look like in 3–6 months — what would you be able to do that you can\'t do today?' },
  { section: 'E — Success', q: 'Is the preference for a technology solution, a process change, or a combination of both?' },
]

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

function buildContextInputs(tab, text, guidedAnswers, guidedNotes, noFurtherInput) {
  if (noFurtherInput) return []
  if (tab === 'guided') {
    const answers = GUIDED_QUESTIONS
      .map((q, i) => guidedAnswers[i].trim()
        ? { section: q.section, question: q.q, answer: guidedAnswers[i].trim(), notes: guidedNotes[i].trim() }
        : null)
      .filter(Boolean)
    if (answers.length === 0) return []
    return [{ input_type: 'guided', content: { answers } }]
  }
  if (!text.trim()) return []
  return [{ input_type: tab, content: { text: text.trim() } }]
}

function SolutionMeta({ effort, impact }) {
  if (!effort && !impact) return null
  return (
    <div className="flex gap-4 mt-3 text-xs text-grey-dark">
      {effort && <span>Effort: <strong>{effort}</strong></span>}
      {impact && <span>Impact: <strong>{impact}</strong></span>}
    </div>
  )
}

function ChosenSolutionPanel({ solution }) {
  if (!solution) {
    return (
      <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3 mb-6">
        No chosen solution recorded — return to Gate 3 to select a solution.
      </div>
    )
  }
  return (
    <div className="bg-white rounded-lg border border-grey-mid mb-6">
      <div className="p-6 border-b border-grey-mid">
        <h2 className="text-lg font-semibold text-navy">Part 1 — Chosen Solution</h2>
        <p className="text-xs text-grey-dark mt-1">Recorded at Gate 3. Confirm this is correct before proceeding.</p>
      </div>
      <div className="p-6">
        <p className="font-semibold text-navy text-sm mb-2">{solution.title}</p>
        <p className="text-sm text-grey-dark leading-relaxed">{solution.description}</p>
        <SolutionMeta effort={solution.effort} impact={solution.impact} />
      </div>
    </div>
  )
}

function TabButton({ id, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
        active ? 'border-navy text-navy' : 'border-transparent text-grey-dark hover:text-navy'
      }`}
    >
      {label}
    </button>
  )
}

function GuidedQuestion({ q, index, answer, note, onChange }) {
  return (
    <div className="border-b border-grey-light pb-4 last:border-0">
      <p className="text-xs font-semibold text-cblue uppercase tracking-wide mb-1">{q.section}</p>
      <p className="text-sm text-grey-dark mb-2">{q.q}</p>
      <textarea
        value={answer}
        onChange={e => onChange(index, 'answer', e.target.value)}
        rows={2}
        placeholder="Optional — leave blank to skip"
        className="w-full border border-grey-mid rounded px-3 py-2 text-sm focus:outline-none focus:border-navy resize-none"
      />
      {answer.trim() && (
        <input
          type="text"
          value={note}
          onChange={e => onChange(index, 'note', e.target.value)}
          placeholder="Notes (optional)"
          className="w-full border border-grey-light rounded px-3 py-2 text-sm focus:outline-none focus:border-navy mt-1"
        />
      )}
    </div>
  )
}

function GuidedTab({ answers, notes, onChange }) {
  return (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
      {GUIDED_QUESTIONS.map((q, i) => (
        <GuidedQuestion key={i} q={q} index={i} answer={answers[i]} note={notes[i]} onChange={onChange} />
      ))}
    </div>
  )
}

function renderTabContent(tab, text, setText, guidedAnswers, guidedNotes, onGuidedChange, noFurtherInput) {
  if (noFurtherInput) {
    return (
      <p className="text-sm text-grey-dark py-4">
        No additional context — Claude will use the approved brief and chosen solution only.
      </p>
    )
  }
  if (tab === 'guided') {
    return <GuidedTab answers={guidedAnswers} notes={guidedNotes} onChange={onGuidedChange} />
  }
  const placeholder = tab === 'transcript'
    ? 'Paste a meeting transcript from the client conversation...'
    : 'Notes from your client conversation — anything relevant to spec generation...'
  return (
    <textarea
      value={text}
      onChange={e => setText(e.target.value)}
      rows={8}
      placeholder={placeholder}
      className="w-full border border-grey-mid rounded px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none"
    />
  )
}

function ContextCapture({ tab, setTab, text, setText, guidedAnswers, guidedNotes, onGuidedChange, noFurtherInput, onNoFurtherChange }) {
  return (
    <div className="bg-white rounded-lg border border-grey-mid mb-6">
      <div className="p-6 border-b border-grey-mid">
        <h2 className="text-lg font-semibold text-navy">Part 2 — Supplementary Context</h2>
        <p className="text-sm text-grey-dark mt-1">
          Add context from the client conversation, or confirm no further input is needed.
        </p>
      </div>

      <div className="flex border-b border-grey-mid">
        <TabButton id="braindump" label="Brain-dump" active={tab === 'braindump'} onClick={setTab} />
        <TabButton id="transcript" label="Transcript" active={tab === 'transcript'} onClick={setTab} />
        <TabButton id="guided" label="Guided Questions" active={tab === 'guided'} onClick={setTab} />
      </div>

      <div className="p-6">
        {renderTabContent(tab, text, setText, guidedAnswers, guidedNotes, onGuidedChange, noFurtherInput)}
      </div>

      <div className="px-6 pb-5">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={noFurtherInput}
            onChange={e => onNoFurtherChange(e.target.checked)}
            className="accent-navy"
          />
          <span className="text-sm text-grey-dark">No further input — proceed with approved brief and chosen solution only</span>
        </label>
      </div>
    </div>
  )
}

export default function ClientDecisionReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [engagement, setEngagement] = useState(null)
  const [tab, setTab] = useState('braindump')
  const [text, setText] = useState('')
  const [guidedAnswers, setGuidedAnswers] = useState(Array(GUIDED_QUESTIONS.length).fill(''))
  const [guidedNotes, setGuidedNotes] = useState(Array(GUIDED_QUESTIONS.length).fill(''))
  const [noFurtherInput, setNoFurtherInput] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

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

  if (loading) return <div className="text-grey-dark text-sm p-8">Loading engagement...</div>
  if (error) return <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3">{error}</div>
  if (!engagement) return null

  if (engagement.status !== 'gate4_review') {
    navigate(`/engagements/${id}`, { replace: true })
    return null
  }

  function handleGuidedChange(index, field, value) {
    if (field === 'answer') setGuidedAnswers(prev => prev.map((a, i) => i === index ? value : a))
    else setGuidedNotes(prev => prev.map((n, i) => i === index ? value : n))
  }

  function handleNoFurtherChange(checked) {
    setNoFurtherInput(checked)
    if (checked) {
      setText('')
      setGuidedAnswers(Array(GUIDED_QUESTIONS.length).fill(''))
      setGuidedNotes(Array(GUIDED_QUESTIONS.length).fill(''))
    }
  }

  const contextInputs = buildContextInputs(tab, text, guidedAnswers, guidedNotes, noFurtherInput)
  const canApprove = !!engagement.chosen_solution && (noFurtherInput || contextInputs.length > 0)

  async function handleApprove() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await postApi('/api/pipeline/gate4-approve', { engagementId: id, contextInputs, noFurtherInput })
      navigate(`/engagements/${id}`)
    } catch (err) {
      setSubmitError(err.message)
      setSubmitting(false)
    }
  }

  async function handleReject() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await postApi('/api/pipeline/gate4-reject', { engagementId: id })
      navigate(`/engagements/${id}`)
    } catch (err) {
      setSubmitError(err.message)
      setSubmitting(false)
    }
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
        <h1 className="text-2xl font-bold text-navy">Gate 4 — Client Decision</h1>
        <p className="text-grey-dark text-sm mt-1">
          {[engagement.client_name, engagement.organisation].filter(Boolean).join(' — ')}
        </p>
      </div>

      <ChosenSolutionPanel solution={engagement.chosen_solution} />

      <ContextCapture
        tab={tab}
        setTab={setTab}
        text={text}
        setText={setText}
        guidedAnswers={guidedAnswers}
        guidedNotes={guidedNotes}
        onGuidedChange={handleGuidedChange}
        noFurtherInput={noFurtherInput}
        onNoFurtherChange={handleNoFurtherChange}
      />

      {submitError && (
        <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3 mb-4">
          {submitError}
        </div>
      )}

      <div className="bg-white rounded-lg border border-grey-mid px-6 py-4 flex items-center justify-between">
        <button
          onClick={handleReject}
          disabled={submitting}
          className="text-sm text-grey-dark hover:text-navy transition-colors disabled:opacity-50"
        >
          Reject — return to proposal
        </button>
        <button
          onClick={handleApprove}
          disabled={!canApprove || submitting}
          className="bg-navy text-white px-6 py-2 rounded font-semibold text-sm hover:bg-navy/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Approve — begin specification →'}
        </button>
      </div>
    </div>
  )
}
