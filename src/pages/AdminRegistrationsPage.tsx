import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Registration = {
  id: string
  registered_at: string
  status: string
  payment_status: string
  participant: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    date_of_birth: string
    position: string
    visual_classification: string
  }
  program: {
    id: string
    name: string
    price: number
    start_date: string
    location: string
  }
  user: {
    email: string
    full_name: string
  }
}

type FilterType = 'all' | 'confirmed' | 'pending' | 'cancelled'

export function AdminRegistrationsPage() {
  const { programId } = useParams()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [programName, setProgramName] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([])

  useEffect(() => {
    fetchRegistrations()
  }, [programId, filter])

  const fetchRegistrations = async () => {
    // First, get the registrations
    let registrationsQuery = supabase
      .from('registrations')
      .select('*')
      .order('registered_at', { ascending: false })

    if (programId) {
      registrationsQuery = registrationsQuery.eq('program_id', programId)
      
      // Get program name
      const { data: programData } = await supabase
        .from('programs')
        .select('name')
        .eq('id', programId)
        .single()
      
      if (programData) {
        setProgramName(programData.name)
      }
    }

    if (filter !== 'all') {
      registrationsQuery = registrationsQuery.eq('status', filter)
    }

    const { data: registrationsData, error: registrationsError } = await registrationsQuery

    if (registrationsError || !registrationsData) {
      setLoading(false)
      return
    }

    // Now fetch related data for each registration
    const transformedData: Registration[] = []

    for (const reg of registrationsData) {
      // Get participant data
      const { data: participantData } = await supabase
        .from('participants')
        .select('*')
        .eq('id', reg.participant_id)
        .single()

      // Get program data
      const { data: programData } = await supabase
        .from('programs')
        .select('*')
        .eq('id', reg.program_id)
        .single()

      if (participantData && programData) {
        // Get guardian info
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', participantData.user_id)
          .single()

        transformedData.push({
          id: reg.id,
          registered_at: reg.registered_at,
          status: reg.status,
          payment_status: reg.payment_status,
          participant: {
            id: participantData.id,
            first_name: participantData.first_name,
            last_name: participantData.last_name,
            email: participantData.email || '',
            phone: participantData.phone || '',
            date_of_birth: participantData.date_of_birth,
            position: participantData.position || '',
            visual_classification: participantData.visual_classification || ''
          },
          program: {
            id: programData.id,
            name: programData.name,
            price: programData.price,
            start_date: programData.start_date,
            location: programData.location || ''
          },
          user: {
            email: profileData?.email || '',
            full_name: profileData?.full_name || ''
          }
        })
      }
    }
    
    setRegistrations(transformedData)
    setLoading(false)
  }

  const handleStatusChange = async (registrationId: string, newStatus: string) => {
    const { error } = await supabase
      .from('registrations')
      .update({ status: newStatus })
      .eq('id', registrationId)

    if (!error) {
      fetchRegistrations()
    }
  }

  const handlePaymentStatusChange = async (registrationId: string, newStatus: string) => {
    const { error } = await supabase
      .from('registrations')
      .update({ payment_status: newStatus })
      .eq('id', registrationId)

    if (!error) {
      fetchRegistrations()
    }
  }

  const handleBulkAction = async (action: 'confirm' | 'cancel' | 'export') => {
    if (action === 'export') {
      exportToCSV()
      return
    }

    const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled'
    
    for (const id of selectedRegistrations) {
      await supabase
        .from('registrations')
        .update({ status: newStatus })
        .eq('id', id)
    }

    setSelectedRegistrations([])
    fetchRegistrations()
  }

  const exportToCSV = () => {
    const filteredRegistrations = registrations.filter(reg => 
      selectedRegistrations.length === 0 || selectedRegistrations.includes(reg.id)
    )

    const csv = [
      ['Name', 'Email', 'Phone', 'Program', 'Date Registered', 'Status', 'Payment Status', 'Guardian Email'],
      ...filteredRegistrations.map(reg => [
        `${reg.participant.first_name} ${reg.participant.last_name}`,
        reg.participant.email || '',
        reg.participant.phone || '',
        reg.program.name,
        new Date(reg.registered_at).toLocaleDateString(),
        reg.status,
        reg.payment_status,
        reg.user.email
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registrations-${programName || 'all'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredRegistrations = registrations.filter(reg => {
    const searchLower = searchTerm.toLowerCase()
    return (
      reg.participant.first_name.toLowerCase().includes(searchLower) ||
      reg.participant.last_name.toLowerCase().includes(searchLower) ||
      reg.participant.email?.toLowerCase().includes(searchLower) ||
      reg.program.name.toLowerCase().includes(searchLower) ||
      reg.user.email.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {programId ? `${programName} Registrations` : 'All Registrations'}
          </h1>
          <p className="text-gray-600 mt-1">
            Total: {filteredRegistrations.length} registrations
          </p>
        </div>
        <Link
          to={programId ? '/admin/programs' : '/admin'}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back
        </Link>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <input
              type="text"
              placeholder="Search by name, email, or program..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 w-64"
            />
          </div>

          {selectedRegistrations.length > 0 && (
            <div className="flex gap-2">
              <span className="text-sm text-gray-600 self-center">
                {selectedRegistrations.length} selected
              </span>
              <button
                onClick={() => handleBulkAction('confirm')}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm Selected
              </button>
              <button
                onClick={() => handleBulkAction('cancel')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Cancel Selected
              </button>
              <button
                onClick={() => handleBulkAction('export')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export Selected
              </button>
            </div>
          )}

          {selectedRegistrations.length === 0 && (
            <button
              onClick={() => handleBulkAction('export')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Export All
            </button>
          )}
        </div>
      </div>

      {/* Registrations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRegistrations.length === filteredRegistrations.length && filteredRegistrations.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRegistrations(filteredRegistrations.map(r => r.id))
                    } else {
                      setSelectedRegistrations([])
                    }
                  }}
                  className="h-4 w-4 text-red-600"
                />
              </th>
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
                Registered
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredRegistrations.map((registration) => (
              <tr key={registration.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedRegistrations.includes(registration.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRegistrations([...selectedRegistrations, registration.id])
                      } else {
                        setSelectedRegistrations(selectedRegistrations.filter(id => id !== registration.id))
                      }
                    }}
                    className="h-4 w-4 text-red-600"
                  />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {registration.participant.first_name} {registration.participant.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {registration.participant.email || 'No email'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {registration.participant.position} • {registration.participant.visual_classification || 'No classification'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="font-medium">{registration.program.name}</div>
                    <div className="text-gray-500">{registration.program.location}</div>
                    <div className="text-xs text-gray-400">
                      ${registration.program.price}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div>{registration.user.full_name || 'N/A'}</div>
                    <div className="text-gray-500 text-xs">{registration.user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(registration.registered_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={registration.status}
                    onChange={(e) => handleStatusChange(registration.id, e.target.value)}
                    className={`text-xs rounded-full px-3 py-1 font-medium ${
                      registration.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800'
                        : registration.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={registration.payment_status}
                    onChange={(e) => handlePaymentStatusChange(registration.id, e.target.value)}
                    className={`text-xs rounded-full px-3 py-1 font-medium ${
                      registration.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800'
                        : registration.payment_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-blue-600 hover:text-blue-700">
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRegistrations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No registrations found
          </div>
        )}
      </div>
    </div>
  )
}