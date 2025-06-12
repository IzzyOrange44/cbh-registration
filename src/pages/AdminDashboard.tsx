import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts'

type Stats = {
  totalUsers: number
  totalParticipants: number
  totalRegistrations: number
  activePrograms: number
  totalEvents: number
  equipmentItems: number
  recentRegistrations: Registration[]
}

type Registration = {
  id: string
  registration_date: string
  status: string
  participant_name: string
  program_name: string
  parent_guardian_name: string | null
  waiver_agreed: boolean
}

type UserLocation = {
  id: string
  first_name: string
  last_name: string
  email: string
  city: string
  province: string
  postal_code: string
  lat?: number
  lng?: number
}

type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  role: string
  is_active: boolean
  created_at: string
  participant?: {
    city: string
    province: string
    postal_code: string | null
    date_of_birth: string
    vision_level: string
    skating_experience: string | null
  }
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalParticipants: 0,
    totalRegistrations: 0,
    activePrograms: 0,
    totalEvents: 0,
    equipmentItems: 0,
    recentRegistrations: []
  })
  const [users, setUsers] = useState<User[]>([])
  const [userLocations, setUserLocations] = useState<UserLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'map'>('overview')
  const [userFilter, setUserFilter] = useState<'all' | 'participants' | 'admins'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Canadian postal code to coordinates mapping (simplified)
  const getCoordinatesFromPostalCode = (postalCode: string): { lat: number; lng: number } | null => {
    if (!postalCode) return null
    
    const code = postalCode.replace(/\s/g, '').toUpperCase()
    const firstChar = code.charAt(0)
    
    // Rough mapping of Canadian postal code first letters to coordinates
    const postalCodeMap: { [key: string]: { lat: number; lng: number } } = {
      'A': { lat: 47.5615, lng: -52.7126 }, // Newfoundland
      'B': { lat: 44.6488, lng: -63.5752 }, // Nova Scotia
      'C': { lat: 46.2382, lng: -63.1311 }, // PEI
      'E': { lat: 46.0878, lng: -64.7782 }, // New Brunswick
      'G': { lat: 46.8139, lng: -71.2082 }, // Eastern Quebec
      'H': { lat: 45.5017, lng: -73.5673 }, // Montreal
      'J': { lat: 45.3781, lng: -73.9634 }, // Western Quebec
      'K': { lat: 45.4215, lng: -75.6972 }, // Eastern Ontario
      'L': { lat: 43.6532, lng: -79.3832 }, // Toronto
      'M': { lat: 43.6532, lng: -79.3832 }, // Toronto
      'N': { lat: 43.4643, lng: -80.5204 }, // Southwestern Ontario
      'P': { lat: 46.3014, lng: -84.3867 }, // Northern Ontario
      'R': { lat: 49.8951, lng: -97.1384 }, // Manitoba
      'S': { lat: 52.1579, lng: -106.6702 }, // Saskatchewan
      'T': { lat: 51.0447, lng: -114.0719 }, // Alberta
      'V': { lat: 49.2827, lng: -123.1207 }, // British Columbia
      'X': { lat: 60.7212, lng: -135.0568 }, // Yukon/NWT/Nunavut
      'Y': { lat: 60.7212, lng: -135.0568 }, // Yukon/NWT/Nunavut
    }
    
    return postalCodeMap[firstChar] || null
  }

  useEffect(() => {
    checkAdminStatus()
  }, [user])

  const checkAdminStatus = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
        setLoading(false)
        return
      }

      if (data?.role === 'admin') {
        setIsAdmin(true)
        await Promise.all([
          fetchDashboardStats(),
          fetchUsers(),
          fetchUserLocations()
        ])
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    } catch (err) {
      console.error('Error in checkAdminStatus:', err)
      setIsAdmin(false)
      setLoading(false)
    }
  }

  const fetchDashboardStats = async () => {
    try {
      // Get all counts in parallel
      const [
        { count: userCount },
        { count: participantCount },
        { count: registrationCount },
        { count: programCount },
        { count: eventCount },
        { count: equipmentCount }
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('participants').select('*', { count: 'exact', head: true }),
        supabase.from('registrations').select('*', { count: 'exact', head: true }),
        supabase.from('programs').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('equipment_inventory').select('*', { count: 'exact', head: true })
      ])

      // Get recent registrations
      const { data: recentRegs, error: recentError } = await supabase
        .from('registrations')
        .select(`
          id,
          registration_date,
          status,
          parent_guardian_name,
          waiver_agreed,
          participant_id,
          program_id
        `)
        .order('registration_date', { ascending: false })
        .limit(5)

      let transformedRegs: Registration[] = []

      if (!recentError && recentRegs) {
        transformedRegs = await Promise.all(
          recentRegs.map(async (reg) => {
            const { data: participant } = await supabase
              .from('participants')
              .select('user_id')
              .eq('id', reg.participant_id)
              .single()

            let participantName = 'Unknown Participant'
            if (participant?.user_id) {
              const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('first_name, last_name')
                .eq('id', participant.user_id)
                .single()

              if (userProfile) {
                participantName = `${userProfile.first_name} ${userProfile.last_name}`.trim()
              }
            }

            const { data: program } = await supabase
              .from('programs')
              .select('name')
              .eq('id', reg.program_id)
              .single()

            return {
              id: reg.id,
              registration_date: reg.registration_date,
              status: reg.status,
              participant_name: participantName,
              program_name: program?.name || 'Unknown Program',
              parent_guardian_name: reg.parent_guardian_name,
              waiver_agreed: reg.waiver_agreed
            }
          })
        )
      }

      setStats({
        totalUsers: userCount || 0,
        totalParticipants: participantCount || 0,
        totalRegistrations: registrationCount || 0,
        activePrograms: programCount || 0,
        totalEvents: eventCount || 0,
        equipmentItems: equipmentCount || 0,
        recentRegistrations: transformedRegs
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          participants (
            city,
            province,
            postal_code,
            date_of_birth,
            vision_level,
            skating_experience
          )
        `)
        .order('created_at', { ascending: false })

      if (!error && usersData) {
        setUsers(usersData.map(user => ({
          ...user,
          participant: user.participants?.[0] || null
        })))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchUserLocations = async () => {
    try {
      const { data: participantsData, error } = await supabase
        .from('participants')
        .select(`
          user_id,
          city,
          province,
          postal_code,
          user_profiles (
            first_name,
            last_name,
            email
          )
        `)
        .not('postal_code', 'is', null)

      if (!error && participantsData) {
        const locations: UserLocation[] = participantsData
          .filter(p => p.postal_code && p.user_profiles)
          .map(p => {
            const coords = getCoordinatesFromPostalCode(p.postal_code!)
            return {
              id: p.user_id,
              first_name: p.user_profiles[0].first_name,
              last_name: p.user_profiles[0].last_name,
              email: p.user_profiles[0].email,
              city: p.city,
              province: p.province,
              postal_code: p.postal_code!,
              ...coords
            }
          })
          .filter(l => l.lat && l.lng)

        setUserLocations(locations)
      }
    } catch (error) {
      console.error('Error fetching user locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const filteredUsers = users.filter(user => {
    const matchesFilter = 
      userFilter === 'all' || 
      (userFilter === 'participants' && user.participant) ||
      (userFilter === 'admins' && user.role === 'admin')
    
    const matchesSearch = 
      searchTerm === '' ||
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.participant?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.participant?.province?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const locationsByProvince = userLocations.reduce((acc, location) => {
    if (!acc[location.province]) {
      acc[location.province] = []
    }
    acc[location.province].push(location)
    return acc
  }, {} as { [key: string]: UserLocation[] })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p>You do not have permission to access the admin dashboard.</p>
          <p className="text-sm mt-2">Make sure you have admin role assigned in the database.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-4">
          <Link
            to="/admin/programs"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Manage Programs
          </Link>
          <Link
            to="/admin/registrations"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            All Registrations
          </Link>
          <Link
            to="/admin/events"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage Events
          </Link>
          <Link
            to="/admin/equipment"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Equipment
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Users ({stats.totalUsers})
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'map'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              User Locations ({userLocations.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Users</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Participants</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalParticipants}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Registrations</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalRegistrations}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Active Programs</p>
                  <p className="text-3xl font-bold mt-1">{stats.activePrograms}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Scheduled Events</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalEvents}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Equipment Items</p>
                  <p className="text-3xl font-bold mt-1">{stats.equipmentItems}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Registrations */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Recent Registrations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guardian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waiver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recentRegistrations.length > 0 ? (
                    stats.recentRegistrations.map((registration) => (
                      <tr key={registration.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {registration.participant_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {registration.program_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.parent_guardian_name || 'Self-registered'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            registration.status === 'approved' 
                              ? 'bg-green-100 text-green-800'
                              : registration.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {registration.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            registration.waiver_agreed 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {registration.waiver_agreed ? 'Signed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(registration.registration_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No registrations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t">
              <Link
                to="/admin/registrations"
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                View all registrations →
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value as 'all' | 'participants' | 'admins')}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Users</option>
                <option value="participants">Participants Only</option>
                <option value="admins">Admins Only</option>
              </select>
              
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 flex-1 max-w-md"
              />
              
              <span className="text-sm text-gray-600">
                Showing {filteredUsers.length} of {users.length} users
              </span>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participant Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-400">{user.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.participant ? (
                          <div>
                            <div>{user.participant.city}, {user.participant.province}</div>
                            {user.participant.postal_code && (
                              <div className="text-xs text-gray-500">{user.participant.postal_code}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not available</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.participant ? (
                          <div className="text-sm space-y-1">
                            <div><strong>Age:</strong> {calculateAge(user.participant.date_of_birth)}</div>
                            <div><strong>Vision:</strong> {user.participant.vision_level}</div>
                            {user.participant.skating_experience && (
                              <div><strong>Experience:</strong> {user.participant.skating_experience}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not a participant</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found matching your criteria
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map Tab */}
      {activeTab === 'map' && (
        <div className="space-y-6">
          {/* Map Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">User Distribution Across Canada</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {Object.entries(locationsByProvince)
                .sort(([,a], [,b]) => b.length - a.length)
                .map(([province, locations]) => (
                <div key={province} className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-900">{province}</div>
                  <div className="text-2xl font-bold text-red-600">{locations.length}</div>
                  <div className="text-xs text-gray-500">users</div>
                </div>
              ))}
            </div>

            {/* Simple textual representation since we can't embed a real map */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium mb-4">User Locations by Province/Territory:</h4>
              <div className="space-y-2">
                {Object.entries(locationsByProvince).map(([province, locations]) => (
                  <div key={province} className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">{province}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">{locations.length} users</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${(locations.length / userLocations.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <p><strong>Note:</strong> This shows users who have provided postal codes in their participant profiles. 
              To view a full interactive map, you would need to integrate with a mapping service like Google Maps or Mapbox.</p>
            </div>
          </div>

          {/* Location Details */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Detailed User Locations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Province
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Postal Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coordinates
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {userLocations.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {location.first_name} {location.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{location.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.city}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.province}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {location.postal_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {location.lat && location.lng ? (
                          `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                        ) : (
                          'Not available'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}