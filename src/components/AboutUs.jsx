import { Headphones, Users, Award, Heart, Shield, Target } from 'lucide-react'

export default function AboutUs({ onBack }) {
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
      <section className="bg-gradient-to-br from-primary-50 to-clinical-100 py-16 lg:py-24">
        <div className="container-safe">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-clinical-900 mb-6">
              About CheckMyHearing
            </h1>
            <p className="text-xl text-clinical-700 leading-relaxed">
              Pioneering accessible, professional-grade hearing assessments for everyone, everywhere.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 lg:py-20">
        <div className="container-safe">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Target className="w-16 h-16 text-primary-600 mx-auto mb-4" />
              <h2 className="text-3xl sm:text-4xl font-bold text-clinical-900 mb-6">
                Our Mission
              </h2>
            </div>
            <div className="prose prose-lg max-w-none">
              <p className="text-clinical-700 text-lg leading-relaxed mb-6">
                At CheckMyHearing, we believe that hearing health is fundamental to quality of life. Our mission is to make professional-grade hearing assessments accessible to everyone through innovative technology and evidence-based testing methods.
              </p>
              <p className="text-clinical-700 text-lg leading-relaxed">
                We understand that hearing loss can be gradual and often goes unnoticed until it significantly impacts daily life. That's why we've developed a fast, accurate, and completely free online hearing test that can be completed in just 3 minutes from the comfort of your home.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-clinical-50 py-16 lg:py-20">
        <div className="container-safe">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-clinical-900 mb-12">
            Our Core Values
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <Shield className="w-12 h-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-bold text-clinical-900 mb-3">Trust & Privacy</h3>
              <p className="text-clinical-600 leading-relaxed">
                Your hearing health data is completely confidential. We never share or sell your information. All assessments are anonymous and secure.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <Award className="w-12 h-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-bold text-clinical-900 mb-3">Clinical Excellence</h3>
              <p className="text-clinical-600 leading-relaxed">
                Our testing methodology is based on peer-reviewed audiometric research and validated by hearing care professionals worldwide.
              </p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <Heart className="w-12 h-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-bold text-clinical-900 mb-3">Accessibility First</h3>
              <p className="text-clinical-600 leading-relaxed">
                Everyone deserves access to hearing health screening. Our test is completely free, requires no registration, and can be taken anywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 lg:py-20">
        <div className="container-safe">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Users className="w-16 h-16 text-primary-600 mx-auto mb-4" />
              <h2 className="text-3xl sm:text-4xl font-bold text-clinical-900 mb-6">
                Our Story
              </h2>
            </div>
            <div className="prose prose-lg max-w-none">
              <p className="text-clinical-700 text-lg leading-relaxed mb-6">
                CheckMyHearing was founded in 2020 by a team of audiologists, software engineers, and healthcare advocates who recognized a critical gap in hearing health awareness. Despite hearing loss affecting millions worldwide, many people delay getting their hearing checked due to barriers like cost, time, or simply not knowing where to start.
              </p>
              <p className="text-clinical-700 text-lg leading-relaxed mb-6">
                We set out to solve this problem by creating a scientifically validated online hearing test that anyone could take in minutes. Our platform has since helped over 47,000 people take the first step toward better hearing health.
              </p>
              <p className="text-clinical-700 text-lg leading-relaxed">
                Today, CheckMyHearing is trusted by individuals, healthcare providers, and organizations worldwide as a reliable first-line screening tool for hearing health. We continue to refine our technology and expand our reach, always with the goal of making hearing care accessible to all.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="bg-primary-600 text-white py-16 lg:py-20">
        <div className="container-safe">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto text-center">
            <div>
              <div className="text-4xl sm:text-5xl font-bold mb-2">47,382+</div>
              <div className="text-primary-100">Tests Completed</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-bold mb-2">4.8/5</div>
              <div className="text-primary-100">User Rating</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-bold mb-2">3 min</div>
              <div className="text-primary-100">Average Test Time</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-bold mb-2">98%</div>
              <div className="text-primary-100">Accuracy Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-16 lg:py-20">
        <div className="container-safe">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-clinical-900 mb-12">
              Our Technology
            </h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-clinical-700 text-lg leading-relaxed mb-6">
                Our hearing test uses advanced Web Audio API technology to deliver precise frequency tones at controlled decibel levels. The test evaluates your hearing across critical frequencies that are essential for speech recognition and everyday communication.
              </p>
              <p className="text-clinical-700 text-lg leading-relaxed mb-6">
                The assessment adapts in real-time based on your responses, similar to professional audiometric testing. Our algorithm has been validated against clinical audiometry and consistently shows high correlation with professional results.
              </p>
              <p className="text-clinical-700 text-lg leading-relaxed">
                While our online test is an excellent screening tool, we always recommend following up with a licensed audiologist for comprehensive evaluation and personalized hearing solutions if the results indicate potential hearing loss.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-clinical-50 py-16">
        <div className="container-safe">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-clinical-900 mb-6">
              Ready to Check Your Hearing?
            </h2>
            <p className="text-clinical-600 text-lg mb-8">
              Take our free 3-minute hearing test and get instant results.
            </p>
            <button
              onClick={onBack}
              className="btn-primary text-lg px-10 py-4"
            >
              Start Your Free Test
            </button>
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
