import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Type definitions
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
  
  const [participants, setParticipants] = useState<Participant[]>([])
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [programQuestions, setProgramQuestions] = useState<ProgramQuestions | null>(null)
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [usesSavedCard, setUsesSavedCard] = useState(true)
  const [waiverAccepted, setWaiverAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [questionResponses, setQuestionResponses] = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user, programId])

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
  }

  const handleQuestionChange = (questionId: string, value: string) => {
    setQuestionResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      // Create registrations for selected participants
      for (const participantId of selectedParticipants) {
        const { error } = await supabase
          .from('registrations')
          .insert({
            participant_id: participantId,
            program_id: programId,
            status: 'pending',
            custom_responses: questionResponses
          })

        if (error) throw error
      }

      // Process payment with saved card
      if (usesSavedCard && savedCards.length > 0) {
        // TODO: Use Stripe to charge saved payment method
        // This would be handled by an edge function
      }

      navigate('/dashboard')
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Quick Registration</h1>

      {/* Step 1: Select Participants */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Select Participants</h2>
        {participants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No participants found</p>
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
                <div>
                  <p className="font-medium">
                    {participant.first_name} {participant.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    All information already on file ✓
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Program-Specific Questions (if any) */}
      {programQuestions && programQuestions.questions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Program Questions</h2>
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
                  <input
                    type="checkbox"
                    checked={questionResponses[question.id] === 'true'}
                    onChange={(e) => handleQuestionChange(question.id, e.target.checked.toString())}
                    className="h-4 w-4 text-red-600"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Waiver */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Waiver Agreement</h2>
        <div className="bg-gray-50 p-4 rounded mb-4 max-h-48 overflow-y-auto text-sm">
          <p>{programQuestions?.waiver_text || 'I understand that participation in hockey involves certain risks, including but not limited to, serious injury. I voluntarily assume all risks associated with participation.'}</p>
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={waiverAccepted}
            onChange={(e) => setWaiverAccepted(e.target.checked)}
            className="mr-2 h-4 w-4 text-red-600"
          />
          <span>I accept the waiver terms</span>
        </label>
      </div>

      {/* Step 4: Payment */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Payment</h2>
        {savedCards.length > 0 ? (
          <div className="space-y-3">
            {savedCards.map((card) => (
              <label key={card.id} className="flex items-center">
                <input
                  type="radio"
                  checked={usesSavedCard}
                  onChange={() => setUsesSavedCard(true)}
                  className="mr-2"
                />
                <span>
                  Use {card.card_brand} ending in {card.card_last4}
                  {card.is_default && ' (default)'}
                </span>
              </label>
            ))}
            <label className="flex items-center">
              <input
                type="radio"
                checked={!usesSavedCard}
                onChange={() => setUsesSavedCard(false)}
                className="mr-2"
              />
              <span>Use a different payment method</span>
            </label>
          </div>
        ) : (
          <p className="text-gray-600">Payment information will be collected on the next step</p>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={selectedParticipants.length === 0 || !waiverAccepted || loading}
        className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : 'Complete Registration'}
      </button>
    </div>
  )
}