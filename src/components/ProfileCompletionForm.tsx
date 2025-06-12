import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts'

export function ProfileCompletionForm() {
  const { user, refreshProfileStatus } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accountType, setAccountType] = useState<'participant' | 'parent_guardian' | 'coach' | 'volunteer'>('participant')
  const [showParticipantSection, setShowParticipantSection] = useState(false)
  
  // User profile info (everyone needs this)
  const [userFormData, setUserFormData] = useState({
    phone: '',
    address: '',
    city: '',
    province: 'Ontario',
    postal_code: '',
  })

  // Participant info (only for players)
  const [participantFormData, setParticipantFormData] = useState({
    date_of_birth: '',
    gender_identity: 'male' as 'male' | 'female' | 'prefer_not_to_say' | 'prefer_to_self_describe',
    gender_self_description: '',
    vision_level: 'B1' as 'B1' | 'B2' | 'B3' | 'other',
    vision_level_other: '',
    skating_experience: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    is_first_time_participant: false,
    allergies: '',
    medical_conditions: '',
  })

  // Emergency contact info
  const [emergencyContact, setEmergencyContact] = useState({
    name: '',
    relationship: 'parent' as 'parent' | 'guardian' | 'spouse' | 'sibling' | 'other_family' | 'friend' | 'other',
    relationship_other: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    // Get the account type from user metadata
    if (user?.user_metadata?.role) {
      setAccountType(user.user_metadata.role)
      setShowParticipantSection(user.user_metadata.role === 'participant')
    }
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

  const handleEmergencyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEmergencyContact(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
  
    try {
      console.log('=== FORM SUBMIT START ===')
      console.log('User from context:', user?.id)
      console.log('Account type:', accountType)
      console.log('Show participant section:', showParticipantSection)
      
      // Test authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Current session:', {
        hasSession: !!session,
        userId: session?.user?.id,
        hasToken: !!session?.access_token,
        sessionError
      })
  
      if (!session) {
        throw new Error('No active session found')
      }
  
      // Step 1: Check if user record exists and update/create it
      console.log('=== STEP 1: USER PROFILE ===')
      const { data: existingUser, error: existingUserError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .single()
      
      console.log('Existing user check:', { existingUser, existingUserError })
  
      if (!existingUser) {
        console.log('Creating new user profile...')
        
        const newUserData = {
          id: user?.id,
          email: user?.email,
          first_name: user?.user_metadata?.first_name || '',
          last_name: user?.user_metadata?.last_name || '',
          phone: userFormData.phone,
          role: accountType
        }
        
        console.log('Creating user with data:', newUserData)
        
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert(newUserData)
        
        if (insertError) {
          console.error('Insert error:', insertError)
          throw insertError
        }
        
        console.log('✅ User profile created successfully')
      } else {
        console.log('Updating existing user profile...')
        
        const updateData = {
          phone: userFormData.phone,
          role: accountType,
          updated_at: new Date().toISOString()
        }
        
        console.log('Updating with data:', updateData)
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', user?.id)
        
        if (updateError) {
          console.error('Update error:', updateError)
          throw updateError
        }
        
        console.log('✅ User profile updated successfully')
      }
  
      // Step 2: If they're a participant, create participant and emergency contact records
      if (showParticipantSection && accountType === 'participant') {
        console.log('=== STEP 2: PARTICIPANT DATA ===')
        
        // Check if participant record already exists
        const { data: existingParticipant, error: existingParticipantError } = await supabase
          .from('participants')
          .select('*')
          .eq('user_id', user?.id)
          .single()
        
        console.log('Existing participant check:', { existingParticipant, existingParticipantError })
  
        let participantId = existingParticipant?.id
  
        if (!existingParticipant) {
          console.log('Creating new participant record...')
          
          // Create participant record
          const participantData = {
            user_id: user?.id,
            date_of_birth: participantFormData.date_of_birth,
            address: userFormData.address,
            city: userFormData.city,
            province: userFormData.province,
            postal_code: userFormData.postal_code,
            gender_identity: participantFormData.gender_identity,
            gender_self_description: participantFormData.gender_identity === 'prefer_to_self_describe' ? participantFormData.gender_self_description : null,
            vision_level: participantFormData.vision_level,
            vision_level_other: participantFormData.vision_level === 'other' ? participantFormData.vision_level_other : null,
            skating_experience: participantFormData.skating_experience,
            is_first_time_participant: participantFormData.is_first_time_participant,
            allergies: participantFormData.allergies || null,
            medical_conditions: participantFormData.medical_conditions || null,
          }
  
          console.log('Creating participant with data:', participantData)
  
          const { data: participantResult, error: participantError } = await supabase
            .from('participants')
            .insert(participantData)
            .select('id')
            .single()
  
          if (participantError) {
            console.error('Participant creation error:', participantError)
            throw participantError
          }
  
          participantId = participantResult.id
          console.log('✅ Participant created successfully:', participantResult)
        } else {
          console.log('Updating existing participant record...')
          
          const participantUpdateData = {
            date_of_birth: participantFormData.date_of_birth,
            address: userFormData.address,
            city: userFormData.city,
            province: userFormData.province,
            postal_code: userFormData.postal_code,
            gender_identity: participantFormData.gender_identity,
            gender_self_description: participantFormData.gender_identity === 'prefer_to_self_describe' ? participantFormData.gender_self_description : null,
            vision_level: participantFormData.vision_level,
            vision_level_other: participantFormData.vision_level === 'other' ? participantFormData.vision_level_other : null,
            skating_experience: participantFormData.skating_experience,
            is_first_time_participant: participantFormData.is_first_time_participant,
            allergies: participantFormData.allergies || null,
            medical_conditions: participantFormData.medical_conditions || null,
            updated_at: new Date().toISOString()
          }
  
          const { error: participantUpdateError } = await supabase
            .from('participants')
            .update(participantUpdateData)
            .eq('id', existingParticipant.id)
  
          if (participantUpdateError) {
            console.error('Participant update error:', participantUpdateError)
            throw participantUpdateError
          }
  
          console.log('✅ Participant updated successfully')
        }
  
        // Step 3: Handle Emergency Contact
        console.log('=== STEP 3: EMERGENCY CONTACT ===')
        
        // Check if emergency contact already exists for this participant
        const { data: existingContacts, error: existingContactsError } = await supabase
          .from('emergency_contacts')
          .select('*')
          .eq('participant_id', participantId)
  
        console.log('Existing contacts check:', { existingContacts, existingContactsError })
  
        const emergencyContactData = {
          participant_id: participantId,
          name: emergencyContact.name,
          relationship: emergencyContact.relationship,
          relationship_other: emergencyContact.relationship === 'other' ? emergencyContact.relationship_other : null,
          phone: emergencyContact.phone,
          email: emergencyContact.email || null,
          is_primary: true
        }
  
        if (!existingContacts || existingContacts.length === 0) {
          console.log('Creating new emergency contact...')
          console.log('Emergency contact data:', emergencyContactData)
  
          const { error: emergencyError } = await supabase
            .from('emergency_contacts')
            .insert(emergencyContactData)
  
          if (emergencyError) {
            console.error('Emergency contact creation error:', emergencyError)
            throw emergencyError
          }
  
          console.log('✅ Emergency contact created successfully')
        } else {
          console.log('Updating existing emergency contact...')
          
          const { error: emergencyUpdateError } = await supabase
            .from('emergency_contacts')
            .update({
              ...emergencyContactData,
              updated_at: new Date().toISOString()
            })
            .eq('participant_id', participantId)
            .eq('is_primary', true)
  
          if (emergencyUpdateError) {
            console.error('Emergency contact update error:', emergencyUpdateError)
            throw emergencyUpdateError
          }
  
          console.log('✅ Emergency contact updated successfully')
        }
      }
  
      console.log('=== ALL STEPS COMPLETED SUCCESSFULLY ===')
      
      // SUCCESS - Refresh the profile status
      console.log('Refreshing profile status...')
      
      // Call the refresh function to update profileCompleted state
      if (refreshProfileStatus) {
        await refreshProfileStatus()
        console.log('✅ Profile status refreshed')
      }
      
      // Show success message
      alert('Profile completed successfully! All information saved.')
      
      // Scroll to top to show the updated dashboard
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
    } catch (err) {
      console.error('=== FORM SUBMIT ERROR ===')
      console.error('Full error object:', err)
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown error')
      console.error('Error code:', (err as any)?.code)
      console.error('Error details:', (err as any)?.details)
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while saving your profile'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-start space-x-2">
          <span className="text-red-500 mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-red-100 pb-2">
            Your Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={`${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || user?.email?.split('@')[0] || 'User'}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                disabled
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={userFormData.phone}
              onChange={handleUserChange}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
              required
            />
          </div>

          {showParticipantSection && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={userFormData.address}
                  onChange={handleUserChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={userFormData.city}
                    onChange={handleUserChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Province <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="province"
                    value={userFormData.province}
                    onChange={handleUserChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white"
                    required
                  >
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

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    value={userFormData.postal_code}
                    onChange={handleUserChange}
                    placeholder="A1A 1A1"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Participant Details */}
        {showParticipantSection && (
          <>
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-red-100 pb-2">
                Player Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={participantFormData.date_of_birth}
                      onChange={handleParticipantChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Gender Identity <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender_identity"
                      value={participantFormData.gender_identity}
                      onChange={handleParticipantChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white"
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                      <option value="prefer_to_self_describe">Prefer to self describe</option>
                    </select>
                  </div>
                </div>

                {participantFormData.gender_identity === 'prefer_to_self_describe' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Self Description
                    </label>
                    <input
                      type="text"
                      name="gender_self_description"
                      value={participantFormData.gender_self_description}
                      onChange={handleParticipantChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Vision Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="vision_level"
                      value={participantFormData.vision_level}
                      onChange={handleParticipantChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white"
                      required
                    >
                      <option value="B1">B1 - Blind</option>
                      <option value="B2">B2 - Low Vision</option>
                      <option value="B3">B3 - Partially Sighted</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Skating Experience <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="skating_experience"
                      value={participantFormData.skating_experience}
                      onChange={handleParticipantChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white"
                      required
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                {participantFormData.vision_level === 'other' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Please specify vision level
                    </label>
                    <input
                      type="text"
                      name="vision_level_other"
                      value={participantFormData.vision_level_other}
                      onChange={handleParticipantChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                    />
                  </div>
                )}

                <div className="flex items-center">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      name="is_first_time_participant"
                      checked={participantFormData.is_first_time_participant}
                      onChange={handleParticipantChange}
                      className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">This is my first time in Canadian Blind Hockey</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Allergies
                    </label>
                    <textarea
                      name="allergies"
                      value={participantFormData.allergies}
                      onChange={handleParticipantChange}
                      rows={2}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                      placeholder="List any allergies..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Medical Conditions
                    </label>
                    <textarea
                      name="medical_conditions"
                      value={participantFormData.medical_conditions}
                      onChange={handleParticipantChange}
                      rows={2}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                      placeholder="List any medical conditions..."
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Emergency Contact */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-red-100 pb-2">
                Emergency Contact
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Contact Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={emergencyContact.name}
                      onChange={handleEmergencyChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="relationship"
                      value={emergencyContact.relationship}
                      onChange={handleEmergencyChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white"
                      required
                    >
                      <option value="parent">Parent</option>
                      <option value="guardian">Guardian</option>
                      <option value="spouse">Spouse</option>
                      <option value="sibling">Sibling</option>
                      <option value="other_family">Other Family</option>
                      <option value="friend">Friend</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={emergencyContact.phone}
                      onChange={handleEmergencyChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={emergencyContact.email}
                      onChange={handleEmergencyChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        <div className="pt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Saving your profile...</span>
              </span>
            ) : (
              'Complete Profile & Access Dashboard'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}