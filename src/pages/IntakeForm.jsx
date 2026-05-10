import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function IntakeForm() {
  const { token } = useParams()
  const [tokenValid, setTokenValid] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    organisation: '',
    department: '',
    problem_description: '',
    impact_description: '',
    constraints: '',
  })

  useEffect(() => {
    async function validateToken() {
      try {
        const { data, error } = await supabase
          .from('engagement_inputs')
          .select('*, engagements(client_name, organisation)')
          .eq('intake_token', token)
          .eq('input_type', 'client_intake')
          .single()

        if (error || !data) {
            setTokenValid(false)
        } else if (data.content !== null) {
            setSubmitted(true)
            setTokenValid(true)
        } else {
            setTokenValid(true)
        }
        
      } catch {
        setTokenValid(false)
      } finally {
        setLoading(false)
      }
    }
    validateToken()
  }, [token])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.problem_description.trim()) {
      return setError('Please describe the problem you are experiencing.')
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/intake/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-grey-light flex items-center justify-center">
      <p className="text-grey-dark text-sm">Loading...</p>
    </div>
  )

  if (tokenValid === false) return (
    <div className="min-h-screen bg-grey-light flex items-center justify-center">
      <div className="bg-white rounded-lg p-10 max-w-md w-full text-center shadow">
        <BrandMark />
        <h2 className="text-lg font-bold text-navy mt-6 mb-2">Invalid or Expired Link</h2>
        <p className="text-grey-dark text-sm">
          This intake form link is invalid or has already been completed.
          Please contact your Comotion representative for a new link.
        </p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-grey-light flex items-center justify-center">
      <div className="bg-white rounded-lg p-10 max-w-md w-full text-center shadow">
        <BrandMark />
        <div className="text-5xl my-6">✓</div>
        <h2 className="text-lg font-bold text-navy mb-2">Thank you</h2>
        <p className="text-grey-dark text-sm">
          Your response has been received. Your Comotion Business Solutions
          representative will be in touch shortly.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-grey-light py-10 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-mid p-6 mb-6">
          <BrandMark />
          <hr className="border-navy border-t-2 my-4" />
          <h1 className="text-xl font-bold text-navy">Business Solutions Intake Form</h1>
          <p className="text-grey-dark text-sm mt-1">
            Please take a few minutes to describe the business challenge you'd like
            Comotion to help you solve. Your responses will help us prepare for our
            first conversation.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg border border-grey-mid p-6 space-y-5">

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Your Name"
              required
              value={form.contact_name}
              onChange={v => handleChange('contact_name', v)}
              placeholder="Jane Smith"
            />
            <Field
              label="Email Address"
              required
              type="email"
              value={form.contact_email}
              onChange={v => handleChange('contact_email', v)}
              placeholder="jane@company.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Organisation"
              value={form.organisation}
              onChange={v => handleChange('organisation', v)}
              placeholder="e.g. Nedbank"
            />
            <Field
              label="Department"
              value={form.department}
              onChange={v => handleChange('department', v)}
              placeholder="e.g. Operations"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
              Describe the Problem <span className="text-cred">*</span>
            </label>
            <p className="text-xs text-grey-dark mb-2">
              In your own words, what is the core challenge or inefficiency you're experiencing?
            </p>
            <textarea
              value={form.problem_description}
              onChange={e => handleChange('problem_description', e.target.value)}
              rows={5}
              placeholder="e.g. Our month-end reconciliation process takes 3 days and involves a lot of manual data entry across multiple spreadsheets..."
              className="w-full border border-grey-mid rounded px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
              Business Impact
            </label>
            <p className="text-xs text-grey-dark mb-2">
              What is the cost of this problem — in time, money, risk, or staff frustration?
            </p>
            <textarea
              value={form.impact_description}
              onChange={e => handleChange('impact_description', e.target.value)}
              rows={3}
              placeholder="e.g. Takes 2 staff members 3 full days each month. We've had 3 audit findings related to errors in the last year..."
              className="w-full border border-grey-mid rounded px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
              Known Constraints
            </label>
            <p className="text-xs text-grey-dark mb-2">
              Any budget, timeline, system, or organisational constraints we should know about?
            </p>
            <textarea
              value={form.constraints}
              onChange={e => handleChange('constraints', e.target.value)}
              rows={3}
              placeholder="e.g. We're on SAP and can't change core systems. Budget is limited for this financial year..."
              className="w-full border border-grey-mid rounded px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !form.contact_name.trim() || !form.problem_description.trim()}
            className="w-full bg-navy text-white py-3 rounded font-semibold text-sm hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            {saving ? 'Submitting...' : 'Submit →'}
          </button>

          <p className="text-xs text-grey-dark text-center">
            Your information is treated as confidential and will only be used
            to prepare for your Comotion Business Solutions engagement.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-grey-dark mt-6">
          © Comotion Business Solutions
        </p>
      </div>
    </div>
  )
}

function BrandMark() {
  return (
    <div className="text-2xl font-bold">
      <span className="text-navy">C</span>
      <span className="text-cgreen">O</span>
      <span className="text-navy">M</span>
      <span className="text-cblue">O</span>
      <span className="text-navy">T</span>
      <span className="text-cred">I</span>
      <span className="text-navy">ON</span>
      <span className="text-grey-dark text-sm font-normal ml-2">Business Solutions</span>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, required, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-grey-dark uppercase tracking-wide mb-1">
        {label} {required && <span className="text-cred">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-grey-mid rounded px-4 py-2 text-sm focus:outline-none focus:border-navy"
      />
    </div>
  )
}