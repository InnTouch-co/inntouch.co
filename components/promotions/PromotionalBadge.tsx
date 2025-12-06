'use client'

import { useState, useEffect } from 'react'
import { Percent } from 'lucide-react'

interface PromotionalBadgeProps {
  promotionId: string
  hotelId: string
  onExpand: () => void
}

export function PromotionalBadge({ promotionId, hotelId, onExpand }: PromotionalBadgeProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling down a bit (100px) - same as FloatingCartButton
      const shouldBeVisible = window.scrollY > 100
      setIsVisible(shouldBeVisible)
    }

    // Check initial scroll position
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleClick = () => {
    onExpand()
  }

  if (!isVisible) return null

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-6 z-50 p-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white/20 transition-all hover:scale-105 shadow-lg"
      aria-label="View promotion"
      type="button"
      style={{ 
        position: 'fixed', 
        bottom: '96px', // 24 * 4px = 96px (above the FloatingCartButton which is at bottom-6 = 24px)
        right: '24px', // 6 * 4px = 24px (same as FloatingCartButton)
        animation: 'bounce 1s ease-in-out infinite, pulse 2s ease-in-out infinite',
        boxShadow: '0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 255, 255, 0.3)'
      }}
    >
      <Percent className="w-6 h-6 text-white" />
    </button>
  )
}

