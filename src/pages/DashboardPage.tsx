import { useState, useEffect } from 'react'
import { useAuth } from '../contexts'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ProfileCompletionForm } from '../components/ProfileCompletionForm'

export function DashboardPage() {
  const { user, profileCompleted } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [participantCount, setParticipantCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      try {
        // Get user role and basic info
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, first_name, last_name')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserRole(profile.role)
        }

        // If profile is completed, fetch dashboard data
        if (profileCompleted === true) {
          // Count participants managed by this user (for parent_guardians)
          if (profile?.role === 'parent_guardian') {
            const { count } = await supabase
              .from('participants')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
            
            setParticipantCount(count || 0)
          }

          // Fetch recent registrations - simplified query
          const { data: registrations } = await supabase
            .from('registrations')
            .select(`
              id,
              registration_date,
              status
            `)
            .order('registration_date', { ascending: false })
            .limit(5)

          setRecentActivity(registrations || [])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user, profileCompleted])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-br from-red-600 to-red-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <span className="text-3xl">🍁</span>
          </div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Profile completion prompt - only show if not completed */}
        {(profileCompleted === false || profileCompleted === null) && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <div className="bg-yellow-500 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📝</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Complete Your Profile</h3>
                <p className="text-yellow-700 mb-4">
                  To register for events and programs, you'll need to complete your profile first. 
                  This information will auto-fill future registrations.
                </p>
                <button
                  onClick={() => {
                    const element = document.getElementById('profile-completion-form')
                    element?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors duration-200 font-medium"
                >
                  Complete Profile Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-br from-red-600 to-red-700 w-16 h-16 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-3xl">🍁</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Welcome back, {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Player'}!
                </h1>
                <p className="text-gray-600">
                  {userRole === 'participant' && 'Ready to hit the ice?'}
                  {userRole === 'parent_guardian' && `Managing ${participantCount} player${participantCount !== 1 ? 's' : ''}`}
                  {userRole === 'coach' && 'Great to have you on the team!'}
                  {userRole === 'volunteer' && 'Thank you for supporting our community!'}
                  {userRole === 'admin' && 'Welcome to the admin dashboard!'}
                  {!userRole && 'Welcome to Canadian Blind Hockey!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Grid - Only show if profile is completed */}
        {profileCompleted && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {userRole === 'participant' && (
                  <button 
                    onClick={() => navigate('/programs')}
                    className="w-full text-left bg-red-50 hover:bg-red-100 p-3 rounded-lg transition-colors duration-200"
                  >
                    <div className="font-medium text-red-700">🏒 Browse Programs</div>
                    <div className="text-sm text-red-600">Find and register for hockey programs</div>
                  </button>
                )}
                
                {userRole === 'parent_guardian' && (
                  <>
                    <button 
                      onClick={() => navigate('/participants/new')}
                      className="w-full text-left bg-red-50 hover:bg-red-100 p-3 rounded-lg transition-colors duration-200"
                    >
                      <div className="font-medium text-red-700">👤 Add Player</div>
                      <div className="text-sm text-red-600">Create profile for your child</div>
                    </button>
                    <button 
                      onClick={() => navigate('/participants')}
                      className="w-full text-left bg-red-50 hover:bg-red-100 p-3 rounded-lg transition-colors duration-200"
                    >
                      <div className="font-medium text-red-700">👥 Manage Players</div>
                      <div className="text-sm text-red-600">View and edit player profiles</div>
                    </button>
                  </>
                )}

                {userRole === 'admin' && (
                  <>
                    <button 
                      onClick={() => navigate('/admin/programs')}
                      className="w-full text-left bg-red-50 hover:bg-red-100 p-3 rounded-lg transition-colors duration-200"
                    >
                      <div className="font-medium text-red-700">📋 Manage Programs</div>
                      <div className="text-sm text-red-600">Create and edit hockey programs</div>
                    </button>
                    <button 
                      onClick={() => navigate('/admin/registrations')}
                      className="w-full text-left bg-red-50 hover:bg-red-100 p-3 rounded-lg transition-colors duration-200"
                    >
                      <div className="font-medium text-red-700">📊 View Registrations</div>
                      <div className="text-sm text-red-600">Manage all program registrations</div>
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition-colors duration-200"
                >
                  <div className="font-medium text-gray-700">⚙️ Profile Settings</div>
                  <div className="text-sm text-gray-600">Update your information</div>
                </button>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Stats</h3>
              <div className="space-y-4">
                {userRole === 'parent_guardian' && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Players</span>
                    <span className="text-2xl font-bold text-red-600">{participantCount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Active Registrations</span>
                  <span className="text-2xl font-bold text-red-600">{recentActivity.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Programs Available</span>
                  <span className="text-2xl font-bold text-red-600">3</span>
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Events</h3>
              <div className="space-y-3">
                <div className="border-l-4 border-red-500 pl-3">
                  <div className="font-medium text-gray-800">Practice Session</div>
                  <div className="text-sm text-gray-600">Tomorrow, 7:00 PM</div>
                </div>
                <div className="border-l-4 border-blue-500 pl-3">
                  <div className="font-medium text-gray-800">Team Meeting</div>
                  <div className="text-sm text-gray-600">Friday, 6:30 PM</div>
                </div>
                <div className="border-l-4 border-green-500 pl-3">
                  <div className="font-medium text-gray-800">Game Day</div>
                  <div className="text-sm text-gray-600">Saturday, 2:00 PM</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity - Only show if profile is completed */}
        {profileCompleted && (
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity: any, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">
                        Registration #{activity.id.slice(0, 8)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(activity.registration_date).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'approved' ? 'bg-green-100 text-green-800' :
                      activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
                <p className="text-sm">Your registrations and events will appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Profile Completion Form - only show if profile not completed */}
        {(profileCompleted === false || profileCompleted === null) && (
          <div id="profile-completion-form" className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Complete Your Profile</h2>
              <p className="text-gray-600">
                Fill out your information below to register for events and programs.
              </p>
            </div>
            <ProfileCompletionForm />
          </div>
        )}
      </div>
    </div>
  )
}