import { useParams, useNavigate } from 'react-router-dom'

export default function ClientDecisionReview() {
  const { id } = useParams()
  const navigate = useNavigate()

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
      </div>

      <div className="bg-white rounded-lg border border-grey-mid p-8 text-center">
        <p className="text-navy font-semibold mb-2">Coming soon — Gate 4</p>
        <p className="text-grey-dark text-sm">BA records the client's chosen solution and captures any post-meeting context before spec generation begins.</p>
      </div>
    </div>
  )
}
