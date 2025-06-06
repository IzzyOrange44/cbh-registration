import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Type definitions
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

type ProgramQuestions = {
  id: string
  program_id: string
  questions: Array<{
    id: string
    label: string
    type: 'text' | 'select' | 'checkbox'
    required: boolean
    options?: string[]
  }>
  waiver_text: string
}

type SavedCard = {
  id: string
  user_id: string
  stripe_payment_method_id: string
  card_last4: string
  card_brand: string
  is_default: boolean
}

type Participant = {
  id: string
  user_id: string
  first_name: string
  last_name: string
  date_of_birth: string
  email?: string
  gender?: string
  phone?: string
  position?: string
  visual_classification?: string
  allergies?: string
  dietary_restrictions?: string
  visual_condition?: string
  played_sighted_hockey?: boolean
  first_year_blind_hockey?: number
  how_heard_about?: string
}

export function QuickRegisterPage() {
  const { programId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [program, setProgram] = useState<Program | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [programQuestions, setProgramQuestions] = useState<ProgramQuestions | null>(null)
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [useNewCard, setUseNewCard] = useState(false)
  const [waiverAccepted, setWaiverAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [questionResponses, setQuestionResponses] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && programId) {
      fetchUserData()
      fetchProgramDetails()
    }
  }, [user, programId])

  const fetchProgramDetails = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single()

    if (data && !error) {
      setProgram(data)
    }
  }

  const fetchUserData = async () => {
    // Get user's participants
    const { data: participantsData } = await supabase
      .from('participants')
      .select('*')
      .eq('user_id', user?.id)

    // Get saved payment methods
    const { data: cardsData } = await supabase
      .from('saved_payment_methods')
      .select('*')
      .eq('user_id', user?.id)

    // Get program-specific questions
    const { data: questionsData } = await supabase
      .from('program_questions')
      .select('*')
      .eq('program_id', programId)
      .single()

    setParticipants(participantsData || [])
    setSavedCards(cardsData || [])
    setProgramQuestions(questionsData || null)
    
    // Set default card if available
    const defaultCard = cardsData?.find(card => card.is_default)
    if (defaultCard) {
      setSelectedCardId(defaultCard.id)
    } else if (cardsData && cardsData.length > 0) {
      setSelectedCardId(cardsData[0].id)
    }
  }

  const handleQuestionChange = (questionId: string, value: string) => {
    setQuestionResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const validateResponses = () => {
    if (!programQuestions) return true
    
    for (const question of programQuestions.questions) {
      if (question.required && !questionResponses[question.id]) {
        setError(`Please answer: ${question.label}`)
        return false
      }
    }
    return true
  }

  const calculateTotalPrice = () => {
    if (!program) return 0
    return selectedParticipants.length * program.price
  }

  const handleSubmit = async () => {
    setError('')
    
    // Validate
    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant')
      return
    }
    
    if (!waiverAccepted) {
      setError('Please accept the waiver agreement')
      return
    }
    
    if (!validateResponses()) {
      return
    }
    
    if (!useNewCard && !selectedCardId && savedCards.length > 0) {
      setError('Please select a payment method')
      return
    }

    setLoading(true)
    
    try {
      // Create registrations for selected participants
      const registrationPromises = selectedParticipants.map(async (participantId) => {
        const { data, error } = await supabase
          .from('registrations')
          .insert({
            participant_id: participantId,
            program_id: programId,
            status: 'pending',
            payment_status: 'pending'
          })
          .select()
          .single()

        if (error) throw error
        return data
      })

      const registrations = await Promise.all(registrationPromises)

      // If there are program questions, save the responses
      if (programQuestions && Object.keys(questionResponses).length > 0) {
        const formResponsePromises = registrations.map(async (registration) => {
          const { error } = await supabase
            .from('form_responses')
            .insert({
              registration_id: registration.id,
              responses: questionResponses
            })

          if (error) throw error
        })

        await Promise.all(formResponsePromises)
      }

      // TODO: Process payment with Stripe
      // This would typically be handled by an edge function that:
      // 1. Creates a payment intent
      // 2. Charges the saved payment method or collects new payment
      // 3. Updates registration payment_status to 'paid'

      navigate('/dashboard', { 
        state: { 
          message: 'Registration successful! Payment processing will be completed shortly.' 
        } 
      })
    } catch (error) {
      console.error('Registration error:', error)
      setError('An error occurred during registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!program) {
    return <div className="flex justify-center items-center h-64">Loading program details...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Register for {program.name}</h1>
      <p className="text-gray-600 mb-8">
        {program.location} • {new Date(program.start_date).toLocaleDateString()} - {new Date(program.end_date).toLocaleDateString()}
      </p>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      {/* Step 1: Select Participants */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Select Participants</h2>
        {participants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No participants found in your account</p>
            <Link 
              to="/participants/new" 
              className="text-red-600 hover:text-red-700"
            >
              Add a participant first
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {participants.map((participant) => (
              <label 
                key={participant.id} 
                className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedParticipants.includes(participant.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedParticipants([...selectedParticipants, participant.id])
                    } else {
                      setSelectedParticipants(selectedParticipants.filter(id => id !== participant.id))
                    }
                  }}
                  className="mr-3 h-4 w-4 text-red-600"
                />
                <div className="flex-1">
                  <p className="font-medium">
                    {participant.first_name} {participant.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {participant.position} • {participant.visual_classification || 'Classification not set'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${program.price}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        
        {selectedParticipants.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total ({selectedParticipants.length} participants):</span>
              <span className="text-xl font-bold">${calculateTotalPrice()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Program-Specific Questions (if any) */}
      {programQuestions && programQuestions.questions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">2. Additional Information</h2>
          <div className="space-y-4">
            {programQuestions.questions.map((question) => (
              <div key={question.id}>
                <label className="block text-sm font-medium mb-2">
                  {question.label}
                  {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {question.type === 'text' && (
                  <input
                    type="text"
                    value={questionResponses[question.id] || ''}
                    onChange={(e) => handleQuestionChange(question.id, e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required={question.required}
                  />
                )}
                
                {question.type === 'select' && question.options && (
                  <select
                    value={questionResponses[question.id] || ''}
                    onChange={(e) => handleQuestionChange(question.id, e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required={question.required}
                  >
                    <option value="">Select an option</option>
                    {question.options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
                
                {question.type === 'checkbox' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={questionResponses[question.id] === 'true'}
                      onChange={(e) => handleQuestionChange(question.id, e.target.checked.toString())}
                      className="h-4 w-4 text-red-600 mr-2"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Waiver */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">3. Waiver Agreement</h2>
        <div className="bg-gray-50 p-4 rounded mb-4 max-h-48 overflow-y-auto text-sm">
          <p>{programQuestions?.waiver_text || 'I understand that participation in hockey involves certain risks, including but not limited to, serious injury. I voluntarily assume all risks associated with participation and release Canadian Blind Hockey and its affiliates from any liability.'}</p>
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={waiverAccepted}
            onChange={(e) => setWaiverAccepted(e.target.checked)}
            className="mr-2 h-4 w-4 text-red-600"
          />
          <span>I accept the waiver terms on behalf of all selected participants</span>
        </label>
      </div>

      {/* Step 4: Payment */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">4. Payment Method</h2>
        {savedCards.length > 0 ? (
          <div className="space-y-3">
            {savedCards.map((card) => (
              <label key={card.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="payment_method"
                  checked={selectedCardId === card.id && !useNewCard}
                  onChange={() => {
                    setSelectedCardId(card.id)
                    setUseNewCard(false)
                  }}
                  className="mr-3"
                />
                <div className="flex-1">
                  <span className="font-medium">
                    {card.card_brand} •••• {card.card_last4}
                  </span>
                  {card.is_default && <span className="ml-2 text-sm text-gray-500">(default)</span>}
                </div>
              </label>
            ))}
            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="payment_method"
                checked={useNewCard}
                onChange={() => setUseNewCard(true)}
                className="mr-3"
              />
              <span>Use a different payment method</span>
            </label>
          </div>
        ) : (
          <p className="text-gray-600">Payment information will be collected on the next step</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : `Complete Registration - $${calculateTotalPrice()}`}
        </button>
      </div>
    </div>
  )
}