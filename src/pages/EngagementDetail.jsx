import { useState, useEffect, Fragment } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SupplementaryContextBanner from '../components/SupplementaryContextBanner'

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

const STATUS_ORDER = [
  'captured',
  'brief_pending',
  'gate1_review',
  'solutions_pending',
  'gate2_review',
  'proposal_pending',
  'gate3_review',
  'gate4_review',
  'spec_pending',
  'gate5_review',
  'code_pending',
  'code_review',
  'gate6_review',
  'output_pending',
  'gate7_review',
  'complete',
]

const STATUS_STEPS = [
  { key: 'captured', label: 'Captured' },
  { key: 'brief_pending', label: 'Generating Brief' },
  { key: 'gate1_review', label: 'Brief Review' },
  { key: 'solutions_pending', label: 'Generating Solutions' },
  { key: 'gate2_review', label: 'Solutions Review' },
  { key: 'proposal_pending', label: 'Generating Proposal' },
  { key: 'gate3_review', label: 'Proposal Review' },
  { key: 'gate4_review', label: 'Client Decision' },
  { key: 'spec_pending', label: 'Generating Spec' },
  { key: 'gate5_review', label: 'Spec Review' },
  { key: 'code_pending', label: 'Generating Code' },
  { key: 'code_review', label: 'Quality Review' },
  { key: 'gate6_review', label: 'Code Review' },
  { key: 'output_pending', label: 'Generating Outputs' },
  { key: 'gate7_review', label: 'Output Review' },
  { key: 'complete', label: 'Complete' },
]

const PENDING_LABELS = {
  brief_pending: 'Generating brief…',
  solutions_pending: 'Generating solutions…',
  proposal_pending: 'Generating proposal…',
  spec_pending: 'Generating specification…',
  code_pending: 'Generating code…',
  code_review: 'Running quality review…',
  output_pending: 'Generating output documents…',
}

const GATE_REVIEW_CONFIG = {
  gate1_review: {
    description: 'Brief generated and ready for review.',
    label: 'Review Brief →',
    path: 'brief',
  },
  gate3_review: {
    description: 'Proposal ready for review and client decision.',
    label: 'Review Proposal →',
    path: 'proposal',
  },
  gate4_review: {
    description: "Proposal approved. Record the client's decision.",
    label: 'Record Client Decision →',
    path: 'client-decision',
  },
  gate5_review: {
    description: 'Specification generated and ready for review.',
    label: 'Review Specification →',
    path: 'spec',
  },
  gate6_review: {
    description: 'Code review complete. Ready for approval.',
    label: 'Review Code →',
    path: 'code',
  },
  gate7_review: {
    description: 'Output documents generated and ready for final review.',
    label: 'Review Outputs →',
    path: 'outputs',
  },
}

function getStepPath(stepKey) {
  if (GATE_REVIEW_CONFIG[stepKey]) return GATE_REVIEW_CONFIG[stepKey].path
  if (stepKey === 'gate2_review') return 'solutions'
  return null
}

const COMPLETED_GATES = [
  { threshold: 'gate2_review', label: 'Brief approved', linkLabel: 'View Brief →', path: 'brief' },
  { threshold: 'gate3_review', label: 'Solutions approved', linkLabel: 'View Solutions →', path: 'solutions' },
  { threshold: 'gate4_review', label: 'Proposal approved', linkLabel: 'View Proposal →', path: 'proposal' },
  { threshold: 'gate5_review', label: 'Client decision recorded', linkLabel: 'View Decision →', path: 'client-decision' },
  { threshold: 'gate6_review', label: 'Spec approved', linkLabel: 'View Spec →', path: 'spec' },
  { threshold: 'gate7_review', label: 'Code approved', linkLabel: 'View Code →', path: 'code' },
  { threshold: 'complete', label: 'Outputs approved', linkLabel: 'View Outputs →', path: 'outputs' },
]

function statusAtOrAfter(current, threshold) {
  return STATUS_ORDER.indexOf(current) >= STATUS_ORDER.indexOf(threshold)
}

