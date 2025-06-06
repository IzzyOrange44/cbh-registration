import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts'

type Program = {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  registration_deadline: string
  location: string
  price: number
  capacity: number
  is_active: boolean
}

export function ProgramsPage() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: true })

    if (!error && data) {
      setPrograms(data)
    }
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Programs & Events</h1>

      {programs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">No programs available</h2>
          <p className="text-gray-600">Check back soon for upcoming programs and events</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => {
            const isUpcoming = new Date(program.registration_deadline) > new Date()
            
            return (
              <div key={program.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{program.name}</h3>
                  {program.description && (
                    <p className="text-gray-600 mb-4">{program.description}</p>
                  )}
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p>📅 {formatDate(program.start_date)} - {formatDate(program.end_date)}</p>
                    {program.location && <p>📍 {program.location}</p>}
                    <p>💰 ${program.price}</p>
                    {program.capacity && <p>👥 Capacity: {program.capacity} players</p>}
                  </div>

                  <div className="border-t pt-4">
                    {user ? (
                      isUpcoming ? (
                        <Link 
                          to={`/programs/${program.id}/register`}
                          className="block text-center bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Register Now
                        </Link>
                      ) : (
                        <p className="text-center text-gray-500">Registration Closed</p>
                      )
                    ) : (
                      <Link 
                        to="/login"
                        className="block text-center bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Login to Register
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}