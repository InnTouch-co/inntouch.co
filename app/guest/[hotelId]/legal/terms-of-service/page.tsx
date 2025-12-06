import type { Metadata } from 'next'
import { TermsOfServiceContent } from '@/components/legal/TermsOfServiceContent'

export const metadata: Metadata = {
  title: 'Terms of Service | InnTouch',
  description: 'Terms of Service for InnTouch guest services',
}

export default function GuestTermsOfServicePage() {
  return <TermsOfServiceContent />
}

