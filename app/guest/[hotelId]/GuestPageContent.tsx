'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { useGuestHotel } from '@/lib/react-query/hooks/useGuestHotel'
import { useGuestServices } from '@/lib/react-query/hooks/useGuestServices'
import { useRoomValidation } from '@/lib/react-query/hooks/useRoomValidation'
import { HomePage } from '@/components/guest/HomePage'
import { ServiceDetailPage } from '@/components/guest/ServiceDetailPage'
import { CartDrawer } from '@/components/guest/CartDrawer'
import { CheckoutPage } from '@/components/guest/CheckoutPage'
import { BookingForm } from '@/components/guest/BookingForm'
import { FloatingCartButton } from '@/components/guest/FloatingCartButton'
import { OrderStatusPage } from '@/components/guest/OrderStatusPage'
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner'
import { PromotionalBannerCarousel } from '@/components/promotions/PromotionalBannerCarousel'
import { PromotionalBadge } from '@/components/promotions/PromotionalBadge'
import { Service, MenuItem, DrinkItem, CartItem } from '@/lib/guest/types'
import { getOrCreateSessionId } from '@/lib/utils/session-id'
import { logger } from '@/lib/utils/logger'
import { useActivePromotion } from '@/lib/react-query/hooks/usePromotions'

type View = 'home' | 'service' | 'checkout' | 'orders'

