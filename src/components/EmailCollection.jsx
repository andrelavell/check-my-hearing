import { useState } from 'react'
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { getUtmParams } from '../utils/utm'

export default function EmailCollection({ onComplete }) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Please enter your email address')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      // Subscribe via serverless function (uses PRIVATE key server-side)
      const response = await fetch('/.netlify/functions/klaviyo-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, utm: getUtmParams() })
      })

      if (response.ok) {
        // Fire Facebook Pixel event for email submission
        if (window.fbq) {
          window.fbq('trackCustom', 'email-submit')
          console.log('FB Pixel event: email-submit')
        }
        onComplete(email)
      } else {
        const text = await response.text()
        console.error('Klaviyo subscribe failed', response.status, text)
        // Proceed anyway to results
        if (window.fbq) {
          window.fbq('trackCustom', 'email-submit')
          console.log('FB Pixel event: email-submit')
        }
        onComplete(email)
      }
    } catch (err) {
      console.error('Error subscribing to Klaviyo:', err)
      // Still proceed to results even if there's an error
      if (window.fbq) {
        window.fbq('trackCustom', 'email-submit')
        console.log('FB Pixel event: email-submit')
      }
      onComplete(email)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-clinical-50">
      <div className="max-w-md w-full glass p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-50 rounded-md flex items-center justify-center mx-auto mb-4 border border-primary-200">
            <CheckCircle2 className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-clinical-900 mb-3">
            We've Finalized Your Results
          </h2>
          <p className="text-clinical-600 text-lg">
            Where should we send your hearing report?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-clinical-900 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-clinical-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 border border-clinical-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-clinical-900"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-4 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                View My Results
              </>
            )}
          </button>

          <p className="text-xs text-clinical-500 text-center">
            We'll send your detailed hearing report to this email. You can also view it on the next screen.
          </p>
        </form>
      </div>
    </div>
  )
}
