import { useState, useEffect, useRef } from 'react'
import { Volume2, Loader2, Check, X, CheckCircle2, Clock, Award, Lock, Plus, Minus, AlertCircle, Play, Pause } from 'lucide-react'
import { STATS } from '../constants/stats'

// Test frequencies in Hz (standard audiometric frequencies)
const testFrequencies = [
  { freq: 250, label: '250 Hz', ear: 'left', type: 'detection' },
  { freq: 500, label: '500 Hz', ear: 'left', type: 'detection' },
  { freq: 1000, label: '1 kHz', ear: 'left', type: 'adjustment' },
  { freq: 2000, label: '2 kHz', ear: 'left', type: 'detection' },
  { freq: 4000, label: '4 kHz', ear: 'left', type: 'adjustment' },
  { freq: 8000, label: '8 kHz', ear: 'left', type: 'detection' },
  { freq: 250, label: '250 Hz', ear: 'right', type: 'detection' },
  { freq: 500, label: '500 Hz', ear: 'right', type: 'detection' },
  { freq: 1000, label: '1 kHz', ear: 'right', type: 'adjustment' },
  { freq: 2000, label: '2 kHz', ear: 'right', type: 'detection' },
  { freq: 4000, label: '4 kHz', ear: 'right', type: 'adjustment' },
  { freq: 8000, label: '8 kHz', ear: 'right', type: 'detection' },
]

const STORAGE_KEY = 'hearwell_test_progress'
const AVG_TIME_PER_TEST = 6 // seconds per tone
const INACTIVITY_THRESHOLD = 12000 // 12 seconds
const MIN_DB = -60 // minimum dB level
const MAX_DB = -10 // maximum safe dB level
const INITIAL_DB = -40 // starting dB level for adjustment tests

