import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const GUIDED_QUESTIONS = [
  { section: 'A — Context', q: 'Who is the client, and which organisation and department are we working with?' },
  { section: 'A — Context', q: 'Who are the key people affected by this problem — what roles are involved?' },
  { section: 'A — Context', q: 'Are there any regulatory, compliance, or data sensitivity considerations we should know about upfront?' },
  { section: 'B — Problem', q: 'In your own words, what is the core problem or inefficiency you\'re experiencing?' },
  { section: 'B — Problem', q: 'Walk us through the current process step by step — what actually happens today?' },
  { section: 'B — Problem', q: 'Where does it break down, slow down, or cause the most frustration?' },
  { section: 'C — Impact', q: 'How long has this been an issue, and what has been the cost — in time, money, or risk?' },
  { section: 'C — Impact', q: 'Who feels the most pain from this — staff on the ground, clients, management, or regulators?' },
  { section: 'C — Impact', q: 'What happens if nothing changes — what does the next 12 months look like?' },
  { section: 'D — Constraints', q: 'What systems and tools are currently in use in this area?' },
  { section: 'D — Constraints', q: 'Have any solutions been tried before? What worked, and what didn\'t?' },
  { section: 'D — Constraints', q: 'Are there budget, timeline, or organisational constraints we should factor in?' },
  { section: 'E — Success', q: 'What does a successful outcome look like in 3–6 months — what would you be able to do that you can\'t do today?' },
  { section: 'E — Success', q: 'Is the preference for a technology solution, a process change, or a combination of both?' },
]

const STATUS_STEPS = [
  { key: 'captured', label: 'Captured' },
  { key: 'brief_pending', label: 'Generating Brief' },
  { key: 'gate1_review', label: 'Brief Review' },
  { key: 'gate2_review', label: 'Solutions Review' },
  { key: 'gate3_review', label: 'Proposal Review' },
  { key: 'gate4_review', label: 'Spec Approval' },
  { key: 'gate5_review', label: 'Code Review' },
  { key: 'gate6_review', label: 'Output Review' },
  { key: 'complete', label: 'Complete' },
]

