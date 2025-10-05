import { useState } from 'react'
import LandingPage from './components/LandingPage'
import AboutUs from './components/AboutUs'
import ContactUs from './components/ContactUs'
import EarlySigns from './components/EarlySigns'
import ScientificValidation from './components/ScientificValidation'
import Questionnaire from './components/Questionnaire'
import HearingTest from './components/HearingTest'
import EmailCollection from './components/EmailCollection'
import Results from './components/Results'

function App() {
  const [stage, setStage] = useState('landing') // landing, about, contact, early-signs, science, questionnaire, test, email-collection, results
  const [userData, setUserData] = useState({})
  const [testResults, setTestResults] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)

  const transitionToStage = (newStage) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setStage(newStage)
      setIsTransitioning(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 300)
  }

  const handleStart = () => {
    transitionToStage('questionnaire')
  }

  const handleQuestionnaireComplete = (data) => {
    setUserData(data)
    transitionToStage('test')
  }

  const handleTestComplete = (results) => {
    setTestResults(results)
    transitionToStage('email-collection')
  }

  const handleEmailComplete = (email) => {
    setUserEmail(email)
    transitionToStage('results')
  }

  const handleRestart = () => {
    setUserData({})
    setTestResults(null)
    setUserEmail('')
    transitionToStage('landing')
  }

  const handleAboutClick = () => {
    transitionToStage('about')
  }

  const handleBackToHome = () => {
    transitionToStage('landing')
  }

  const handleContactClick = () => {
    transitionToStage('contact')
  }

  const handleEarlySignsClick = () => {
    transitionToStage('early-signs')
  }

  const handleScienceClick = () => {
    transitionToStage('science')
  }

  return (
    <div className="min-h-screen">
      <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {stage === 'landing' && <LandingPage onStart={handleStart} onAbout={handleAboutClick} onContact={handleContactClick} onEarlySigns={handleEarlySignsClick} onScience={handleScienceClick} />}
        {stage === 'about' && <AboutUs onBack={handleBackToHome} />}
        {stage === 'contact' && <ContactUs onBack={handleBackToHome} />}
        {stage === 'early-signs' && <EarlySigns onBack={handleBackToHome} onStart={handleStart} />}
        {stage === 'science' && <ScientificValidation onBack={handleBackToHome} />}
        {stage === 'questionnaire' && <Questionnaire onComplete={handleQuestionnaireComplete} />}
        {stage === 'test' && <HearingTest userData={userData} onComplete={handleTestComplete} />}
        {stage === 'email-collection' && <EmailCollection onComplete={handleEmailComplete} />}
        {stage === 'results' && <Results results={testResults} userData={userData} userEmail={userEmail} onRestart={handleRestart} />}
      </div>
    </div>
  )
}

export default App
