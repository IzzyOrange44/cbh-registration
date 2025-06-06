import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts'

type Participant = {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  position: string
  visual_classification: string
}

export function ParticipantsPage() {
  const { user } = useAuth()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchParticipants()
    }
  }, [user])

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setParticipants(data)
    }
    setLoading(false)
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Participants</h1>
        <Link 
          to="/participants/new" 
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Add Participant
        </Link>
      </div>

      {participants.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">No participants yet</h2>
          <p className="text-gray-600 mb-6">Add your first participant to get started with registrations</p>
          <Link 
            to="/participants/new" 
            className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Add Your First Participant
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {participants.map((participant) => (
            <div key={participant.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">
                    {participant.first_name} {participant.last_name}
                  </h3>
                  <div className="text-gray-600 mt-2 space-y-1">
                    <p>Age: {calculateAge(participant.date_of_birth)} years old</p>
                    {participant.position && <p>Position: {participant.position}</p>}
                    {participant.visual_classification && (
                      <p>Classification: {participant.visual_classification}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link 
                    to={`/participants/${participant.id}/edit`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </Link>
                  <Link 
                    to={`/participants/${participant.id}/register`}
                    className="text-red-600 hover:text-red-700"
                  >
                    Register for Program
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}