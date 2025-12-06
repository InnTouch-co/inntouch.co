'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { CartItem } from '@/lib/guest/types'
import { calculateTotal } from '@/lib/guest/utils/serviceHelpers'
import { formatPhoneNumber } from '@/lib/utils/phone-mask'
import { GuestNavbar } from './GuestNavbar'
import { calculateCartDiscounts, DiscountResult } from '@/lib/guest/utils/discountCalculator'

interface CheckoutPageProps {
  cart: CartItem[]
  onBack: () => void
  onSubmit: (order: {
    roomNumber: string
    guestName: string
    guestPhone: string
    specialInstructions: string
    items: CartItem[]
    total: number
    subtotal: number
    discountAmount: number
  }) => Promise<void>
  defaultRoomNumber?: string
  hotelId?: string
  onCartClick?: () => void
  cartItemCount?: number
  serviceType?: string
}

export function CheckoutPage({ cart, onBack, onSubmit, defaultRoomNumber, hotelId, onCartClick, cartItemCount = 0, serviceType }: CheckoutPageProps) {
  const [roomNumber, setRoomNumber] = useState(defaultRoomNumber || '')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [discounts, setDiscounts] = useState<DiscountResult | null>(null)
  const [isCalculatingDiscounts, setIsCalculatingDiscounts] = useState(true)
  
  // Memoize original total calculation to avoid recalculating on every render
  const originalTotal = useMemo(() => calculateTotal(cart), [cart])
  
  // Memoize discount calculation function to prevent unnecessary re-renders
  const calculateDiscounts = useCallback(async () => {
    if (hotelId && cart.length > 0) {
      setIsCalculatingDiscounts(true)
      try {
        const result = await calculateCartDiscounts(hotelId, cart, serviceType)
          setDiscounts(result)
      } catch (error) {
        // Error handled silently, fallback to no discount
        setDiscounts(null)
      } finally {
          setIsCalculatingDiscounts(false)
      }
    } else {
      setDiscounts(null)
      setIsCalculatingDiscounts(false)
    }
  }, [hotelId, cart, serviceType])
  
  // Calculate discounts when dependencies change
  useEffect(() => {
    calculateDiscounts()
  }, [calculateDiscounts])
  
  // Memoize final calculations
  const finalTotal = useMemo(() => discounts ? discounts.finalTotal : originalTotal, [discounts, originalTotal])
  const discountAmount = useMemo(() => discounts ? discounts.discountAmount : 0, [discounts])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!roomNumber.trim() || !guestName.trim() || !guestPhone.trim() || !acceptedTerms) {
      return
    }
    
    // Prevent double submission
    if (isSubmitting) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await onSubmit({
        roomNumber: roomNumber.trim(),
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        specialInstructions: specialInstructions.trim(),
        items: cart,
        total: finalTotal, // Use discounted total
        subtotal: originalTotal, // Original total before discount
        discountAmount: discountAmount, // Discount amount applied
      })
    } catch (error) {
      // Error is handled by parent component
      // Just ensure we don't leave form in submitting state
    } finally {
      // Reset after a short delay to allow parent to process
      // Parent component manages its own isSubmittingOrder state
      setTimeout(() => {
        setIsSubmitting(false)
      }, 100)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <GuestNavbar
        onBack={onBack}
        onCartClick={onCartClick}
        cartItemCount={cartItemCount}
        title="Checkout"
      />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-6">
              <div>
                <label htmlFor="roomNumber" className="block text-sm font-medium text-white/90 mb-2">
                  Room Number *
                </label>
                <input
                  id="roomNumber"
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:ring-2 focus:ring-white/50 focus:border-white/30 focus:outline-none transition-all"
                  placeholder="Enter your room number"
                />
              </div>
              
              <div>
                <label htmlFor="guestName" className="block text-sm font-medium text-white/90 mb-2">
                  Guest Name *
                </label>
                <input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:ring-2 focus:ring-white/50 focus:border-white/30 focus:outline-none transition-all"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label htmlFor="guestPhone" className="block text-sm font-medium text-white/90 mb-2">
                  Phone Number *
                </label>
                <input
                  id="guestPhone"
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(formatPhoneNumber(e.target.value))}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:ring-2 focus:ring-white/50 focus:border-white/30 focus:outline-none transition-all"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div>
                <label htmlFor="specialInstructions" className="block text-sm font-medium text-white/90 mb-2">
                  Special Instructions
                </label>
                <textarea
                  id="specialInstructions"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/50 focus:ring-2 focus:ring-white/50 focus:border-white/30 focus:outline-none transition-all resize-none"
                  placeholder="Any special requests or dietary restrictions..."
                />
              </div>
              
              {/* Terms Acceptance */}
              <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                  className="mt-1 w-4 h-4 text-white bg-white/5 border-white/20 rounded focus:ring-2 focus:ring-white/50 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
                />
                <label htmlFor="acceptTerms" className="text-sm text-white/90 cursor-pointer">
                  I agree to the{' '}
                  {hotelId ? (
                    <>
                      <a 
                        href={`/guest/${hotelId}/legal/terms-of-service${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white transition-colors"
                      >
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a 
                        href={`/guest/${hotelId}/legal/privacy-policy${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white transition-colors"
                      >
                        Privacy Policy
                      </a>
                    </>
                  ) : (
                    <>
                      <a 
                        href="/terms-of-service"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white transition-colors"
                      >
                        Terms of Service
                      </a>
                      {' '}and{' '}
                      <a 
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-white transition-colors"
                      >
                        Privacy Policy
                      </a>
                    </>
                  )}
                  {' '}*
                </label>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || !roomNumber.trim() || !guestName.trim() || !guestPhone.trim() || !acceptedTerms}
                className="w-full py-4 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? 'Placing Order...' : 'Place Order'}
              </button>
            </form>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-white mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {cart.map((item) => {
                  const itemDiscount = discounts?.itemDiscounts.find(d => d.itemId === item.menuItem.id)
                  const itemOriginalTotal = item.menuItem.price * item.quantity
                  const itemFinalTotal = itemDiscount 
                    ? (itemDiscount.finalPrice * item.quantity)
                    : itemOriginalTotal
                  const itemDiscountAmount = itemDiscount ? itemDiscount.discountAmount * item.quantity : 0
                  
                  return (
                    <div key={item.menuItem.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-white">{item.menuItem.name}</p>
                        <p className="text-sm text-white/70">Qty: {item.quantity}</p>
                        {itemDiscountAmount > 0 && (
                          <p className="text-sm text-green-400 mt-1">
                            -${itemDiscountAmount.toFixed(2)} discount
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {itemDiscountAmount > 0 ? (
                          <>
                            <p className="text-sm text-white/50 line-through">
                              ${itemOriginalTotal.toFixed(2)}
                            </p>
                            <p className="font-medium text-white">
                              ${itemFinalTotal.toFixed(2)}
                            </p>
                          </>
                        ) : (
                          <p className="font-medium text-white">
                            ${itemOriginalTotal.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="border-t border-white/10 pt-4">
                {isCalculatingDiscounts && (
                  <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300">Calculating discounts...</p>
                  </div>
                )}
                {discountAmount > 0 && !isCalculatingDiscounts && (
                  <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-300">
                      🎉 You saved ${discountAmount.toFixed(2)} with this promotion!
                    </p>
                  </div>
                )}
                <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 Prices shown are before tax. Taxes will be calculated at checkout.
                  </p>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80">Subtotal</span>
                    <span className="text-white">${originalTotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-400">Discount</span>
                      <span className="text-green-400">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-lg font-semibold text-white">Total</span>
                    <span className="text-2xl font-bold text-white">${finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

