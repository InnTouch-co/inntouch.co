'use client'

import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function CookiePolicyContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const hotelId = params.hotelId as string
  const roomNumber = searchParams.get('room')

  const handleBack = () => {
    // Check if user came from privacy settings page
    const fromPrivacySettings = searchParams.get('from') === 'privacy-settings'
    
    if (fromPrivacySettings && hotelId && roomNumber) {
      // Navigate back to privacy settings page with room parameter
      router.push(`/guest/${hotelId}/privacy-settings?room=${encodeURIComponent(roomNumber)}`)
    } else if (hotelId) {
      // Navigate to main guest page
      const roomParam = roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''
      router.push(`/guest/${hotelId}${roomParam}`)
    } else {
      router.back()
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header with Back Button */}
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Cookie Policy</h1>
              <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 shadow-xl p-8 md:p-12">

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">1. What Are Cookies?</h2>
              <p className="text-gray-300 leading-relaxed">
                Cookies are small text files that are placed on your device when you visit a website. They are widely used to make 
                websites work more efficiently and provide information to website owners.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Cookies</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                InnTouch uses cookies to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Remember your preferences and settings</li>
                <li>Maintain your session while using the service</li>
                <li>Improve website functionality and user experience</li>
                <li>Analyze how the service is used</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">3. Types of Cookies We Use</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">3.1 Essential Cookies</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                These cookies are necessary for the website to function properly. They cannot be disabled.
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li><strong>Session Cookies:</strong> Maintain your login session</li>
                <li><strong>Security Cookies:</strong> Protect against unauthorized access</li>
                <li><strong>Cart Cookies:</strong> Remember items in your shopping cart</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">3.2 Functional Cookies</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                These cookies enhance functionality and personalization.
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li><strong>Preference Cookies:</strong> Remember your language and region settings</li>
                <li><strong>Room Number Cookies:</strong> Remember your room number for faster checkout</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">3.3 Analytics Cookies</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                These cookies help us understand how visitors use our website.
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li><strong>Usage Analytics:</strong> Track page views and user interactions</li>
                <li><strong>Performance Monitoring:</strong> Identify and fix technical issues</li>
              </ul>
              <p className="text-gray-300 leading-relaxed">
                <em className="text-gray-400">Note: Analytics cookies are optional and require your consent.</em>
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">3.4 Marketing Cookies</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Currently, we do not use marketing cookies. If we implement them in the future, we will update this policy and request your consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">4. Third-Party Cookies</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We may use third-party services that set their own cookies:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li><strong>Supabase:</strong> For authentication and data storage (essential)</li>
                <li><strong>Analytics Services:</strong> If enabled, for usage analytics (optional)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">5. Managing Cookies</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You can manage your cookie preferences:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li><strong>Cookie Banner:</strong> Use the cookie consent banner to accept or reject optional cookies</li>
                <li><strong>Browser Settings:</strong> Most browsers allow you to control cookies through settings</li>
                <li><strong>Privacy Settings:</strong> Access your privacy settings page to update preferences</li>
              </ul>
              <p className="text-gray-300 leading-relaxed">
                <strong>Note:</strong> Disabling essential cookies may affect website functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">6. Cookie Duration</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Cookies we use have different lifespans:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
                <li><strong>Persistent Cookies:</strong> Remain until expiration or manual deletion</li>
                <li><strong>Consent Cookies:</strong> Stored for up to 12 months</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Accept or reject non-essential cookies</li>
                <li>Change your cookie preferences at any time</li>
                <li>Delete cookies from your browser</li>
                <li>Request information about cookies we use</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">8. Updates to This Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Cookie Policy from time to time. We will notify you of significant changes and update the 
                "Last updated" date. Please review this policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">9. Contact Us</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you have questions about our use of cookies, please contact us:
              </p>
              <ul className="list-none text-gray-300 space-y-2">
                <li><strong>Email:</strong> privacy@inntouch.co</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

