import { useAuth } from '../contexts/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()
  
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <p>Welcome, {user?.email}!</p>
      {/* Add your dashboard content here */}
    </div>
  )
}