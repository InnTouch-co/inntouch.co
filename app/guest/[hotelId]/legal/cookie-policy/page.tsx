import type { Metadata } from 'next'
import { CookiePolicyContent } from '@/components/legal/CookiePolicyContent'

export const metadata: Metadata = {
  title: 'Cookie Policy | InnTouch',
  description: 'Cookie Policy for InnTouch guest services',
}

export default function GuestCookiePolicyPage() {
  return <CookiePolicyContent />
}

