'use client'

import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { ReactNode } from 'react'

interface GuestNavbarProps {
  onBack?: () => void
  onCartClick?: () => void
  cartItemCount?: number
  title?: string
  rightAction?: ReactNode
}

export function GuestNavbar({
  onBack,
  onCartClick,
  cartItemCount = 0,
  title,
  rightAction,
}: GuestNavbarProps) {
  return (
    <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 fixed top-0 left-0 right-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Back Button */}
          <div className="flex items-center gap-4 flex-1">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            {title && (
              <h1 className="text-xl font-bold text-white">{title}</h1>
            )}
          </div>

          {/* Right: Title (if no back button) or Actions */}
          <div className="flex items-center gap-3">
            {rightAction}
            {onCartClick && (
              <button
                onClick={onCartClick}
                className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Shopping cart"
              >
                <ShoppingCart size={24} className="text-gray-300" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

