import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="bg-white rounded-lg p-10 w-full max-w-md shadow-xl">
        <div className="text-3xl font-bold mb-1">
          <span className="text-navy">C</span>
          <span className="text-cgreen">O</span>
          <span className="text-navy">M</span>
          <span className="text-cblue">O</span>
          <span className="text-navy">T</span>
          <span className="text-cred">I</span>
          <span className="text-navy">ON</span>
        </div>
        <p className="text-grey-dark text-sm mb-8">Business Solutions Engine</p>

        {error && (
          <div className="bg-red-50 border border-cred text-cred text-sm rounded px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-grey-mid rounded px-4 py-2 mb-3 text-sm focus:outline-none focus:border-navy"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border border-grey-mid rounded px-4 py-2 mb-6 text-sm focus:outline-none focus:border-navy"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white py-2 rounded font-semibold text-sm hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}