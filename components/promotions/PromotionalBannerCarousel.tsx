'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Promotion {
  id: string
  title: string
  short_description: string | null
  description: string | null
  image_url: string | null
  banner_duration_seconds: number
}

interface PromotionalBannerCarouselProps {
  promotions: Promotion[]
  hotelId: string
  roomNumber?: string | null
  onClose: () => void
  onMinimize: () => void
}

export function PromotionalBannerCarousel({ 
  promotions, 
  hotelId, 
  roomNumber, 
  onClose, 
  onMinimize 
}: PromotionalBannerCarouselProps) {
  // Remove duplicates by ID
  const uniquePromotions = promotions.filter((promotion, index, self) => 
    index === self.findIndex((p) => p.id === promotion.id)
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const currentPromotion = uniquePromotions[currentIndex]
  const duration = currentPromotion?.banner_duration_seconds * 1000 || 5000 // Default 5 seconds
  const updateInterval = 50 // Update every 50ms for smooth animation

  // Removed debug logging for performance

  // Reset progress when switching banners
  useEffect(() => {
    setProgress(0)
  }, [currentIndex])

  // Ensure currentIndex is within bounds
  useEffect(() => {
    if (currentIndex >= uniquePromotions.length && uniquePromotions.length > 0) {
      setCurrentIndex(0)
    }
  }, [uniquePromotions.length, currentIndex])

  // Progress bar animation
  useEffect(() => {
    if (!currentPromotion || isPaused) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      return
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (duration / updateInterval))
        if (newProgress >= 100) {
          // Move to next banner or close
          if (currentIndex < uniquePromotions.length - 1) {
            setCurrentIndex(currentIndex + 1)
          } else {
            // Last banner, close or minimize
            setTimeout(() => {
              onClose()
            }, 100)
          }
          return 100
        }
        return newProgress
      })
    }, updateInterval)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPaused, duration, currentIndex, currentPromotion, uniquePromotions.length, onClose])

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!currentPromotion) return
    const baseUrl = `/guest/${hotelId}/promotions/${currentPromotion.id}`
    const url = roomNumber ? `${baseUrl}?room=${roomNumber}` : baseUrl
    router.push(url)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    onClose()
  }

  const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onClose()
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentIndex < uniquePromotions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onClose()
    }
  }

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleBannerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsPaused(prev => !prev)
  }

  // Swipe handlers
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX
    handleSwipe()
  }

  const handleSwipe = () => {
    if (!touchStartX.current || !touchEndX.current) return
    
    const distance = touchStartX.current - touchEndX.current
    const minSwipeDistance = 50

    if (distance > minSwipeDistance && currentIndex < uniquePromotions.length - 1) {
      // Swipe left - next
      setCurrentIndex(currentIndex + 1)
    } else if (distance < -minSwipeDistance && currentIndex > 0) {
      // Swipe right - previous
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (!currentPromotion || !currentPromotion.image_url) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Background overlay - clickable to close */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        onClick={handleOverlayClick}
      />
      
      {/* Image with overlay - Square format, centered, smaller */}
      <div 
        className="relative w-full max-w-sm mx-auto aspect-square overflow-hidden rounded-lg shadow-2xl border-2 border-white/30 z-10"
        onClick={handleBannerClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation buttons - only show if more than 1, positioned inside banner */}
      {uniquePromotions.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={handlePrevious}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-30 cursor-pointer"
              aria-label="Previous"
              type="button"
            >
                <ChevronLeft className="w-8 h-8 text-white drop-shadow-lg" />
            </button>
          )}
          {currentIndex < uniquePromotions.length - 1 && (
            <button
              onClick={handleNext}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-30 cursor-pointer"
              aria-label="Next"
              type="button"
            >
                <ChevronRight className="w-8 h-8 text-white drop-shadow-lg" />
            </button>
          )}
        </>
      )}
        {/* Image */}
        <img
          src={currentPromotion.image_url}
          alt={currentPromotion.title}
          className="w-full h-full object-cover"
        />

        {/* Black overlay container - behind all elements */}
        <div className="absolute inset-0 bg-black/50 z-10" />

        {/* Close button */}
        <button
          onClick={handleCloseClick}
          className="absolute top-4 right-4 z-30 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all border border-white/30 cursor-pointer"
          aria-label="Close"
          type="button"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Text content overlay - at top left */}
        <div className="absolute top-0 left-0 flex flex-col items-start p-6 text-left z-20">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">
            {currentPromotion.title}
          </h2>
          {currentPromotion.short_description && (
            <p className="text-base md:text-lg text-white/90 drop-shadow-md max-w-sm">
              {currentPromotion.short_description}
            </p>
          )}
        </div>

        {/* Action button - at bottom left, above progress bars */}
        <div className="absolute bottom-16 left-0 flex justify-start items-center p-6 z-30">
          <button
            onClick={handleViewDetails}
            className="px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/30 transition-all border border-white/30 text-sm cursor-pointer"
            type="button"
          >
            View More
          </button>
        </div>

        {/* Progress bars for all banners (bottom) - only show if more than 1 */}
        {uniquePromotions.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex gap-1 z-30 p-4">
            {uniquePromotions.map((promotion, index) => (
              <div
                key={promotion.id || index}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
          <div
                  className={`h-full bg-white transition-all duration-75 ease-linear ${
                    index < currentIndex ? 'w-full' : index === currentIndex ? '' : 'w-0'
                  }`}
                  style={index === currentIndex ? { width: `${progress}%` } : {}}
          />
        </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

