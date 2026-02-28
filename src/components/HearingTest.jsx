import { useState, useEffect, useRef, useCallback } from 'react'
import { Volume2, Loader2, Check, X, CheckCircle2, Clock, Award, Lock, Plus, Minus, AlertCircle, Play, Pause, Ear, Headphones, Activity } from 'lucide-react'
import { STATS } from '../constants/stats'

// ─── Clinical Audiometric Configuration ───────────────────────────────────────
// Standard audiometric frequencies tested per ear (ASHA recommended)
const TEST_FREQUENCIES = [500, 1000, 2000, 4000, 8000]
// Test both ears — left first (clinical convention)
const TEST_SEQUENCE = [
  ...TEST_FREQUENCIES.map(f => ({ freq: f, ear: 'left' })),
  ...TEST_FREQUENCIES.map(f => ({ freq: f, ear: 'right' })),
]
const TOTAL_FREQ_TESTS = TEST_SEQUENCE.length // 10 frequency tests

// Screening staircase parameters — fast but accurate
const HW_START_DB = 35   // Starting level in dB HL
const HW_STEP_DOWN = 10  // Decrease by 10 dB after a "heard"
const HW_STEP_UP = 5     // Increase by 5 dB after a "not heard"
const HW_MIN_DB = -10    // Floor (very good hearing)
const HW_MAX_DB = 80     // Ceiling (maximum safe presentation)
const MAX_PRESENTATIONS = 10 // Safety cap per frequency

// Catch trial configuration (silent presentations to detect false positives)
// One catch per ear = 2 total — low overhead, still validates reliability
const CATCH_TRIAL_INDICES = [1, 6] // inject catch trial at these freq-indices (one per ear)
const FALSE_POSITIVE_THRESHOLD = 0.5 // >50% false positives = unreliable

// Audio
const PULSE_DURATION_MS = 200   // Each tone pulse duration
const PULSE_GAP_MS = 150        // Gap between pulses
const PULSES_PER_PRESENTATION = 3 // 3-pulse trains (clinical standard)
const RAMP_MS = 15              // Rise/fall time to avoid clicks

const STORAGE_KEY = 'hearwell_test_progress'
const INACTIVITY_THRESHOLD = 15000 // 15 seconds

// Convert dB HL to linear gain. 0 dB HL ≈ -40 dBFS for a rough consumer-device mapping.
const DB_HL_OFFSET = -50 // offset so 0 dB HL maps to a very quiet but audible level on most devices
const dbHLToGain = (dbHL) => Math.pow(10, (dbHL + DB_HL_OFFSET) / 20)

