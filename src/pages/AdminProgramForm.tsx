import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type ProgramFormData = {
  name: string
  description: string
  start_date: string
  end_date: string
  registration_deadline: string
  location: string
  price: string
  capacity: string
  is_active: boolean
}

type CustomQuestion = {
  id: string
  label: string
  type: 'text' | 'select' | 'checkbox'
  required: boolean
  options?: string[]
}

export function AdminProgramForm() {
  const { programId } = useParams()
  const navigate = useNavigate()
  const isEditing = !!programId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<ProgramFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    location: '',
    price: '',
    capacity: '',
    is_active: true
  })
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
  const [waiverText, setWaiverText] = useState('')

  useEffect(() => {
    if (isEditing) {
      fetchProgram()
    }
  }, [programId])

  const fetchProgram = async () => {
    const { data: program, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .single()

    if (!error && program) {
      setFormData({
        name: program.name,
        description: program.description || '',
        start_date: program.start_date,
        end_date: program.end_date,
        registration_deadline: program.registration_deadline,
        location: program.location || '',
        price: program.price.toString(),
        capacity: program.capacity?.toString() || '',
        is_active: program.is_active
      })

      // Fetch program questions
      const { data: questions } = await supabase
        .from('program_questions')
        .select('*')
        .eq('program_id', programId)
        .single()

      if (questions) {
        setCustomQuestions(questions.questions || [])
        setWaiverText(questions.waiver_text || '')
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleAddQuestion = () => {
    const newQuestion: CustomQuestion = {
      id: crypto.randomUUID(),
      label: '',
      type: 'text',
      required: false
    }
    setCustomQuestions([...customQuestions, newQuestion])
  }

  const handleQuestionChange = (id: string, field: keyof CustomQuestion, value: string | boolean | string[]) => {
    setCustomQuestions(questions =>
      questions.map(q => q.id === id ? { ...q, [field]: value } : q)
    )
  }

  const handleRemoveQuestion = (id: string) => {
    setCustomQuestions(questions => questions.filter(q => q.id !== id))
  }

  const handleAddOption = (questionId: string) => {
    setCustomQuestions(questions =>
      questions.map(q => {
        if (q.id === questionId) {
          return { ...q, options: [...(q.options || []), ''] }
        }
        return q
      })
    )
  }

  const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
    setCustomQuestions(questions =>
      questions.map(q => {
        if (q.id === questionId && q.options) {
          const newOptions = [...q.options]
          newOptions[optionIndex] = value
          return { ...q, options: newOptions }
        }
        return q
      })
    )
  }

  const handleRemoveOption = (questionId: string, optionIndex: number) => {
    setCustomQuestions(questions =>
      questions.map(q => {
        if (q.id === questionId && q.options) {
          return { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
        }
        return q
      })
    )
  }

  const validateForm = () => {
    if (!formData.name || !formData.start_date || !formData.end_date || 
        !formData.registration_deadline || !formData.price) {
      setError('Please fill in all required fields')
      return false
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError('End date must be after start date')
      return false
    }

    if (new Date(formData.registration_deadline) > new Date(formData.start_date)) {
      setError('Registration deadline must be before the start date')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const programData = {
        ...formData,
        price: parseFloat(formData.price),
        capacity: formData.capacity ? parseInt(formData.capacity) : null
      }

      let finalProgramId: string

      if (isEditing && programId) {
        const { error } = await supabase
          .from('programs')
          .update(programData)
          .eq('id', programId)

        if (error) throw error
        finalProgramId = programId
      } else {
        const { data, error } = await supabase
          .from('programs')
          .insert(programData)
          .select()
          .single()

        if (error) throw error
        if (!data) throw new Error('No data returned from insert')
        finalProgramId = data.id
      }

      // Save or update program questions
      if (customQuestions.length > 0 || waiverText) {
        const questionsData = {
          program_id: finalProgramId,
          questions: customQuestions.filter(q => q.label), // Only save questions with labels
          waiver_text: waiverText
        }

        if (isEditing) {
          // Check if questions already exist
          const { data: existingQuestions } = await supabase
            .from('program_questions')
            .select('id')
            .eq('program_id', finalProgramId)
            .single()

          if (existingQuestions) {
            await supabase
              .from('program_questions')
              .update(questionsData)
              .eq('program_id', finalProgramId)
          } else {
            await supabase
              .from('program_questions')
              .insert(questionsData)
          }
        } else {
          await supabase
            .from('program_questions')
            .insert(questionsData)
        }
      }

      navigate('/admin/programs')
    } catch (err) {
      console.error('Error saving program:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          {isEditing ? 'Edit Program' : 'Create New Program'}
        </h1>
        <Link
          to="/admin/programs"
          className="text-gray-600 hover:text-gray-800"
        >
          ← Back to Programs
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Program Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Registration Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="registration_deadline"
                  value={formData.registration_deadline}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Capacity (optional)
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-red-600"
                />
                <span className="text-sm">Program is active (visible to users)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Custom Questions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Custom Registration Questions</h2>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              + Add Question
            </button>
          </div>

          {customQuestions.length === 0 ? (
            <p className="text-gray-500 text-sm">No custom questions added yet.</p>
          ) : (
            <div className="space-y-4">
              {customQuestions.map((question, index) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium">Question {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(question.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Question Label</label>
                        <input
                          type="text"
                          value={question.label}
                          onChange={(e) => handleQuestionChange(question.id, 'label', e.target.value)}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="e.g., Jersey size"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                          value={question.type}
                          onChange={(e) => handleQuestionChange(question.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="text">Text</option>
                          <option value="select">Dropdown</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                    </div>

                    {question.type === 'select' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Options</label>
                        {question.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionChange(question.id, optionIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                              placeholder="Option value"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(question.id, optionIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddOption(question.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          + Add Option
                        </button>
                      </div>
                    )}

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => handleQuestionChange(question.id, 'required', e.target.checked)}
                        className="mr-2 h-4 w-4 text-red-600"
                      />
                      <span className="text-sm">Required question</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waiver Text */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Waiver Text</h2>
          <textarea
            value={waiverText}
            onChange={(e) => setWaiverText(e.target.value)}
            rows={5}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Enter custom waiver text for this program (optional). If left blank, default waiver will be used."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Link
            to="/admin/programs"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Program' : 'Create Program')}
          </button>
        </div>
      </form>
    </div>
  )
}