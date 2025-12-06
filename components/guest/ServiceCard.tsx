'use client'

import { Service } from '@/lib/guest/types'
import { ServiceIcon } from './ServiceIcon'
import { getBackgroundImage } from '@/lib/services/backgroundUtils'
import { getTodayHours } from '@/lib/guest/utils/serviceHelpers'
import { ArrowRight } from 'lucide-react'

interface ServiceCardProps {
  service: Service
  onClick: () => void
}

export function ServiceCard({ service, onClick }: ServiceCardProps) {
  // Get background image using the same utility as admin
  // Priority: custom background_image > service photos > default background by type
  const backgroundImage = getBackgroundImage({
    service_type: service.type,
    settings: service.settings,
    photos: service.photos,
  })
  
  const todayHours = getTodayHours(service)
  
  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-lg group h-48 border-2 border-white/20 hover:border-white/30 backdrop-blur-sm"
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>
      
      {/* Content Overlay */}
      <div className="relative h-full flex flex-col justify-between p-3 text-white">
        {/* Top Section - Icon and Title */}
        <div className="flex items-start justify-between gap-2">
          <div className="p-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
            <ServiceIcon type={service.type} className="text-white" size={18} />
          </div>
          {/* Status Badge - moved to top right */}
          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-600 rounded-full">
            <div className="w-1 h-1 bg-green-300 rounded-full" />
            <span className="text-[10px] font-medium text-white">Open</span>
          </div>
        </div>
        
        {/* Middle Section - Title */}
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-lg font-bold mb-1 group-hover:text-white/90 transition-colors line-clamp-2">
            {service.title}
          </h3>
        </div>
        
        {/* Bottom Section - CTA */}
        <div className="flex items-center justify-between">
          {/* Operating Hours - compact */}
          {todayHours && todayHours !== 'Always open' && todayHours !== 'Closed today' && (
            <span className="text-white/80 text-[10px] font-medium truncate">
              {todayHours}
            </span>
          )}
          <button
            className="flex items-center gap-1 text-white text-xs font-medium hover:text-white/80 transition-colors group/btn"
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
          >
            <span>Explore</span>
            <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}

