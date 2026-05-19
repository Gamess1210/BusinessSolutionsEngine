import { useParams, useNavigate } from 'react-router-dom'

export default function CodeReview() {
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
        <h1 className="text-2xl font-bold text-navy">Gate 6 — Code Review</h1>
      </div>

      <div className="bg-white rounded-lg border border-grey-mid p-8 text-center">
        <p className="text-navy font-semibold mb-2">Coming soon — Gate 6</p>
        <p className="text-grey-dark text-sm">BA reviews the Gemini scorecard, ESLint complexity scores, and code diff before approving the generated code.</p>
      </div>
    </div>
  )
}