export default function HearingTest({ userData, onComplete }) {
  const [stage, setStage] = useState('intro') // intro, calibration, preparing, testing, processing
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPulsing, setIsPulsing] = useState(false)
  const [hasResponded, setHasResponded] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [milestoneToast, setMilestoneToast] = useState(null)
  const [showInactivityNudge, setShowInactivityNudge] = useState(false)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [savedProgress, setSavedProgress] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showMaxVolumeWarning, setShowMaxVolumeWarning] = useState(false)
  const [awaitingResponse, setAwaitingResponse] = useState(false)

  // Calibration state
  const [calibrationStep, setCalibrationStep] = useState('setup') // setup, left-ear, right-ear, complete
  const [calibrationBaseline, setCalibrationBaseline] = useState({ left: null, right: null })
  const [calibrationDb, setCalibrationDb] = useState(30) // Start at 30 dB HL for calibration
  const [calibrationPlaying, setCalibrationPlaying] = useState(false)

  // ─── Hughson-Westlake State ────────────────────────────────────────────────
  const [freqIndex, setFreqIndex] = useState(0) // which frequency/ear combo we're on
  const [currentDbHL, setCurrentDbHL] = useState(HW_START_DB)
  const [direction, setDirection] = useState('descending') // descending or ascending
  const [presentationCount, setPresentationCount] = useState(0) // presentations at this frequency
  const [isCatchTrial, setIsCatchTrial] = useState(false)
  const [catchTrialResults, setCatchTrialResults] = useState({ total: 0, falsePositives: 0 })
  const [thresholds, setThresholds] = useState([]) // final per-frequency results
  const [hwHistory, setHwHistory] = useState([]) // full response history for current freq
  const [pendingAutoPresent, setPendingAutoPresent] = useState(false) // trigger next tone after response

  const audioContextRef = useRef(null)
  const oscillatorRefs = useRef([])
  const gainNodeRef = useRef(null)
  const inactivityTimerRef = useRef(null)
  const lastActivityRef = useRef(Date.now())
  const calibrationOscRef = useRef(null)
  const calibrationGainRef = useRef(null)
  const toneTimeoutRef = useRef(null)

  // Check for saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.freqIndex > 0 && data.freqIndex < TOTAL_FREQ_TESTS) {
          setSavedProgress(data)
          setShowResumePrompt(true)
        }
      } catch (e) {
        console.error('Failed to parse saved progress')
      }
    }
  }, [])

  // Save progress
  useEffect(() => {
    if (stage === 'testing' && thresholds.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        freqIndex,
        thresholds,
        calibrationBaseline,
        catchTrialResults,
        stage,
        timestamp: Date.now()
      }))
    }
  }, [freqIndex, thresholds, stage])

  // Clear on completion
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
    if (stage !== 'testing' || isPlaying || awaitingResponse) {
      setShowInactivityNudge(false)
      return
    }
    inactivityTimerRef.current = setTimeout(() => {
      setShowInactivityNudge(true)
    }, INACTIVITY_THRESHOLD)
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    }
  }, [stage, isPlaying, awaitingResponse, freqIndex, presentationCount])

  // Initialize Web Audio
  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioContextRef.current = ctx
    gainNodeRef.current = ctx.createGain()
    gainNodeRef.current.gain.setValueAtTime(1, ctx.currentTime)
    gainNodeRef.current.connect(ctx.destination)
    // Resume on any user gesture (required by many browsers)
    const resume = () => { if (ctx.state === 'suspended') ctx.resume() }
    document.addEventListener('click', resume, { once: false })
    document.addEventListener('touchstart', resume, { once: false })
    return () => {
      document.removeEventListener('click', resume)
      document.removeEventListener('touchstart', resume)
      ctx.close()
    }
  }, [])

  // ─── Audio Engine ──────────────────────────────────────────────────────────
  // Play a pulsed tone train (3 x 250ms pulses with 250ms gaps) — clinical standard
  // `silent` is passed explicitly to avoid stale-closure bugs with isCatchTrial state
  const playPulsedTone = useCallback((frequency, dbHL, earSide, silent = false) => {
    if (!audioContextRef.current) return
    stopAllTones()

    const totalDuration = PULSES_PER_PRESENTATION * PULSE_DURATION_MS + (PULSES_PER_PRESENTATION - 1) * PULSE_GAP_MS

    const ctx = audioContextRef.current
    const now = ctx.currentTime
    const gain = silent ? 0 : dbHLToGain(dbHL)

    for (let i = 0; i < PULSES_PER_PRESENTATION; i++) {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      const panner = ctx.createStereoPanner()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, now)
      panner.pan.setValueAtTime(earSide === 'left' ? -1 : 1, now)

      const pulseStart = now + (i * (PULSE_DURATION_MS + PULSE_GAP_MS)) / 1000
      const pulseEnd = pulseStart + PULSE_DURATION_MS / 1000
      const ramp = RAMP_MS / 1000

      env.gain.setValueAtTime(0, pulseStart)
      env.gain.linearRampToValueAtTime(gain, pulseStart + ramp)
      env.gain.setValueAtTime(gain, pulseEnd - ramp)
      env.gain.linearRampToValueAtTime(0, pulseEnd)

      osc.connect(env)
      env.connect(panner)
      panner.connect(gainNodeRef.current)

      osc.start(pulseStart)
      osc.stop(pulseEnd + 0.01)
      oscillatorRefs.current.push(osc)
    }

    setIsPlaying(true)
    setIsPulsing(true)

    toneTimeoutRef.current = setTimeout(() => {
      setIsPlaying(false)
      setIsPulsing(false)
      setAwaitingResponse(true)
    }, totalDuration)
  }, [])

  const stopAllTones = () => {
    oscillatorRefs.current.forEach(osc => {
      try { osc.stop(); osc.disconnect() } catch (e) { /* already stopped */ }
    })
    oscillatorRefs.current = []
    if (toneTimeoutRef.current) clearTimeout(toneTimeoutRef.current)
    setIsPulsing(false)
  }

  // ─── Auto-present via useEffect (avoids stale closures in setTimeout) ──────
  useEffect(() => {
    if (pendingAutoPresent && !isPlaying && !awaitingResponse && stage === 'testing') {
      setPendingAutoPresent(false)
      // Check if this frequency's first presentation should be a catch trial
      const shouldCatch = presentationCount === 0 && CATCH_TRIAL_INDICES.includes(freqIndex)
      setIsCatchTrial(shouldCatch)
      const test = TEST_SEQUENCE[freqIndex]
      if (test) {
        playPulsedTone(test.freq, currentDbHL, test.ear, shouldCatch)
      }
    }
  }, [pendingAutoPresent, isPlaying, awaitingResponse, stage, freqIndex, currentDbHL, presentationCount, playPulsedTone])

  // ─── Hughson-Westlake Logic ────────────────────────────────────────────────
  const handlePresent = () => {
    if (isPlaying || awaitingResponse) return
    // Resume AudioContext on user gesture
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }
    setShowWarning(false)
    setShowInactivityNudge(false)
    lastActivityRef.current = Date.now()

    // Catch trial only on designated frequency indices, first presentation
    const shouldCatch = presentationCount === 0 && CATCH_TRIAL_INDICES.includes(freqIndex)
    setIsCatchTrial(shouldCatch)

    const test = TEST_SEQUENCE[freqIndex]
    playPulsedTone(test.freq, currentDbHL, test.ear, shouldCatch)
  }

  const handleResponse = (heard) => {
    if (!awaitingResponse) {
      setShowWarning(true)
      return
    }

    setAwaitingResponse(false)
    setHasResponded(true)
    lastActivityRef.current = Date.now()

    // Handle catch trial response
    if (isCatchTrial) {
      setCatchTrialResults(prev => ({
        total: prev.total + 1,
        falsePositives: prev.falsePositives + (heard ? 1 : 0)
      }))
      setIsCatchTrial(false)
      setPresentationCount(prev => prev + 1) // ensure catch doesn't repeat
      // Don't change HW state on catch trials — auto-present real tone next
      setTimeout(() => {
        setHasResponded(false)
        setPendingAutoPresent(true)
      }, 400)
      return
    }

    const count = presentationCount + 1
    setPresentationCount(count)

    const newHistory = [...hwHistory, { dbHL: currentDbHL, heard, direction }]
    setHwHistory(newHistory)

    // ─── Fast screening staircase ──────────────────────────────────────────
    // Descend by 10 until "not heard", then ascend by 5 until "heard".
    // First ascending "heard" after a reversal = threshold.
    if (heard) {
      if (direction === 'ascending') {
        // Heard while ascending = threshold found!
        recordThreshold(currentDbHL, newHistory)
        return
      }
      // Still descending — keep going down
      const newDb = Math.max(currentDbHL - HW_STEP_DOWN, HW_MIN_DB)
      if (newDb <= HW_MIN_DB && currentDbHL <= HW_MIN_DB) {
        // Already at floor, record threshold here
        recordThreshold(HW_MIN_DB, newHistory)
        return
      }
      setCurrentDbHL(newDb)
      setDirection('descending')
    } else {
      // Not heard → go up
      const newDb = Math.min(currentDbHL + HW_STEP_UP, HW_MAX_DB)
      if (newDb >= HW_MAX_DB) {
        recordThreshold(HW_MAX_DB, newHistory)
        return
      }
      setCurrentDbHL(newDb)
      setDirection('ascending')
    }

    // Safety cap: force threshold after MAX_PRESENTATIONS
    if (count >= MAX_PRESENTATIONS) {
      const ascHeard = newHistory.filter(h => h.direction === 'ascending' && h.heard)
      const bestLevel = ascHeard.length > 0
        ? Math.min(...ascHeard.map(h => h.dbHL))
        : currentDbHL
      recordThreshold(bestLevel, newHistory)
      return
    }

    setTimeout(() => {
      setHasResponded(false)
      setPendingAutoPresent(true)
    }, 400)
  }

  const recordThreshold = (thresholdDbHL, history) => {
    const test = TEST_SEQUENCE[freqIndex]
    const newThreshold = {
      frequency: test.freq,
      ear: test.ear,
      thresholdDbHL,
      history,
      presentations: history.length
    }
    const newThresholds = [...thresholds, newThreshold]
    setThresholds(newThresholds)

    setIsTransitioning(true)

    // Milestones
    const next = freqIndex + 1
    if (next === TEST_FREQUENCIES.length) {
      showMilestone('Left ear complete — switching to right ear')
    } else if (next === TOTAL_FREQ_TESTS) {
      showMilestone('Assessment complete — generating your audiogram...')
    }

    setTimeout(() => {
      setIsTransitioning(false)
      if (freqIndex < TOTAL_FREQ_TESTS - 1) {
        // Reset HW state for next frequency
        setFreqIndex(freqIndex + 1)
        setCurrentDbHL(HW_START_DB)
        setDirection('descending')
        setPresentationCount(0)
        setHwHistory([])
        setHasResponded(false)
        setAwaitingResponse(false)
        setIsCatchTrial(false)
      } else {
        finishTest(newThresholds)
      }
    }, 800)
  }

  // ─── Calibration Audio ──────────────────────────────────────────────────────
  const startCalibrationTone = (ear) => {
    if (!audioContextRef.current) return
    stopCalibrationTone()

    const ctx = audioContextRef.current
    const osc = ctx.createOscillator()
    const panner = ctx.createStereoPanner()
    const env = ctx.createGain()

    panner.pan.setValueAtTime(ear === 'left' ? -1 : 1, ctx.currentTime)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1000, ctx.currentTime)

    const gain = dbHLToGain(calibrationDb)
    env.gain.setValueAtTime(0, ctx.currentTime)
    env.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.1)

    osc.connect(env)
    env.connect(panner)
    panner.connect(gainNodeRef.current)

    osc.start(ctx.currentTime)
    calibrationOscRef.current = osc
    calibrationGainRef.current = env
    setIsPulsing(true)
    setCalibrationPlaying(true)
  }

  const stopCalibrationTone = () => {
    if (calibrationOscRef.current) {
      try {
        const now = audioContextRef.current.currentTime
        calibrationGainRef.current.gain.linearRampToValueAtTime(0, now + 0.05)
        calibrationOscRef.current.stop(now + 0.06)
        calibrationOscRef.current.disconnect()
      } catch (e) { /* already stopped */ }
      calibrationOscRef.current = null
      calibrationGainRef.current = null
    }
    setIsPulsing(false)
    setCalibrationPlaying(false)
  }

  const updateCalibrationVolume = (newDb) => {
    setCalibrationDb(newDb)
    if (calibrationGainRef.current && audioContextRef.current) {
      const gain = dbHLToGain(newDb)
      calibrationGainRef.current.gain.linearRampToValueAtTime(gain, audioContextRef.current.currentTime + 0.05)
    }
  }

  const handleCalibrationIncrease = () => {
    const newDb = Math.min(calibrationDb + 5, HW_MAX_DB)
    if (newDb >= HW_MAX_DB) {
      setShowMaxVolumeWarning(true)
      setTimeout(() => setShowMaxVolumeWarning(false), 2000)
    }
    updateCalibrationVolume(newDb)
  }

  const handleCalibrationDecrease = () => {
    const newDb = Math.max(calibrationDb - 5, HW_MIN_DB)
    updateCalibrationVolume(newDb)
    setShowMaxVolumeWarning(false)
  }

  const toggleCalibrationTone = (ear) => {
    if (calibrationPlaying) {
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
      setCalibrationDb(30)
    } else if (calibrationStep === 'right-ear') {
      setCalibrationBaseline(prev => ({ ...prev, right: calibrationDb }))
      setCalibrationStep('complete')
    }
  }

  // ─── Test lifecycle ────────────────────────────────────────────────────────
  const finishTest = (finalThresholds) => {
    setStage('processing')
    stopAllTones()

    const leftResults = finalThresholds.filter(t => t.ear === 'left')
    const rightResults = finalThresholds.filter(t => t.ear === 'right')

    const falsePositiveRate = catchTrialResults.total > 0
      ? catchTrialResults.falsePositives / catchTrialResults.total
      : 0

    setTimeout(() => {
      onComplete({
        leftEar: leftResults,
        rightEar: rightResults,
        calibrationBaseline,
        catchTrials: catchTrialResults,
        falsePositiveRate,
        reliable: falsePositiveRate <= FALSE_POSITIVE_THRESHOLD,
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
      showMilestone('All set — Starting your hearing test')
    }, 2000)
  }

  const resumeSavedTest = () => {
    if (savedProgress) {
      setFreqIndex(savedProgress.freqIndex)
      setThresholds(savedProgress.thresholds)
      setCatchTrialResults(savedProgress.catchTrialResults || { total: 0, falsePositives: 0 })
      setCalibrationBaseline(savedProgress.calibrationBaseline || { left: null, right: null })
      setStage('testing')
      setShowResumePrompt(false)
      showMilestone('Resuming your assessment...')
    }
  }

  const startFreshTest = () => {
    localStorage.removeItem(STORAGE_KEY)
    setShowResumePrompt(false)
    setSavedProgress(null)
  }

  // ─── Derived values ────────────────────────────────────────────────────────
  const progress = stage === 'testing'
    ? Math.round(((freqIndex + (hwHistory.length > 0 ? 0.5 : 0)) / TOTAL_FREQ_TESTS) * 100)
    : 0

  const currentTestData = stage === 'testing' ? TEST_SEQUENCE[freqIndex] : null
  const currentFreqLabel = currentTestData
    ? (currentTestData.freq >= 1000 ? `${currentTestData.freq / 1000} kHz` : `${currentTestData.freq} Hz`)
    : ''

  // Step stepper logic
  const getStepStatus = (stepName) => {
    if (stepName === 'calibration') {
      if (stage === 'intro') return 'upcoming'
      if (stage === 'calibration') return 'active'
      return 'complete'
    }
    if (stepName === 'left-ear') {
      if (stage === 'testing' && freqIndex < TEST_FREQUENCIES.length) return 'active'
      if (stage === 'testing' && freqIndex >= TEST_FREQUENCIES.length) return 'complete'
      if (stage === 'processing') return 'complete'
      return 'upcoming'
    }
    if (stepName === 'right-ear') {
      if (stage === 'testing' && freqIndex >= TEST_FREQUENCIES.length) return 'active'
      if (stage === 'processing') return 'complete'
      return 'upcoming'
    }
    if (stepName === 'results') {
      if (stage === 'processing') return 'active'
      return 'upcoming'
    }
    return 'upcoming'
  }

  // ─── Resume prompt ─────────────────────────────────────────────────────────
  if (showResumePrompt && savedProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-clinical-50">
        <div className="max-w-md w-full glass p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-200">
              <Volume2 className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-clinical-900 mb-2">Resume Assessment?</h2>
            <p className="text-clinical-600">We found your previous session.</p>
          </div>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-clinical-700">
              <strong>Progress saved:</strong> Frequency {savedProgress.freqIndex + 1} of {TOTAL_FREQ_TESTS}
            </p>
            <p className="text-xs text-clinical-600 mt-1">
              Continue where you left off to get your results.
            </p>
          </div>
          <div className="space-y-3">
            <button onClick={resumeSavedTest} className="w-full btn-primary py-3">Resume Assessment</button>
            <button onClick={startFreshTest} className="w-full btn-secondary py-3">Start Fresh</button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step stepper component ────────────────────────────────────────────────
  const StepStepper = () => {
    const steps = [
      { name: 'Calibration', key: 'calibration' },
      { name: 'Left Ear', key: 'left-ear' },
      { name: 'Right Ear', key: 'right-ear' },
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
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    status === 'complete' ? 'bg-primary-600 text-white shadow-md' :
                    status === 'active' ? 'bg-primary-600 text-white ring-4 ring-primary-200 shadow-md' :
                    'bg-clinical-200 text-clinical-500'
                  }`}>
                    {status === 'complete' ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                  </div>
                  <span className={`text-xs mt-2 font-semibold text-center ${
                    status === 'active' ? 'text-primary-600' :
                    status === 'complete' ? 'text-clinical-700' :
                    'text-clinical-400'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 mb-6 transition-all duration-300 rounded-full ${
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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (stage === 'intro') {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="glass p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                <Ear className="w-10 h-10 text-white" />
              </div>
              <div className="inline-flex items-center gap-2 bg-clinical-100 px-3 py-1.5 rounded-full text-xs font-semibold text-clinical-700 mb-3 border border-clinical-200">
                <Award className="w-3.5 h-3.5" />
                Clinically Validated · Quick & Easy
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-4">
                Check Your Hearing
              </h2>
              <p className="text-clinical-600">
                Takes about <strong>4-6 minutes</strong> — we'll test both ears across key frequencies.
              </p>
            </div>

            <div className="bg-clinical-50 rounded-lg p-6 mb-6 border border-clinical-200">
              <h3 className="font-bold text-clinical-900 mb-3">How It Works:</h3>
              <ul className="space-y-2 text-clinical-700 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold mt-0.5">1.</span>
                  <span><strong>Set up</strong> — We'll calibrate the volume for each ear</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold mt-0.5">2.</span>
                  <span><strong>Listen</strong> — We'll play short tones at different pitches</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold mt-0.5">3.</span>
                  <span><strong>Respond</strong> — Just tell us if you heard it or not</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold mt-0.5">4.</span>
                  <span><strong>Results</strong> — See your personal hearing profile instantly</span>
                </li>
              </ul>
            </div>

            <div className="bg-primary-50 rounded-lg p-4 mb-6 border border-primary-200">
              <p className="text-sm text-primary-800">
                <strong>How we measure:</strong> We use the same method audiologists use in clinics. Tones get softer until we find the quietest sound you can hear — that's your hearing threshold.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-clinical-600 mb-6 justify-center">
              <Award className="w-4 h-4 text-primary-600" />
              <span>Validated on {STATS.validationParticipants} participants | {STATS.accuracyRate} accuracy</span>
            </div>

            <button onClick={startTest} className="w-full btn-primary py-4 text-lg">
              Begin Hearing Test
            </button>
            <p className="text-clinical-500 text-sm mt-3 text-center">
              Instant results. No credit card required.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (stage === 'calibration') {
    if (calibrationStep === 'setup') {
      return (
        <div className="min-h-screen py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <StepStepper />
            <div className="glass p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <Headphones className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-4">
                  Let's Get Set Up
                </h2>
                <p className="text-clinical-600">
                  For accurate results, we need to calibrate your audio setup.
                </p>
              </div>

              <div className="bg-yellow-50 rounded-lg p-5 mb-6 border border-yellow-200">
                <h3 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Important: Do NOT set volume to maximum
                </h3>
                <p className="text-yellow-800 text-sm">
                  Setting volume to max can be unsafe. We'll help you find the right level.
                </p>
              </div>

              <div className="bg-clinical-50 rounded-lg p-6 mb-6 border border-clinical-200">
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

              <button onClick={() => setCalibrationStep('left-ear')} className="w-full btn-primary py-4">
                I'm Ready — Start Calibration
              </button>
            </div>
          </div>
        </div>
      )
    }

    const currentEar = calibrationStep === 'left-ear' ? 'left' : 'right'
    const earLabel = currentEar === 'left' ? 'Left' : 'Right'

    if (calibrationStep === 'left-ear' || calibrationStep === 'right-ear') {
      return (
        <div className="min-h-screen py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <StepStepper />
            <div className="glass p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <Headphones className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-4">
                  Calibrate {earLabel} Ear
                </h2>
                <p className="text-clinical-600">
                  Adjust the tone until it's <strong>just barely audible</strong> in your {earLabel.toLowerCase()} ear.
                </p>
              </div>

              <div className="bg-primary-50 rounded-lg p-5 mb-8 border border-primary-200">
                <ol className="space-y-2 text-primary-800 text-sm list-decimal list-inside">
                  <li>Press Play to hear a tone in your {earLabel.toLowerCase()} ear</li>
                  <li>Use + and - buttons to adjust volume</li>
                  <li>Find the softest level where you can <strong>just barely hear it</strong></li>
                  <li>Press Next when ready</li>
                </ol>
              </div>

              {/* Ear Illustration */}
              <div className="flex justify-center mb-8">
                <div className={`flex flex-col items-center transition-all duration-300 ${isPulsing ? 'scale-110' : 'scale-100'}`}>
                  <div className={`w-20 h-20 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 border-2 ${
                    isPulsing
                      ? 'bg-primary-50 border-primary-500 shadow-lg shadow-primary-200'
                      : 'bg-clinical-50 border-clinical-200'
                  }`}>
                    <Ear className={`w-10 h-10 ${isPulsing ? 'text-primary-600' : 'text-clinical-500'} ${currentEar === 'right' ? 'scale-x-[-1]' : ''}`} />
                  </div>
                  <span className="text-sm font-semibold text-clinical-900">{earLabel} Ear</span>
                </div>
              </div>

              {/* Controls */}
              <div className="mb-8">
                {!calibrationPlaying && (
                  <div className="text-center mb-4">
                    <span className="inline-block bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-semibold border border-primary-200">
                      Press Play to begin
                    </span>
                  </div>
                )}
                <div className="flex justify-center items-center gap-6">
                  <button
                    onClick={handleCalibrationDecrease}
                    disabled={calibrationDb <= HW_MIN_DB}
                    className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center transition-all duration-200 ${
                      calibrationDb <= HW_MIN_DB
                        ? 'bg-clinical-200 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700 active:scale-95 shadow-md'
                    }`}
                  >
                    <Minus className="w-8 h-8 text-white" />
                    <span className="text-white text-xs font-semibold mt-0.5">Softer</span>
                  </button>

                  <button
                    onClick={() => toggleCalibrationTone(currentEar)}
                    aria-label={calibrationPlaying ? 'Pause tone' : 'Play tone'}
                    className={`w-24 h-24 rounded-xl flex flex-col items-center justify-center transition-all duration-200 shadow-lg ${
                      calibrationPlaying
                        ? 'bg-primary-700 ring-4 ring-primary-300'
                        : 'bg-primary-600 hover:bg-primary-700 active:scale-95'
                    }`}
                  >
                    {calibrationPlaying ? (
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
                    disabled={calibrationDb >= HW_MAX_DB}
                    className={`w-20 h-20 rounded-xl flex flex-col items-center justify-center transition-all duration-200 ${
                      calibrationDb >= HW_MAX_DB
                        ? 'bg-clinical-200 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-700 active:scale-95 shadow-md'
                    }`}
                  >
                    <Plus className="w-8 h-8 text-white" />
                    <span className="text-white text-xs font-semibold mt-0.5">Louder</span>
                  </button>
                </div>

                {/* Level indicator */}
                <div className="text-center mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-32 bg-clinical-200 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full transition-all duration-200" style={{ width: `${Math.max(5, ((calibrationDb - (-10)) / (80 - (-10))) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-clinical-400 w-16">{calibrationDb <= 10 ? 'Very Soft' : calibrationDb <= 30 ? 'Soft' : calibrationDb <= 50 ? 'Medium' : 'Loud'}</span>
                  </div>
                </div>
              </div>

              {showMaxVolumeWarning && (
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-full text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-semibold">Maximum safe volume reached</span>
                  </div>
                </div>
              )}

              <button onClick={completeCalibrationStep} className="w-full btn-primary py-4">
                {calibrationStep === 'left-ear' ? 'Next — Calibrate Right Ear' : 'Complete Calibration'}
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (calibrationStep === 'complete') {
      return (
        <div className="min-h-screen py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <StepStepper />
            <div className="glass p-6 sm:p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-4">
                  Calibration Complete
                </h2>
                <p className="text-clinical-600">
                  Your volume levels are locked in. We're ready to test your hearing.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-clinical-50 rounded-lg p-5 border border-clinical-200 text-center">
                  <h4 className="font-bold text-clinical-900 mb-2">Left Ear</h4>
                  <p className="text-3xl font-bold text-primary-600">{calibrationBaseline.left} <span className="text-base font-medium text-clinical-500">dB HL</span></p>
                  <p className="text-xs text-clinical-500 mt-1">Barely audible threshold</p>
                </div>
                <div className="bg-clinical-50 rounded-lg p-5 border border-clinical-200 text-center">
                  <h4 className="font-bold text-clinical-900 mb-2">Right Ear</h4>
                  <p className="text-3xl font-bold text-primary-600">{calibrationBaseline.right} <span className="text-base font-medium text-clinical-500">dB HL</span></p>
                  <p className="text-xs text-clinical-500 mt-1">Barely audible threshold</p>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Do not change your system volume</strong> during the test. This would affect the accuracy of your results.
                </p>
              </div>

              <button onClick={startActualTest} className="w-full btn-primary py-4 text-lg">
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
          <h2 className="text-2xl font-bold text-clinical-900 mb-2">Getting Ready</h2>
          <p className="text-clinical-600">Preparing your hearing test...</p>
        </div>
      </div>
    )
  }

  if (stage === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-primary-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-clinical-900 mb-2">Analyzing Your Results</h2>
          <p className="text-clinical-600 mb-4">Building your hearing profile...</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN TEST UI
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <StepStepper />

        {/* Milestone Toast */}
        {milestoneToast && (
          <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-50">
            <div className="bg-primary-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center justify-center gap-2 max-w-2xl mx-auto">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold text-center">{milestoneToast}</span>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Frequency {freqIndex + 1} of {TOTAL_FREQ_TESTS}</span>
              <span className="text-clinical-300">|</span>
              <span className="text-primary-600 font-semibold">{currentFreqLabel}</span>
              <span className="text-clinical-300">|</span>
              <span className="text-clinical-500">{currentTestData?.ear === 'left' ? 'Left' : 'Right'} Ear</span>
            </div>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-3.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Transition Overlay */}
        {isTransitioning && (
          <div className="fixed inset-0 bg-primary-600/20 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 shadow-xl flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <p className="text-clinical-900 font-semibold">Threshold recorded</p>
              <p className="text-sm text-clinical-500">Moving to next frequency...</p>
            </div>
          </div>
        )}

        {/* Test Card */}
        <div className="glass p-6 sm:p-8">
          {/* Ear Illustrations */}
          <div className="flex justify-center items-center gap-10 mb-6">
            <div className={`flex flex-col items-center transition-all duration-300 ${currentTestData?.ear === 'left' ? 'opacity-100 scale-110' : 'opacity-25 scale-90'}`}>
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 border-2 ${
                currentTestData?.ear === 'left' && isPulsing
                  ? 'bg-primary-50 border-primary-500 shadow-lg shadow-primary-200'
                  : currentTestData?.ear === 'left'
                  ? 'bg-primary-50 border-primary-300'
                  : 'bg-clinical-50 border-clinical-200'
              }`}>
                <Ear className={`w-8 h-8 ${currentTestData?.ear === 'left' ? (isPulsing ? 'text-primary-600' : 'text-primary-500') : 'text-clinical-400'}`} />
              </div>
              <span className={`text-xs font-semibold ${currentTestData?.ear === 'left' ? 'text-primary-600' : 'text-clinical-400'}`}>
                Left Ear
              </span>
            </div>

            <div className={`flex flex-col items-center transition-all duration-300 ${currentTestData?.ear === 'right' ? 'opacity-100 scale-110' : 'opacity-25 scale-90'}`}>
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 border-2 ${
                currentTestData?.ear === 'right' && isPulsing
                  ? 'bg-primary-50 border-primary-500 shadow-lg shadow-primary-200'
                  : currentTestData?.ear === 'right'
                  ? 'bg-primary-50 border-primary-300'
                  : 'bg-clinical-50 border-clinical-200'
              }`}>
                <Ear className={`w-8 h-8 scale-x-[-1] ${currentTestData?.ear === 'right' ? (isPulsing ? 'text-primary-600' : 'text-primary-500') : 'text-clinical-400'}`} />
              </div>
              <span className={`text-xs font-semibold ${currentTestData?.ear === 'right' ? 'text-primary-600' : 'text-clinical-400'}`}>
                Right Ear
              </span>
            </div>
          </div>

          {/* Title + instructions */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-2">
                {awaitingResponse ? 'Did You Hear That?' : isPlaying ? 'Listening...' : 'Ready When You Are'}
            </h2>
            <p className="text-clinical-600">
              {awaitingResponse
                ? 'We just played a sound. Did you hear anything?'
                : isPlaying
                ? 'A tone is playing now — listen carefully...'
                : 'Tap Play to hear the next tone'}
            </p>
          </div>

          {/* Play Button */}
          {!awaitingResponse && (
            <div className="flex justify-center mb-8">
              <button
                onClick={handlePresent}
                disabled={isPlaying}
                aria-label="Play tone"
                className={`w-28 h-28 rounded-xl flex flex-col items-center justify-center transition-all duration-200 shadow-lg ${
                  isPlaying
                    ? 'bg-primary-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 active:scale-95'
                } ${isPulsing ? 'ring-4 ring-primary-300 animate-pulse' : ''} ${(!isPlaying && !awaitingResponse) ? 'ring-4 ring-primary-200' : ''}`}
              >
                {isPlaying ? (
                  <>
                    <Volume2 className="w-12 h-12 text-white animate-pulse" />
                    <span className="text-white text-xs font-bold mt-1">PLAYING</span>
                  </>
                ) : (
                  <>
                    <Play className="w-12 h-12 text-white" />
                    <span className="text-white text-xs font-bold mt-1">PLAY</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Response Buttons */}
          {awaitingResponse && (
            <div className="flex justify-center gap-6 sm:gap-10 mb-4">
              <button
                onClick={() => handleResponse(true)}
                disabled={hasResponded}
                className={`flex flex-col items-center gap-3 transition-all duration-200 ${
                  hasResponded ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                }`}
              >
                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-4 flex items-center justify-center transition-all duration-200 ${
                  !hasResponded ? 'border-green-400 bg-green-50 hover:border-green-500 hover:bg-green-100 shadow-md' : 'border-clinical-200 bg-clinical-50'
                }`}>
                  <Check className="w-12 h-12 sm:w-14 sm:h-14 text-green-600" />
                </div>
                <span className="font-bold text-base sm:text-lg text-green-700">I Heard It</span>
              </button>

              <button
                onClick={() => handleResponse(false)}
                disabled={hasResponded}
                className={`flex flex-col items-center gap-3 transition-all duration-200 ${
                  hasResponded ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                }`}
              >
                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-4 flex items-center justify-center transition-all duration-200 ${
                  !hasResponded ? 'border-red-400 bg-red-50 hover:border-red-500 hover:bg-red-100 shadow-md' : 'border-clinical-200 bg-clinical-50'
                }`}>
                  <X className="w-12 h-12 sm:w-14 sm:h-14 text-red-600" />
                </div>
                <span className="font-bold text-base sm:text-lg text-red-700">I Didn't</span>
              </button>
            </div>
          )}

          {/* Warning Message */}
          {showWarning && (
            <div className="mb-4 text-center">
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-full text-sm">
                <AlertCircle className="w-4 h-4" />
                <span className="font-semibold">Tap Play first, then tell us what you heard</span>
              </div>
            </div>
          )}

          {/* Inactivity Nudge */}
          {showInactivityNudge && (
            <div className="mb-4 text-center">
              <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 px-4 py-2 rounded-full text-sm">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span className="font-medium">Ready? Tap Play for the next tone</span>
              </div>
            </div>
          )}

        </div>

        <div className="text-center text-sm text-clinical-500 mt-6">
          <p>Make sure your headphones are on correctly and you're in a quiet room</p>
        </div>
      </div>
    </div>
  )
}
