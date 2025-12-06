'use client'

import { Service } from '@/lib/guest/types'
import { getServiceStatus } from '@/lib/guest/utils/serviceHelpers'

interface StatusBadgeProps {
  service: Service
  variant?: 'light' | 'dark'
}

export function StatusBadge({ service, variant = 'light' }: StatusBadgeProps) {
  // Always show as open
  const status = 'open'
  
  const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium transition-all'
  
  const statusConfig = {
    open: {
      bg: variant === 'light' ? 'bg-green-100 text-green-800' : 'bg-green-600 text-white',
      text: 'Open',
    },
    closed: {
      bg: variant === 'light' ? 'bg-red-100 text-red-800' : 'bg-red-600 text-white',
      text: 'Closed',
    },
    'closing-soon': {
      bg: variant === 'light' ? 'bg-yellow-100 text-yellow-800' : 'bg-yellow-600 text-white',
      text: 'Closing Soon',
    },
  }
  
  const config = statusConfig[status]
  
  return (
    <span className={`${baseClasses} ${config.bg}`}>
      {config.text}
    </span>
  )
}

