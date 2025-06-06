import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function CompleteProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accountType, setAccountType] = useState<'participant' | 'guardian' | 'both'>('guardian')
  const [isParticipantSection, setIsParticipantSection] = useState(false)
  
  // Guardian/User info (everyone needs this)
  const [userFormData, setUserFormData] = useState({
    full_name: '',
    email: user?.email || '',
    phone: '',
    street_address: '',
    city: '',
    province: '',
    country: 'Canada',
    postal_code: '',
  })

  // Participant info (only for players)
  const [participantFormData, setParticipantFormData] = useState({
    // Personal Details
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    allergies: '',
    dietary_restrictions: '',
    position: '',
    
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    emergency_contact_email: '',
    
    // Survey Questions (Optional)
    visual_classification: '',
    visual_condition: '',
    played_sighted_hockey: false,
    first_year_blind_hockey: '',
    how_heard_about: ''
  })

  const [showOptionalSurvey, setShowOptionalSurvey] = useState(false)

  useEffect(() => {
    // Get the account type from the profile
    const getAccountType = async () => {
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('account_type')
        .eq('id', user.id)
        .single()
      
      if (data?.account_type) {
        setAccountType(data.account_type)
        // If they're a participant or both, show participant section
        setIsParticipantSection(data.account_type === 'participant' || data.account_type === 'both')
      }
    }
    
    getAccountType()
  }, [user])

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUserFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleParticipantChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setParticipantFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('Starting profile completion for user:', user?.id)
      
      // Step 1: Update the profile with profile_completed = true
      const profileData = {
        full_name: userFormData.full_name,
        phone: userFormData.phone,
        street_address: userFormData.street_address,
        city: userFormData.city,
        province: userFormData.province,
        country: userFormData.country,
        postal_code: userFormData.postal_code,
        profile_completed: true, // THIS IS KEY!
        account_type: accountType,
        updated_at: new Date().toISOString()
      }

      console.log('Updating profile with data:', profileData)

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user?.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
        throw profileError
      }

      console.log('Profile updated successfully')

      // Step 2: If they're a participant, create their participant record
      if (isParticipantSection && (accountType === 'participant' || accountType === 'both')) {
        // Check if account holder participant record already exists
        const { data: existingParticipant } = await supabase
          .from('participants')
          .select('id')
          .eq('user_id', user?.id)
          .eq('is_account_holder', true)
          .single()

        const participantData = {
          user_id: user?.id,
          first_name: participantFormData.first_name || userFormData.full_name.split(' ')[0],
          last_name: participantFormData.last_name || userFormData.full_name.split(' ').slice(1).join(' '),
          email: participantFormData.email || user?.email,
          phone: participantFormData.phone || userFormData.phone,
          gender: participantFormData.gender,
          date_of_birth: participantFormData.date_of_birth,
          allergies: participantFormData.allergies,
          dietary_restrictions: participantFormData.dietary_restrictions,
          position: participantFormData.position,
          emergency_contact_name: participantFormData.emergency_contact_name,
          emergency_contact_relationship: participantFormData.emergency_contact_relationship,
          emergency_contact_phone: participantFormData.emergency_contact_phone,
          emergency_contact_email: participantFormData.emergency_contact_email,
          visual_classification: participantFormData.visual_classification,
          visual_condition: participantFormData.visual_condition,
          played_sighted_hockey: participantFormData.played_sighted_hockey,
          first_year_blind_hockey: participantFormData.first_year_blind_hockey ? parseInt(participantFormData.first_year_blind_hockey) : null,
          how_heard_about: participantFormData.how_heard_about,
          is_account_holder: true // Mark this as the account holder's participant record
        }

        if (existingParticipant) {
          // Update existing participant
          const { error: participantError } = await supabase
            .from('participants')
            .update(participantData)
            .eq('id', existingParticipant.id)

          if (participantError) throw participantError
        } else {
          // Insert new participant
          const { error: participantError } = await supabase
            .from('participants')
            .insert(participantData)

          if (participantError) throw participantError
        }
      }

      // Step 3: Redirect to dashboard with a page reload to refresh auth context
      console.log('Profile completed successfully, redirecting to dashboard...')
      window.location.href = '/dashboard'
      
    } catch (err) {
      console.error('Profile update error:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while saving your profile'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold mb-2">Complete Your Profile</h1>
          <p className="text-gray-600 mb-8">
            {accountType === 'guardian' 
              ? "We need your contact information to manage registrations."
              : isParticipantSection 
              ? "We need your information for program registrations."
              : "Let's start with your contact information."}
          </p>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* SECTION 1: Contact Information (Everyone) */}
            <section>
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Your Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={userFormData.full_name}
                    onChange={handleUserChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={userFormData.phone}
                    onChange={handleUserChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="street_address"
                    value={userFormData.street_address}
                    onChange={handleUserChange}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={userFormData.city}
                      onChange={handleUserChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="province"
                      value={userFormData.province}
                      onChange={handleUserChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="">Select province</option>
                      <option value="AB">Alberta</option>
                      <option value="BC">British Columbia</option>
                      <option value="MB">Manitoba</option>
                      <option value="NB">New Brunswick</option>
                      <option value="NL">Newfoundland and Labrador</option>
                      <option value="NS">Nova Scotia</option>
                      <option value="ON">Ontario</option>
                      <option value="PE">Prince Edward Island</option>
                      <option value="QC">Quebec</option>
                      <option value="SK">Saskatchewan</option>
                      <option value="NT">Northwest Territories</option>
                      <option value="NU">Nunavut</option>
                      <option value="YT">Yukon</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={userFormData.postal_code}
                    onChange={handleUserChange}
                    placeholder="A1A 1A1"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
              </div>
            </section>

            {/* SECTION 2: Participant Details (Only for players) */}
            {isParticipantSection && (
              <>
                {/* Personal Details */}
                <section>
                  <h2 className="text-lg font-semibold mb-4 text-gray-900">Personal Details</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="first_name"
                          value={participantFormData.first_name}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required={isParticipantSection}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="last_name"
                          value={participantFormData.last_name}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required={isParticipantSection}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="gender"
                          value={participantFormData.gender}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required={isParticipantSection}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="non-binary">Non-binary</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={participantFormData.date_of_birth}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required={isParticipantSection}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Position <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="position"
                        value={participantFormData.position}
                        onChange={handleParticipantChange}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        required={isParticipantSection}
                      >
                        <option value="">Select position</option>
                        <option value="forward">Forward</option>
                        <option value="defense">Defense</option>
                        <option value="goalie">Goalie</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Allergies
                      </label>
                      <textarea
                        name="allergies"
                        value={participantFormData.allergies}
                        onChange={handleParticipantChange}
                        rows={2}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="List any allergies..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Dietary Restrictions
                      </label>
                      <textarea
                        name="dietary_restrictions"
                        value={participantFormData.dietary_restrictions}
                        onChange={handleParticipantChange}
                        rows={2}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="List any dietary restrictions..."
                      />
                    </div>
                  </div>
                </section>

                {/* Emergency Contact */}
                <section>
                  <h2 className="text-lg font-semibold mb-4 text-gray-900">Emergency Contact</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Contact Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="emergency_contact_name"
                          value={participantFormData.emergency_contact_name}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required={isParticipantSection}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Relationship <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="emergency_contact_relationship"
                          value={participantFormData.emergency_contact_relationship}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required={isParticipantSection}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="emergency_contact_phone"
                          value={participantFormData.emergency_contact_phone}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          required={isParticipantSection}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          name="emergency_contact_email"
                          value={participantFormData.emergency_contact_email}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Optional Survey */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Survey Questions (Optional)</h2>
                    <button
                      type="button"
                      onClick={() => setShowOptionalSurvey(!showOptionalSurvey)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      {showOptionalSurvey ? 'Hide' : 'Show'} Survey
                    </button>
                  </div>

                  {showOptionalSurvey && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Visual Classification
                        </label>
                        <select
                          name="visual_classification"
                          value={participantFormData.visual_classification}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select classification</option>
                          <option value="B1">B1</option>
                          <option value="B2">B2</option>
                          <option value="B3">B3</option>
                          <option value="B4">B4</option>
                          <option value="unknown">Unknown</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Visual Condition
                        </label>
                        <select
                          name="visual_condition"
                          value={participantFormData.visual_condition}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select condition</option>
                          <option value="retinitis-pigmentosa">Retinitis Pigmentosa</option>
                          <option value="lhon">LHON</option>
                          <option value="aniridia">Aniridia</option>
                          <option value="albinism">Albinism / Ocular Albinism</option>
                          <option value="amd">Age Related Macular Degeneration</option>
                          <option value="stargardts">Stargardts</option>
                          <option value="diabetic-retinopathy">Diabetic Retinopathy</option>
                          <option value="cataracts">Cataracts</option>
                          <option value="glaucoma">Glaucoma</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="played_sighted_hockey"
                            checked={participantFormData.played_sighted_hockey}
                            onChange={handleParticipantChange}
                            className="mr-2 h-4 w-4 text-red-600"
                          />
                          <span className="text-sm">Have played traditional sighted hockey</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          First year played Blind Hockey
                        </label>
                        <input
                          type="number"
                          name="first_year_blind_hockey"
                          value={participantFormData.first_year_blind_hockey}
                          onChange={handleParticipantChange}
                          min="1900"
                          max={new Date().getFullYear()}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          How did you first hear about Blind Hockey?
                        </label>
                        <select
                          name="how_heard_about"
                          value={participantFormData.how_heard_about}
                          onChange={handleParticipantChange}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select option</option>
                          <option value="social-media">Social media</option>
                          <option value="traditional-media">Traditional media</option>
                          <option value="cnib-referral">CNIB referral</option>
                          <option value="cbh-try-it">Canadian Blind Hockey Try It Program</option>
                          <option value="word-of-mouth">Word of mouth</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}