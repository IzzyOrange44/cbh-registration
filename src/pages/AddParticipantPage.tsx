import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export function AddParticipantPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  
  // Form data
  const [formData, setFormData] = useState({
    // Personal Details
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    position: '',
    
    // Medical Information
    allergies: '',
    dietary_restrictions: '',
    medical_conditions: '',
    
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    emergency_contact_email: '',
    
    // Hockey Information (Optional)
    visual_classification: '',
    visual_condition: '',
    played_sighted_hockey: false,
    first_year_blind_hockey: '',
    how_heard_about: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        if (!formData.first_name || !formData.last_name || !formData.date_of_birth || !formData.gender || !formData.position) {
          setError('Please fill in all required fields')
          return false
        }
        break
      case 2:
        if (!formData.emergency_contact_name || !formData.emergency_contact_relationship || !formData.emergency_contact_phone) {
          setError('Please fill in all emergency contact fields')
          return false
        }
        break
    }
    setError('')
    return true
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateStep(currentStep)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          user_id: user?.id,
          ...formData,
          first_year_blind_hockey: formData.first_year_blind_hockey ? parseInt(formData.first_year_blind_hockey) : null,
        })

      if (insertError) throw insertError

      navigate('/participants', { 
        state: { message: 'Participant added successfully!' } 
      })
    } catch (err) {
      console.error('Error adding participant:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Add New Participant</h1>

      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        <div className={`flex items-center ${currentStep >= 1 ? 'text-red-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'border-red-600 bg-red-600 text-white' : 'border-gray-400'}`}>
            1
          </div>
          <span className="ml-2 font-medium">Personal Info</span>
        </div>
        <div className={`mx-4 flex-1 h-1 ${currentStep >= 2 ? 'bg-red-600' : 'bg-gray-300'}`} />
        <div className={`flex items-center ${currentStep >= 2 ? 'text-red-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'border-red-600 bg-red-600 text-white' : 'border-gray-400'}`}>
            2
          </div>
          <span className="ml-2 font-medium">Emergency & Medical</span>
        </div>
        <div className={`mx-4 flex-1 h-1 ${currentStep >= 3 ? 'bg-red-600' : 'bg-gray-300'}`} />
        <div className={`flex items-center ${currentStep >= 3 ? 'text-red-600' : 'text-gray-400'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${currentStep >= 3 ? 'border-red-600 bg-red-600 text-white' : 'border-gray-400'}`}>
            3
          </div>
          <span className="ml-2 font-medium">Hockey Info</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
                {formData.date_of_birth && (
                  <p className="text-sm text-gray-600 mt-1">
                    Age: {calculateAge(formData.date_of_birth)} years
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Position <span className="text-red-500">*</span>
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">Select position</option>
                <option value="forward">Forward</option>
                <option value="defense">Defense</option>
                <option value="goalie">Goalie</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Emergency Contact & Medical */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Emergency Contact</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Relationship <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleChange}
                  placeholder="e.g., Parent, Spouse, Friend"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
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
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="emergency_contact_email"
                  value={formData.emergency_contact_email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold mt-8 mb-4">Medical Information</h2>

            <div>
              <label className="block text-sm font-medium mb-2">
                Allergies
              </label>
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="List any allergies (food, medication, environmental)..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Dietary Restrictions
              </label>
              <textarea
                name="dietary_restrictions"
                value={formData.dietary_restrictions}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="List any dietary restrictions or preferences..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Medical Conditions
              </label>
              <textarea
                name="medical_conditions"
                value={formData.medical_conditions}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="List any medical conditions we should be aware of..."
              />
            </div>
          </div>
        )}

        {/* Step 3: Hockey Information (Optional) */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Hockey Information</h2>
            <p className="text-gray-600 mb-4">This information helps us better understand our players and improve our programs.</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Visual Classification
                </label>
                <select
                  name="visual_classification"
                  value={formData.visual_classification}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select classification</option>
                  <option value="B1">B1 - No light perception</option>
                  <option value="B2">B2 - Ability to recognize shapes</option>
                  <option value="B3">B3 - Visual acuity 20/600-20/200</option>
                  <option value="B4">B4 - Visual field less than 20 degrees</option>
                  <option value="unknown">Unknown / Not classified</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Visual Condition
                </label>
                <select
                  name="visual_condition"
                  value={formData.visual_condition}
                  onChange={handleChange}
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
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="played_sighted_hockey"
                  checked={formData.played_sighted_hockey}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-red-600"
                />
                <span className="text-sm">Has played traditional sighted hockey</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  First year played Blind Hockey
                </label>
                <input
                  type="number"
                  name="first_year_blind_hockey"
                  value={formData.first_year_blind_hockey}
                  onChange={handleChange}
                  min="1900"
                  max={new Date().getFullYear()}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  How did they first hear about Blind Hockey?
                </label>
                <select
                  name="how_heard_about"
                  value={formData.how_heard_about}
                  onChange={handleChange}
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
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/participants')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding Participant...' : 'Add Participant'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}