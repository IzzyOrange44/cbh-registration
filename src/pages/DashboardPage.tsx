import { useEffect, useState } from 'react'
import { useAuth } from '../contexts'
import { supabase } from '../lib/supabase'

interface Program {
  name: string
  start_date: string
  location: string
}

export function DashboardPage() {
  const { user } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [fullName, setFullName] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrograms = async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('name, start_date, location')
        .order('start_date', { ascending: true })

      if (error) {
        console.error('Error fetching programs:', error)
      } else {
        setPrograms(data as Program[])
      }
    }

    const fetchFullName = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        if (data?.full_name && !error) {
          setFullName(data.full_name)
        } else {
          console.warn('Failed to fetch full name:', error)
        }
      }
    }

    fetchPrograms()
    fetchFullName()
  }, [user])

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 space-y-8 bg-white rounded-lg shadow-lg max-w-3xl mx-auto mt-10">
      <h1 className="text-4xl font-extrabold text-red-700">
        Welcome, {fullName ?? user?.email}
      </h1>

      {/* Upcoming Activities */}
      <section className="w-full">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b-2 border-red-700 pb-2">Upcoming Activities</h2>
        <ul className="space-y-4">
          {programs.length > 0 ? (
            programs.slice(0, 3).map((program, index) => (
              <li
                key={index}
                className="bg-red-100 text-red-900 rounded-md p-4 shadow transition hover:scale-[1.02] hover:shadow-md"
              >
                <h3 className="text-xl font-bold">{program.name}</h3>
                <p className="text-sm">{new Date(program.start_date).toLocaleDateString()}</p>
                <p className="text-sm italic">{program.location}</p>
              </li>
            ))
          ) : (
            <p className="text-gray-500">No upcoming activities.</p>
          )}
        </ul>
      </section>

      {/* Blog Section */}
      <section className="w-full">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b-2 border-red-700 pb-2">From the Blog</h2>
        <div className="bg-gray-100 p-4 rounded shadow text-left">
          <h3 className="text-lg font-bold mb-2 text-gray-700">Staying Active During Off-Season</h3>
          <p className="text-sm text-gray-600">
            Learn how our athletes stay in shape year-round with tips from Team Canada coaches.
          </p>
        </div>
      </section>
    </div>
  )
}