function StatusBar({ status }) {
  if (status === 'failed') {
    return (
      <div className="bg-red-50 border border-cred text-cred text-sm font-semibold rounded px-4 py-3 mb-8">
        Pipeline error — retry available
      </div>
    )
  }

  const stepIndex = STATUS_STEPS.findIndex(s => s.key === status)
  const activeIndex = stepIndex === -1 ? 0 : stepIndex
  const isPending = status === 'brief_pending'

  return (
    <div className="flex items-center gap-0 mb-8">
      {STATUS_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            i < activeIndex ? 'bg-cgreen text-white' :
            i === activeIndex ? `bg-navy text-white${isPending ? ' animate-pulse' : ''}` :
            'bg-grey-mid text-grey-dark'
          }`}>
            {i < activeIndex && <span>✓</span>}
            {step.label}
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div className={`h-0.5 w-6 ${i < activeIndex ? 'bg-cgreen' : 'bg-grey-mid'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function EngagementDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [engagement, setEngagement] = useState(null)
  const [inputs, setInputs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetch() {
      try {
        const { data: eng, error: engError } = await supabase
          .from('engagements')
          .select('*')
          .eq('id', id)
          .single()
        if (engError) throw engError
        const { data: inp, error: inpError } = await supabase
          .from('engagement_inputs')
          .select('*')
          .eq('engagement_id', id)
          .order('created_at', { ascending: true })
        if (inpError) throw inpError
        setEngagement(eng)
        setInputs(inp)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
    const interval = setInterval(fetch, 5000)
    return () => clearInterval(interval)
  }, [id])

  if (loading) return <div className="text-grey-dark text-sm p-8">Loading engagement...</div>
  if (error) return <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3">{error}</div>
  if (!engagement) return null

  const date = new Date(engagement.created_at).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="text-grey-dark text-sm hover:text-navy transition-colors mb-4 flex items-center gap-1"
      >
        ← Back to engagements
      </button>

      <div className="bg-white rounded-lg border border-grey-mid p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy">{engagement.client_name}</h1>
            <p className="text-grey-dark text-sm mt-1">
              {[engagement.organisation, engagement.department].filter(Boolean).join(' — ')}
            </p>
            <p className="text-grey-dark text-xs mt-1">{date}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-grey-light text-grey-dark capitalize">
              {engagement.industry?.replace('_', ' ')}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              engagement.analysis_mode === 'deep' ? 'bg-navy text-white' : 'bg-grey-light text-grey-dark'
            }`}>
              {engagement.analysis_mode === 'deep' ? 'Deep Analysis' : 'Quick Ideas'}
            </span>
          </div>
        </div>
      </div>

      <StatusBar status={engagement.status} />

      {engagement.status === 'captured' && (
        <CaptureSection
          engagement={engagement}
          inputs={inputs}
          onInputAdded={(newInput) => setInputs(prev => [...prev, newInput])}
          onStatusChange={(newStatus) => setEngagement(prev => ({ ...prev, status: newStatus }))}
        />
      )}

      {engagement.status !== 'captured' && (
        <div className="bg-white rounded-lg border border-grey-mid p-8 text-center text-grey-dark text-sm">
          Gate review screens coming soon. Current status: <strong>{engagement.status}</strong>
        </div>
      )}
    </div>
  )
}

function CaptureSection({ engagement, inputs, onInputAdded, onStatusChange }) {
  const [activeTab, setActiveTab] = useState('braindump')
  const [error, setError] = useState(null)
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [success, setSuccess] = useState(null)

  async function getSession() {
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    return data.session
  }

  async function handleRunPipeline() {
    setPipelineRunning(true)
    setError(null)
    setSuccess(null)
    onStatusChange('brief_pending')
    try {
      const session = await getSession()
      const res = await fetch('/api/pipeline/consolidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ engagementId: engagement.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const msg = body.error || `Request failed (${res.status})`
        const isApiKeyError = msg.includes('ANTHROPIC_API_KEY') || msg.includes('API key')
        throw new Error(isApiKeyError ? 'AI service not yet configured — contact your administrator' : msg)
      }
      setSuccess('Brief generated — review ready')
      setTimeout(() => onStatusChange('gate1_review'), 1500)
    } catch (err) {
      onStatusChange('captured')
      setError(err.message)
    } finally {
      setPipelineRunning(false)
    }
  }

  const tabs = [
    { id: 'braindump', label: 'Brain-dump' },
    { id: 'guided', label: 'Guided Mode' },
    { id: 'transcript', label: 'Transcript' },
  ]

  return (
    <div className="bg-white rounded-lg border border-grey-mid">
      <div className="flex border-b border-grey-mid">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-navy text-navy'
                : 'border-transparent text-grey-dark hover:text-navy'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto px-4 py-3 text-xs text-grey-dark self-center">
          {inputs.length > 0 && `${inputs.length} input${inputs.length > 1 ? 's' : ''} captured`}
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3 mb-4">
            {error}
          </div>
        )}
        {activeTab === 'braindump' && (
          <BrainDumpInput engagementId={engagement.id} onSaved={onInputAdded} onError={setError} />
        )}
        {activeTab === 'guided' && (
          <GuidedModeInput engagementId={engagement.id} onSaved={onInputAdded} onError={setError} />
        )}
        {activeTab === 'transcript' && (
          <TranscriptInput engagementId={engagement.id} onSaved={onInputAdded} onError={setError} />
        )}
      </div>

      {inputs.length > 0 && (
        <div className="border-t border-grey-mid px-6 py-4">
          <p className="text-xs font-semibold text-grey-dark uppercase tracking-wide mb-3">
            Captured Inputs
          </p>
          <div className="space-y-2">
            {inputs.map(input => (
              <InputSummaryRow key={input.id} input={input} />
            ))}
          </div>
        </div>
      )}
      

      {inputs.length > 0 && (
        <PipelineFooter onRun={handleRunPipeline} running={pipelineRunning} success={success} />
      )}
    </div>
  )
}

function PipelineFooter({ onRun, running, success }) {
  return (
    <div className="border-t border-grey-mid px-6 py-4 bg-grey-light rounded-b-lg flex items-center justify-between">
      {success ? (
        <p className="text-sm text-cgreen font-semibold">{success}</p>
      ) : (
        <p className="text-sm text-grey-dark">Ready to generate brief and solutions.</p>
      )}
      <button
        onClick={onRun}
        disabled={running || !!success}
        className="bg-cgreen text-white px-6 py-2 rounded font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {running ? 'Generating Brief...' : 'Run AI Pipeline →'}
      </button>
    </div>
  )
}

function BrainDumpInput({ engagementId, onSaved, onError }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!text.trim()) return onError('Please enter some content.')
    setSaving(true)
    onError(null)
    try {
      const { data, error } = await supabase
        .from('engagement_inputs')
        .insert({
          engagement_id: engagementId,
          input_type: 'braindump',
          content: { text: text.trim() },
          source: 'manual',
        })
        .select()
        .single()
      if (error) throw error
      onSaved(data)
      setText('')
    } catch (err) {
      onError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-2">
        Brain-dump
      </label>
      <p className="text-xs text-grey-dark mb-3">
        Type or paste anything — meeting notes, bullet points, observations. Claude will structure it.
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={10}
        placeholder="e.g. Met with the ops team at Nedbank today. They're struggling with their month-end reconciliation process..."
        className="w-full border border-grey-mid rounded px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none font-mono"
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-grey-dark">{text.length} characters</span>
        <button
          onClick={handleSave}
          disabled={saving || !text.trim()}
          className="bg-navy text-white px-5 py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Input'}
        </button>
      </div>
    </div>
  )
}

function TranscriptInput({ engagementId, onSaved, onError }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!text.trim()) return onError('Please paste a transcript.')
    setSaving(true)
    onError(null)
    try {
      const { data, error } = await supabase
        .from('engagement_inputs')
        .insert({
          engagement_id: engagementId,
          input_type: 'transcript',
          content: { text: text.trim() },
          source: 'fireflies',
        })
        .select()
        .single()
      if (error) throw error
      onSaved(data)
      setText('')
    } catch (err) {
      onError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-2">
        Meeting Transcript
      </label>
      <p className="text-xs text-grey-dark mb-3">
        Paste your Fireflies transcript below. Claude will extract the structured problem context.
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={10}
        placeholder="Paste Fireflies transcript here..."
        className="w-full border border-grey-mid rounded px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none font-mono"
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-grey-dark">{text.length} characters</span>
        <button
          onClick={handleSave}
          disabled={saving || !text.trim()}
          className="bg-navy text-white px-5 py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Transcript'}
        </button>
      </div>
    </div>
  )
}

function GuidedModeInput({ engagementId, onSaved, onError }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState(Array(GUIDED_QUESTIONS.length).fill(''))
  const [notes, setNotes] = useState(Array(GUIDED_QUESTIONS.length).fill(''))
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)

  const question = GUIDED_QUESTIONS[currentQ]
  const progress = Math.round((currentQ / GUIDED_QUESTIONS.length) * 100)
  const isLast = currentQ === GUIDED_QUESTIONS.length - 1

  function handleAnswer(val) {
    const updated = [...answers]
    updated[currentQ] = val
    setAnswers(updated)
  }

  function handleNotes(val) {
    const updated = [...notes]
    updated[currentQ] = val
    setNotes(updated)
  }

  function handleNext() {
    if (!answers[currentQ].trim()) return onError('Please answer this question before continuing.')
    onError(null)
    setCurrentQ(prev => prev + 1)
  }

  function handleBack() {
    onError(null)
    setCurrentQ(prev => prev - 1)
  }

  async function handleSubmit() {
    if (!answers[currentQ].trim()) return onError('Please answer this question before submitting.')
    setSaving(true)
    onError(null)
    try {
      const content = {
        answers: GUIDED_QUESTIONS.map((q, i) => ({
          section: q.section,
          question: q.q,
          answer: answers[i],
          notes: notes[i] || null,
        }))
      }
      const { data, error } = await supabase
        .from('engagement_inputs')
        .insert({
          engagement_id: engagementId,
          input_type: 'guided',
          content,
          source: 'manual',
        })
        .select()
        .single()
      if (error) throw error
      onSaved(data)
      setCompleted(true)
    } catch (err) {
      onError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (completed) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✓</div>
        <p className="font-semibold text-navy mb-1">Guided Mode Complete</p>
        <p className="text-grey-dark text-sm">All 14 questions answered and saved.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-grey-dark uppercase tracking-wide">
          Question {currentQ + 1} of {GUIDED_QUESTIONS.length}
        </span>
        <span className="text-xs text-grey-dark">{progress}% complete</span>
      </div>
      <div className="w-full bg-grey-mid rounded-full h-1.5 mb-6">
        <div
          className="bg-navy h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Section label */}
      <div className="inline-block bg-grey-light text-grey-dark text-xs font-semibold px-2 py-1 rounded uppercase tracking-wide mb-3">
        {question.section}
      </div>

      {/* Question */}
      <p className="text-navy font-semibold text-base mb-4">{question.q}</p>

      {/* Answer */}
      <textarea
        value={answers[currentQ]}
        onChange={e => handleAnswer(e.target.value)}
        rows={5}
        placeholder="Your answer..."
        className="w-full border border-grey-mid rounded px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none mb-3"
      />

      {/* Notes (optional) */}
      <div className="mb-6">
        <label className="block text-xs text-grey-dark mb-1">
          Additional notes (optional)
        </label>
        <input
          type="text"
          value={notes[currentQ]}
          onChange={e => handleNotes(e.target.value)}
          placeholder="Any extra context..."
          className="w-full border border-grey-mid rounded px-4 py-2 text-sm focus:outline-none focus:border-navy"
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={currentQ === 0}
          className="text-grey-dark text-sm hover:text-navy transition-colors disabled:opacity-30"
        >
          ← Back
        </button>

        {/* Question dots */}
        <div className="flex gap-1">
          {GUIDED_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < currentQ ? 'bg-cgreen' :
                i === currentQ ? 'bg-navy' :
                'bg-grey-mid'
              }`}
            />
          ))}
        </div>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-cgreen text-white px-6 py-2 rounded font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Submit All →'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="bg-navy text-white px-6 py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}

