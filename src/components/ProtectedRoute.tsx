import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileCompleted } = useAuth()
  const location = useLocation()
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check if profile is complete (except for the complete-profile page itself)
  if (!profileCompleted && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }
  
  return <>{children}</>
}