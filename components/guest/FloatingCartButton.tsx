'use client'

import { ShoppingCart, Package } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface FloatingCartButtonProps {
  onCartClick: () => void
  onOrdersClick: () => void
  cartItemCount: number
  roomNumber?: string
}

export function FloatingCartButton({ onCartClick, onOrdersClick, cartItemCount, roomNumber }: FloatingCartButtonProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling down a bit (100px)
      setIsVisible(window.scrollY > 100)
    }

    // Check initial scroll position
    handleScroll()

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  if (!isVisible) return null

  const handleMainButtonClick = () => {
    if (cartItemCount > 0) {
      onCartClick()
    } else {
      setIsMenuOpen(!isMenuOpen)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={menuRef}>
      {/* Main Button */}
      <button
        onClick={handleMainButtonClick}
        className="p-4 bg-gray-800 hover:bg-gray-700 rounded-full shadow-lg transition-all hover:scale-110 border border-gray-700 relative"
        aria-label={cartItemCount > 0 ? "Shopping cart" : "Menu"}
      >
        {cartItemCount > 0 ? (
          <>
            <ShoppingCart size={24} className="text-white" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold">
              {cartItemCount}
            </span>
          </>
        ) : (
          <Package size={24} className="text-white" />
        )}
      </button>

      {/* Menu Dropdown */}
      {isMenuOpen && (
        <div className="absolute bottom-16 right-0 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="py-2">
            <button
              onClick={() => {
                onCartClick()
                setIsMenuOpen(false)
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 text-white"
            >
              <ShoppingCart size={20} className="text-gray-300" />
              <div className="flex-1">
                <div className="font-medium">Cart</div>
                {cartItemCount > 0 && (
                  <div className="text-xs text-gray-400">{cartItemCount} item{cartItemCount !== 1 ? 's' : ''}</div>
                )}
              </div>
            </button>
            <button
              onClick={() => {
                onOrdersClick()
                setIsMenuOpen(false)
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 text-white border-t border-gray-700"
            >
              <Package size={20} className="text-gray-300" />
              <div className="flex-1">
                <div className="font-medium">My Orders</div>
                <div className="text-xs text-gray-400">View order status</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


