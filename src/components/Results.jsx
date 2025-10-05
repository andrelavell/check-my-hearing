import { CheckCircle, AlertCircle, Download, RotateCcw, Headphones, Award, TrendingDown, TrendingUp, Minus, ExternalLink, Volume2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { appendUtmParams } from '../utils/utm'

export default function Results({ results, userData, onRestart }) {
  const { leftEar, rightEar, leftScore, rightScore, overallScore } = results

  // Prepare data for audiogram
  const frequencies = [250, 500, 1000, 2000, 4000, 8000]
  
  const chartData = frequencies.map(freq => {
    const leftResult = leftEar.find(r => r.frequency === freq)
    const rightResult = rightEar.find(r => r.frequency === freq)
    
    return {
      frequency: freq >= 1000 ? `${freq / 1000}k` : freq,
      left: leftResult?.heard ? 100 : 20,
      right: rightResult?.heard ? 100 : 20,
    }
  })

  // Classify hearing loss by dB HL (Hearing Level)
  const classifyHearingLoss = (dbHL) => {
    if (dbHL <= 25) return { level: 'Normal', color: 'green', range: '0-25 dB HL' }
    if (dbHL <= 40) return { level: 'Mild', color: 'yellow', range: '26-40 dB HL' }
    if (dbHL <= 55) return { level: 'Moderate', color: 'orange', range: '41-55 dB HL' }
    if (dbHL <= 70) return { level: 'Moderately Severe', color: 'red', range: '56-70 dB HL' }
    if (dbHL <= 90) return { level: 'Severe', color: 'red', range: '71-90 dB HL' }
    return { level: 'Profound', color: 'red', range: '91+ dB HL' }
  }

  // Calculate average threshold in dB HL for each ear
  const calculateAverageThreshold = (earResults, earSide) => {
    const thresholds = earResults
      .filter(r => r.thresholdDb !== undefined)
      .map(r => Math.abs(r.thresholdDb)) // Convert to positive dB HL
    
    if (thresholds.length === 0) {
      // Fallback for detection-only tests
      const heardCount = earResults.filter(r => r.heard).length
      const estimatedDb = 25 - (heardCount / earResults.length) * 25
      return Math.round(estimatedDb)
    }
    
    // Calculate average threshold
    const avgThreshold = Math.round(thresholds.reduce((a, b) => a + b, 0) / thresholds.length)
    
    // Adjust based on calibration baseline if available
    if (results.calibrationBaseline && results.calibrationBaseline[earSide]) {
      const baseline = Math.abs(results.calibrationBaseline[earSide])
      // Normalize: if their baseline was higher (worse), adjust results accordingly
      const adjustment = baseline - 40 // 40 dB is our standard reference
      return Math.round(avgThreshold + adjustment)
    }
    
    return avgThreshold
  }

  const leftAvgDb = calculateAverageThreshold(leftEar, 'left')
  const rightAvgDb = calculateAverageThreshold(rightEar, 'right')
  const overallAvgDb = Math.round((leftAvgDb + rightAvgDb) / 2)

  const leftClassification = classifyHearingLoss(leftAvgDb)
  const rightClassification = classifyHearingLoss(rightAvgDb)
  const overallClassification = classifyHearingLoss(overallAvgDb)

  // Determine hearing status
  const getHearingStatus = (score) => {
    if (score >= 90) return { level: 'Excellent', color: 'green', description: 'Your hearing appears to be in excellent condition.' }
    if (score >= 75) return { level: 'Good', color: 'blue', description: 'Your hearing is good, with minor areas to monitor.' }
    if (score >= 60) return { level: 'Fair', color: 'yellow', description: 'Some hearing loss detected.' }
    return { level: 'Needs Attention', color: 'red', description: 'Significant hearing concerns detected.' }
  }

  const status = getHearingStatus(overallScore)

  // Analyze frequency-specific patterns
  const analyzeFrequencyPattern = () => {
    const lowFreq = [250, 500] // Low frequencies
    const midFreq = [1000, 2000] // Mid frequencies  
    const highFreq = [4000, 8000] // High frequencies

    const checkRange = (freqs, ear) => {
      const results = freqs.map(f => ear.find(r => r.frequency === f)?.heard)
      const heardCount = results.filter(Boolean).length
      return heardCount / results.length
    }

    const leftLow = checkRange(lowFreq, leftEar)
    const leftMid = checkRange(midFreq, leftEar)
    const leftHigh = checkRange(highFreq, leftEar)
    const rightLow = checkRange(lowFreq, rightEar)
    const rightMid = checkRange(midFreq, rightEar)
    const rightHigh = checkRange(highFreq, rightEar)

    const patterns = []
    
    if ((leftHigh < 0.5 || rightHigh < 0.5) && (leftLow > 0.8 && rightLow > 0.8)) {
      patterns.push('High-frequency hearing loss detected (common with age-related hearing loss)')
    }
    if ((leftLow < 0.5 || rightLow < 0.5) && (leftHigh > 0.8 && rightHigh > 0.8)) {
      patterns.push('Low-frequency hearing loss detected')
    }
    if (Math.abs(leftScore - rightScore) > 20) {
      patterns.push('Asymmetric hearing loss between ears')
    }
    if (leftLow > 0.8 && leftMid > 0.8 && leftHigh > 0.8 && rightLow > 0.8 && rightMid > 0.8 && rightHigh > 0.8) {
      patterns.push('Bilateral normal hearing across all frequencies')
    }

    return patterns
  }

  const frequencyPatterns = analyzeFrequencyPattern()

  // Generate personalized Nova hearing aid recommendation
  const generateNovaRecommendation = () => {
    const reasons = []
    const features = []
    
    // Analyze high-frequency loss (common pattern)
    const highFreq = [4000, 8000]
    const leftHigh = highFreq.map(f => leftEar.find(r => r.frequency === f)?.heard).filter(Boolean).length / highFreq.length
    const rightHigh = highFreq.map(f => rightEar.find(r => r.frequency === f)?.heard).filter(Boolean).length / highFreq.length
    
    if (leftHigh < 0.8 || rightHigh < 0.8) {
      reasons.push('Your assessment shows reduced sensitivity in high frequencies (4-8 kHz), which are critical for understanding speech clarity, especially consonants like "s," "f," and "th."')
      features.push('Restores the high-frequency sounds you\'re missing, so you can hear conversations clearly again')
    }
    
    // Check for mild to moderate hearing loss
    if (overallAvgDb >= 26 && overallAvgDb <= 55) {
      reasons.push(`Your average hearing threshold of ${overallAvgDb} dB HL indicates ${overallClassification.level.toLowerCase()} hearing loss, which can benefit significantly from amplification.`)
      features.push('Calibrated specifically for your level of hearing loss to give you the exact amplification you need')
    }
    
    // Check for asymmetric hearing
    if (Math.abs(leftScore - rightScore) > 15) {
      reasons.push('Your results show different hearing levels between ears, requiring independent adjustment for optimal balance.')
      features.push('Adjusts independently for each of your ears since they have different hearing levels')
    }
    
    // Check mid-frequency issues (speech range)
    const midFreq = [1000, 2000]
    const leftMid = midFreq.map(f => leftEar.find(r => r.frequency === f)?.heard).filter(Boolean).length / midFreq.length
    const rightMid = midFreq.map(f => rightEar.find(r => r.frequency === f)?.heard).filter(Boolean).length / midFreq.length
    
    if (leftMid < 0.9 || rightMid < 0.9) {
      reasons.push('Your mid-frequency response (1-2 kHz) shows areas for improvement. This range is essential for understanding vowel sounds and overall speech intelligibility.')
      features.push('Targets the exact frequency ranges where your hearing needs the most help')
    }
    
    // Default recommendations if hearing is good
    if (overallScore >= 90) {
      reasons.push('While your hearing is currently in excellent condition, the Nova can help you maintain clarity in challenging listening environments.')
      features.push('Helps you hear clearly even in noisy restaurants, meetings, and crowded spaces')
    } else if (overallScore >= 75) {
      reasons.push('Your hearing assessment indicates early changes that could benefit from assistive technology to prevent communication difficulties.')
      features.push('Automatically adjusts as you move between quiet and noisy environments throughout your day')
    }
    
    // Universal features
    features.push('Rechargeable battery system - no need to constantly buy and replace tiny batteries')
    features.push('Discreet, comfortable design that fits naturally behind the ear')
    features.push('FDA-registered hearing aid with clinical-grade sound quality')
    
    return { reasons, features }
  }

  const novaRecommendation = generateNovaRecommendation()

  const getColorClasses = (color) => {
    const colors = {
      green: 'bg-green-50 border-green-200 text-green-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      red: 'bg-red-50 border-red-200 text-red-700',
    }
    return colors[color] || colors.blue
  }

  const getIconColorClasses = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="min-h-screen py-8 px-4 relative">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-500 rounded-md flex items-center justify-center">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-clinical-900">CheckMyHearing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-clinical-900 mb-2">
            Hearing Assessment Results
          </h1>
          <p className="text-clinical-600">
            Assessment Date: {new Date(results.timestamp).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </p>
        </div>

        {/* Overall Score */}
        <div className={`rounded-md p-6 sm:p-8 mb-6 border ${getColorClasses(status.color)}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColorClasses(status.color)}`}>
              {status.color === 'green' || status.color === 'blue' ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">
                Clinical Assessment: {status.level}
              </h2>
              <p className="text-lg mb-4">{status.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-3xl font-bold">{overallScore}%</div>
                  <div className="text-sm">Detection Rate</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{overallAvgDb}</div>
                  <div className="text-sm">Avg Threshold (dB HL)</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-lg font-bold">{overallClassification.level}</div>
                  <div className="text-sm">{overallClassification.range}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Ear Scores */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="glass p-6">
            <h3 className="font-bold text-clinical-900 mb-3">Left Ear (AS)</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-primary-600">{leftScore}%</span>
                  <span className="text-sm text-clinical-600">detection</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded transition-all"
                    style={{ width: `${leftScore}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-clinical-200">
                <div className="text-sm text-clinical-600 mb-1">Average Threshold</div>
                <div className="text-2xl font-bold text-clinical-900">{leftAvgDb} dB HL</div>
                <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  leftClassification.color === 'green' ? 'bg-green-100 text-green-700' :
                  leftClassification.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                  leftClassification.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {leftClassification.level}
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-6">
            <h3 className="font-bold text-clinical-900 mb-3">Right Ear (AD)</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-primary-600">{rightScore}%</span>
                  <span className="text-sm text-clinical-600">detection</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded transition-all"
                    style={{ width: `${rightScore}%` }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-clinical-200">
                <div className="text-sm text-clinical-600 mb-1">Average Threshold</div>
                <div className="text-2xl font-bold text-clinical-900">{rightAvgDb} dB HL</div>
                <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  rightClassification.color === 'green' ? 'bg-green-100 text-green-700' :
                  rightClassification.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                  rightClassification.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {rightClassification.level}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audiogram */}
        <div className="glass p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-clinical-900 mb-2">Audiometric Frequency Response</h3>
              <p className="text-clinical-600 text-sm">
                Frequency-specific hearing threshold responses by ear (Hz).
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-clinical-100 px-2.5 py-1 rounded text-xs font-semibold text-clinical-700 border border-clinical-200">
              <Award className="w-3 h-3" />
              Clinical Chart
            </div>
          </div>
          
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="frequency" 
                  label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -5, style: { fontSize: '12px', fill: '#6b7280' } }}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis 
                  label={{ value: 'Response Level (0–100)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#6b7280' } }}
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="left" 
                  stroke="#005A8E" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Left Ear"
                  dot={{ fill: '#005A8E', r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="right" 
                  stroke="#53afcb" 
                  strokeWidth={2}
                  name="Right Ear"
                  dot={{ fill: '#53afcb', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frequency Pattern Analysis */}
        {frequencyPatterns.length > 0 && (
          <div className="glass p-6 mb-6">
            <h3 className="text-xl font-bold text-clinical-900 mb-4">Clinical Findings</h3>
            <ul className="space-y-2">
              {frequencyPatterns.map((pattern, idx) => (
                <li key={idx} className="flex items-start gap-3 text-clinical-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-2 flex-shrink-0"></div>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed Breakdown */}
        <div className="glass p-6 mb-6">
          <h3 className="text-xl font-bold text-clinical-900 mb-4">Frequency-Specific Thresholds</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold text-gray-900">Frequency</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-900">Range</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">Left Ear (AS)</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">Right Ear (AD)</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">Test Type</th>
                </tr>
              </thead>
              <tbody>
                {frequencies.map((freq) => {
                  const leftResult = leftEar.find(r => r.frequency === freq)
                  const rightResult = rightEar.find(r => r.frequency === freq)
                  
                  const getFreqRange = (f) => {
                    if (f <= 500) return 'Low'
                    if (f <= 2000) return 'Mid'
                    return 'High'
                  }

                  const renderThreshold = (result) => {
                    if (!result) return <span className="text-gray-400">—</span>
                    
                    if (result.thresholdDb !== undefined) {
                      const dbHL = Math.abs(result.thresholdDb)
                      const classification = classifyHearingLoss(dbHL)
                      return (
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-clinical-900">{dbHL} dB HL</span>
                          <span className={`text-xs ${
                            classification.color === 'green' ? 'text-green-600' :
                            classification.color === 'yellow' ? 'text-yellow-600' :
                            classification.color === 'orange' ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {classification.level}
                          </span>
                        </div>
                      )
                    }
                    
                    return result.heard ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" /> Detected
                      </span>
                    ) : (
                      <span className="text-red-600">Not detected</span>
                    )
                  }
                  
                  return (
                    <tr key={freq} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-semibold text-gray-900">
                        {freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {getFreqRange(freq)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {renderThreshold(leftResult)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {renderThreshold(rightResult)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-block px-2 py-1 rounded text-xs bg-clinical-100 text-clinical-700">
                          {leftResult?.testType === 'adjustment' ? 'Adjustment' : 'Detection'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-3 bg-clinical-50 rounded border border-clinical-200">
            <p className="text-xs text-clinical-600">
              <strong>Legend:</strong> dB HL = Decibels Hearing Level | AS = Auris Sinistra (Left Ear) | AD = Auris Dextra (Right Ear) | 
              Normal: 0-25 dB HL | Mild: 26-40 dB HL | Moderate: 41-55 dB HL | Moderately Severe: 56-70 dB HL
            </p>
          </div>
        </div>

        {/* Nova Hearing Aid Recommendation */}
        <div className="glass p-6 sm:p-8 mb-6 border-2 border-primary-500 sm:border-primary-200 shadow-lg sm:shadow-none">
          <div className="flex items-start gap-4 mb-6">
            <div className="hidden sm:flex w-14 h-14 bg-primary-600 rounded-lg items-center justify-center flex-shrink-0">
              <Volume2 className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-clinical-900 mb-2">Recommended Solution: Nova Hearing Aid</h3>
              <p className="text-clinical-600">
                Based on your specific hearing profile, we recommend the{' '}
                <a 
                  href={appendUtmParams("https://heardirectclub.com/products/nova")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 underline font-semibold"
                >
                  Nova hearing aid system
                </a>.
              </p>
            </div>
          </div>

          {/* Why Nova is Recommended for Your Profile */}
          <div className="mb-6">
            <h4 className="font-bold text-clinical-900 mb-3 text-lg">Why Nova Matches Your Hearing Profile:</h4>
            <div className="space-y-3">
              {novaRecommendation.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-primary-50 p-4 rounded-lg border border-primary-100">
                  <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <p className="text-clinical-700">{reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Nova Features That Address Your Needs */}
          <div className="mb-6">
            <h4 className="font-bold text-clinical-900 mb-3 text-lg">How Nova Can Help You:</h4>
            <ul className="space-y-2">
              {novaRecommendation.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-clinical-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-2 flex-shrink-0"></div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Button */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-xl mb-1">Ready to Hear Better?</h4>
                <p className="text-primary-100 text-sm">Explore the Nova hearing aid designed for your hearing needs.</p>
              </div>
              <a
                href={appendUtmParams("https://heardirectclub.com/products/nova")}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-primary-600 hover:bg-primary-50 font-bold px-6 py-3 rounded-lg transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
              >
                Learn More About Nova
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Test Methodology */}
        <div className="glass p-6 mb-6">
          <h3 className="text-xl font-bold text-clinical-900 mb-4">Assessment Methodology</h3>
          <div className="space-y-3 text-sm text-clinical-700">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-clinical-900">Pure-Tone Audiometry (PTA)</div>
                <div>Standard clinical protocol testing 6 frequencies per ear (250 Hz - 8 kHz)</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-clinical-900">Individualized Calibration</div>
                <div>Per-ear baseline calibration to account for device and headphone variations</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-clinical-900">Mixed Methodology</div>
                <div>Combination of detection tests (yes/no response) and threshold adjustment tests (method of limits)</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-clinical-900">Monaural Presentation</div>
                <div>Each ear tested independently with stereo panning for accurate lateralization</div>
              </div>
            </div>
          </div>
          {results.calibrationBaseline && results.calibrationBaseline.left && results.calibrationBaseline.right && (
            <div className="mt-4 p-3 bg-primary-50 rounded border border-primary-200">
              <p className="text-xs text-primary-800">
                <strong>Your Calibration:</strong> Left ear baseline: {Math.abs(results.calibrationBaseline.left)} dB | 
                Right ear baseline: {Math.abs(results.calibrationBaseline.right)} dB. 
                Results are normalized to your individual hearing threshold.
              </p>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 rounded-md p-4 mb-6 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Medical Disclaimer:</strong> This online assessment is a screening tool only and does not replace 
            professional audiological evaluation. Results are estimates based on self-administered testing in uncontrolled 
            acoustic environments. For clinical diagnosis, treatment recommendations, and hearing aid fitting, consult a 
            licensed audiologist or hearing healthcare professional.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onRestart}
            className="flex-1 btn-secondary py-4"
          >
            <RotateCcw className="w-5 h-5" />
            Take Test Again
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 btn-primary py-4"
          >
            <Download className="w-5 h-5" />
            Save Results
          </button>
        </div>
      </div>
    </div>
  )
}
