'use client'

import { useParams, useSearchParams } from 'next/navigation'
import PrivacySettingsPage from '@/app/privacy-settings/page'

export default function GuestPrivacySettingsPage() {
  // This is just a wrapper that redirects to the main privacy settings page
  // The main page handles both routes
  return <PrivacySettingsPage />
}


