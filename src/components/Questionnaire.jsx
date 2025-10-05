import { useState, useEffect } from 'react'
import { ChevronLeft, Award } from 'lucide-react'

const questions = [
  {
    id: 'age',
    question: 'What is your age range?',
    options: [
      { value: 'under-30', label: 'Under 30' },
      { value: '30-50', label: '30-50' },
      { value: '50-65', label: '50-65' },
      { value: 'over-65', label: 'Over 65' },
    ]
  },
  {
    id: 'concerns',
    question: 'What brings you here today?',
    options: [
      { value: 'difficulty-hearing', label: 'Difficulty hearing conversations' },
      { value: 'loud-environments', label: 'Trouble in loud environments' },
      { value: 'tv-volume', label: 'Others say my TV is too loud' },
      { value: 'checkup', label: 'Just checking my hearing' },
    ]
  },
  {
    id: 'which-ear',
    question: 'Which ear concerns you most?',
    options: [
      { value: 'left', label: 'Left ear' },
      { value: 'right', label: 'Right ear' },
      { value: 'both', label: 'Both ears equally' },
      { value: 'not-sure', label: 'Not sure' },
    ]
  },
  {
    id: 'duration',
    question: 'When did you first notice hearing difficulties?',
    options: [
      { value: 'recent', label: 'Recently (past few weeks)' },
      { value: '6-12-months', label: '6-12 months ago' },
      { value: '1-3-years', label: '1-3 years ago' },
      { value: 'longer', label: 'More than 3 years ago' },
    ]
  },
  {
    id: 'tinnitus',
    question: 'Do you experience ringing or buzzing in your ears (tinnitus)?',
    options: [
      { value: 'constant', label: 'Yes, constantly' },
      { value: 'occasional', label: 'Yes, occasionally' },
      { value: 'no', label: 'No' },
      { value: 'not-sure', label: 'Not sure' },
    ]
  },
  {
    id: 'daily-impact',
    question: 'How often do you ask people to repeat themselves?',
    options: [
      { value: 'all-the-time', label: 'All the time' },
      { value: 'often', label: 'Often (daily)' },
      { value: 'sometimes', label: 'Sometimes (weekly)' },
      { value: 'rarely', label: 'Rarely' },
    ]
  },
  {
    id: 'exposure',
    question: 'Are you regularly exposed to loud noise?',
    options: [
      { value: 'yes-work', label: 'Yes, at work' },
      { value: 'yes-music', label: 'Yes, loud music/concerts' },
      { value: 'occasional', label: 'Occasionally' },
      { value: 'no', label: 'No' },
    ]
  },
  {
    id: 'previous',
    question: 'Have you had your hearing tested before?',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'long-ago', label: 'Yes, over a year ago' },
      { value: 'recently', label: 'Yes, within the past year' },
      { value: 'regularly', label: 'Yes, I get tested regularly' },
    ]
  },
]

export default function Questionnaire({ onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})

  // Exit guard - prevent leaving mid-questionnaire
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentQuestion > 0 && currentQuestion < questions.length - 1) {
        e.preventDefault()
        e.returnValue = 'Leaving now will restart your assessment from the beginning.'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentQuestion])

  const handleAnswer = (questionId, value) => {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)

    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1)
      }, 300)
    } else {
      setTimeout(() => {
        onComplete(newAnswers)
      }, 300)
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="min-h-screen py-10">
      <div className="container-safe max-w-2xl">
        {/* Protocol Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-clinical-100 px-3 py-1 rounded-full text-xs font-semibold text-clinical-700 border border-clinical-200">
            <Award className="w-3 h-3" />
            Pre-Assessment Clinical Questionnaire
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">Question {currentQuestion + 1} of {questions.length}</span>
            <span className="font-medium">{Math.round(progress)}% • ~1 minute</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="glass p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-8">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(question.id, option.value)}
                className={`w-full text-left p-4 rounded-md border-2 transition-all hover:border-primary-500 hover:bg-primary-50 ${
                  answers[question.id] === option.value
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-clinical-200 bg-white'
                }`}
              >
                <span className="text-clinical-900 font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        {currentQuestion > 0 && (
          <button
            onClick={handleBack}
            className="mt-6 btn-secondary"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
        )}
      </div>
    </div>
  )
}
