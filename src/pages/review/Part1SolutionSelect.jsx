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

function SolutionOption({ solution, index, selected, onSelect }) {
  return (
    <label className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
      selected
        ? 'border-navy bg-navy/5'
        : 'border-grey-mid bg-white hover:border-navy/40'
    }`}>
      <input
        type="radio"
        name="chosen_solution"
        checked={selected}
        onChange={() => onSelect(solution)}
        className="mt-1 accent-navy flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-white bg-navy rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <p className="text-sm font-semibold text-navy">{solution.title}</p>
        </div>
        <p className="text-sm text-grey-dark leading-relaxed">{solution.description}</p>
        {solution.effort && (
          <div className="flex gap-3 mt-2 text-xs text-grey-dark">
            <span>Effort: <strong>{solution.effort}</strong></span>
            <span>Impact: <strong>{solution.impact}</strong></span>
          </div>
        )}
      </div>
    </label>
  )
}

export default function Part1SolutionSelect({ engagement, onSolutionSelected, onChangeSolution }) {
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const solutions = engagement.solutions?.solutions ?? []

  async function handleNext() {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      await postApi('/api/pipeline/gate3-select-solution', {
        engagementId: engagement.id,
        chosenSolution: selected,
      })
      onSolutionSelected(selected)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-grey-mid">
      <div className="p-6 border-b border-grey-mid">
        <h2 className="text-lg font-semibold text-navy">Part 1 — Select Solution</h2>
        <p className="text-sm text-grey-dark mt-1">
          Choose the solution to propose to the client. You will refine the proposal in the next step.
        </p>
      </div>

      <div className="p-6 space-y-3">
        {solutions.length === 0 && (
          <p className="text-sm text-grey-dark">No solutions found on this engagement.</p>
        )}
        {solutions.map((sol, i) => (
          <SolutionOption
            key={i}
            solution={sol}
            index={i}
            selected={selected?.title === sol.title}
            onSelect={setSelected}
          />
        ))}
      </div>

      {error && (
        <div className="mx-6 mb-4 bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3">
          {error}
        </div>
      )}

      <div className="border-t border-grey-mid px-6 py-4 bg-grey-light rounded-b-lg flex items-center justify-between">
        <button
          onClick={() => onChangeSolution(false)}
          className="text-sm text-grey-dark hover:text-navy transition-colors"
        >
          Change solution
        </button>
        <button
          onClick={handleNext}
          disabled={!selected || loading}
          className="bg-navy text-white px-6 py-2 rounded font-semibold text-sm hover:bg-navy/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Next: Add Context →'}
        </button>
      </div>
    </div>
  )
}
