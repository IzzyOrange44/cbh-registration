import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Program = {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  registration_deadline: string
  location: string | null
  price: number
  capacity: number | null
  is_active: boolean
  _count?: {
    registrations: number
  }
}

export function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .order('start_date', { ascending: false })

    if (!error && data) {
      // Process the data to include registration counts
      const programsWithCounts = await Promise.all(
        data.map(async (program) => {
          const { count } = await supabase
            .from('registrations')
            .select('*', { count: 'exact', head: true })
            .eq('program_id', program.id)
          
          return {
            ...program,
            _count: { registrations: count || 0 }
          }
        })
      )
      setPrograms(programsWithCounts)
    }
    setLoading(false)
  }

  const handleToggleActive = async (program: Program) => {
    const { error } = await supabase
      .from('programs')
      .update({ is_active: !program.is_active })
      .eq('id', program.id)

    if (!error) {
      fetchPrograms()
    }
  }

  const handleDelete = async (programId: string) => {
    if (!window.confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return
    }

    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', programId)

    if (!error) {
      fetchPrograms()
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Programs</h1>
        <div className="flex gap-4">
          <Link
            to="/admin"
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Dashboard
          </Link>
          <Link
            to="/admin/programs/new"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Create New Program
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Program
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registrations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {programs.map((program) => {
              const isPast = new Date(program.end_date) < new Date()

              return (
                <tr key={program.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{program.name}</div>
                      {program.description && (
                        <div className="text-sm text-gray-500">{program.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div>
                      {new Date(program.start_date).toLocaleDateString()} - {new Date(program.end_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Registration by: {new Date(program.registration_deadline).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {program.location || 'TBD'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    ${program.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {program._count?.registrations || 0}
                    {program.capacity && ` / ${program.capacity}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        program.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {program.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {isPast && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                          Past
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/programs/${program.id}/edit`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/admin/programs/${program.id}/registrations`}
                        className="text-green-600 hover:text-green-700"
                      >
                        Registrations
                      </Link>
                      <button
                        onClick={() => handleToggleActive(program)}
                        className={`${
                          program.is_active ? 'text-yellow-600 hover:text-yellow-700' : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        {program.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      {program._count?.registrations === 0 && (
                        <button
                          onClick={() => handleDelete(program.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}