'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { GuestNavbar } from '@/components/guest/GuestNavbar'
import { Clock, Calendar, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function PromotionDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const hotelId = params.hotelId as string
  const promotionId = params.id as string
  const roomNumber = searchParams.get('room')

  const { data: promotion, isLoading, error } = useQuery({
    queryKey: ['promotion', promotionId, hotelId],
    queryFn: async () => {
      const response = await fetch(`/api/guest/promotions/${promotionId}?hotel_id=${hotelId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch promotion' }))
        throw new Error(errorData.error || 'Failed to fetch promotion')
      }
      const data = await response.json()
      return data.promotion
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  const getBackUrl = () => {
    const baseUrl = `/guest/${hotelId}`
    return roomNumber ? `${baseUrl}?room=${roomNumber}` : baseUrl
  }

  if (error || !promotion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Promotion Not Found</h1>
          <p className="text-white/70 mb-6">{error?.message || 'The promotion you are looking for does not exist.'}</p>
          <Button onClick={() => router.push(getBackUrl())}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <GuestNavbar
        onBack={() => router.push(getBackUrl())}
        title="Special Offer"
      />

      <div className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Image Section */}
          {promotion.image_url && (
            <div className="relative w-full h-80 md:h-[500px] rounded-3xl overflow-hidden mb-8 shadow-2xl border-2 border-white/20">
              <img
                src={promotion.image_url}
                alt={promotion.title}
                className="w-full h-full object-cover"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              
              {/* Title on Image */}
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 drop-shadow-2xl">
                  {promotion.title}
                </h1>
                {promotion.short_description && (
                  <p className="text-xl md:text-2xl text-white/90 drop-shadow-lg max-w-3xl">
                    {promotion.short_description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Main Content Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-10 shadow-2xl">
            {/* Description */}
            {promotion.description && (
              <div className="mb-8">
                <p className="text-white/90 text-lg md:text-xl leading-relaxed whitespace-pre-line">
                  {promotion.description}
                </p>
              </div>
            )}

            {/* Discount Badge - Prominent */}
            <div className="relative mb-8">
              <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-2xl p-8 shadow-xl border-2 border-white/30">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                      <Tag className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-white/80 text-sm md:text-base mb-1">Special Discount</p>
                      {promotion.discount_type === 'percentage' && (
                        <p className="text-4xl md:text-5xl font-bold text-white">
                          {promotion.discount_value}% OFF
                        </p>
                      )}
                      {promotion.discount_type === 'fixed_amount' && (
                        <p className="text-4xl md:text-5xl font-bold text-white">
                          ${promotion.discount_value.toFixed(2)} OFF
                        </p>
                      )}
                      {promotion.max_discount_amount && (
                        <p className="text-white/90 text-sm mt-1">
                          Up to ${promotion.max_discount_amount.toFixed(2)} savings
                        </p>
                      )}
                    </div>
                  </div>
                  {promotion.min_order_amount > 0 && (
                    <div className="text-right">
                      <p className="text-white/80 text-sm">Minimum Order</p>
                      <p className="text-2xl font-bold text-white">${promotion.min_order_amount.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {/* Time Restrictions */}
              {(promotion.start_time || promotion.end_time) && (
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Valid Hours</h3>
                  </div>
                  <p className="text-white/90 text-base">
                    {promotion.start_time && promotion.end_time
                      ? `${formatTime(promotion.start_time)} - ${formatTime(promotion.end_time)}`
                      : promotion.start_time
                      ? `From ${formatTime(promotion.start_time)}`
                      : `Until ${formatTime(promotion.end_time!)}`}
                  </p>
                </div>
              )}

              {/* Date Range */}
              {(promotion.start_date || promotion.end_date) && (
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Valid Dates</h3>
                  </div>
                  <p className="text-white/90 text-base">
                    {promotion.start_date && promotion.end_date
                      ? `${formatDate(promotion.start_date)} - ${formatDate(promotion.end_date)}`
                      : promotion.start_date
                      ? `From ${formatDate(promotion.start_date)}`
                      : `Until ${formatDate(promotion.end_date!)}`}
                  </p>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <button
              onClick={() => {
                const backUrl = getBackUrl()
                router.push(backUrl)
                // Scroll to services section after navigation
                setTimeout(() => {
                  const servicesSection = document.querySelector('[data-section="services"]')
                  if (servicesSection) {
                    servicesSection.scrollIntoView({ behavior: 'smooth' })
                  }
                }, 100)
              }}
              className="w-full px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white/20 transition-all hover:scale-105 font-semibold"
            >
              Order now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${minutes} ${period}`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