export default function HearingTest({ userData, onComplete }) {
  const [stage, setStage] = useState('intro') // intro, calibration, preparing, testing, processing
  const [currentTest, setCurrentTest] = useState(0)
  const [results, setResults] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [canHear, setCanHear] = useState(null)
  const [volumeLevel, setVolumeLevel] = useState(0.5)
  const [isPulsing, setIsPulsing] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [hasPlayedTone, setHasPlayedTone] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [milestoneToast, setMilestoneToast] = useState(null)
  const [showInactivityNudge, setShowInactivityNudge] = useState(false)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [savedProgress, setSavedProgress] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [adjustmentDb, setAdjustmentDb] = useState(INITIAL_DB)
  const [adjustmentPlaying, setAdjustmentPlaying] = useState(false)
  const [showMaxVolumeWarning, setShowMaxVolumeWarning] = useState(false)
  
  // Calibration state
  const [calibrationStep, setCalibrationStep] = useState('setup') // setup, left-ear, right-ear, complete
  const [calibrationBaseline, setCalibrationBaseline] = useState({ left: null, right: null })
  const [calibrationDb, setCalibrationDb] = useState(INITIAL_DB)
  
  const audioContextRef = useRef(null)
  const oscillatorRef = useRef(null)
  const gainNodeRef = useRef(null)
  const inactivityTimerRef = useRef(null)
  const lastActivityRef = useRef(Date.now())
  const adjustmentOscillatorRef = useRef(null)
  const adjustmentGainRef = useRef(null)

  // Check for saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.currentTest > 0 && data.currentTest < testFrequencies.length) {
          setSavedProgress(data)
          setShowResumePrompt(true)
        }
      } catch (e) {
        console.error('Failed to parse saved progress')
      }
    }
  }, [])

  // Save progress to localStorage
  useEffect(() => {
    if (stage === 'testing' && currentTest > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentTest,
        results,
        stage,
        timestamp: Date.now()
      }))
    }
  }, [currentTest, results, stage])

  // Clear saved progress on completion
  useEffect(() => {
    if (stage === 'processing') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [stage])

  // Exit guard
  useEffect(() => {
    if (stage === 'testing' || stage === 'calibration') {
      const handleBeforeUnload = (e) => {
        e.preventDefault()
        e.returnValue = 'Leaving now will discard your assessment progress and personal audiogram data.'
        return e.returnValue
      }
      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [stage])

  // Inactivity nudge
  useEffect(() => {
    if (stage !== 'testing' || isPlaying || hasPlayedTone) {
      setShowInactivityNudge(false)
      return
    }

    inactivityTimerRef.current = setTimeout(() => {
      setShowInactivityNudge(true)
    }, INACTIVITY_THRESHOLD)

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [stage, isPlaying, hasPlayedTone, currentTest])

  useEffect(() => {
    // Initialize Web Audio API
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    gainNodeRef.current = audioContextRef.current.createGain()
    gainNodeRef.current.connect(audioContextRef.current.destination)

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  const playTone = (frequency, duration = 1500, earSide = null) => {
    if (!audioContextRef.current) return

    // Stop any existing tone
    stopTone()

    const oscillator = audioContextRef.current.createOscillator()
    const panner = audioContextRef.current.createStereoPanner()
    const envelope = audioContextRef.current.createGain()
    
    // Set ear (left = -1, right = 1)
    if (earSide) {
      panner.pan.value = earSide === 'left' ? -1 : 1
    } else {
      const currentTestData = testFrequencies[currentTest]
      panner.pan.value = currentTestData.ear === 'left' ? -1 : 1
    }

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
    
    // Fade in/out envelope for smoother sound
    const now = audioContextRef.current.currentTime
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(volumeLevel, now + 0.1) // 100ms fade in
    envelope.gain.setValueAtTime(volumeLevel, now + duration / 1000 - 0.1)
    envelope.gain.linearRampToValueAtTime(0, now + duration / 1000) // 100ms fade out
    
    oscillator.connect(envelope)
    envelope.connect(panner)
    panner.connect(gainNodeRef.current.destination || gainNodeRef.current)
    
    oscillator.start(now)
    oscillator.stop(now + duration / 1000)
    oscillatorRef.current = oscillator

    // Visual pulse animation
    setIsPulsing(true)

    // Auto-stop after duration
    setTimeout(() => {
      stopTone()
      setIsPlaying(false)
      setIsPulsing(false)
    }, duration)
  }

  const stopTone = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop()
        oscillatorRef.current.disconnect()
      } catch (e) {
        // Already stopped
      }
      oscillatorRef.current = null
    }
  }

  // Convert dB to linear gain (0-1)
  const dbToGain = (db) => {
    return Math.pow(10, db / 20)
  }

  // Start continuous tone for adjustment tests
  const startAdjustmentTone = (frequency, earSide) => {
    if (!audioContextRef.current) return

    stopAdjustmentTone()

    const oscillator = audioContextRef.current.createOscillator()
    const panner = audioContextRef.current.createStereoPanner()
    const envelope = audioContextRef.current.createGain()
    
    panner.pan.value = earSide === 'left' ? -1 : 1
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
    
    const gain = dbToGain(adjustmentDb)
    const now = audioContextRef.current.currentTime
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(gain, now + 0.1)
    
    oscillator.connect(envelope)
    envelope.connect(panner)
    panner.connect(gainNodeRef.current.destination || gainNodeRef.current)
    
    oscillator.start(now)
    adjustmentOscillatorRef.current = oscillator
    adjustmentGainRef.current = envelope
    setIsPulsing(true)
  }

  const stopAdjustmentTone = () => {
    if (adjustmentOscillatorRef.current) {
      try {
        const now = audioContextRef.current.currentTime
        adjustmentGainRef.current.gain.linearRampToValueAtTime(0, now + 0.1)
        adjustmentOscillatorRef.current.stop(now + 0.1)
        adjustmentOscillatorRef.current.disconnect()
      } catch (e) {
        // Already stopped
      }
      adjustmentOscillatorRef.current = null
      adjustmentGainRef.current = null
    }
    setIsPulsing(false)
  }

  const updateAdjustmentVolume = (newDb) => {
    if (adjustmentGainRef.current && audioContextRef.current) {
      const gain = dbToGain(newDb)
      const now = audioContextRef.current.currentTime
      adjustmentGainRef.current.gain.linearRampToValueAtTime(gain, now + 0.05)
    }
  }

  const handleVolumeIncrease = () => {
    const newDb = Math.min(adjustmentDb + 5, MAX_DB)
    if (newDb >= MAX_DB) {
      setShowMaxVolumeWarning(true)
      setTimeout(() => setShowMaxVolumeWarning(false), 2000)
    }
    setAdjustmentDb(newDb)
    updateAdjustmentVolume(newDb)
    lastActivityRef.current = Date.now()
  }

  const handleVolumeDecrease = () => {
    const newDb = Math.max(adjustmentDb - 5, MIN_DB)
    setAdjustmentDb(newDb)
    updateAdjustmentVolume(newDb)
    setShowMaxVolumeWarning(false)
    lastActivityRef.current = Date.now()
  }

  const toggleAdjustmentTone = () => {
    const test = testFrequencies[currentTest]
    if (adjustmentPlaying) {
      stopAdjustmentTone()
      setAdjustmentPlaying(false)
    } else {
      startAdjustmentTone(test.freq, test.ear)
      setAdjustmentPlaying(true)
      setHasPlayedTone(true)
    }
    lastActivityRef.current = Date.now()
  }

  const handleAdjustmentComplete = () => {
    if (!hasPlayedTone) {
      setShowWarning(true)
      return
    }

    stopAdjustmentTone()
    setAdjustmentPlaying(false)
    lastActivityRef.current = Date.now()
    
    const test = testFrequencies[currentTest]
    const result = {
      frequency: test.freq,
      ear: test.ear,
      heard: true,
      volume: dbToGain(adjustmentDb),
      threshold: dbToGain(adjustmentDb),
      thresholdDb: adjustmentDb,
      testType: 'adjustment'
    }
    
    const newResults = [...results, result]
    setResults(newResults)
    setIsTransitioning(true)

    const nextTest = currentTest + 1
    if (nextTest === 6) {
      showMilestone('Left ear complete — Halfway done!')
    } else if (nextTest === 11) {
      showMilestone('Right ear almost complete — Final tone next!')
    } else if (nextTest === testFrequencies.length) {
      showMilestone('Assessment complete — Generating your audiogram...')
    }

    setTimeout(() => {
      setIsTransitioning(false)
      if (currentTest < testFrequencies.length - 1) {
        setCurrentTest(currentTest + 1)
        setCanHear(null)
        setIsPlaying(false)
        setHasPlayedTone(false)
        setShowWarning(false)
        setAdjustmentDb(INITIAL_DB)
        setShowMaxVolumeWarning(false)
      } else {
        finishTest(newResults)
      }
    }, 600)
  }

  const handlePlayTone = () => {
    const test = testFrequencies[currentTest]
    setIsPlaying(true)
    setShowWarning(false)
    setShowInactivityNudge(false)
    lastActivityRef.current = Date.now()
    
    // Small countdown before playing
    setCountdown(3)
    let count = 3
    const countInterval = setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        clearInterval(countInterval)
        setCountdown(null)
        playTone(test.freq)
        setHasPlayedTone(true)
      }
    }, 400)
  }

  const startCalibrationTone = (ear) => {
    if (!audioContextRef.current) return
    stopCalibrationTone()

    const oscillator = audioContextRef.current.createOscillator()
    const panner = audioContextRef.current.createStereoPanner()
    const envelope = audioContextRef.current.createGain()
    
    panner.pan.value = ear === 'left' ? -1 : 1
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(1000, audioContextRef.current.currentTime)
    
    const gain = dbToGain(calibrationDb)
    const now = audioContextRef.current.currentTime
    envelope.gain.setValueAtTime(0, now)
    envelope.gain.linearRampToValueAtTime(gain, now + 0.1)
    
    oscillator.connect(envelope)
    envelope.connect(panner)
    panner.connect(gainNodeRef.current.destination || gainNodeRef.current)
    
    oscillator.start(now)
    adjustmentOscillatorRef.current = oscillator
    adjustmentGainRef.current = envelope
    setIsPulsing(true)
    setAdjustmentPlaying(true)
  }

  const stopCalibrationTone = () => {
    if (adjustmentOscillatorRef.current) {
      try {
        const now = audioContextRef.current.currentTime
        adjustmentGainRef.current.gain.linearRampToValueAtTime(0, now + 0.1)
        adjustmentOscillatorRef.current.stop(now + 0.1)
        adjustmentOscillatorRef.current.disconnect()
      } catch (e) {
        // Already stopped
      }
      adjustmentOscillatorRef.current = null
      adjustmentGainRef.current = null
    }
    setIsPulsing(false)
    setAdjustmentPlaying(false)
  }

  const updateCalibrationVolume = (newDb) => {
    setCalibrationDb(newDb)
    if (adjustmentGainRef.current && audioContextRef.current) {
      const gain = dbToGain(newDb)
      const now = audioContextRef.current.currentTime
      adjustmentGainRef.current.gain.linearRampToValueAtTime(gain, now + 0.05)
    }
  }

  const handleCalibrationIncrease = () => {
    const newDb = Math.min(calibrationDb + 5, MAX_DB)
    if (newDb >= MAX_DB) {
      setShowMaxVolumeWarning(true)
      setTimeout(() => setShowMaxVolumeWarning(false), 2000)
    }
    updateCalibrationVolume(newDb)
  }

  const handleCalibrationDecrease = () => {
    const newDb = Math.max(calibrationDb - 5, MIN_DB)
    updateCalibrationVolume(newDb)
    setShowMaxVolumeWarning(false)
  }

  const toggleCalibrationTone = (ear) => {
    if (adjustmentPlaying) {
      stopCalibrationTone()
    } else {
      startCalibrationTone(ear)
    }
  }

  const completeCalibrationStep = () => {
    stopCalibrationTone()
    
    if (calibrationStep === 'left-ear') {
      setCalibrationBaseline(prev => ({ ...prev, left: calibrationDb }))
      setCalibrationStep('right-ear')
      setCalibrationDb(INITIAL_DB)
    } else if (calibrationStep === 'right-ear') {
      setCalibrationBaseline(prev => ({ ...prev, right: calibrationDb }))
      setCalibrationStep('complete')
    }
  }

  const handleResponse = (heard) => {
    if (!hasPlayedTone) {
      setShowWarning(true)
      return
    }
    
    setCanHear(heard)
    lastActivityRef.current = Date.now()
    
    const test = testFrequencies[currentTest]
    const result = {
      frequency: test.freq,
      ear: test.ear,
      heard: heard,
      volume: volumeLevel,
      threshold: heard ? volumeLevel : null,
      testType: 'detection'
    }
    
    const newResults = [...results, result]
    setResults(newResults)

    // Show transition state
    setIsTransitioning(true)

    // Show milestone toasts
    const nextTest = currentTest + 1
    if (nextTest === 6) {
      showMilestone('Left ear complete — Halfway done!')
    } else if (nextTest === 11) {
      showMilestone('Right ear almost complete — Final tone next!')
    } else if (nextTest === testFrequencies.length) {
      showMilestone('Assessment complete — Generating your audiogram...')
    }

    setTimeout(() => {
      setIsTransitioning(false)
      if (currentTest < testFrequencies.length - 1) {
        setCurrentTest(currentTest + 1)
        setCanHear(null)
        setIsPlaying(false)
        setHasPlayedTone(false)
        setShowWarning(false)
      } else {
        finishTest(newResults)
      }
    }, 600)
  }

  const finishTest = (finalResults) => {
    setStage('processing')
    
    // Calculate hearing profile
    const leftEarResults = finalResults.filter(r => r.ear === 'left')
    const rightEarResults = finalResults.filter(r => r.ear === 'right')
    
    const calculateScore = (earResults) => {
      const heardCount = earResults.filter(r => r.heard).length
      return Math.round((heardCount / earResults.length) * 100)
    }

    const leftScore = calculateScore(leftEarResults)
    const rightScore = calculateScore(rightEarResults)
    const overallScore = Math.round((leftScore + rightScore) / 2)

    setTimeout(() => {
      onComplete({
        leftEar: leftEarResults,
        rightEar: rightEarResults,
        leftScore,
        rightScore,
        overallScore,
        calibrationBaseline,
        timestamp: new Date().toISOString()
      })
    }, 2000)
  }

  const startTest = () => {
    setStage('calibration')
  }

  const showMilestone = (message) => {
    setMilestoneToast(message)
    setTimeout(() => setMilestoneToast(null), 3000)
  }

  const startActualTest = () => {
    stopCalibrationTone()
    setStage('preparing')
    setTimeout(() => {
      setStage('testing')
      showMilestone('Calibration complete — Test conditions standardized')
    }, 2000)
  }

  const resumeSavedTest = () => {
    if (savedProgress) {
      setCurrentTest(savedProgress.currentTest)
      setResults(savedProgress.results)
      setStage(savedProgress.stage)
      setShowResumePrompt(false)
      showMilestone('Resuming your assessment...')
    }
  }

  const startFreshTest = () => {
    localStorage.removeItem(STORAGE_KEY)
    setShowResumePrompt(false)
    setSavedProgress(null)
  }

  // Calculate progress with endowed progress boost
  const baseProgress = stage === 'testing' ? ((currentTest + 1) / testFrequencies.length) * 90 : 0
  const endowedProgress = stage === 'testing' ? baseProgress + 10 : 0
  const progress = endowedProgress

  // Calculate time remaining
  const remainingTests = testFrequencies.length - currentTest - 1
  const estimatedSecondsLeft = remainingTests * AVG_TIME_PER_TEST
  const minutesLeft = Math.floor(estimatedSecondsLeft / 60)
  const secondsLeft = estimatedSecondsLeft % 60
  const timeRemainingText = minutesLeft > 0 
    ? `≈ ${minutesLeft}:${secondsLeft.toString().padStart(2, '0')} left`
    : `≈ ${secondsLeft}s left`

  // Step stepper logic
  const getStepStatus = (stepName) => {
    if (stepName === 'calibration') return stage !== 'intro' ? 'complete' : 'upcoming'
    if (stepName === 'left-ear') {
      if (stage === 'testing' && currentTest >= 0 && currentTest < 6) return 'active'
      if (stage === 'testing' && currentTest >= 6) return 'complete'
      if (stage === 'processing') return 'complete'
      return 'upcoming'
    }
    if (stepName === 'right-ear') {
      if (stage === 'testing' && currentTest >= 6 && currentTest < 12) return 'active'
      if (stage === 'processing') return 'complete'
      return 'upcoming'
    }
    if (stepName === 'results') {
      if (stage === 'processing') return 'active'
      return 'upcoming'
    }
    return 'upcoming'
  }

  // Resume prompt
  if (showResumePrompt && savedProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-clinical-50">
        <div className="max-w-md w-full glass p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-50 rounded-md flex items-center justify-center mx-auto mb-4 border border-primary-200">
              <Volume2 className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-clinical-900 mb-2">Resume Assessment?</h2>
            <p className="text-clinical-600">We found your previous session.</p>
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-md p-4 mb-6">
            <p className="text-sm text-clinical-700">
              <strong>Progress saved:</strong> Test {savedProgress.currentTest + 1} of {testFrequencies.length}
            </p>
            <p className="text-xs text-clinical-600 mt-1">
              Continue where you left off to get your results.
            </p>
          </div>
          <div className="space-y-3">
            <button onClick={resumeSavedTest} className="w-full btn-primary py-3">
              Resume Assessment
            </button>
            <button onClick={startFreshTest} className="w-full btn-secondary py-3">
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Step stepper component
  const StepStepper = () => {
    const steps = [
      { name: 'Calibration', key: 'calibration' },
      { name: 'Left Ear (6)', key: 'left-ear' },
      { name: 'Right Ear (6)', key: 'right-ear' },
      { name: 'Results', key: 'results' },
    ]

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const status = getStepStatus(step.key)
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    status === 'complete' ? 'bg-primary-600 text-white' :
                    status === 'active' ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                    'bg-clinical-200 text-clinical-500'
                  }`}>
                    {status === 'complete' ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-xs mt-2 font-medium text-center ${
                    status === 'active' ? 'text-primary-600' :
                    status === 'complete' ? 'text-clinical-700' :
                    'text-clinical-400'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 mb-6 transition-all ${
                    getStepStatus(steps[idx + 1].key) !== 'upcoming' ? 'bg-primary-600' : 'bg-clinical-200'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }


  if (stage === 'intro') {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="glass p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-50 rounded-md flex items-center justify-center mx-auto mb-4 border border-primary-200">
                <Volume2 className="w-8 h-8 text-primary-600" />
              </div>
              <div className="inline-flex items-center gap-2 bg-clinical-100 px-3 py-1 rounded-full text-xs font-semibold text-clinical-700 mb-3 border border-clinical-200">
                <Award className="w-3 h-3" />
                Protocol: Pure-Tone v3.2 | Binaural | 12 stimuli
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-4">
                Clinical Hearing Assessment
              </h2>
              <p className="text-clinical-600">
                Approximately <strong>3 minutes</strong> — 12 precise tone measurements across both ears.
              </p>
            </div>

            <div className="bg-clinical-50 rounded-md p-6 mb-6 border border-clinical-200">
              <h3 className="font-bold text-clinical-900 mb-3">Assessment Parameters:</h3>
              <ul className="space-y-2 text-clinical-700 text-sm">
                <li>• <strong>Duration:</strong> ~3 minutes total time</li>
                <li>• <strong>Frequencies:</strong> 12 measurements (250Hz – 8kHz)</li>
                <li>• <strong>Presentation:</strong> Monaural (one ear at a time)</li>
                <li>• <strong>Method:</strong> Pure-tone audiometry</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 text-xs text-clinical-600 mb-6 justify-center">
              <Award className="w-4 h-4 text-primary-600" />
              <span>Validated on {STATS.validationParticipants} participants | {STATS.accuracyRate} accuracy</span>
            </div>

            <button
              onClick={startTest}
              className="w-full btn-primary py-4"
            >
              Begin Hearing Test
            </button>
            <p className="text-clinical-600 text-sm mt-3 text-center">
              Instant results. No credit card required.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'calibration') {
    // Setup instructions
    if (calibrationStep === 'setup') {
      return (
        <div className="min-h-screen py-8 px-4 transition-opacity duration-500">
          <div className="max-w-2xl mx-auto">
            <StepStepper />
            <div className="glass p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-50 rounded-md flex items-center justify-center mx-auto mb-4 border border-primary-200">
                  <Volume2 className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-4">
                  Setup Your Environment
                </h2>
                <p className="text-clinical-600 mb-6">
                  For accurate results, we need to calibrate your audio setup.
                </p>
              </div>

              <div className="bg-yellow-50 rounded-md p-6 mb-6 border border-yellow-200">
                <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Important: Do NOT set volume to maximum
                </h3>
                <p className="text-yellow-800 text-sm">
                  Setting volume to max can be unsafe and won't improve accuracy. We'll help you find the right level.
                </p>
              </div>

              <div className="bg-clinical-50 rounded-md p-6 mb-6 border border-clinical-200">
                <h3 className="font-bold text-clinical-900 mb-3">Before You Begin:</h3>
                <ul className="space-y-3 text-clinical-700 text-sm">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Find a quiet room</strong> — Background noise affects accuracy</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Use headphones</strong> — Wired or over-ear headphones work best</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Set system volume to 50-70%</strong> — We'll calibrate from there</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Don't change volume during test</strong> — Keep it locked once calibrated</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setCalibrationStep('left-ear')}
                className="w-full btn-primary py-4"
              >
                I'm Ready — Start Calibration
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Left or Right ear calibration
    const currentEar = calibrationStep === 'left-ear' ? 'left' : 'right'
    const earLabel = currentEar === 'left' ? 'Left' : 'Right'

    if (calibrationStep === 'left-ear' || calibrationStep === 'right-ear') {
      return (
        <div className="min-h-screen py-8 px-4 transition-opacity duration-500">
          <div className="max-w-2xl mx-auto">
            <StepStepper />
            <div className="glass p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-50 rounded-md flex items-center justify-center mx-auto mb-4 border border-primary-200">
                  <Volume2 className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-4">
                  Calibrate {earLabel} Ear
                </h2>
                <p className="text-clinical-600 mb-6">
                  Adjust the tone until it's <strong>just barely audible</strong> in your {earLabel.toLowerCase()} ear.
                </p>
              </div>

              <div className="bg-primary-50 rounded-md p-6 mb-8 border border-primary-200">
                <h3 className="font-bold text-primary-900 mb-3">Instructions:</h3>
                <ol className="space-y-2 text-primary-800 text-sm list-decimal list-inside">
                  <li>Press Play to start the tone in your {earLabel.toLowerCase()} ear</li>
                  <li>Use + and - buttons to adjust volume</li>
                  <li>Find the softest level where you can <strong>just barely hear it</strong></li>
                  <li>Press Next when ready</li>
                </ol>
              </div>

              {/* Ear Illustration */}
              <div className="flex justify-center mb-8">
                <div className={`flex flex-col items-center transition-all ${isPulsing ? 'scale-110' : 'scale-100'}`}>
                  <div className={`w-20 h-20 rounded-md flex items-center justify-center mb-2 transition-all border-2 ${
                    isPulsing
                      ? 'bg-primary-50 border-primary-500 animate-pulse'
                      : 'bg-clinical-50 border-clinical-200'
                  }`}>
                    <img 
                      src={currentEar === 'left' 
                        ? "https://cdn.shopify.com/s/files/1/0939/7482/3208/files/left-ear.png?v=1759638067"
                        : "https://cdn.shopify.com/s/files/1/0939/7482/3208/files/right-ear.png?v=1759638067"
                      }
                      alt={`${earLabel} ear`}
                      className="w-12 h-12 object-contain"
                    />
                  </div>
                  <span className="text-sm font-semibold text-clinical-900">
                    {earLabel} Ear
                  </span>
                </div>
              </div>

              {/* Adjustment Controls */}
              <div className="mb-8">
                {!adjustmentPlaying && (
                  <div className="text-center mb-3">
                    <span className="inline-block bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-semibold border border-primary-200">
                      1. Press Play
                    </span>
                  </div>
                )}
                <div className="flex justify-center items-center gap-6">
                  <button
                    onClick={handleCalibrationDecrease}
                    disabled={calibrationDb <= MIN_DB}
                    className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all ${
                      calibrationDb <= MIN_DB
                        ? 'bg-clinical-200 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700'
                    }`}
                  >
                    <Minus className="w-8 h-8 text-white" />
                    <span className="text-white text-xs font-semibold mt-1">Softer</span>
                  </button>

                  <button
                    onClick={() => toggleCalibrationTone(currentEar)}
                    aria-label={adjustmentPlaying ? 'Pause tone' : 'Play tone'}
                    className={`w-24 h-24 rounded-md flex flex-col items-center justify-center transition-all ${
                      adjustmentPlaying
                        ? 'bg-primary-700'
                        : 'bg-primary-600 hover:bg-primary-700'
                    } ${isPulsing ? 'ring-4 ring-primary-400' : ''}`}
                  >
                    {adjustmentPlaying ? (
                      <>
                        <Pause className="w-10 h-10 text-white" />
                        <span className="text-white text-[10px] font-bold mt-1">PAUSE</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-10 h-10 text-white" />
                        <span className="text-white text-[10px] font-bold mt-1">PLAY</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCalibrationIncrease}
                    disabled={calibrationDb >= MAX_DB}
                    className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all ${
                      calibrationDb >= MAX_DB
                        ? 'bg-clinical-200 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700'
                    }`}
                  >
                    <Plus className="w-8 h-8 text-white" />
                    <span className="text-white text-xs font-semibold mt-1">Louder</span>
                  </button>
                </div>
              </div>

              {/* Max Volume Warning */}
              {showMaxVolumeWarning && (
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-full text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-semibold">Maximum safe volume reached</span>
                  </div>
                </div>
              )}

              <button
                onClick={completeCalibrationStep}
                className="w-full btn-primary py-4"
              >
                {calibrationStep === 'left-ear' ? 'Next — Calibrate Right Ear' : 'Complete Calibration'}
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Calibration complete summary
    if (calibrationStep === 'complete') {
      return (
        <div className="min-h-screen py-8 px-4 transition-opacity duration-500">
          <div className="max-w-2xl mx-auto">
            <StepStepper />
            <div className="glass p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-50 rounded-md flex items-center justify-center mx-auto mb-4 border border-green-200">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-4">
                  Calibration Complete
                </h2>
                <p className="text-clinical-600 mb-6">
                  Your audio is now calibrated. All test results will be relative to your baseline.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-clinical-50 rounded-md p-4 border border-clinical-200">
                  <h4 className="font-bold text-clinical-900 mb-2">Left Ear Baseline</h4>
                  <p className="text-2xl font-bold text-primary-600">{Math.abs(calibrationBaseline.left)} dB</p>
                  <p className="text-xs text-clinical-600 mt-1">Calibrated threshold</p>
                </div>
                <div className="bg-clinical-50 rounded-md p-4 border border-clinical-200">
                  <h4 className="font-bold text-clinical-900 mb-2">Right Ear Baseline</h4>
                  <p className="text-2xl font-bold text-primary-600">{Math.abs(calibrationBaseline.right)} dB</p>
                  <p className="text-xs text-clinical-600 mt-1">Calibrated threshold</p>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-md p-4 mb-6 border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Remember:</strong> Do not change your system volume during the test. This would invalidate your calibration.
                </p>
              </div>

              <button
                onClick={startActualTest}
                className="w-full btn-primary py-4"
              >
                Start Hearing Test
              </button>
            </div>
          </div>
        </div>
      )
    }
  }

  if (stage === 'preparing') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-clinical-900 mb-2">
            Initializing Assessment
          </h2>
          <p className="text-clinical-600">Configuring audio parameters...</p>
        </div>
      </div>
    )
  }

  if (stage === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-clinical-900 mb-2">
            Processing Data
          </h2>
          <p className="text-clinical-600 mb-4">Analyzing audiometric measurements...</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  const currentTestData = testFrequencies[currentTest]
  const isAdjustmentTest = currentTestData.type === 'adjustment'

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Step Stepper */}
        <StepStepper />

        {/* Milestone Toast */}
        {milestoneToast && (
          <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="bg-primary-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center justify-center gap-2 max-w-2xl mx-auto">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold text-center">{milestoneToast}</span>
            </div>
          </div>
        )}

        {/* Progress with Time */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Test {currentTest + 1} of {testFrequencies.length}</span>
              {currentTest < testFrequencies.length - 1 && (
                <>
                  <span className="text-clinical-400">•</span>
                  <Clock className="w-3.5 h-3.5 text-clinical-500" />
                  <span className="text-clinical-500">{timeRemainingText}</span>
                </>
              )}
            </div>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Results Teaser (at 90%+) */}
        {progress >= 90 && currentTest < testFrequencies.length - 1 && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 px-4 py-2 rounded-full text-sm">
              <Lock className="w-4 h-4" />
              <span className="font-semibold">Almost done — Preparing your audiogram...</span>
            </div>
          </div>
        )}

        {/* Transition Overlay */}
        {isTransitioning && (
          <div className="fixed inset-0 bg-primary-600 bg-opacity-20 backdrop-blur-sm z-40 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <p className="text-clinical-900 font-semibold">Response recorded</p>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Test Card */}
        <div className="glass p-6 sm:p-8">
          {/* Ear Illustrations */}
          <div className="flex justify-center items-center gap-8 mb-6">
            <div className={`flex flex-col items-center transition-all ${currentTestData.ear === 'left' ? 'opacity-100 scale-110' : 'opacity-30 scale-90'}`}>
              <div className={`w-16 h-16 rounded-md flex items-center justify-center mb-2 transition-all border-2 ${
                currentTestData.ear === 'left' && isPulsing
                  ? 'bg-primary-50 border-primary-500 animate-pulse'
                  : 'bg-clinical-50 border-clinical-200'
              }`}>
                <img 
                  src="https://cdn.shopify.com/s/files/1/0939/7482/3208/files/left-ear.png?v=1759638067" 
                  alt="Left ear"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <span className={`text-xs font-semibold ${currentTestData.ear === 'left' ? 'text-clinical-900' : 'text-clinical-400'}`}>
                Left Ear
              </span>
            </div>

            <div className={`flex flex-col items-center transition-all ${currentTestData.ear === 'right' ? 'opacity-100 scale-110' : 'opacity-30 scale-90'}`}>
              <div className={`w-16 h-16 rounded-md flex items-center justify-center mb-2 transition-all border-2 ${
                currentTestData.ear === 'right' && isPulsing
                  ? 'bg-primary-50 border-primary-500 animate-pulse'
                  : 'bg-clinical-50 border-clinical-200'
              }`}>
                <img 
                  src="https://cdn.shopify.com/s/files/1/0939/7482/3208/files/right-ear.png?v=1759638067" 
                  alt="Right ear"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <span className={`text-xs font-semibold ${currentTestData.ear === 'right' ? 'text-clinical-900' : 'text-clinical-400'}`}>
                Right Ear
              </span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-3">
              {isAdjustmentTest ? 'Threshold Adjustment' : 'Stimulus Detection'}
            </h2>
            <p className="text-clinical-600 text-lg">
              {isAdjustmentTest 
                ? 'Press the Play button (▶), adjust volume to the softest sound you can hear, then press Next'
                : 'Press the button to play the tone, listen carefully, then respond'}
            </p>
          </div>

          {/* Play Button with Countdown OR Adjustment Controls */}
          {!isAdjustmentTest ? (
            <div className="flex justify-center mb-10 relative">
              {countdown && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-5xl font-bold text-primary-600 animate-ping">
                    {countdown}
                  </div>
                </div>
              )}
              <button
                onClick={handlePlayTone}
                disabled={isPlaying || countdown !== null}
                aria-label="Play tone"
                className={`w-28 h-28 rounded-md flex flex-col items-center justify-center transition-all relative ${
                  isPlaying || countdown !== null
                    ? 'bg-primary-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                } ${isPulsing ? 'ring-4 ring-primary-400 animate-pulse' : ''} ${(!hasPlayedTone && !isPlaying) ? 'ring-4 ring-primary-300 animate-pulse' : ''}`}
              >
                <Play className={`w-12 h-12 text-white ${isPlaying && !countdown ? 'animate-pulse' : ''}`} />
                <span className="text-white text-sm font-bold mt-1">PLAY</span>
              </button>
            </div>
          ) : (
            <div className="mb-10">
              {/* Adjustment Controls */}
              <div className="flex justify-center items-center gap-6 mb-6">
                <button
                  onClick={handleVolumeDecrease}
                  disabled={adjustmentDb <= MIN_DB}
                  className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all ${
                    adjustmentDb <= MIN_DB
                      ? 'bg-clinical-200 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  <Minus className="w-10 h-10 text-white" />
                  <span className="text-white text-xs font-semibold mt-1">Softer</span>
                </button>

                <button
                    onClick={toggleAdjustmentTone}
                    className={`w-28 h-28 rounded-md flex flex-col items-center justify-center transition-all ${
                      adjustmentPlaying
                        ? 'bg-primary-700'
                        : 'bg-primary-600 hover:bg-primary-700'
                    } ${isPulsing ? 'ring-4 ring-primary-400' : ''} ${(!hasPlayedTone && !adjustmentPlaying) ? 'ring-4 ring-primary-300 animate-pulse' : ''}`}
                  >
                    {adjustmentPlaying ? (
                      <>
                        <Pause className="w-12 h-12 text-white" />
                        <span className="text-white text-xs font-bold mt-1">PAUSE</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-12 h-12 text-white" />
                        <span className="text-white text-xs font-bold mt-1">PLAY</span>
                      </>
                    )}
                  </button>

                <button
                  onClick={handleVolumeIncrease}
                  disabled={adjustmentDb >= MAX_DB}
                  className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all ${
                    adjustmentDb >= MAX_DB
                      ? 'bg-clinical-200 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  <Plus className="w-10 h-10 text-white" />
                  <span className="text-white text-xs font-semibold mt-1">Louder</span>
                </button>
              </div>
            </div>
          )}

          {/* Max Volume Warning Modal */}
          {showMaxVolumeWarning && (
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
              <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-2xl">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-clinical-900 mb-2">
                    You have reached the maximum volume
                  </h3>
                  <p className="text-clinical-600 text-sm">
                    For safety and accuracy, we limit the maximum test volume.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning Message */}
          {showWarning && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-full text-sm animate-pulse">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold">Please activate test tone first</span>
              </div>
            </div>
          )}

          {/* Inactivity Nudge */}
          {showInactivityNudge && !hasPlayedTone && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 px-4 py-2 rounded-full text-sm">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span className="font-medium">Ready for the next tone? Press Play to continue</span>
              </div>
            </div>
          )}

          {/* Response Buttons - Large Circular OR Next Button for Adjustment */}
          {!isAdjustmentTest ? (
            hasPlayedTone && (
              <div className="flex justify-center gap-8 sm:gap-12">
                <button
                  onClick={() => handleResponse(true)}
                  disabled={canHear !== null}
                  className={`flex flex-col items-center gap-3 transition-all ${
                    canHear === true ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-md border-4 flex items-center justify-center transition-all ${
                    canHear === true
                      ? 'border-primary-600 bg-primary-50 scale-110'
                      : 'border-clinical-300 bg-white hover:border-primary-500'
                  }`}>
                    <Check className={`w-10 h-10 sm:w-12 sm:h-12 ${
                      canHear === true ? 'text-primary-600' : 'text-clinical-400'
                    }`} />
                  </div>
                  <span className={`font-bold text-base sm:text-lg ${
                    canHear === true ? 'text-primary-600' : 'text-clinical-600'
                  }`}>
                    YES, I HEARD IT
                  </span>
                </button>

                <button
                  onClick={() => handleResponse(false)}
                  disabled={canHear !== null}
                  className={`flex flex-col items-center gap-3 transition-all ${
                    canHear === false ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-md border-4 flex items-center justify-center transition-all ${
                    canHear === false
                      ? 'border-clinical-500 bg-clinical-50 scale-110'
                      : 'border-clinical-300 bg-white hover:border-clinical-500'
                  }`}>
                    <X className={`w-10 h-10 sm:w-12 sm:h-12 ${
                      canHear === false ? 'text-clinical-600' : 'text-clinical-400'
                    }`} />
                  </div>
                  <span className={`font-bold text-base sm:text-lg ${
                    canHear === false ? 'text-clinical-600' : 'text-clinical-600'
                  }`}>
                    NO, I DIDN'T HEAR IT
                  </span>
                </button>
              </div>
            )
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleAdjustmentComplete}
                disabled={!hasPlayedTone}
                className={`btn-primary px-16 py-5 text-xl font-bold ${
                  !hasPlayedTone ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                NEXT
              </button>
            </div>
          )}
        </div>

        <div className="text-center text-base text-clinical-700 mt-6 font-medium">
          <p>Make sure your headphones are on correctly and you're in a quiet room</p>
        </div>
      </div>
    </div>
  )
}