function StepNode({ step, index, isCompleted, isActive, isPending, engagementId }) {
  if (isActive) {
    return (
      <div className={`h-6 px-2 flex items-center rounded text-xs font-semibold bg-navy text-white flex-shrink-0${isPending ? ' animate-pulse' : ''}`}>
        {step.label}
      </div>
    )
  }
  const reviewPath = isCompleted ? getStepPath(step.key) : null
  if (isCompleted && reviewPath) {
    return (
      <Link
        to={`/review/${engagementId}/${reviewPath}`}
        title={step.label}
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-cgreen text-white flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        ✓
      </Link>
    )
  }
  return (
    <div
      title={step.label}
      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors ${
        isCompleted ? 'bg-cgreen text-white' : 'border-2 border-grey-mid text-grey-mid'
      }`}
    >
      {isCompleted ? '✓' : index + 1}
    </div>
  )
}

function StatusBar({ status, pipelinePhase, engagementId }) {
  const showError = pipelinePhase === 'error' || (pipelinePhase === 'idle' && status === 'failed')

  const stepIndex = STATUS_STEPS.findIndex(s => s.key === status)
  const activeIndex = stepIndex === -1 ? 0 : stepIndex
  const isPending = PENDING_LABELS[status] !== undefined

  if (showError) {
    return (
      <div className="bg-red-50 border border-cred text-cred text-sm font-semibold rounded px-4 py-3 mb-8">
        Pipeline error — retry available
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex items-center w-full">
        {STATUS_STEPS.map((step, i) => {
          const isCompleted = i < activeIndex
          const isActive = i === activeIndex
          return (
            <Fragment key={step.key}>
              <StepNode
                step={step}
                index={i}
                isCompleted={isCompleted}
                isActive={isActive}
                isPending={isPending}
                engagementId={engagementId}
              />
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-px ${i + 1 < activeIndex ? 'bg-cgreen' : 'bg-gray-300'}`} />
              )}
            </Fragment>
          )
        })}
      </div>
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
  const [pipelinePhase, setPipelinePhase] = useState('idle')
  const [refetchKey, setRefetchKey] = useState(0)

  useEffect(() => {
    let stale = false

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
        if (stale) return
        setEngagement(eng)
        setInputs(inp)
      } catch (err) {
        if (!stale) setError(err.message)
      } finally {
        if (!stale) setLoading(false)
      }
    }
    fetch()
    const interval = setInterval(fetch, 5000)
    return () => {
      stale = true
      clearInterval(interval)
    }
  }, [id, refetchKey])

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

      <StatusBar status={engagement.status} pipelinePhase={pipelinePhase} engagementId={engagement.id} />

      <StatusSection
        engagement={engagement}
        inputs={inputs}
        onInputAdded={(newInput) => setInputs(prev => [...prev, newInput])}
        onStatusChange={(newStatus) => setEngagement(prev => ({ ...prev, status: newStatus }))}
        onPhaseChange={setPipelinePhase}
        onRefetch={() => setRefetchKey(k => k + 1)}
      />
    </div>
  )
}

function StatusSection({ engagement, inputs, onInputAdded, onStatusChange, onPhaseChange, onRefetch }) {
  const panel = resolveStatusPanel({ engagement, inputs, onInputAdded, onStatusChange, onPhaseChange, onRefetch })
  return (
    <>
      {panel}
      <PreviousGatesSection engagementId={engagement.id} status={engagement.status} />
    </>
  )
}

function resolveStatusPanel({ engagement, inputs, onInputAdded, onStatusChange, onPhaseChange, onRefetch }) {
  const { status, last_successful_gate, id } = engagement

  if (status === 'captured' || (status === 'failed' && last_successful_gate === 0)) {
    return (
      <CaptureSection
        engagement={engagement}
        inputs={inputs}
        onInputAdded={onInputAdded}
        onStatusChange={onStatusChange}
      />
    )
  }
  if (status === 'failed' && last_successful_gate === 1) {
    return (
      <SolutionsPendingSection
        engagement={engagement}
        onStatusChange={onStatusChange}
        onPhaseChange={onPhaseChange}
      />
    )
  }
  if (status === 'gate2_review') {
    return (
      <Gate2ReviewSection
        engagement={engagement}
        inputs={inputs}
        onInputAdded={onInputAdded}
        onRefetch={onRefetch}
      />
    )
  }
  if (GATE_REVIEW_CONFIG[status]) {
    return <GateReviewSection engagementId={id} config={GATE_REVIEW_CONFIG[status]} />
  }
  if (PENDING_LABELS[status]) {
    return <PendingSection label={PENDING_LABELS[status]} />
  }
  if (status === 'complete') {
    return <CompleteSection />
  }
  return (
    <div className="bg-white rounded-lg border border-grey-mid p-8 text-center text-grey-dark text-sm">
      Current status: <strong>{status}</strong>
    </div>
  )
}

function Gate2ReviewSection({ engagement, inputs, onInputAdded, onRefetch }) {
  const [hasPendingSupplementaryInput, setHasPendingSupplementaryInput] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  function handleInputAdded(newInput) {
    onInputAdded(newInput)
    setHasPendingSupplementaryInput(true)
  }

  function handleRegenerateComplete() {
    setIsRegenerating(false)
    setHasPendingSupplementaryInput(false)
    setDismissed(false)
    onRefetch()
  }

  function handleDismiss() {
    setDismissed(true)
  }

  function handleRegeneratingChange(value) {
    setIsRegenerating(value)
  }

  const showBanner = hasPendingSupplementaryInput && !dismissed

  return (
    <div>
      <div className="bg-white rounded-lg border border-grey-mid mb-4">
        <div className="p-6">
          <p className="text-sm text-grey-dark">
            Solutions generated and ready for review.
          </p>
        </div>
        <div className="border-t border-grey-mid px-6 py-4 bg-grey-light rounded-b-lg flex items-center justify-end">
          <Link
            to={`/review/${engagement.id}/solutions`}
            className="bg-navy text-white px-6 py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors"
          >
            Review Solutions →
          </Link>
        </div>
      </div>

      {showBanner && (
        <SupplementaryContextBanner
          engagementId={engagement.id}
          analysisMode={engagement.analysis_mode}
          onRegenerateComplete={handleRegenerateComplete}
          onDismiss={handleDismiss}
          onRegeneratingChange={handleRegeneratingChange}
        />
      )}

      <div className={isRegenerating ? 'pointer-events-none opacity-50' : undefined}>
        <CaptureSection
          engagement={engagement}
          inputs={inputs}
          onInputAdded={handleInputAdded}
          onStatusChange={() => {}}
          mode="supplementary"
        />
      </div>
    </div>
  )
}

