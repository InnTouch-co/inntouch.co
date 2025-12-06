'use client'

import { Service, MenuItem, DrinkItem, CartItem } from '@/lib/guest/types'
import { StatusBadge } from './StatusBadge'
import { ImageGalleryCarousel } from './ImageGalleryCarousel'
import { OperatingHours } from './OperatingHours'
import { ContactInfo } from './ContactInfo'
import { MenuItemCard } from './MenuItemCard'
import { MenuSection } from './MenuSection'
import { DrinksSection } from './DrinksSection'
import { GuestNavbar } from './GuestNavbar'
import { formatTime } from '@/lib/guest/utils/serviceHelpers'
import { useActivePromotionForDiscount } from '@/lib/react-query/hooks/usePromotions'
import Image from 'next/image'
import { Tag } from 'lucide-react'
import { useEffect } from 'react'

interface ServiceDetailPageProps {
  service: Service
  onBack: () => void
  onAddToCart: (item: MenuItem | DrinkItem) => void
  onCartClick: () => void
  cartItemCount: number
  onBookClick: () => void
  roomNumber?: string
  hotelId?: string
}

export function ServiceDetailPage({
  service,
  onBack,
  onAddToCart,
  onCartClick,
  cartItemCount,
  onBookClick,
  roomNumber,
  hotelId,
}: ServiceDetailPageProps) {
  const hasMenu = (service.menu && service.menu.length > 0) || (service.drinks && service.drinks.length > 0)
  
  // Wrapper to ensure service type and service ID are included when adding to cart
  const handleAddToCartWithServiceType = (item: MenuItem | DrinkItem) => {
    // Create a cart item with service type and service ID included
    const cartItem = { ...item, _serviceType: service.type, _serviceId: service.id } as any
    onAddToCart(cartItem)
  }
  
  // Fetch active promotion for discount (only for restaurant/bar)
  const shouldCheckPromotion = service.type === 'restaurant' || service.type === 'bar'
  const { data: activePromotion, isLoading: promotionLoading, error: promotionError } = useActivePromotionForDiscount(
    shouldCheckPromotion ? hotelId : undefined,
    shouldCheckPromotion ? service.type : undefined
  )
  
  // Removed debug logging for performance
  
  // Show badge if promotion exists and applies to this service
  const showDiscountBadge = !!activePromotion
  
  // Format discount text
  const getDiscountText = () => {
    if (!activePromotion) return ''
    if (activePromotion.discount_type === 'percentage') {
      return `${activePromotion.discount_value}% OFF`
    } else if (activePromotion.discount_type === 'fixed_amount') {
      return `$${activePromotion.discount_value.toFixed(2)} OFF`
    }
    return ''
  }
  
  return (
    <div className="min-h-screen bg-gray-900 overflow-x-hidden">
      {/* Header */}
      <GuestNavbar
        onBack={onBack}
        onCartClick={onCartClick}
        cartItemCount={cartItemCount}
      />
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        {/* Service Title and Description */}
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-white mb-2">{service.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge service={service} variant="dark" />
              {showDiscountBadge && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  {getDiscountText()}
                </span>
              )}
            </div>
          </div>
          <p className="text-gray-300 text-lg mb-6">{service.description}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            {service.photos && service.photos.length > 0 && (
              <ImageGalleryCarousel images={service.photos} title="Gallery" />
            )}
            
            {/* Menu */}
            {service.menu && service.menu.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-white">Menu</h2>
                </div>
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 All prices are pre-tax. Final amount includes applicable taxes.
                  </p>
                </div>
                <MenuSection
                  categories={service.menu}
                  onAddToCart={handleAddToCartWithServiceType}
                />
              </div>
            )}
            
            {/* Drinks (Bar) */}
            {service.drinks && service.drinks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-white">Drinks</h2>
                </div>
                {/* Happy Hour Times */}
                {service.type === 'bar' && service.settings?.happy_hour_start && service.settings?.happy_hour_end && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-lg font-semibold text-yellow-300">Happy Hour</h3>
                    </div>
                    <p className="text-sm text-yellow-200">
                      {formatTime(service.settings.happy_hour_start)} - {formatTime(service.settings.happy_hour_end)}
                    </p>
                  </div>
                )}
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 All prices are pre-tax. Final amount includes applicable taxes.
                  </p>
                </div>
                <DrinksSection
                  drinks={service.drinks}
                  onAddToCart={handleAddToCartWithServiceType}
                />
              </div>
            )}
            
            {/* Spa Services */}
            {service.spaServices && service.spaServices.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Spa Services</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.spaServices.map((spaService) => (
                    <div
                      key={spaService.id}
                      className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xl font-semibold text-white">{spaService.name}</h3>
                          <span className="text-lg font-bold text-white">${spaService.price.toFixed(2)}</span>
                        </div>
                        {spaService.duration && (
                          <p className="text-sm text-gray-300 mb-3">
                            Duration: {spaService.duration} minutes
                          </p>
                        )}
                        {spaService.description && (
                          <p className="text-gray-300 text-sm">{spaService.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Fitness/Gym Equipment and Rules */}
            {service.type === 'fitness' && service.settings && (
              <div className="space-y-6">
                {service.settings.equipment && (
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-4">Equipment</h2>
                    <div className="bg-gray-800 rounded-xl p-6">
                      <div className="whitespace-pre-line text-gray-300">
                        {service.settings.equipment}
                      </div>
                    </div>
                  </div>
                )}
                
                {service.settings.rules && (
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-4">Rules & Regulations</h2>
                    <div className="bg-gray-800 rounded-xl p-6">
                      <div className="whitespace-pre-line text-gray-300">
                        {service.settings.rules}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Laundry Services */}
            {service.laundryServices && service.laundryServices.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Laundry Service</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.laundryServices.map((laundryService, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-semibold text-white">{laundryService.name}</h3>
                        <span className="text-lg font-bold text-white">${laundryService.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {service.settings && (service.settings.turnaround_time || service.settings.pickup_delivery) && (
                  <div className="mt-6 space-y-3">
                    {service.settings.turnaround_time && (
                      <div className="bg-gray-800 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-300 mb-1">Turnaround Time</p>
                        <p className="text-gray-300">{service.settings.turnaround_time}</p>
                      </div>
                    )}
                    {service.settings.pickup_delivery && (
                      <div className="bg-gray-800 rounded-xl p-4">
                        <p className="text-sm font-medium text-gray-300 mb-1">Pickup & Delivery</p>
                        <p className="text-gray-300">Available</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Pool Rules and Information */}
            {service.type === 'pool' && service.settings && (
              <div className="space-y-6">
                {service.settings.rules && (
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-4">Rules & Regulations</h2>
                    <div className="bg-gray-800 rounded-xl p-6">
                      <div className="whitespace-pre-line text-gray-300">
                        {service.settings.rules}
                      </div>
                    </div>
                  </div>
                )}
                
                {service.settings.amenities && (
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-4">Amenities</h2>
                    <div className="bg-gray-800 rounded-xl p-6">
                      <div className="whitespace-pre-line text-gray-300">
                        {service.settings.amenities}
                      </div>
                    </div>
                  </div>
                )}
                
                {(service.settings.age_restriction || service.settings.temperature) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {service.settings.age_restriction && (
                      <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">Age Restriction</h3>
                        <p className="text-gray-300">{service.settings.age_restriction}</p>
                      </div>
                    )}
                    
                    {service.settings.temperature && (
                      <div className="bg-gray-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-2">Pool Temperature</h3>
                        <p className="text-gray-300">{service.settings.temperature}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Concierge Services */}
            {service.type === 'concierge' && service.settings && service.settings.services_offered && (
              <div>
                <h2 className="text-2xl font-semibold text-white mb-4">Services Offered</h2>
                <div className="bg-gray-800 rounded-xl p-6">
                  <div className="whitespace-pre-line text-gray-300">
                    {service.settings.services_offered}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <ContactInfo service={service} />
            <OperatingHours service={service} />
          </div>
        </div>
      </div>
    </div>
  )
}

