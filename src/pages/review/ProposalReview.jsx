import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Part1SolutionSelect from './Part1SolutionSelect'
import Part2ContextCapture from './Part2ContextCapture'
import Part3ProposalLoop from './Part3ProposalLoop'

function determinePart(engagement) {
  if (!engagement.chosen_solution) return 1
  if (!engagement.proposal_json) return 2
  return 3
}

function stepClass(part, threshold) { return part >= threshold ? 'text-navy font-medium' : 'font-medium' }

export default function ProposalReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [engagement, setEngagement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  if (engagement.status !== 'gate3_review') {
    navigate(`/engagements/${id}`, { replace: true })
    return null
  }

  const part = determinePart(engagement)

  function updateEngagement(updates) {
    setEngagement(prev => ({ ...prev, ...updates }))
  }

  function handleSolutionSelected(chosenSolution) {
    updateEngagement({ chosen_solution: chosenSolution })
  }

  function handleProposalGenerated(proposalJson, context) {
    updateEngagement({ proposal_json: proposalJson, chosen_solution_context: context })
  }

  function handleProposalUpdated(proposalJson) {
    updateEngagement({ proposal_json: proposalJson })
  }

  function handleChangeSolution() {
    updateEngagement({ chosen_solution: null, chosen_solution_context: null, proposal_json: null })
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
        <h1 className="text-2xl font-bold text-navy">Gate 3 — Proposal Review</h1>
        <p className="text-grey-dark text-sm mt-1">
          {[engagement.client_name, engagement.organisation].filter(Boolean).join(' — ')}
        </p>
        <div className="flex gap-4 mt-3 text-xs text-grey-dark">
          <span className={stepClass(part, 1)}>1. Select Solution</span>
          <span>›</span>
          <span className={stepClass(part, 2)}>2. Add Context</span>
          <span>›</span>
          <span className={stepClass(part, 3)}>3. Review &amp; Approve</span>
        </div>
      </div>

      {part === 1 && (
        <Part1SolutionSelect
          engagement={engagement}
          onSolutionSelected={handleSolutionSelected}
          onChangeSolution={handleChangeSolution}
        />
      )}

      {part === 2 && (
        <Part2ContextCapture
          engagement={engagement}
          onProposalGenerated={handleProposalGenerated}
          onChangeSolution={handleChangeSolution}
        />
      )}

      {part === 3 && (
        <Part3ProposalLoop
          engagement={engagement}
          proposalJson={engagement.proposal_json}
          onProposalUpdated={handleProposalUpdated}
          onApproved={() => {}}
          onChangeSolution={handleChangeSolution}
        />
      )}
    </div>
  )
}
