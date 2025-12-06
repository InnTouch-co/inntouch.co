'use client'

import { Service } from '@/lib/guest/types'
import { ServiceCard } from './ServiceCard'
import { Footer } from './Footer'
import type { Hotel } from '@/types/database'
import { ChevronDown } from 'lucide-react'

interface HomePageProps {
  hotel: Hotel
  services: Service[]
  onServiceClick: (serviceId: string) => void
  onCartClick?: () => void
  cartItemCount?: number
  roomNumber?: string
  guestName?: string
  hotelId?: string
}

export function HomePage({ hotel, services, onServiceClick, onCartClick, cartItemCount = 0, roomNumber, guestName, hotelId }: HomePageProps) {
  // Extract hotel name from title (can be JSON or string)
  let hotelName = ''
  if (typeof hotel.title === 'string') {
    hotelName = hotel.title
  } else if (hotel.title && typeof hotel.title === 'object') {
    hotelName = (hotel.title as any).en || (hotel.title as any).name || 'Hotel'
  }
  
  // Check if personalization is enabled (opt-out)
  const isPersonalizationEnabled = typeof window !== 'undefined' 
    ? localStorage.getItem('personalization_enabled') !== 'false'
    : true // Default to true (opt-out, not opt-in)
  
  // Only show name if personalization is enabled
  const displayName = isPersonalizationEnabled ? guestName : undefined
  
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Full Screen Hero with Video Background */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Video Background */}
        {(() => {
          const guestSettings = hotel.guest_settings && typeof hotel.guest_settings === 'object' && !Array.isArray(hotel.guest_settings)
            ? hotel.guest_settings as any
            : null
          const heroVideo = guestSettings?.hero_video
          
          // Use key prop to force re-render when video URL changes
          const videoKey = heroVideo || 'default'
          
          // Default hero video URL - can be replaced with a new video URL
          const DEFAULT_HERO_VIDEO = "https://videos.pexels.com/video-files/5308981/5308981-hd_1080_1920_30fps.mp4"
          const videoUrl = heroVideo || DEFAULT_HERO_VIDEO
          const videoType = videoUrl.endsWith('.webm') ? 'video/webm' : 
                           videoUrl.endsWith('.mov') ? 'video/quicktime' : 
                           'video/mp4'
          
          return (
            <video
              key={videoKey}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={videoUrl} type={videoType} />
            </video>
          )
        })()}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
        
        {/* Hero Content */}
        <div className="relative h-full w-full flex flex-col justify-center items-center text-center p-6 sm:p-8 lg:p-12">
          <div className="w-full text-white z-10">
            {/* Logo */}
            {(() => {
              const guestSettings = hotel.guest_settings && typeof hotel.guest_settings === 'object' && !Array.isArray(hotel.guest_settings)
                ? hotel.guest_settings as any
                : null
              const heroLogo = guestSettings?.hero_logo
              
              if (heroLogo) {
                return (
                  <div className="mb-4 sm:mb-6 md:mb-8 flex justify-center -mt-8 sm:-mt-12 md:-mt-16">
                    <img
                      src={heroLogo}
                      alt={`${hotelName} Logo`}
                      className="max-h-60 sm:max-h-[28rem] md:max-h-[36rem] lg:max-h-[44rem] xl:max-h-[48rem] object-contain drop-shadow-2xl"
                    />
                  </div>
                )
              }
              return null
            })()}
            <h3 className="mt-8 text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
              Welcome to {hotelName}{displayName ? (
                <>
                  , <span className="font-normal text-white/90">{displayName}</span>
                </>
              ) : ''}!
            </h3>
            <br />
            <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-6 sm:mb-8">
              We're delighted to have you with us and hope your stay feels like home.
            </p>
            
            {/* Subtle Personalization Notice */}
            {displayName && hotelId && (
              <p className="text-xs text-white/60 mb-6 sm:mb-8">
                We use your name to personalize your experience.{' '}
                <a 
                  href={`/guest/${hotelId}/privacy-settings${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`}
                  className="underline hover:text-white/80 transition-colors"
                >
                  Manage preferences
                </a>
              </p>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <button
                onClick={() => {
                  // Scroll to services section
                  const servicesSection = document.querySelector('[data-section="services"]')
                  if (servicesSection) {
                    servicesSection.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                className="px-8 py-4 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition-all hover:scale-105"
              >
                Explore Services
              </button>
              
              <button
                onClick={() => {
                  // Find concierge service and navigate to it
                  const conciergeService = services.find(s => s.type === 'concierge')
                  if (conciergeService) {
                    onServiceClick(conciergeService.id)
                  } else {
                    // Fallback: scroll to services
                    const servicesSection = document.querySelector('[data-section="services"]')
                    if (servicesSection) {
                      servicesSection.scrollIntoView({ behavior: 'smooth' })
                    }
                  }
                }}
                className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white/20 transition-all hover:scale-105"
              >
                Contact Concierge
              </button>
            </div>
          </div>
        </div>

        {/* Animated Arrow Down */}
        <button
          onClick={() => {
            const servicesSection = document.querySelector('[data-section="services"]')
            if (servicesSection) {
              servicesSection.scrollIntoView({ behavior: 'smooth' })
            }
          }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce text-white/80 hover:text-white transition-colors z-10"
          aria-label="Scroll to services"
        >
          <ChevronDown size={32} className="drop-shadow-lg" />
        </button>
      </section>

      {/* Services Grid */}
      <section data-section="services" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 bg-gray-900">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-white mb-1">All Guest Services</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onClick={() => onServiceClick(service.id)}
            />
          ))}
        </div>
      </section>
      
      {/* Footer */}
      <Footer hotel={hotel} roomNumber={roomNumber} hotelId={hotelId} />
    </div>
  )
}

