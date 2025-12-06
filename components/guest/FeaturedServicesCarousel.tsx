'use client'

import { useState } from 'react'
import Slider from 'react-slick'
import { Service } from '@/lib/guest/types'
import { ServiceIcon } from './ServiceIcon'
import { StatusBadge } from './StatusBadge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { getBackgroundImage } from '@/lib/services/backgroundUtils'

interface FeaturedServicesCarouselProps {
  services: Service[]
  onServiceClick: (serviceId: string) => void
}

function CustomArrow({ direction, onClick }: { direction: 'prev' | 'next'; onClick?: () => void }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  
  return (
    <button
      onClick={onClick}
      className={`
        absolute top-1/2 -translate-y-1/2 z-20
        ${direction === 'prev' ? 'left-4' : 'right-4'}
        w-16 h-16 rounded-full bg-white shadow-2xl
        flex items-center justify-center
        hover:scale-110 transition-transform
        group
      `}
      aria-label={direction === 'prev' ? 'Previous' : 'Next'}
    >
      <Icon size={24} className="text-gray-900 group-hover:text-gray-700" strokeWidth={2.5} />
    </button>
  )
}

export function FeaturedServicesCarousel({ services, onServiceClick }: FeaturedServicesCarouselProps) {
  const featuredServices = services.slice(0, 4)
  
  if (featuredServices.length === 0) {
    return null
  }
  
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
    prevArrow: <CustomArrow direction="prev" />,
    nextArrow: <CustomArrow direction="next" />,
  }
  
  return (
    <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[500px] rounded-2xl overflow-hidden">
      <Slider {...settings}>
        {featuredServices.map((service) => {
          const backgroundImage = getBackgroundImage({
            service_type: service.type,
            settings: service.settings,
            photos: service.photos,
          })
          
          return (
            <div key={service.id} className="relative h-[300px] sm:h-[400px] lg:h-[500px]">
              <div className="absolute inset-0">
                <Image
                  src={backgroundImage}
                  alt={service.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
              </div>
            
            <div className="relative h-full flex flex-col justify-end p-4 sm:p-6 lg:p-8 text-white">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-xl rounded-lg sm:rounded-xl border border-white/30">
                    <ServiceIcon type={service.type} className="text-white" size={20} />
                  </div>
                  <StatusBadge service={service} variant="dark" />
                </div>
                
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3">{service.title}</h2>
                <p className="text-sm sm:text-base lg:text-lg mb-3 sm:mb-4 text-white/90 line-clamp-2">{service.description}</p>
                
                <button
                  onClick={() => onServiceClick(service.id)}
                  className="px-4 py-2 sm:px-6 sm:py-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-lg sm:rounded-xl text-white text-sm sm:text-base font-medium hover:bg-white/30 transition-colors"
                >
                  Explore Now
                </button>
              </div>
            </div>
          </div>
          )
        })}
      </Slider>
    </div>
  )
}

