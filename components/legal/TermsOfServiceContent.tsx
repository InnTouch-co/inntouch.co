'use client'

import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function TermsOfServiceContent() {
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
              <h1 className="text-2xl font-bold text-white">Terms of Service</h1>
              <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 shadow-xl p-8 md:p-12">

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                By accessing and using InnTouch guest services, you accept and agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                InnTouch provides a digital platform for hotel guests to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Browse and order hotel services (room service, restaurant, bar, spa, etc.)</li>
                <li>Track order status in real-time</li>
                <li>Receive notifications via WhatsApp</li>
                <li>Access concierge services</li>
                <li>View and manage their orders</li>
                <li>Enjoy a personalized experience with your name displayed throughout the platform</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                <strong>Personalized Service:</strong> As part of our hospitality service, we display your name to create a more welcoming 
                and personalized experience. This is standard practice in the hotel industry and helps our staff provide better service. 
                You can opt-out of name display at any time in your privacy settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">3. User Responsibilities</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                You agree to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Provide accurate and complete information when placing orders</li>
                <li>Use the service only for lawful purposes</li>
                <li>Not attempt to access unauthorized areas of the system</li>
                <li>Not place fraudulent or abusive orders</li>
                <li>Respect the privacy of other guests</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">4. Order Terms</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">4.1 Order Placement</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                When you place an order:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>You must be a registered guest with an active booking</li>
                <li>Room number and guest information must be accurate</li>
                <li>Orders are subject to availability</li>
                <li>We reserve the right to refuse or cancel orders</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">4.2 Payment</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Payment terms:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Orders are charged to your room account</li>
                <li>Payment is due at checkout</li>
                <li>Prices are shown before tax; taxes are calculated at checkout</li>
                <li>All charges are in the hotel's local currency</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">4.3 Cancellation and Refunds</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Cancellation policy:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Orders can be cancelled before preparation begins</li>
                <li>Contact the front desk or kitchen to cancel</li>
                <li>Refunds are processed according to hotel policy</li>
                <li>Completed orders cannot be cancelled</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">5. Service Availability</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We strive to provide reliable service, but:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Service may be unavailable due to maintenance or technical issues</li>
                <li>We do not guarantee uninterrupted access</li>
                <li>Service hours may vary by hotel</li>
                <li>Some services may not be available at all times</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">6. Intellectual Property</h2>
              <p className="text-gray-300 leading-relaxed">
                All content, features, and functionality of the InnTouch platform are owned by InnTouch and are protected by 
                international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">7. Limitation of Liability</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>InnTouch is not liable for any indirect, incidental, or consequential damages</li>
                <li>We are not responsible for delays in order delivery</li>
                <li>We are not liable for service quality issues (handled by the hotel)</li>
                <li>Total liability is limited to the amount you paid for the service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">8. Indemnification</h2>
              <p className="text-gray-300 leading-relaxed">
                You agree to indemnify and hold harmless InnTouch, its affiliates, and their respective officers, directors, 
                employees, and agents from any claims, damages, losses, liabilities, and expenses arising from your use of the service 
                or violation of these terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">9. Dispute Resolution</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                For any disputes:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Contact the hotel front desk first</li>
                <li>Contact InnTouch support if the issue persists</li>
                <li>Disputes will be resolved through good faith negotiation</li>
                <li>If unresolved, disputes will be subject to binding arbitration</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to Terms</h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of significant changes. 
                Continued use of the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Information</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                For questions about these Terms of Service, please contact:
              </p>
              <ul className="list-none text-gray-300 space-y-2">
                <li><strong>Email:</strong> legal@inntouch.co</li>
                <li><strong>Support:</strong> support@inntouch.co</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