function GuidedInputDetail({ input }) {
  if (!input.content?.answers) return null
  return (
    <div className="space-y-4">
      {input.content.answers.map((item, i) => (
        <div key={i} className="bg-white rounded border border-grey-mid p-3">
          <div className="text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
            {item.section} — Q{i + 1}
          </div>
          <p className="text-xs text-grey-dark mb-2">{item.question}</p>
          <p className="text-sm text-navy">
            {item.answer || <span className="text-grey-mid italic">No answer</span>}
          </p>
          {item.notes && (
            <p className="text-xs text-grey-dark mt-1 italic">Note: {item.notes}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function BrainDumpDetail({ input }) {
  return (
    <div className="bg-white rounded border border-grey-mid p-3">
      <p className="text-sm text-navy font-mono whitespace-pre-wrap">{input.content?.text}</p>
    </div>
  )
}

function TranscriptDetail({ input }) {
  return (
    <div className="bg-white rounded border border-grey-mid p-3">
      <p className="text-sm text-navy font-mono whitespace-pre-wrap">{input.content?.text}</p>
    </div>
  )
}

const INTAKE_FIELDS = [
  { label: 'Contact Name', key: 'contact_name' },
  { label: 'Email', key: 'contact_email' },
  { label: 'Organisation', key: 'organisation' },
  { label: 'Department', key: 'department' },
  { label: 'Problem Description', key: 'problem_description', multiline: true },
  { label: 'Business Impact', key: 'impact_description', multiline: true },
  { label: 'Constraints', key: 'constraints', multiline: true },
]

function ClientIntakeDetail({ input }) {
  const c = input.content ?? {}
  return (
    <div className="space-y-3">
      {INTAKE_FIELDS.filter(f => c[f.key]).map(f => (
        <IntakeField key={f.label} label={f.label} value={c[f.key]} multiline={f.multiline} />
      ))}
    </div>
  )
}

const INPUT_DETAIL_COMPONENTS = {
  guided: GuidedInputDetail,
  braindump: BrainDumpDetail,
  transcript: TranscriptDetail,
  client_intake: ClientIntakeDetail,
}

const INPUT_TYPE_LABELS = {
  guided: 'Guided Mode',
  braindump: 'Brain-dump',
  transcript: 'Transcript',
  client_intake: 'Client Intake',
}

function getInputTypeLabel(type) {
  return INPUT_TYPE_LABELS[type] || type
}

function InputSummaryRow({ input }) {
  const [expanded, setExpanded] = useState(false)

  const time = new Date(input.created_at).toLocaleTimeString()
  const isPending = input.input_type === 'client_intake' && !input.content
  const hasContent = !!input.content
  const DetailComponent = INPUT_DETAIL_COMPONENTS[input.input_type]

  return (
    <div className="border border-grey-mid rounded-lg overflow-hidden">
      <div
        onClick={() => hasContent && setExpanded(prev => !prev)}
        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
          hasContent ? 'cursor-pointer hover:bg-grey-light' : 'cursor-default'
        }`}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isPending ? 'bg-yellow-400' : 'bg-cgreen'
        }`} />
        <span className="text-navy font-medium text-sm">
          {getInputTypeLabel(input.input_type)}
        </span>
        <span className="text-grey-dark text-xs">{time}</span>
        {isPending && (
          <span className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
            Awaiting client submission
          </span>
        )}
        {hasContent && (
          <span className="ml-auto text-grey-dark text-xs">
            {expanded ? '▲ Hide' : '▼ Review'}
          </span>
        )}
      </div>

      {expanded && hasContent && DetailComponent && (
        <div className="border-t border-grey-mid bg-grey-light px-4 py-4">
          <DetailComponent input={input} />
        </div>
      )}
    </div>
  )
}

function IntakeField({ label, value, multiline }) {
  return (
    <div className="bg-white rounded border border-grey-mid p-3">
      <p className="text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">{label}</p>
      {multiline
        ? <p className="text-sm text-navy whitespace-pre-wrap">{value}</p>
        : <p className="text-sm text-navy">{value}</p>
      }
    </div>
  )
}