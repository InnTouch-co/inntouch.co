'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Promotion {
  id: string
  title: string
  short_description: string | null
  description: string | null
  image_url: string | null
  banner_duration_seconds: number
}

interface PromotionalBannerProps {
  promotion: Promotion
  hotelId: string
  roomNumber?: string | null
  onClose: () => void
  onMinimize: () => void
}

export function PromotionalBanner({ promotion, hotelId, roomNumber, onClose, onMinimize }: PromotionalBannerProps) {
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const duration = promotion.banner_duration_seconds * 1000 // Convert to milliseconds
  const updateInterval = 50 // Update every 50ms for smooth animation

  useEffect(() => {
    if (isPaused) {
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
          // Auto-close when progress reaches 100%
          setTimeout(() => {
            onClose()
          }, 100)
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
  }, [isPaused, duration, onClose])

  const handleViewDetails = () => {
    const baseUrl = `/guest/${hotelId}/promotions/${promotion.id}`
    const url = roomNumber ? `${baseUrl}?room=${roomNumber}` : baseUrl
    router.push(url)
    onClose()
  }


  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Close banner when clicking on the overlay (outside the banner content)
    // Stop propagation to prevent closing when clicking inside banner content
    e.stopPropagation()
    onClose()
  }

  const handleCloseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onClose()
  }

  if (!promotion.image_url) {
    return null // Don't show banner if no image
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
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Image */}
        <img
          src={promotion.image_url}
          alt={promotion.title}
          className="w-full h-full object-cover"
        />

        {/* Close button */}
        <button
          onClick={handleCloseClick}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all border border-white/30 cursor-pointer"
          aria-label="Close"
          type="button"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Text content overlay - at top left */}
        <div className="absolute top-0 left-0 flex flex-col items-start p-6 text-left z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">
            {promotion.title}
          </h2>
          {promotion.short_description && (
            <p className="text-base md:text-lg text-white/90 drop-shadow-md max-w-sm">
              {promotion.short_description}
            </p>
          )}
        </div>

        {/* Action button - at bottom left, above progress bar */}
        <div className="absolute bottom-4 left-0 flex justify-start items-center p-6 z-10">
          <button
            onClick={handleViewDetails}
            className="px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/30 transition-all border border-white/30 text-sm cursor-pointer"
            type="button"
          >
            View More
          </button>
        </div>

        {/* Progress bar at bottom (Instagram-style) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30 z-10">
          <div
            className="h-full bg-white transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

