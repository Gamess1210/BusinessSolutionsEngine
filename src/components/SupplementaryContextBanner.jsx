import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SupplementaryContextBanner({
  engagementId,
  onRegenerateComplete,
  onDismiss,
  onRegeneratingChange,
}) {
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState(null)

  function setRegeneratingState(value) {
    setRegenerating(value)
    onRegeneratingChange?.(value)
  }

  async function handleRegenerate() {
    setRegeneratingState(true)
    setError(null)
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const session = data.session
      const res = await fetch('/api/pipeline/regenerate-brief-and-solutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ engagementId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Regeneration failed (${res.status})`)
      }
      onRegenerateComplete()
    } catch (err) {
      setError(err.message)
      setRegeneratingState(false)
    }
  }

  return (
    <div className="bg-grey-light border-l-4 border-navy rounded px-5 py-4 mb-4">
      <p className="text-sm text-navy mb-3">
        New context added. The current brief and solutions do not reflect this input.
        Regenerate to update them before proceeding to Gate 3.
      </p>
      {error && (
        <p className="text-sm text-cred mb-3">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={onDismiss}
          disabled={regenerating}
          className="text-sm text-grey-dark hover:text-navy transition-colors disabled:opacity-50"
        >
          Dismiss
        </button>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="bg-navy text-white px-5 py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          {regenerating ? 'Regenerating...' : 'Regenerate Brief & Solutions'}
        </button>
      </div>
    </div>
  )
}
