import { useState, useEffect } from 'react'
import { useAuth } from '../contexts'
import { supabase } from '../lib/supabase'

// Define the profile type
type Profile = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  street_address: string | null
  city: string | null
  province: string | null
  country: string | null
  postal_code: string | null
  account_type: string | null
  is_admin: boolean
  profile_completed: boolean
}

export function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      setProfile(data)
    }
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
        <div className="space-y-2">
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Name:</strong> {profile?.full_name || 'Not set'}</p>
          <p><strong>Phone:</strong> {profile?.phone || 'Not set'}</p>
          <p><strong>Account Type:</strong> {profile?.account_type || 'Not set'}</p>
        </div>
      </div>
    </div>
  )
}