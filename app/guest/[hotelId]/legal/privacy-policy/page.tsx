import type { Metadata } from 'next'
import { PrivacyPolicyContent } from '@/components/legal/PrivacyPolicyContent'

export const metadata: Metadata = {
  title: 'Privacy Policy | InnTouch',
  description: 'Privacy Policy for InnTouch guest services',
}

export default function GuestPrivacyPolicyPage() {
  return <PrivacyPolicyContent />
}

