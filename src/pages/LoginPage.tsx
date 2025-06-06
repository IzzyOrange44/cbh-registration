import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts'

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signIn, user, profileCompleted } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/dashboard'

  // If user is already logged in, redirect them
  useEffect(() => {
    if (user) {
      if (!profileCompleted) {
        navigate('/complete-profile', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    }
  }, [user, profileCompleted, navigate, from])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email to confirm your account')
        } else {
          setError(error.message)
        }
        setLoading(false)
      } else {
        // Sign in successful
        console.log('Sign in successful')
        setLoading(false)
        // The useEffect will handle navigation
      }
    } catch (err) {
      console.error('Unexpected error during sign in:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <div className="bg-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🍁</span>
          </div>
          <h2 className="text-2xl font-bold">Sign In</h2>
          <p className="text-gray-600 mt-2">Welcome back to Canadian Blind Hockey</p>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-red-600 hover:underline">
              Sign up
            </Link>
          </p>
          <p className="text-sm">
            <Link to="/forgot-password" className="text-gray-600 hover:underline">
              Forgot your password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}