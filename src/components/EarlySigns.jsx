import { Headphones, AlertCircle, Volume2, Users, Phone, Tv, Music, CheckCircle } from 'lucide-react'

export default function EarlySigns({ onBack, onStart }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white w-full px-6 sm:px-8 lg:px-12 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-md flex items-center justify-center">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-clinical-900">HearWell</span>
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
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 py-16 lg:py-20">
        <div className="container-safe">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-clinical-900 mb-6">
              Early Signs of Hearing Loss
            </h1>
            <p className="text-xl text-clinical-700">
              Recognizing the warning signs early can help you take action and maintain your quality of life.
            </p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12 lg:py-16">
        <div className="container-safe">
          <div className="max-w-3xl mx-auto">
            <div className="prose prose-lg max-w-none">
              <p className="text-clinical-700 text-lg leading-relaxed mb-6">
                Hearing loss often develops gradually, making it easy to miss the early warning signs. Many people don't realize they have hearing loss until it becomes significant. Understanding these early indicators can help you seek help sooner and prevent further deterioration.
              </p>
              <p className="text-clinical-700 text-lg leading-relaxed">
                According to the National Institute on Deafness and Other Communication Disorders, approximately 15% of American adults (37.5 million) report some trouble hearing. Early detection is crucial for effective intervention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Common Warning Signs */}
      <section className="bg-clinical-50 py-16 lg:py-20">
        <div className="container-safe">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-clinical-900 mb-12">
              Common Warning Signs
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-primary-600">
                <div className="flex gap-4">
                  <Volume2 className="w-8 h-8 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-clinical-900 mb-2">Difficulty Following Conversations</h3>
                    <p className="text-clinical-600 leading-relaxed">
                      You frequently ask people to repeat themselves or find it hard to understand what others are saying, especially in noisy environments like restaurants or social gatherings. You may also feel like people are mumbling.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-primary-600">
                <div className="flex gap-4">
                  <Tv className="w-8 h-8 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-clinical-900 mb-2">Turning Up the Volume</h3>
                    <p className="text-clinical-600 leading-relaxed">
                      Family members or roommates frequently complain that the TV or radio volume is too loud. You find yourself increasing the volume higher than others prefer or need closed captions to follow shows.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-primary-600">
                <div className="flex gap-4">
                  <Phone className="w-8 h-8 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-clinical-900 mb-2">Phone Conversation Struggles</h3>
                    <p className="text-clinical-600 leading-relaxed">
                      You have trouble understanding phone conversations and often need to switch ears or use speakerphone. You may avoid phone calls because they're difficult to understand.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-primary-600">
                <div className="flex gap-4">
                  <Users className="w-8 h-8 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-clinical-900 mb-2">Social Withdrawal</h3>
                    <p className="text-clinical-600 leading-relaxed">
                      You avoid social situations or group conversations because it's exhausting to try to follow along. You may feel isolated or embarrassed about constantly asking people to repeat themselves.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-primary-600">
                <div className="flex gap-4">
                  <Music className="w-8 h-8 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-clinical-900 mb-2">Missing Everyday Sounds</h3>
                    <p className="text-clinical-600 leading-relaxed">
                      You don't hear common sounds like birds chirping, doorbells ringing, or your phone notifications. Family members may mention sounds you didn't notice.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-primary-600">
                <div className="flex gap-4">
                  <AlertCircle className="w-8 h-8 text-primary-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-clinical-900 mb-2">Ringing in the Ears (Tinnitus)</h3>
                    <p className="text-clinical-600 leading-relaxed">
                      You experience persistent ringing, buzzing, or humming sounds in your ears, especially in quiet environments. Tinnitus often accompanies hearing loss and shouldn't be ignored.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Factors */}
      <section className="py-16 lg:py-20">
        <div className="container-safe">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-clinical-900 mb-12">
              Who Is at Risk?
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-clinical-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-clinical-900 mb-3">Age-Related Factors</h3>
                <ul className="space-y-2 text-clinical-600">
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Adults over 60 years old</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Natural aging process (presbycusis)</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Cumulative noise exposure over lifetime</span>
                  </li>
                </ul>
              </div>

              <div className="bg-clinical-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-clinical-900 mb-3">Lifestyle Factors</h3>
                <ul className="space-y-2 text-clinical-600">
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Regular exposure to loud music or machinery</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Working in noisy environments</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Recreational noise (concerts, power tools)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-clinical-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-clinical-900 mb-3">Health Conditions</h3>
                <ul className="space-y-2 text-clinical-600">
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Diabetes and cardiovascular disease</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>History of ear infections</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Certain medications (ototoxic drugs)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-clinical-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-clinical-900 mb-3">Family History</h3>
                <ul className="space-y-2 text-clinical-600">
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Genetic predisposition to hearing loss</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Family members with hearing loss</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span>Hereditary hearing conditions</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What to Do */}
      <section className="bg-primary-50 py-16 lg:py-20">
        <div className="container-safe">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-clinical-900 mb-8">
              What Should You Do?
            </h2>
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <p className="text-clinical-700 text-lg leading-relaxed mb-6">
                If you recognize any of these warning signs, it's important to take action:
              </p>
              <ol className="space-y-4 text-clinical-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                  <div>
                    <strong className="text-clinical-900">Take a hearing test:</strong> Start with our free online screening to get a baseline understanding of your hearing health.
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                  <div>
                    <strong className="text-clinical-900">Consult a professional:</strong> Schedule an appointment with an audiologist or ENT specialist for a comprehensive evaluation.
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                  <div>
                    <strong className="text-clinical-900">Protect your hearing:</strong> Limit exposure to loud noises and use hearing protection when necessary.
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
                  <div>
                    <strong className="text-clinical-900">Take action early:</strong> The sooner hearing loss is addressed, the better the outcomes for treatment and quality of life.
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-20">
        <div className="container-safe">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-clinical-900 mb-6">
              Check Your Hearing Today
            </h2>
            <p className="text-clinical-600 text-lg mb-8">
              Don't wait for hearing loss to impact your quality of life. Our free 3-minute test can help you understand your hearing health right now.
            </p>
            <button
              onClick={onStart}
              className="btn-primary text-lg px-10 py-4"
            >
              Start Free Hearing Test
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-clinical-900 text-white py-8">
        <div className="container-safe">
          <div className="text-center text-clinical-400">
            <p className="mb-2">© 2024 HearWell. All rights reserved.</p>
            <p className="text-sm">Professional hearing screening for everyone.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
