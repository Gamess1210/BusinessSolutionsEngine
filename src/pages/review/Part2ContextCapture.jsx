import { useState } from 'react'
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

function buildContext(noContext, tab, text) {
  if (noContext || !text.trim()) return null
  return { type: tab, text: text.trim() }
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

function ContextInputArea({ noContext, tab, text, onChange }) {
  if (noContext) {
    return (
      <p className="text-sm text-grey-dark py-4">
        No additional context — Claude will use only the approved brief and chosen solution.
      </p>
    )
  }
  const placeholder = tab === 'transcript'
    ? 'Paste a meeting transcript to give Claude additional context...'
    : 'Notes from your client conversation — anything relevant to the proposal...'
  return (
    <textarea
      value={text}
      onChange={e => onChange(e.target.value)}
      rows={8}
      placeholder={placeholder}
      className="w-full border border-grey-mid rounded px-4 py-3 text-sm focus:outline-none focus:border-navy resize-none font-mono"
    />
  )
}

export default function Part2ContextCapture({ engagement, onProposalGenerated, onChangeSolution }) {
  const [tab, setTab] = useState('braindump')
  const [text, setText] = useState('')
  const [noContext, setNoContext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const canProceed = noContext || text.trim().length > 0

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const context = buildContext(noContext, tab, text)
      const result = await postApi('/api/pipeline/gate3-generate', {
        engagementId: engagement.id,
        context,
      })
      onProposalGenerated(result.proposalJson, context)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-grey-mid">
      <div className="p-6 border-b border-grey-mid">
        <h2 className="text-lg font-semibold text-navy">Part 2 — Supplementary Context</h2>
        <p className="text-sm text-grey-dark mt-1">
          Optionally add meeting notes or transcript context from the client discussion.
        </p>
        <p className="text-xs text-grey-dark mt-2">
          Selected solution: <strong className="text-navy">{engagement.chosen_solution?.title}</strong>
        </p>
      </div>

      <div className="flex border-b border-grey-mid">
        <TabButton id="braindump" label="Brain-dump" active={tab === 'braindump'} onClick={setTab} />
        <TabButton id="transcript" label="Transcript" active={tab === 'transcript'} onClick={setTab} />
      </div>

      <div className="p-6">
        <ContextInputArea noContext={noContext} tab={tab} text={text} onChange={setText} />
      </div>

      <div className="px-6 pb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={noContext}
            onChange={e => { setNoContext(e.target.checked); setText('') }}
            className="accent-navy"
          />
          <span className="text-sm text-grey-dark">No additional context</span>
        </label>
      </div>

      {error && (
        <div className="mx-6 mb-4 bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3">
          {error}
        </div>
      )}

      <div className="border-t border-grey-mid px-6 py-4 bg-grey-light rounded-b-lg flex items-center justify-between">
        <button
          onClick={() => onChangeSolution()}
          className="text-sm text-grey-dark hover:text-navy transition-colors"
        >
          Change solution
        </button>
        <button
          onClick={handleGenerate}
          disabled={!canProceed || loading}
          className="bg-navy text-white px-6 py-2 rounded font-semibold text-sm hover:bg-navy/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating Proposal…' : 'Generate Proposal →'}
        </button>
      </div>
    </div>
  )
}
