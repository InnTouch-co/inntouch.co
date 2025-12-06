import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | InnTouch',
  description: 'Privacy Policy for InnTouch guest services',
}

export default function PrivacyPolicyPage() {
  // This page should only be accessed from guest site
  return (
    <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-4">
          This page is only available from the guest portal. Please access it through your hotel's guest site.
        </p>
        <p className="text-sm text-gray-500">
          If you are a guest, please use the link provided in the footer of your hotel's guest portal.
        </p>
      </div>
    </div>
  )
}
