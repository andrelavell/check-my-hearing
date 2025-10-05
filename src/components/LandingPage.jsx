import { Headphones, Check, ListChecks, Star, Menu, X, Award } from 'lucide-react'
import { useState } from 'react'
import { STATS } from '../constants/stats'

export default function LandingPage({ onStart, onAbout, onContact, onEarlySigns, onScience }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleNavClick = (callback) => {
    setMobileMenuOpen(false)
    callback()
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white w-full px-6 sm:px-8 lg:px-12 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-md flex items-center justify-center">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-clinical-900">CheckMyHearing</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4 sm:gap-6">
            <button
              onClick={onEarlySigns}
              className="text-clinical-700 hover:text-clinical-900 font-medium transition-colors"
            >
              Early Signs
            </button>
            <button
              onClick={onScience}
              className="text-clinical-700 hover:text-clinical-900 font-medium transition-colors"
            >
              Science
            </button>
            <button
              onClick={onAbout}
              className="text-clinical-700 hover:text-clinical-900 font-medium transition-colors"
            >
              About
            </button>
            <button
              onClick={onContact}
              className="text-clinical-700 hover:text-clinical-900 font-medium transition-colors"
            >
              Contact
            </button>
            <button
              onClick={onStart}
              className="btn-primary"
            >
              Begin Assessment
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-clinical-700 hover:text-clinical-900"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleNavClick(onEarlySigns)}
                className="text-left px-4 py-2 text-clinical-700 hover:bg-clinical-50 rounded-md font-medium transition-colors"
              >
                Early Signs
              </button>
              <button
                onClick={() => handleNavClick(onScience)}
                className="text-left px-4 py-2 text-clinical-700 hover:bg-clinical-50 rounded-md font-medium transition-colors"
              >
                Science
              </button>
              <button
                onClick={() => handleNavClick(onAbout)}
                className="text-left px-4 py-2 text-clinical-700 hover:bg-clinical-50 rounded-md font-medium transition-colors"
              >
                About
              </button>
              <button
                onClick={() => handleNavClick(onContact)}
                className="text-left px-4 py-2 text-clinical-700 hover:bg-clinical-50 rounded-md font-medium transition-colors"
              >
                Contact
              </button>
              <button
                onClick={() => handleNavClick(onStart)}
                className="btn-primary mt-2"
              >
                Begin Assessment
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Trust Badge Banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-safe py-3">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-sm sm:text-base">
            <span className="font-semibold text-clinical-900">The Most Trusted Online Test by Audiologists</span>
            <span className="text-clinical-600">•</span>
            <div className="flex items-center gap-1">
              <span className="font-bold text-clinical-900">{STATS.averageRating}/5</span>
              <div className="flex gap-0.5 ml-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'fill-yellow-400 text-yellow-400'}`}
                    style={i === 4 ? { clipPath: 'inset(0 20% 0 0)' } : {}}
                  />
                ))}
              </div>
            </div>
            <span className="text-clinical-600 hidden sm:inline">•</span>
            <span className="text-clinical-600 text-xs sm:text-sm">Clinical-Grade 3-Minute Test</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="w-full">
        <div className="grid lg:grid-cols-2 lg:min-h-[500px]">
          {/* Left Image */}
          <div className="w-full h-[300px] lg:h-full">
            <img 
              src="https://assets-ue.rt.demant.com/-/media/project/retail/shared/images/half-width/lye-24/web2-lye24-leadform-caravan-clinic-man-hearingtest-960.jpg?rev=-1"
              alt="Man taking hearing test"
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Right Content */}
          <div className="bg-primary-50 flex items-center justify-center px-8 sm:px-12 lg:px-16 py-12 lg:py-16 lg:min-h-[500px]">
            <div className="max-w-xl text-center lg:text-left">
              <p className="text-sm font-medium text-primary-700 mb-4">
                Clinical-Grade 3-Minute Test — Used by 500+ Audiologists
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-700 mb-6 leading-tight">
                Free Online Hearing Assessment
              </h1>
              <p className="text-base text-primary-800 mb-8 leading-relaxed">
                Professional audiometric screening is as important as any health check-up. Our validated assessment uses pure-tone audiometry to detect potential hearing loss. Complete in 3 minutes and receive your personal audiogram instantly.
              </p>
              <button
                onClick={onStart}
                className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-full transition-colors duration-200 w-full sm:w-auto"
              >
                Begin Clinical Assessment
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="bg-white border-y border-gray-200 py-8">
        <div className="container-safe">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-primary-500 mb-1">{STATS.accuracyRate}</div>
              <div className="text-sm text-clinical-600">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-primary-500 mb-1">{STATS.testsPerformed}</div>
              <div className="text-sm text-clinical-600">Tests Performed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-primary-500 mb-1">500+</div>
              <div className="text-sm text-clinical-600">Audiologists Recommend</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-primary-500 mb-1">3 Min</div>
              <div className="text-sm text-clinical-600">Average Test Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Take Test Section - Light */}
      <section className="py-16 lg:py-20">
        <div className="container-safe">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-clinical-900 mb-12">
            Clinical Hearing Assessment
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="flex gap-4 glass p-5 card-hover">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-md border-2 border-primary-500 flex items-center justify-center bg-primary-50">
                  <Check className="w-5 h-5 text-primary-500" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-clinical-900">Clinically Validated Protocol</h3>
                <p className="text-clinical-600 text-sm leading-relaxed">
                  Pure-tone audiometry validated on {STATS.validationParticipants} participants with {STATS.accuracyRate} accuracy versus clinical audiometry.
                </p>
              </div>
            </div>

            <div className="flex gap-4 glass p-5 card-hover">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-md border-2 border-primary-500 flex items-center justify-center bg-primary-50">
                  <Check className="w-5 h-5 text-primary-500" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-clinical-900">Comprehensive Frequency Analysis</h3>
                <p className="text-clinical-600 text-sm leading-relaxed">
                  Tests 12 critical frequencies (250Hz–8kHz) essential for speech recognition and daily communication.
                </p>
              </div>
            </div>

            <div className="flex gap-4 glass p-5 card-hover">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-md border-2 border-primary-500 flex items-center justify-center bg-primary-50">
                  <Check className="w-5 h-5 text-primary-500" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-clinical-900">Rapid Clinical Assessment</h3>
                <p className="text-clinical-600 text-sm leading-relaxed">
                  Complete professional-grade assessment in 3 minutes with immediate personal audiogram.
                </p>
              </div>
            </div>

            <div className="flex gap-4 glass p-5 card-hover">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-md border-2 border-primary-500 flex items-center justify-center bg-primary-50">
                  <Check className="w-5 h-5 text-primary-500" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-clinical-900">Early Detection Technology</h3>
                <p className="text-clinical-600 text-sm leading-relaxed">
                  Identifies potential hearing deficits early, before significant impact on daily communication.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <button
              onClick={onStart}
              className="btn-primary text-lg px-8 py-4"
            >
              Begin Assessment
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-clinical-900 text-white py-12 mt-16">
        <div className="container-safe">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-500 rounded-md flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">CheckMyHearing</span>
              </div>
              <p className="text-clinical-400 text-sm">
                Professional hearing assessment trusted by audiologists worldwide.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={onEarlySigns} className="text-clinical-400 hover:text-white text-sm transition-colors">
                    Early Signs
                  </button>
                </li>
                <li>
                  <button onClick={onScience} className="text-clinical-400 hover:text-white text-sm transition-colors">
                    Science
                  </button>
                </li>
                <li>
                  <button onClick={onAbout} className="text-clinical-400 hover:text-white text-sm transition-colors">
                    About Us
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Contact</h3>
              <ul className="space-y-2 text-clinical-400 text-sm">
                <li>
                  <button onClick={onContact} className="hover:text-white transition-colors">
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-clinical-400 text-sm">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-clinical-800 pt-6 text-center text-clinical-400 text-sm">
            <p>&copy; {new Date().getFullYear()} CheckMyHearing. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