function SolutionsPendingSection({ engagement, onStatusChange, onPhaseChange }) {
  const [phase, setPhase] = useState('idle')
  const [errorMessage, setErrorMessage] = useState(null)

  const isDeep = engagement.analysis_mode === 'deep'
  const endpoint = isDeep ? '/api/pipeline/deep-analysis' : '/api/pipeline/quick-ideas'
  const idleLabel = isDeep ? 'Run Deep Analysis →' : 'Run Quick Ideas →'
  const loadingLabel = isDeep ? 'Running Deep Analysis...' : 'Running Quick Ideas...'

  function updatePhase(newPhase) {
    setPhase(newPhase)
    onPhaseChange(newPhase)
  }

  async function handleGenerateSolutions() {
    updatePhase('running')
    setErrorMessage(null)
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const session = data.session
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ engagementId: engagement.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      updatePhase('success')
      setTimeout(() => onStatusChange('gate2_review'), 1500)
    } catch (err) {
      updatePhase('error')
      setErrorMessage(err.message)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-grey-mid">
      <div className="p-6">
        {phase === 'error' && errorMessage && (
          <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3 mb-4">
            {errorMessage}
          </div>
        )}
        <p className="text-sm text-grey-dark">
          Brief approved. Ready to generate solution options.
        </p>
      </div>
      <div className="border-t border-grey-mid px-6 py-4 bg-grey-light rounded-b-lg flex items-center justify-between">
        {phase === 'success' ? (
          <p className="text-sm text-cgreen font-semibold">Solutions generated — review ready</p>
        ) : (
          <p className="text-sm text-grey-dark">Ready to generate solutions.</p>
        )}
        <button
          onClick={handleGenerateSolutions}
          disabled={phase === 'running' || phase === 'success'}
          className="bg-cgreen text-white px-6 py-2 rounded font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {phase === 'running' ? loadingLabel : idleLabel}
        </button>
      </div>
    </div>
  )
}

function GateReviewSection({ engagementId, config }) {
  return (
    <div className="bg-white rounded-lg border border-grey-mid">
      <div className="p-6">
        <p className="text-sm text-grey-dark">{config.description}</p>
      </div>
      <div className="border-t border-grey-mid px-6 py-4 bg-grey-light rounded-b-lg flex items-center justify-end">
        <Link
          to={`/review/${engagementId}/${config.path}`}
          className="bg-navy text-white px-6 py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors"
        >
          {config.label}
        </Link>
      </div>
    </div>
  )
}

function PendingSection({ label }) {
  return (
    <div className="bg-white rounded-lg border border-grey-mid p-8 text-center">
      <div className="inline-flex items-center gap-3 animate-pulse">
        <div className="w-3 h-3 rounded-full bg-navy" />
        <p className="text-navy font-semibold text-sm">{label}</p>
        <div className="w-3 h-3 rounded-full bg-navy" />
      </div>
      <p className="text-grey-dark text-xs mt-3">This may take a few minutes.</p>
    </div>
  )
}

function CompleteSection() {
  return (
    <div className="bg-white rounded-lg border border-grey-mid p-8 text-center">
      <div className="inline-flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-cgreen text-white flex items-center justify-center text-sm font-bold">✓</span>
        <p className="text-navy font-semibold text-sm">Engagement complete</p>
      </div>
      <p className="text-grey-dark text-xs mt-3">All gates approved. Review your outputs below.</p>
    </div>
  )
}

function PreviousGatesSection({ engagementId, status }) {
  const [open, setOpen] = useState(false)
  const completed = COMPLETED_GATES.filter(g => statusAtOrAfter(status, g.threshold))

  if (completed.length === 0) return null

  return (
    <div className="mt-4 bg-white rounded-lg border border-grey-mid overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-grey-dark hover:text-navy transition-colors"
      >
        <span>Previous Gates</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-grey-mid divide-y divide-grey-mid">
          {completed.map(g => (
            <div key={g.path} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cgreen text-white flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
                <span className="text-sm text-grey-dark">{g.label}</span>
              </div>
              <Link
                to={`/review/${engagementId}/${g.path}`}
                className="text-sm text-navy font-medium hover:underline"
              >
                {g.linkLabel}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CaptureSection({ engagement, inputs, onInputAdded, onStatusChange, mode }) {
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
      

      {inputs.length > 0 && mode !== 'supplementary' && (
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