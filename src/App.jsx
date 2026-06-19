import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import NewEngagement from './pages/NewEngagement'
import EngagementDetail from './pages/EngagementDetail'
import BriefReview from './pages/review/BriefReview'
import SolutionsReview from './pages/review/SolutionsReview'
import ProposalReview from './pages/review/ProposalReview'
import ClientDecisionReview from './pages/review/ClientDecisionReview'
import ProjectPlanReview from './pages/review/ProjectPlanReview'
import SpecReview from './pages/review/SpecReview'
import OutputsReview from './pages/review/OutputsReview'
import ProposalPreview from './pages/preview/ProposalPreview'
import SolutionsPreview from './pages/preview/SolutionsPreview'
import Login from './pages/Login'
import { useAuth } from './hooks/useAuth'
import IntakeForm from './pages/IntakeForm'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-grey-light" />
  if (!session) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/intake/:token" element={<IntakeForm />} />
      <Route path="/preview/:id/proposal" element={<ProtectedRoute><ProposalPreview /></ProtectedRoute>} />
      <Route path="/preview/:id/solutions" element={<ProtectedRoute><SolutionsPreview /></ProtectedRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="new" element={<NewEngagement />} />
        <Route path="engagements/:id" element={<EngagementDetail />} />
        <Route path="review/:id/brief" element={<BriefReview />} />
        <Route path="review/:id/solutions" element={<SolutionsReview />} />
        <Route path="review/:id/proposal" element={<ProposalReview />} />
        <Route path="review/:id/client-decision" element={<ClientDecisionReview />} />
        <Route path="review/:id/project-plan" element={<ProjectPlanReview />} />
        <Route path="review/:id/spec" element={<SpecReview />} />
        <Route path="review/:id/outputs" element={<OutputsReview />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App