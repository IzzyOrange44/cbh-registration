
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts'
import { useEffect } from 'react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, profileCompleted, ready } = useAuth()
  const location = useLocation()

  useEffect(() => {
    console.log('ProtectedRoute - Auth State:', {
      user: user?.email,
      loading,
      profileCompleted,
      ready,
      currentPath: location.pathname
    })
  }, [user, loading, profileCompleted, ready, location.pathname])

  if (!ready || profileCompleted === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profileCompleted && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />
  }

  if (profileCompleted && location.pathname === '/complete-profile') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
