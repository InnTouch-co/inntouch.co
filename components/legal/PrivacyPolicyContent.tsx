'use client'

import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function PrivacyPolicyContent() {
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
              <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
              <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 shadow-xl p-8 md:p-12">

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Welcome to InnTouch. We are committed to protecting your privacy and ensuring the security of your personal information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our guest services platform.
              </p>
              <p className="text-gray-300 leading-relaxed">
                By using our services, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">2.1 Personal Information</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                We collect the following personal information when you use our services:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li><strong>Name:</strong> To identify you and personalize your experience</li>
                <li><strong>Email Address:</strong> For order confirmations and communications</li>
                <li><strong>Phone Number:</strong> For WhatsApp notifications and order updates</li>
                <li><strong>Room Number:</strong> To deliver services to your room</li>
                <li><strong>Check-in/Check-out Dates:</strong> To manage your stay</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">2.2 Order Information</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                When you place an order, we collect:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li>Order details (items, quantities, prices)</li>
                <li>Special instructions</li>
                <li>Order status and delivery information</li>
                <li>Payment information (processed securely)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">2.3 Technical Information</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                We automatically collect certain technical information:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Device information</li>
                <li>Usage data and analytics</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use your information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li><strong>Service Delivery:</strong> To process and fulfill your orders</li>
                <li><strong>Personalization:</strong> To display your name and personalize your experience throughout our platform, based on our legitimate interest in providing quality hospitality service. You can opt-out of name display in your privacy settings.</li>
                <li><strong>Communication:</strong> To send order confirmations, status updates, and important notifications via WhatsApp and email</li>
                <li><strong>Billing:</strong> To charge services to your room and generate folios</li>
                <li><strong>Customer Support:</strong> To respond to your inquiries and provide assistance</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations and protect our rights</li>
                <li><strong>Service Improvement:</strong> To analyze usage patterns and improve our services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We may share your information with:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li><strong>Hotel Staff:</strong> To process your orders and provide services</li>
                <li><strong>Service Providers:</strong> Third-party services we use:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li><strong>Twilio:</strong> For WhatsApp and SMS notifications</li>
                    <li><strong>Supabase:</strong> For secure data storage and hosting</li>
                  </ul>
                </li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
              <p className="text-gray-300 leading-relaxed">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">5. Data Storage and Security</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                Your data is stored securely using:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li>Encrypted databases (Supabase)</li>
                <li>Secure HTTPS connections</li>
                <li>Access controls and authentication</li>
                <li>Regular security audits</li>
              </ul>
              <p className="text-gray-300 leading-relaxed">
                While we implement security measures, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">6. Data Retention</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We retain your personal information for:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li><strong>Active Bookings:</strong> For the duration of your stay</li>
                <li><strong>Order Records:</strong> 7 years (for tax and legal compliance)</li>
                <li><strong>Guest Information:</strong> Until you request deletion or as required by law</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">7. Your Rights (GDPR)</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you are located in the European Economic Area (EEA), you have the following rights:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your data</li>
                <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Right to Object:</strong> Object to processing of your data (including personalization)</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
              </ul>
              <p className="text-gray-300 leading-relaxed mt-4">
                To exercise these rights, visit your privacy settings page or contact us using the information provided in Section 10.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                <strong>Note on Personalization:</strong> We process your name for personalization based on our legitimate interest in providing 
                quality hospitality service (GDPR Article 6(1)(f)). You have the right to object to this processing at any time by turning off 
                personalization in your privacy settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">8. Cookies and Tracking</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li>Remember your preferences</li>
                <li>Maintain your session</li>
                <li>Analyze usage patterns</li>
              </ul>
              <p className="text-gray-300 leading-relaxed">
                For more information, please see our <span className="text-blue-400 hover:text-blue-300">Cookie Policy</span>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">9. Children's Privacy</h2>
              <p className="text-gray-300 leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">10. Contact Us</h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
              </p>
              <ul className="list-none text-gray-300 space-y-2">
                <li><strong>Email:</strong> privacy@inntouch.co</li>
                <li><strong>Data Protection Officer:</strong> dpo@inntouch.co</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Policy</h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page 
                and updating the "Last updated" date. You are advised to review this policy periodically.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

