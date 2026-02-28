import { CheckCircle, AlertCircle, Download, RotateCcw, Headphones, Award, ExternalLink, Volume2, ShieldCheck, AlertTriangle, Activity, Ear, BarChart3, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts'
import { appendUtmParams } from '../utils/utm'

export default function Results({ results, userData, userEmail, onRestart }) {
  const { leftEar, rightEar, calibrationBaseline, catchTrials, falsePositiveRate, reliable } = results

  // ─── Data extraction ─────────────────────────────────────────────────────
  // Each ear item now has: { frequency, ear, thresholdDbHL, presentations, history }
  const TEST_FREQUENCIES = [500, 1000, 2000, 4000, 8000]

  const getThreshold = (ear, freq) => {
    const r = ear.find(x => x.frequency === freq)
    return r ? r.thresholdDbHL : null
  }

  // Pure-Tone Average (PTA) — clinical standard uses 500, 1000, 2000 Hz
  const calcPTA = (ear) => {
    const ptaFreqs = [500, 1000, 2000]
    const vals = ptaFreqs.map(f => getThreshold(ear, f)).filter(v => v !== null)
    if (vals.length === 0) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }

  // High-frequency PTA (4000, 8000)
  const calcHFPTA = (ear) => {
    const vals = [4000, 8000].map(f => getThreshold(ear, f)).filter(v => v !== null)
    if (vals.length === 0) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }

  const leftPTA = calcPTA(leftEar)
  const rightPTA = calcPTA(rightEar)
  const overallPTA = leftPTA !== null && rightPTA !== null ? Math.round((leftPTA + rightPTA) / 2) : (leftPTA || rightPTA || 0)

  const leftHFPTA = calcHFPTA(leftEar)
  const rightHFPTA = calcHFPTA(rightEar)

  // Classify hearing loss by dB HL (WHO grades)
  const classifyHearingLoss = (dbHL) => {
    if (dbHL === null) return { level: 'N/A', color: 'gray', range: '—' }
    if (dbHL <= 25) return { level: 'Normal', color: 'green', range: '0-25 dB HL' }
    if (dbHL <= 40) return { level: 'Mild', color: 'yellow', range: '26-40 dB HL' }
    if (dbHL <= 55) return { level: 'Moderate', color: 'orange', range: '41-55 dB HL' }
    if (dbHL <= 70) return { level: 'Moderately Severe', color: 'red', range: '56-70 dB HL' }
    if (dbHL <= 90) return { level: 'Severe', color: 'red', range: '71-90 dB HL' }
    return { level: 'Profound', color: 'red', range: '91+ dB HL' }
  }

  const leftClassification = classifyHearingLoss(leftPTA)
  const rightClassification = classifyHearingLoss(rightPTA)
  const overallClassification = classifyHearingLoss(overallPTA)

  // Worst threshold across all frequencies
  const allThresholds = [...leftEar, ...rightEar].map(r => r.thresholdDbHL).filter(v => v !== null)
  const worstThreshold = allThresholds.length > 0 ? Math.max(...allThresholds) : 0

  // High-frequency concern
  const highFreqConcern = [leftHFPTA, rightHFPTA].some(v => v !== null && v > 25)

  // Asymmetry
  const asymmetry = leftPTA !== null && rightPTA !== null ? Math.abs(leftPTA - rightPTA) : 0

  // Overall status
  const getStatus = () => {
    if (worstThreshold > 55) return { level: 'Needs Attention', color: 'red', description: 'Significant hearing loss detected. Professional evaluation recommended.' }
    if (worstThreshold > 40) return { level: 'Fair', color: 'yellow', description: 'Moderate hearing loss detected in some frequencies.' }
    if (worstThreshold > 25) return { level: 'Mild Loss', color: 'yellow', description: 'Mild hearing loss detected. Monitor and consider evaluation.' }
    if (highFreqConcern) return { level: 'Good (HF concern)', color: 'blue', description: 'Hearing is mostly normal, but some high-frequency changes detected.' }
    return { level: 'Excellent', color: 'green', description: 'Your hearing thresholds are within the normal range across all tested frequencies.' }
  }
  const status = getStatus()

  // ─── Audiogram chart data ────────────────────────────────────────────────
  // Clinical audiogram: X = frequency (log scale), Y = dB HL (inverted: 0 at top, higher = worse)
  const chartData = TEST_FREQUENCIES.map(freq => ({
    frequency: freq >= 1000 ? `${freq / 1000}k` : `${freq}`,
    freqHz: freq,
    left: getThreshold(leftEar, freq),
    right: getThreshold(rightEar, freq),
  }))

  // ─── Pattern analysis (threshold-based) ──────────────────────────────────
  const analyzePatterns = () => {
    const patterns = []

    // High-frequency loss (sloping audiogram)
    const leftLowAvg = calcAvg(leftEar, [500, 1000])
    const leftHighAvg = calcAvg(leftEar, [4000, 8000])
    const rightLowAvg = calcAvg(rightEar, [500, 1000])
    const rightHighAvg = calcAvg(rightEar, [4000, 8000])

    if ((leftHighAvg !== null && leftLowAvg !== null && leftHighAvg - leftLowAvg > 15) ||
        (rightHighAvg !== null && rightLowAvg !== null && rightHighAvg - rightLowAvg > 15)) {
      patterns.push('Sloping high-frequency hearing loss detected — common with noise exposure or age-related changes (presbycusis)')
    }

    if ((leftLowAvg !== null && leftHighAvg !== null && leftLowAvg - leftHighAvg > 15) ||
        (rightLowAvg !== null && rightHighAvg !== null && rightLowAvg - rightHighAvg > 15)) {
      patterns.push('Low-frequency hearing loss detected — less common pattern, may warrant medical evaluation')
    }

    if (asymmetry > 15) {
      patterns.push(`Asymmetric hearing detected (${asymmetry} dB difference between ears) — asymmetries over 15 dB should be evaluated`)
    }

    // 4 kHz notch (noise-induced)
    const check4kNotch = (ear) => {
      const t2k = getThreshold(ear, 2000)
      const t4k = getThreshold(ear, 4000)
      const t8k = getThreshold(ear, 8000)
      if (t2k !== null && t4k !== null && t8k !== null) {
        return t4k > t2k + 10 && t4k > t8k + 10
      }
      return false
    }
    if (check4kNotch(leftEar) || check4kNotch(rightEar)) {
      patterns.push('4 kHz notch detected — characteristic of noise-induced hearing loss')
    }

    if (overallPTA <= 25 && !highFreqConcern && asymmetry <= 10) {
      patterns.push('Bilateral normal hearing across all tested frequencies')
    }

    return patterns
  }

  const calcAvg = (ear, freqs) => {
    const vals = freqs.map(f => getThreshold(ear, f)).filter(v => v !== null)
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }

  const frequencyPatterns = analyzePatterns()

  // ─── Nova recommendation (uses real threshold data) ──────────────────────
  const generateNovaRecommendation = () => {
    const reasons = []
    const features = []

    if (highFreqConcern) {
      const worst = Math.max(leftHFPTA || 0, rightHFPTA || 0)
      reasons.push(`Your high-frequency thresholds average ${worst} dB HL, which affects speech clarity — especially consonants like "s," "f," and "th."`)
      features.push('Restores high-frequency sounds critical for speech understanding')
    }

    if (overallPTA >= 26 && overallPTA <= 55) {
      reasons.push(`Your PTA of ${overallPTA} dB HL indicates ${overallClassification.level.toLowerCase()} hearing loss, which benefits significantly from amplification.`)
      features.push('Calibrated for your exact level of hearing loss')
    }

    if (asymmetry > 10) {
      reasons.push(`Your ears differ by ${asymmetry} dB, requiring independent adjustment for optimal balance.`)
      features.push('Independent ear-by-ear tuning for balanced hearing')
    }

    if (overallPTA <= 25 && !highFreqConcern) {
      reasons.push('Your hearing is currently normal. The Nova can still help in challenging listening environments like restaurants or meetings.')
      features.push('Enhanced clarity in noisy environments')
    }

    features.push('Rechargeable battery — no tiny batteries to replace')
    features.push('Discreet, comfortable behind-the-ear design')
    features.push('FDA-registered with clinical-grade sound processing')

    return { reasons, features }
  }

  const novaRecommendation = generateNovaRecommendation()

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const getColorClasses = (color) => ({
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }[color] || 'bg-blue-50 border-blue-200 text-blue-700')

  const getIconColorClasses = (color) => ({
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
  }[color] || 'bg-blue-100 text-blue-600')

  const classificationBadge = (cls) => {
    const bg = {
      green: 'bg-green-100 text-green-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      orange: 'bg-orange-100 text-orange-700',
      red: 'bg-red-100 text-red-700',
      gray: 'bg-gray-100 text-gray-500',
    }[cls.color] || 'bg-gray-100 text-gray-500'
    return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${bg}`}>{cls.level}</span>
  }

  // Custom audiogram tooltip
  const AudiogramTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
        <p className="font-bold text-clinical-900 mb-1">{label} Hz</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.value !== null ? `${entry.value} dB HL` : 'N/A'}
            {entry.value !== null && (
              <span className="text-gray-500 ml-1">({classifyHearingLoss(entry.value).level})</span>
            )}
          </p>
        ))}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen py-8 px-4 relative">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-md">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-clinical-900">CheckMyHearing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-clinical-900 mb-2">
            Your Hearing Results
          </h1>
          <p className="text-clinical-600">
            {new Date(results.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Reliability badge */}
        {catchTrials && catchTrials.total > 0 && (
          <div className={`rounded-lg p-4 mb-4 border flex items-start gap-3 ${
            reliable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            {reliable ? <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
            <div>
              <div className={`font-semibold ${reliable ? 'text-green-800' : 'text-red-800'}`}>
                Test Reliability: {Math.round((1 - falsePositiveRate) * 100)}%
              </div>
              <div className={`text-sm ${reliable ? 'text-green-700' : 'text-red-700'}`}>
                {reliable
                  ? `${catchTrials.total} catch trials completed with ${catchTrials.falsePositives} false positive${catchTrials.falsePositives !== 1 ? 's' : ''} — results are reliable.`
                  : `High false-positive rate detected. Results may be less accurate. Consider retaking the test in a quieter environment.`
                }
              </div>
            </div>
          </div>
        )}

        {/* High-frequency alert */}
        {highFreqConcern && (
          <div className="rounded-lg p-4 mb-4 border bg-yellow-50 border-yellow-200 text-yellow-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">High-frequency hearing changes detected</div>
              <div className="text-sm">Sounds like birds and consonants (s, f, th) may be harder to hear.</div>
            </div>
          </div>
        )}

        {/* Overall Status */}
        <div className={`rounded-lg p-6 sm:p-8 mb-6 border ${getColorClasses(status.color)}`}>
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconColorClasses(status.color)}`}>
              {status.color === 'green' || status.color === 'blue' ? (
                <CheckCircle className="w-7 h-7" />
              ) : (
                <AlertCircle className="w-7 h-7" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">Assessment: {status.level}</h2>
              <p className="text-base mb-4">{status.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-3xl font-bold">{overallPTA}</div>
                  <div className="text-sm">PTA (dB HL)</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{overallClassification.level}</div>
                  <div className="text-sm">{overallClassification.range}</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-lg font-bold">{allThresholds.length}</div>
                  <div className="text-sm">Frequencies Tested</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Ear Cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Left Ear', ear: leftEar, pta: leftPTA, cls: leftClassification, hfpta: leftHFPTA },
            { label: 'Right Ear', ear: rightEar, pta: rightPTA, cls: rightClassification, hfpta: rightHFPTA },
          ].map(({ label, pta, cls, hfpta }) => (
            <div key={label} className="glass p-6">
              <h3 className="font-bold text-clinical-900 mb-3">{label}</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-clinical-600 mb-1">Pure-Tone Average (500-2k Hz)</div>
                  <div className="text-3xl font-bold text-primary-600">{pta !== null ? `${pta}` : '—'} <span className="text-base font-medium text-clinical-500">dB HL</span></div>
                  <div className="mt-2">{classificationBadge(cls)}</div>
                </div>
                {hfpta !== null && (
                  <div className="pt-2 border-t border-clinical-200">
                    <div className="text-sm text-clinical-600 mb-1">High-Frequency Average (4-8k Hz)</div>
                    <div className="text-xl font-bold text-clinical-900">{hfpta} <span className="text-sm font-medium text-clinical-500">dB HL</span></div>
                    <div className="mt-1">{classificationBadge(classifyHearingLoss(hfpta))}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Audiogram — Clinical Standard */}
        <div className="glass p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-clinical-900 mb-1">Audiogram</h3>
              <p className="text-clinical-600 text-sm">
                Hearing thresholds in dB HL — lower is better. Shaded area = normal hearing (0-25 dB HL).
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-clinical-100 px-2.5 py-1 rounded text-xs font-semibold text-clinical-700 border border-clinical-200">
              <Award className="w-3 h-3" />
              Clinical Audiogram
            </div>
          </div>

          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <ReferenceArea y1={-10} y2={25} fill="#dcfce7" fillOpacity={0.5} />
                <ReferenceLine y={25} stroke="#86efac" strokeDasharray="4 4" label={{ value: '25 dB (Normal limit)', position: 'right', fontSize: 10, fill: '#16a34a' }} />
                <XAxis
                  dataKey="frequency"
                  label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -10, style: { fontSize: '12px', fill: '#6b7280' } }}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis
                  reversed
                  domain={[-10, 90]}
                  ticks={[-10, 0, 10, 20, 25, 30, 40, 50, 60, 70, 80, 90]}
                  label={{ value: 'Hearing Level (dB HL)', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: '12px', fill: '#6b7280' } }}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                />
                <Tooltip content={<AudiogramTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="left"
                  stroke="#005A8E"
                  strokeWidth={2.5}
                  name="Left Ear (X)"
                  dot={{ fill: '#005A8E', r: 6, strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="right"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  name="Right Ear (O)"
                  dot={{ fill: '#dc2626', r: 6, strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-clinical-500 text-center">
            Convention: Left ear = X (blue) | Right ear = O (red) | Lower dB HL = better hearing
          </div>
        </div>

        {/* Clinical Findings */}
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

        {/* Frequency-Specific Threshold Table */}
        <div className="glass p-6 mb-6">
          <h3 className="text-xl font-bold text-clinical-900 mb-4">Frequency-Specific Thresholds</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-2 font-semibold text-gray-900">Frequency</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-900">Range</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">Left Ear</th>
                  <th className="text-center py-3 px-2 font-semibold text-gray-900">Right Ear</th>
                </tr>
              </thead>
              <tbody>
                {TEST_FREQUENCIES.map((freq) => {
                  const leftResult = leftEar.find(r => r.frequency === freq)
                  const rightResult = rightEar.find(r => r.frequency === freq)
                  const getFreqRange = (f) => f <= 500 ? 'Low' : f <= 2000 ? 'Mid' : 'High'

                  const renderThreshold = (result) => {
                    if (!result) return <span className="text-gray-400">—</span>
                    const dbHL = result.thresholdDbHL
                    const cls = classifyHearingLoss(dbHL)
                    return (
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-clinical-900">{dbHL} dB HL</span>
                        <span className={`text-xs ${
                          cls.color === 'green' ? 'text-green-600' :
                          cls.color === 'yellow' ? 'text-yellow-600' :
                          cls.color === 'orange' ? 'text-orange-600' :
                          'text-red-600'
                        }`}>{cls.level}</span>
                        <span className="text-[10px] text-clinical-400">{result.presentations} presentations</span>
                      </div>
                    )
                  }

                  return (
                    <tr key={freq} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 font-semibold text-gray-900">
                        {freq >= 1000 ? `${freq / 1000} kHz` : `${freq} Hz`}
                      </td>
                      <td className="py-3 px-2 text-gray-600">{getFreqRange(freq)}</td>
                      <td className="py-3 px-2 text-center">{renderThreshold(leftResult)}</td>
                      <td className="py-3 px-2 text-center">{renderThreshold(rightResult)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-clinical-50 rounded-lg border border-clinical-200">
            <p className="text-xs text-clinical-600">
              <strong>How to read:</strong> dB HL = how loud a sound needs to be for you to hear it (lower is better). 
              Normal: 0-25 | Mild loss: 26-40 | Moderate: 41-55 | Moderately Severe: 56-70 | Severe: 71-90
            </p>
          </div>
        </div>

        {/* Nova Recommendation */}
        <div className="glass p-6 sm:p-8 mb-6 border-2 border-primary-200 shadow-lg">
          <div className="flex items-start gap-4 mb-6">
            <div className="hidden sm:flex w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl items-center justify-center flex-shrink-0 shadow-md">
              <Ear className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-clinical-900 mb-2">Recommended: Nova Hearing Aid</h3>
              <p className="text-clinical-600">
                Based on your audiometric profile, we recommend the{' '}
                <a href={appendUtmParams("https://heardirectclub.com/products/nova")} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline font-semibold">
                  Nova hearing aid system
                </a>.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-bold text-clinical-900 mb-3 text-lg">Why Nova Matches Your Profile:</h4>
            <div className="space-y-3">
              {novaRecommendation.reasons.map((reason, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-primary-50 p-4 rounded-lg border border-primary-100">
                  <CheckCircle className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <p className="text-clinical-700">{reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-bold text-clinical-900 mb-3 text-lg">How Nova Can Help:</h4>
            <ul className="space-y-2">
              {novaRecommendation.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-clinical-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-600 mt-2 flex-shrink-0"></div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-xl mb-1">Ready to Hear Better?</h4>
                <p className="text-primary-100 text-sm">Explore the Nova hearing aid for your needs.</p>
              </div>
              <a
                href={appendUtmParams("https://heardirectclub.com/products/nova")}
                target="_blank" rel="noopener noreferrer"
                className="bg-white text-primary-600 hover:bg-primary-50 font-bold px-6 py-3 rounded-lg transition-colors duration-200 flex items-center gap-2 whitespace-nowrap shadow-md"
              >
                Learn More About Nova
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Methodology */}
        <div className="glass p-6 mb-6">
          <h3 className="text-xl font-bold text-clinical-900 mb-4">Assessment Methodology</h3>
          <div className="space-y-3 text-sm text-clinical-700">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-clinical-900">Clinical-Grade Method</div>
                <div>Uses the same adaptive approach audiologists rely on — tones get quieter when you hear them and louder when you don't, to find your exact threshold.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Volume2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-clinical-900">Precision Tone Delivery</div>
                <div>Short pulsed tones with smooth fade-in/out for clean, accurate sound presentation.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-clinical-900">Built-in Reliability Checks</div>
                <div>Silent "catch" tones are mixed in to verify you're responding accurately, not guessing.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Headphones className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-clinical-900">Personalized Calibration</div>
                <div>Each ear is individually calibrated before the test to account for your device and headphones.</div>
              </div>
            </div>
          </div>
          {calibrationBaseline && calibrationBaseline.left !== null && calibrationBaseline.right !== null && (
            <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-xs text-primary-800">
                <strong>Your Calibration:</strong> Left ear: {calibrationBaseline.left} dB HL |
                Right ear: {calibrationBaseline.right} dB HL
              </p>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Medical Disclaimer:</strong> This online assessment is a screening tool only. Results are estimates
            from self-administered testing in uncontrolled environments. For diagnosis and treatment, consult a
            licensed audiologist.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={onRestart} className="flex-1 btn-secondary py-4">
            <RotateCcw className="w-5 h-5" />
            Take Test Again
          </button>
          <button onClick={() => window.print()} className="flex-1 btn-primary py-4">
            <Download className="w-5 h-5" />
            Save Results
          </button>
        </div>
      </div>
    </div>
  )
}
