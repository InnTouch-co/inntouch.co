'use client'

import { ServiceType } from '@/lib/guest/types'
import { getServiceIcon } from '@/lib/guest/utils/serviceHelpers'
import { LucideIcon } from 'lucide-react'

interface ServiceIconProps {
  type: ServiceType
  className?: string
  size?: number
}

export function ServiceIcon({ type, className = '', size = 24 }: ServiceIconProps) {
  const IconComponent = getServiceIcon(type) as LucideIcon
  
  return <IconComponent className={className} size={size} />
}

