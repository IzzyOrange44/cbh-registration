import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Stats = {
  totalParticipants: number
  totalRegistrations: number
  activePrograms: number
  totalRevenue: number
  recentRegistrations: Registration[]
}

type Registration = {
  id: string
  registered_at: string
  participant: {
    first_name: string
    last_name: string
  }
  program: {
    name: string
    price: number
  }
  status: string
  payment_status: string
}

type RegistrationResponse = {
  id: string
  registered_at: string
  status: string
  payment_status: string
  participants: {
    first_name: string
    last_name: string
  } | null
  programs: {
    name: string
    price: number
  } | null
}

type PaidRegistrationResponse = {
  programs: {
    price: number
  } | null
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalParticipants: 0,
    totalRegistrations: 0,
    activePrograms: 0,
    totalRevenue: 0,
    recentRegistrations: []
  })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminStatus()
  }, [user])

  const checkAdminStatus = async () => {
    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (data?.is_admin) {
      setIsAdmin(true)
      fetchDashboardStats()
    } else {
      setIsAdmin(false)
      setLoading(false)
    }
  }

  const fetchDashboardStats = async () => {
    try {
      // Get total participants
      const { count: participantCount } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })

      // Get total registrations
      const { count: registrationCount } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })

      // Get active programs
      const { count: programCount } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('registration_deadline', new Date().toISOString())

      // Get recent registrations with participant and program info
      const { data: recentRegs } = await supabase
        .from('registrations')
        .select(`
          id,
          registered_at,
          status,
          payment_status,
          participants!inner(first_name, last_name),
          programs!inner(name, price)
        `)
        .order('registered_at', { ascending: false })
        .limit(5)

      // Calculate total revenue (only paid registrations)
      const { data: paidRegistrations } = await supabase
        .from('registrations')
        .select('programs!inner(price)')
        .eq('payment_status', 'paid')

      const totalRevenue = (paidRegistrations as PaidRegistrationResponse[] | null)?.reduce((sum, reg) => {
        return sum + (reg.programs?.price || 0)
      }, 0) || 0

      // Transform the data to match our type
      const transformedRegs = (recentRegs as RegistrationResponse[] | null)?.map((reg) => ({
        id: reg.id,
        registered_at: reg.registered_at,
        status: reg.status,
        payment_status: reg.payment_status,
        participant: {
          first_name: reg.participants?.first_name || '',
          last_name: reg.participants?.last_name || ''
        },
        program: {
          name: reg.programs?.name || '',
          price: reg.programs?.price || 0
        }
      })) || []

      setStats({
        totalParticipants: participantCount || 0,
        totalRegistrations: registrationCount || 0,
        activePrograms: programCount || 0,
        totalRevenue,
        recentRegistrations: transformedRegs
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p>You do not have permission to access the admin dashboard.</p>
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
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <p className="text-gray-500 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold mt-1">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.recentRegistrations.map((registration) => (
                <tr key={registration.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {registration.participant?.first_name} {registration.participant?.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {registration.program?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      registration.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {registration.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      registration.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {registration.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(registration.registered_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
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
    </div>
  )
}