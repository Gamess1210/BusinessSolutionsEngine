import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const CAPTURE_MODES = [
  {
    id: 'guided',
    title: 'Guided Mode',
    description: '14 structured discovery questions walked through one at a time. Best for thorough first engagements.',
    icon: '📋',
  },
  {
    id: 'braindump',
    title: 'Brain-dump',
    description: 'Paste or type anything — meeting notes, observations, bullet points. Claude structures it for you.',
    icon: '🧠',
  },
  {
    id: 'transcript',
    title: 'Meeting Transcript',
    description: 'Paste a Fireflies transcript. Claude extracts the structured problem context automatically.',
    icon: '🎙️',
  },
]

const ANALYSIS_MODES = [
  {
    id: 'quick',
    title: 'Quick Ideas',
    description: 'Single Claude call. 3 solution options with effort/impact ratings. Results in under 60 seconds.',
    icon: '⚡',
  },
  {
    id: 'deep',
    title: 'Deep Analysis',
    description: 'Two sequential Claude calls. Full problem brief + 5 detailed solutions with ROI framing and risk assessment.',
    icon: '🔍',
  },
]

export default function NewEngagement() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [step, setStep] = useState(1)
  const [clientName, setClientName] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [department, setDepartment] = useState('')
  const [industry, setIndustry] = useState('financial_services')
  const [captureMode, setCaptureMode] = useState(null)
  const [analysisMode, setAnalysisMode] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!clientName.trim()) return setError('Client name is required.')
    if (!captureMode) return setError('Please select a capture mode.')
    if (!analysisMode) return setError('Please select an analysis mode.')

    setSaving(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('engagements')
        .insert({
          client_name: clientName.trim(),
          organisation: organisation.trim() || null,
          department: department.trim() || null,
          industry,
          analysis_mode: analysisMode,
          status: 'captured',
          team_member_id: session.user.id,
        })
        .select()
        .single()

      if (error) throw error
      navigate(`/engagements/${data.id}`)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">New Engagement</h1>
        <p className="text-grey-dark text-sm mt-1">Set up a new client engagement.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= n ? 'bg-navy text-white' : 'bg-grey-mid text-grey-dark'
            }`}>
              {n}
            </div>
            {n < 3 && <div className={`h-0.5 w-12 transition-colors ${step > n ? 'bg-navy' : 'bg-grey-mid'}`} />}
          </div>
        ))}
        <span className="text-xs text-grey-dark ml-2">
          {step === 1 && 'Client details'}
          {step === 2 && 'Capture mode'}
          {step === 3 && 'Analysis mode'}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Step 1 — Client details */}
      {step === 1 && (
        <div className="bg-white rounded-lg border border-grey-mid p-6">
          <h2 className="font-semibold text-navy mb-4">Client Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
                Client Name <span className="text-cred">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full border border-grey-mid rounded px-4 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
                Organisation
              </label>
              <input
                type="text"
                value={organisation}
                onChange={e => setOrganisation(e.target.value)}
                placeholder="e.g. Nedbank"
                className="w-full border border-grey-mid rounded px-4 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Operations"
                className="w-full border border-grey-mid rounded px-4 py-2 text-sm focus:outline-none focus:border-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
                Industry
              </label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full border border-grey-mid rounded px-4 py-2 text-sm focus:outline-none focus:border-navy"
              >
                <option value="financial_services">Financial Services</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => {
                if (!clientName.trim()) return setError('Client name is required.')
                setError(null)
                setStep(2)
              }}
              className="bg-navy text-white px-6 py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Capture mode */}
      {step === 2 && (
        <div className="bg-white rounded-lg border border-grey-mid p-6">
          <h2 className="font-semibold text-navy mb-1">Capture Mode</h2>
          <p className="text-xs text-grey-dark mb-4">How will you provide the problem information?</p>
          <div className="space-y-3">
            {CAPTURE_MODES.map(mode => (
              <div
                key={mode.id}
                onClick={() => setCaptureMode(mode.id)}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  captureMode === mode.id
                    ? 'border-navy bg-grey-light'
                    : 'border-grey-mid hover:border-navy'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{mode.icon}</span>
                  <div>
                    <p className="font-semibold text-navy text-sm">{mode.title}</p>
                    <p className="text-xs text-grey-dark mt-0.5">{mode.description}</p>
                  </div>
                  {captureMode === mode.id && (
                    <span className="ml-auto text-cgreen font-bold">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-grey-dark text-sm hover:text-navy transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                if (!captureMode) return setError('Please select a capture mode.')
                setError(null)
                setStep(3)
              }}
              className="bg-navy text-white px-6 py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Analysis mode */}
      {step === 3 && (
        <div className="bg-white rounded-lg border border-grey-mid p-6">
          <h2 className="font-semibold text-navy mb-1">Analysis Mode</h2>
          <p className="text-xs text-grey-dark mb-4">How deeply should Claude analyse this engagement?</p>
          <div className="space-y-3">
            {ANALYSIS_MODES.map(mode => (
              <div
                key={mode.id}
                onClick={() => setAnalysisMode(mode.id)}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  analysisMode === mode.id
                    ? 'border-navy bg-grey-light'
                    : 'border-grey-mid hover:border-navy'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{mode.icon}</span>
                  <div>
                    <p className="font-semibold text-navy text-sm">{mode.title}</p>
                    <p className="text-xs text-grey-dark mt-0.5">{mode.description}</p>
                  </div>
                  {analysisMode === mode.id && (
                    <span className="ml-auto text-cgreen font-bold">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="text-grey-dark text-sm hover:text-navy transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="bg-cgreen text-white px-6 py-2 rounded font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Engagement →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}