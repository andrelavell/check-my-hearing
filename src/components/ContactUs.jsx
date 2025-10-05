import { Headphones, Mail, Phone, MapPin, Clock, Send } from 'lucide-react'
import { useState } from 'react'

export default function ContactUs({ onBack }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // In a real app, this would send to a backend
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white w-full px-6 sm:px-8 lg:px-12 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-md flex items-center justify-center">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-clinical-900">CheckMyHearing</span>
          </div>
          <button
            onClick={onBack}
            className="btn-primary"
          >
            Home
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-clinical-100 py-16 lg:py-20">
        <div className="container-safe">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-clinical-900 mb-6">
              Get In Touch
            </h1>
            <p className="text-xl text-clinical-700">
              Have questions? We're here to help with your hearing health journey.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16 lg:py-20">
        <div className="container-safe">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-clinical-900 mb-6">Send Us a Message</h2>
              <p className="text-clinical-600 mb-8">
                Fill out the form below and we'll get back to you within 24 hours.
              </p>

              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-green-900 mb-2">Message Sent!</h3>
                  <p className="text-green-700">Thank you for contacting us. We'll respond soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-clinical-900 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-clinical-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="John Smith"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-clinical-900 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-clinical-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-clinical-900 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-clinical-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-semibold text-clinical-900 mb-2">
                      Subject *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-clinical-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select a subject</option>
                      <option value="test-question">Question About Test</option>
                      <option value="results">Understanding My Results</option>
                      <option value="technical">Technical Support</option>
                      <option value="partnership">Partnership Inquiry</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-clinical-900 mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      rows="5"
                      className="w-full px-4 py-3 border border-clinical-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      placeholder="How can we help you?"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary text-lg py-4"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-clinical-900 mb-6">Contact Information</h2>
              <p className="text-clinical-600 mb-8">
                Reach out to us through any of these channels. We're available to assist you.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-clinical-900 mb-1">Email</h3>
                    <p className="text-clinical-600">support@hearwell.com</p>
                    <p className="text-clinical-600">info@hearwell.com</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-clinical-900 mb-1">Phone</h3>
                    <p className="text-clinical-600">1-800-HEAR-123</p>
                    <p className="text-clinical-600">(1-800-432-7123)</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-clinical-900 mb-1">Address</h3>
                    <p className="text-clinical-600">
                      123 Health Avenue<br />
                      Suite 400<br />
                      San Francisco, CA 94102
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-clinical-900 mb-1">Business Hours</h3>
                    <p className="text-clinical-600">Monday - Friday: 9:00 AM - 6:00 PM PST</p>
                    <p className="text-clinical-600">Saturday: 10:00 AM - 4:00 PM PST</p>
                    <p className="text-clinical-600">Sunday: Closed</p>
                  </div>
                </div>
              </div>

              {/* FAQ Quick Links */}
              <div className="mt-12 p-6 bg-clinical-50 rounded-lg">
                <h3 className="font-bold text-clinical-900 mb-3">Quick Answers</h3>
                <p className="text-clinical-600 text-sm mb-4">
                  Looking for quick answers? Check out these common questions:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="text-primary-600 hover:text-primary-700 cursor-pointer">
                    • How accurate is the online hearing test?
                  </li>
                  <li className="text-primary-600 hover:text-primary-700 cursor-pointer">
                    • What equipment do I need?
                  </li>
                  <li className="text-primary-600 hover:text-primary-700 cursor-pointer">
                    • How long does the test take?
                  </li>
                  <li className="text-primary-600 hover:text-primary-700 cursor-pointer">
                    • Is my data private and secure?
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-clinical-900 text-white py-8">
        <div className="container-safe">
          <div className="text-center text-clinical-400">
            <p className="mb-2">© 2024 CheckMyHearing. All rights reserved.</p>
            <p className="text-sm">Professional hearing screening for everyone.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
