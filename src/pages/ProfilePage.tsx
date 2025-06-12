import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts'

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ParticipantData {
  id: string
  user_id: string
  date_of_birth: string
  address: string
  city: string
  province: string
  postal_code: string
  gender_identity: string
  gender_self_description: string | null
  vision_level: string
  vision_level_other: string | null
  skating_experience: string
  is_first_time_participant: boolean
  allergies: string | null
  medical_conditions: string | null
  created_at: string
  updated_at: string
}

interface EmergencyContact {
  id: string
  participant_id: string
  name: string
  relationship: string
  relationship_other: string | null
  phone: string
  email: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
}

interface EditForm {
  first_name: string
  last_name: string
  phone: string
  address: string
  city: string
  province: string
  postal_code: string
  allergies: string
  medical_conditions: string
}

export function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Profile data state
  const [profileData, setProfileData] = useState<UserProfile | null>(null)
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([])

  // Edit form state
  const [editForm, setEditForm] = useState<EditForm>({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    allergies: '',
    medical_conditions: ''
  })

  useEffect(() => {
    fetchProfileData()
  }, [user])

  const fetchProfileData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setProfileData(profile as UserProfile)
      setEditForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        address: '',
        city: '',
        province: '',
        postal_code: '',
        allergies: '',
        medical_conditions: ''
      })

      // If user is a participant, fetch participant data
      if (profile.role === 'participant') {
        const { data: participant, error: participantError } = await supabase
          .from('participants')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!participantError && participant) {
          setParticipantData(participant as ParticipantData)
          setEditForm(prev => ({
            ...prev,
            address: participant.address || '',
            city: participant.city || '',
            province: participant.province || '',
            postal_code: participant.postal_code || '',
            allergies: participant.allergies || '',
            medical_conditions: participant.medical_conditions || ''
          }))

          // Fetch emergency contacts
          const { data: contacts, error: contactsError } = await supabase
            .from('emergency_contacts')
            .select('*')
            .eq('participant_id', participant.id)
            .order('is_primary', { ascending: false })

          if (!contactsError) {
            setEmergencyContacts((contacts || []) as EmergencyContact[])
          }
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    try {
      setError('')
      setSuccess('')
      setLoading(true)

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone: editForm.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)

      if (profileError) throw profileError

      // If participant, update participant data
      if (profileData?.role === 'participant' && participantData) {
        const { error: participantError } = await supabase
          .from('participants')
          .update({
            address: editForm.address,
            city: editForm.city,
            province: editForm.province,
            postal_code: editForm.postal_code,
            allergies: editForm.allergies || null,
            medical_conditions: editForm.medical_conditions || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', participantData.id)

        if (participantError) throw participantError
      }

      setSuccess('Profile updated successfully!')
      setEditing(false)
      await fetchProfileData() // Refresh data
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not provided'
    return new Date(dateString).toLocaleDateString()
  }

  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      'participant': 'Player',
      'parent_guardian': 'Parent/Guardian',
      'coach': 'Coach',
      'volunteer': 'Volunteer',
      'admin': 'Administrator'
    }
    return roleMap[role] || role
  }

  const formatRelationship = (relationship: string) => {
    return relationship.replace(/_/g, ' ')
  }

  if (loading && !profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-br from-red-600 to-red-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <span className="text-3xl">🍁</span>
          </div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load profile data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-red-600 to-red-700 w-16 h-16 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-3xl">👤</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {profileData.first_name && profileData.last_name 
                      ? `${profileData.first_name} ${profileData.last_name}`
                      : 'Your Profile'
                    }
                  </h1>
                  <p className="text-gray-600">{formatRole(profileData.role)}</p>
                </div>
              </div>
              
              <button
                onClick={() => editing ? setEditing(false) : setEditing(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
              >
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-start space-x-2">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6 flex items-start space-x-2">
            <span className="text-green-500 mt-0.5">✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-red-100 pb-2">
            Basic Information
          </h2>
          
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={editForm.first_name}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={editForm.last_name}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Name</p>
                <p className="text-gray-900">
                  {profileData.first_name && profileData.last_name 
                    ? `${profileData.first_name} ${profileData.last_name}`
                    : 'Not provided'
                  }
                </p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Email</p>
                <p className="text-gray-900">{profileData.email}</p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Phone</p>
                <p className="text-gray-900">{profileData.phone || 'Not provided'}</p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Role</p>
                <p className="text-gray-900">{formatRole(profileData.role)}</p>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Account Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  profileData.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {profileData.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Participant Information */}
        {profileData.role === 'participant' && participantData && (
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-red-100 pb-2">
              Player Information
            </h2>
            
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={editForm.address}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      value={editForm.city}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Province</label>
                    <select
                      name="province"
                      value={editForm.province}
                      onChange={handleEditChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                    >
                      <option value="">Select Province</option>
                      <option value="Ontario">Ontario</option>
                      <option value="Quebec">Quebec</option>
                      <option value="British Columbia">British Columbia</option>
                      <option value="Alberta">Alberta</option>
                      <option value="Manitoba">Manitoba</option>
                      <option value="Saskatchewan">Saskatchewan</option>
                      <option value="Nova Scotia">Nova Scotia</option>
                      <option value="New Brunswick">New Brunswick</option>
                      <option value="Newfoundland and Labrador">Newfoundland and Labrador</option>
                      <option value="Prince Edward Island">Prince Edward Island</option>
                      <option value="Northwest Territories">Northwest Territories</option>
                      <option value="Nunavut">Nunavut</option>
                      <option value="Yukon">Yukon</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Postal Code</label>
                  <input
                    type="text"
                    name="postal_code"
                    value={editForm.postal_code}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="A1A 1A1"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Allergies</label>
                    <textarea
                      name="allergies"
                      value={editForm.allergies}
                      onChange={handleEditChange}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="List any allergies..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Medical Conditions</label>
                    <textarea
                      name="medical_conditions"
                      value={editForm.medical_conditions}
                      onChange={handleEditChange}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="List any medical conditions..."
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Date of Birth</p>
                  <p className="text-gray-900">{formatDate(participantData.date_of_birth)}</p>
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Gender Identity</p>
                  <p className="text-gray-900">
                    {participantData.gender_identity === 'prefer_to_self_describe' 
                      ? participantData.gender_self_description 
                      : formatRelationship(participantData.gender_identity) || 'Not provided'
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Vision Level</p>
                  <p className="text-gray-900">
                    {participantData.vision_level === 'other' 
                      ? participantData.vision_level_other 
                      : participantData.vision_level || 'Not provided'
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Skating Experience</p>
                  <p className="text-gray-900">{participantData.skating_experience || 'Not provided'}</p>
                </div>
                
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Address</p>
                  <p className="text-gray-900">
                    {participantData.address && participantData.city 
                      ? `${participantData.address}, ${participantData.city}, ${participantData.province} ${participantData.postal_code}`
                      : 'Not provided'
                    }
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">First Time Participant</p>
                  <p className="text-gray-900">{participantData.is_first_time_participant ? 'Yes' : 'No'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Allergies</p>
                  <p className="text-gray-900">{participantData.allergies || 'None listed'}</p>
                </div>
                
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Medical Conditions</p>
                  <p className="text-gray-900">{participantData.medical_conditions || 'None listed'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emergency Contacts */}
        {emergencyContacts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b border-red-100 pb-2">
              Emergency Contacts
            </h2>
            
            <div className="space-y-4">
              {emergencyContacts.map((contact) => (
                <div key={contact.id} className={`p-4 rounded-lg ${contact.is_primary ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                  {contact.is_primary && (
                    <span className="inline-block bg-red-600 text-white text-xs px-2 py-1 rounded-full mb-2">
                      Primary Contact
                    </span>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Name</p>
                      <p className="text-gray-900">{contact.name}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Relationship</p>
                      <p className="text-gray-900">
                        {contact.relationship === 'other' 
                          ? contact.relationship_other 
                          : formatRelationship(contact.relationship)
                        }
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Phone</p>
                      <p className="text-gray-900">{contact.phone}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Email</p>
                      <p className="text-gray-900">{contact.email || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save/Cancel Buttons for Editing */}
        {editing && (
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-6">
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setEditing(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}