export function GuestPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const hotelId = params.hotelId as string
  const roomNumber = searchParams.get('room')
  
  const [currentView, setCurrentView] = useState<View>('home')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [guestName, setGuestName] = useState<string | undefined>(undefined)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [showPromoBanner, setShowPromoBanner] = useState(false)
  const [showPromoBadge, setShowPromoBadge] = useState(false)
  
  const { data: hotel, isLoading: hotelLoading, error: hotelError } = useGuestHotel(hotelId)
  const { data: services = [], isLoading: servicesLoading } = useGuestServices(hotelId)
  const { data: roomValidation, isLoading: roomValidationLoading } = useRoomValidation(hotelId, roomNumber)
  const { data: activePromotions = [], isLoading: promotionLoading } = useActivePromotion(hotelId)
  
  // Load cart from localStorage on mount (after services are loaded)
  useEffect(() => {
    if (typeof window !== 'undefined' && hotelId && services.length > 0) {
      try {
        const storageKey = `guest_cart_${hotelId}${roomNumber ? `_${roomNumber}` : ''}`
        const savedCart = localStorage.getItem(storageKey)
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart)
          // Validate cart structure and filter out invalid items
          if (Array.isArray(parsedCart)) {
            const validCart = parsedCart
              .filter((item: any) => item && item.menuItem && item.quantity && item.quantity > 0)
              .map((item: any) => {
                // Migration: Ensure serviceType and serviceId are present for old cart items
                if (!item.serviceType || !item.serviceId) {
                  // Try to find the service that contains this menu item
                  // This is a best-effort migration - we search services for the menu item
                  let foundService: Service | null = null
                  
                  for (const service of services) {
                    if (service.type === item.serviceType || (!item.serviceType && service.menu)) {
                      // Check if this service has the menu item
                      if (service.menu) {
                        const menuItems: any[] = []
                        if (Array.isArray(service.menu)) {
                          service.menu.forEach((cat: any) => {
                            if (cat.items) menuItems.push(...cat.items)
                          })
                        } else if (service.menu.items) {
                          menuItems.push(...service.menu.items)
                        }
                        
                        const hasItem = menuItems.some((mi: any) => 
                          mi.id === item.menuItem.id || mi.name === item.menuItem.name
                        )
                        
                        if (hasItem) {
                          foundService = service
                          break
                        }
                      }
                      
                      // Also check drinks for bar services
                      if (service.drinks) {
                        const hasDrink = service.drinks.some((drink: any) =>
                          drink.id === item.menuItem.id || drink.name === item.menuItem.name
                        )
                        if (hasDrink) {
                          foundService = service
                          break
                        }
                      }
                    }
                  }
                  
                  if (foundService) {
                    return {
                      ...item,
                      serviceType: item.serviceType || foundService.type,
                      serviceId: item.serviceId || foundService.id
                    }
                  }
                }
                return item
              })
            if (validCart.length > 0) {
              setCart(validCart)
            }
          }
        }
      } catch (error) {
        logger.error('Error loading cart from localStorage:', error)
      }
    }
  }, [hotelId, roomNumber, services])
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && hotelId) {
      try {
        const storageKey = `guest_cart_${hotelId}${roomNumber ? `_${roomNumber}` : ''}`
        if (cart.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(cart))
        } else {
          // Remove from localStorage if cart is empty
          localStorage.removeItem(storageKey)
        }
      } catch (error) {
        logger.error('Error saving cart to localStorage:', error)
      }
    }
  }, [cart, hotelId, roomNumber])
  
  // Fetch guest name from booking if room number is provided
  useEffect(() => {
    if (roomNumber && hotelId) {
      fetch(`/api/guest/room-guest-info?hotel_id=${encodeURIComponent(hotelId)}&room_number=${encodeURIComponent(roomNumber)}`)
        .then(res => res.json())
        .then(data => {
          logger.info('Guest info response:', data)
          // Don't display "Deleted User" - this means the guest data was anonymized
          if (data.guest_name && data.guest_name !== 'Deleted User') {
            logger.info('Setting guest name:', data.guest_name)
            setGuestName(data.guest_name)
          } else {
            logger.info('No guest name found or name is "Deleted User"')
            setGuestName(undefined)
          }
        })
        .catch((error) => {
          logger.error('Error fetching guest name:', error)
          setGuestName(undefined)
        })
    } else {
      setGuestName(undefined)
    }
  }, [roomNumber, hotelId])

  // Scroll to top whenever view changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [currentView])
  
  // Filter out dismissed promotions
  const visiblePromotions = activePromotions.filter(promotion => {
    if (typeof window === 'undefined') return true
    const dismissedKey = `promo_dismissed_${promotion.id}`
    return !localStorage.getItem(dismissedKey)
  })
  
  // Removed debug logging for performance

  // Show promotional banner only after user scrolls (not immediately on page load)
  useEffect(() => {
    if (visiblePromotions.length === 0 || typeof window === 'undefined') {
      // If all promotions are dismissed, show badge for first promotion
      if (activePromotions.length > 0) {
        setShowPromoBadge(true)
      }
      return
    }

    // Check if user has scrolled
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset
      // Show banner after scrolling at least 100px
      if (scrollY > 100 && !showPromoBanner) {
        setShowPromoBanner(true)
        window.removeEventListener('scroll', handleScroll)
      }
    }

    // Check initial scroll position
    const initialScroll = window.scrollY || window.pageYOffset
    if (initialScroll > 100) {
      // Already scrolled, show banner immediately
      setShowPromoBanner(true)
    } else {
      // Not scrolled yet, wait for scroll event
      window.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [visiblePromotions.length, showPromoBanner, activePromotions.length])
  
  if (hotelLoading || servicesLoading || roomValidationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (hotelError || !hotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Hotel Not Found</h1>
          <p className="text-gray-300">The hotel you're looking for doesn't exist or is not active.</p>
        </div>
      </div>
    )
  }
  
  // Validate room exists if room number is provided
  if (roomNumber && roomValidation && !roomValidation.exists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <svg className="w-24 h-24 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Room Not Found</h1>
          <p className="text-gray-300 mb-2">
            Room <span className="font-semibold text-white">{roomNumber}</span> does not exist in this hotel.
          </p>
          <p className="text-gray-400 text-sm">
            Please check your room number or contact the front desk for assistance.
          </p>
          <div className="mt-8">
            <a
              href={`/guest/${hotelId}`}
              className="inline-block px-6 py-3 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white/20 transition-all"
            >
              Continue Without Room Number
            </a>
          </div>
        </div>
      </div>
    )
  }
  
  const handleServiceClick = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    if (service) {
      setSelectedService(service)
      setCurrentView('service')
    }
  }
  
  const handleBackToHome = () => {
    setCurrentView('home')
    setSelectedService(null)
  }
  
  const handleAddToCart = (menuItem: MenuItem | DrinkItem | any) => {
    // Extract service type and service ID from menuItem if it was passed (from ServiceDetailPage wrapper)
    // Otherwise fall back to selectedService
    let serviceType = (menuItem as any)?._serviceType || selectedService?.type
    let serviceId = (menuItem as any)?._serviceId || selectedService?.id
    
    // If serviceId is still missing, try to find it from services
    if (!serviceId && serviceType && services.length > 0) {
      const matchingService = services.find(s => s.type === serviceType)
      if (matchingService) {
        serviceId = matchingService.id
      }
    }
    
    // Clean the menuItem by removing the temporary properties
    const cleanMenuItem = { ...menuItem }
    delete (cleanMenuItem as any)._serviceType
    delete (cleanMenuItem as any)._serviceId
    
    const existing = cart.find((item) => item.menuItem.id === cleanMenuItem.id && item.serviceType === serviceType)
    if (existing) {
      setCart(
        cart.map((item) =>
          item.menuItem.id === cleanMenuItem.id && item.serviceType === serviceType
            ? { ...item, quantity: item.quantity + 1, serviceId: serviceId || item.serviceId }
            : item
        )
      )
    } else {
      setCart([...cart, { menuItem: cleanMenuItem, quantity: 1, serviceType: serviceType, serviceId: serviceId }])
    }
    toast.success(`${cleanMenuItem.name} added to cart`)
  }
  
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.menuItem.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }
  
  const handleRemoveItem = (itemId: string) => {
    setCart(cart.filter((item) => item.menuItem.id !== itemId))
    toast.success('Item removed from cart')
  }
  
  const handleCheckout = () => {
    setShowCartDrawer(false)
    setCurrentView('checkout')
  }
  
  const handleCheckoutSubmit = async (order: {
    roomNumber: string
    guestName: string
    guestPhone: string
    specialInstructions: string
    items: CartItem[]
    total: number
    subtotal: number
    discountAmount: number
  }) => {
    // Prevent multiple submissions
    if (isSubmittingOrder) {
      logger.warn('Order submission already in progress, ignoring duplicate request')
      return
    }

    setIsSubmittingOrder(true)
    
    try {
      // Generate idempotency key based on order content
      const orderFingerprint = JSON.stringify({
        hotel_id: hotelId,
        room_number: order.roomNumber || roomNumber || '',
        guest_name: order.guestName,
        guest_phone: order.guestPhone,
        items: order.items.map(item => ({
          id: item.menuItem?.id || item.id,
          quantity: item.quantity,
        })),
        total: order.total,
      })
      const idempotencyKey = btoa(orderFingerprint).slice(0, 64) // Base64 encode and limit length

      // Create order with validation
      const response = await fetch('/api/guest/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotel_id: hotelId,
          room_number: order.roomNumber || roomNumber || '',
          guest_name: order.guestName,
          guest_phone: order.guestPhone,
          items: order.items,
          total: order.total,
          subtotal: order.subtotal,
          discount_amount: order.discountAmount,
          order_type: selectedService?.type === 'restaurant' ? 'restaurant_order' : selectedService?.type === 'bar' ? 'bar_order' : 'room_service_order',
          special_instructions: order.specialInstructions || null,
          payment_method: 'room_charge',
          idempotency_key: idempotencyKey, // Prevent duplicate orders
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // Handle validation errors
        const errorMessage = data.error || 'Failed to place order'
        toast.error(errorMessage, { duration: 5000 })
        return
      }
      
      // Order created successfully
      const orderNumber = data.order?.order_number || 'N/A'
      toast.success(
        `Order #${orderNumber} placed successfully! Total: $${order.total.toFixed(2)}. Your order will be delivered to room ${order.roomNumber} shortly.`,
        { duration: 5000 }
      )
      setCart([])
      // Clear cart from localStorage after successful order
      if (typeof window !== 'undefined') {
        try {
          const storageKey = `guest_cart_${hotelId}${roomNumber ? `_${roomNumber}` : ''}`
          localStorage.removeItem(storageKey)
        } catch (error) {
          logger.error('Error clearing cart from localStorage:', error)
        }
      }
      setCurrentView('orders')
      setSelectedService(null)
    } catch (error) {
      logger.error('Error placing order:', error)
      toast.error('Failed to place order. Please try again.')
    } finally {
      setIsSubmittingOrder(false)
    }
  }
  
  const handleBookingSubmit = async (booking: {
    serviceName: string
    guestName: string
    roomNumber: string
    date: string
    time: string
    notes?: string
  }) => {
    try {
      const response = await fetch('/api/guest/service-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotel_id: hotelId,
          title: `Booking: ${booking.serviceName} - ${booking.guestName}`,
          description: `Booking Details:\nService: ${booking.serviceName}\nDate: ${booking.date}\nTime: ${booking.time}\nRoom: ${booking.roomNumber || roomNumber || 'N/A'}\n\nNotes: ${booking.notes || 'None'}`,
          request_type: selectedService?.type === 'spa' ? 'spa_booking' : 'fitness_booking',
          priority: 'normal',
          status: 'pending',
          guest_name: booking.guestName,
          guest_phone: null,
          guest_email: null,
          room_number: booking.roomNumber || roomNumber || null,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit booking')
      }
      
      toast.success(
        `Booking request received! We'll confirm your ${booking.serviceName} appointment for ${booking.date} at ${booking.time} shortly.`
      )
      setShowBookingForm(false)
    } catch (error) {
      logger.error('Error submitting booking:', error)
      toast.error('Failed to submit booking. Please try again.')
    }
  }
  
  const handleBackToService = () => {
    // If selectedService is not available, go back to home instead
    // This prevents blank screen when navigating back from checkout
    if (selectedService) {
      setCurrentView('service')
    } else {
      setCurrentView('home')
    }
  }
  
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  
  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" richColors />
      
      {/* Floating Cart/Orders Button - Visible on all pages when scrolling */}
      <FloatingCartButton
        onCartClick={() => setShowCartDrawer(true)}
        onOrdersClick={() => setCurrentView('orders')}
        cartItemCount={cartItemCount}
        roomNumber={roomNumber || undefined}
      />
      
             {currentView === 'home' && (
               <HomePage
                 hotel={hotel}
                 services={services}
                 onServiceClick={handleServiceClick}
                 onCartClick={() => setShowCartDrawer(true)}
                 cartItemCount={cartItemCount}
                 roomNumber={roomNumber || undefined}
                 guestName={guestName}
                 hotelId={hotelId}
               />
             )}
      
      {/* Cart Drawer for Home Page */}
      {currentView === 'home' && (
        <CartDrawer
          isOpen={showCartDrawer}
          onClose={() => setShowCartDrawer(false)}
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
        />
      )}
      
      {currentView === 'service' && selectedService && (
        <>
          <ServiceDetailPage
            service={selectedService}
            onBack={handleBackToHome}
            onAddToCart={handleAddToCart}
            onCartClick={() => setShowCartDrawer(true)}
            cartItemCount={cartItemCount}
            onBookClick={() => {}}
            roomNumber={roomNumber || undefined}
            hotelId={hotelId}
          />
          
          <CartDrawer
            isOpen={showCartDrawer}
            onClose={() => setShowCartDrawer(false)}
            cart={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
          />
        </>
      )}
      
      {currentView === 'checkout' && (
        <CheckoutPage
          cart={cart}
          onBack={handleBackToService}
          onSubmit={handleCheckoutSubmit}
          defaultRoomNumber={roomNumber || undefined}
          hotelId={hotelId}
          onCartClick={() => setShowCartDrawer(true)}
          cartItemCount={cartItemCount}
          serviceType={selectedService?.type}
        />
      )}
      
      {currentView === 'orders' && (
        <OrderStatusPage
          hotelId={hotelId}
          roomNumber={roomNumber}
          onBack={() => setCurrentView('home')}
          onCartClick={() => setShowCartDrawer(true)}
          cartItemCount={cartItemCount}
        />
      )}
      
      {/* Booking Form Modal */}
      {showBookingForm && selectedService && (
        <BookingForm
          service={selectedService}
          onClose={() => setShowBookingForm(false)}
          onSubmit={handleBookingSubmit}
          defaultRoomNumber={roomNumber || undefined}
          hotelId={hotelId}
        />
      )}

      {/* Promotional Banner Carousel (Instagram stories style) */}
      {showPromoBanner && visiblePromotions.length > 0 && (
        <PromotionalBannerCarousel
          promotions={visiblePromotions}
          hotelId={hotelId}
          roomNumber={roomNumber}
          onClose={() => {
            setShowPromoBanner(false)
            // Mark all visible promotions as dismissed
            if (typeof window !== 'undefined') {
              visiblePromotions.forEach(promotion => {
                localStorage.setItem(`promo_dismissed_${promotion.id}`, 'true')
              })
            }
            setShowPromoBadge(true)
          }}
          onMinimize={() => {
            setShowPromoBanner(false)
            // Mark all visible promotions as dismissed
            if (typeof window !== 'undefined') {
              visiblePromotions.forEach(promotion => {
                localStorage.setItem(`promo_dismissed_${promotion.id}`, 'true')
              })
            }
            setShowPromoBadge(true)
          }}
        />
      )}

      {/* Promotional Badge (minimized) - shows if any promotions exist */}
      {showPromoBadge && activePromotions.length > 0 && !showPromoBanner && (
        <PromotionalBadge
          promotionId={activePromotions[0].id}
          hotelId={hotelId}
          onExpand={() => {
            setShowPromoBadge(false)
            setShowPromoBanner(true)
            // Clear dismissal for all promotions to show them again
            if (typeof window !== 'undefined') {
              activePromotions.forEach(promotion => {
                localStorage.removeItem(`promo_dismissed_${promotion.id}`)
              })
            }
          }}
        />
      )}

      {/* Cookie Consent Banner */}
      <CookieConsentBanner
        hotelId={hotelId}
        sessionId={getOrCreateSessionId()}
        roomNumber={roomNumber || undefined}
      />
    </div>
  )
}

