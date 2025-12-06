'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, Clock, Tag, TrendingUp, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from 'sonner'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import Image from 'next/image'

interface Promotion {
  id: string
  hotel_id: string
  title: string
  description: string | null
  short_description: string | null
  image_url: string | null
  banner_duration_seconds: number
  is_active: boolean
  show_banner: boolean
  show_always: boolean
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  days_of_week: number[]
  discount_type: 'percentage' | 'fixed_amount' | 'free_item'
  discount_value: number
  min_order_amount: number
  max_discount_amount: number | null
  applies_to_all_products: boolean
  applies_to_service_types: string[] | null
  created_at: string
  updated_at: string | null
}

export default function PromotionsPage() {
  const router = useRouter()
  const hotelId = useSelectedHotel()
  const queryClient = useQueryClient()

  const { data: promotions = [], isLoading } = useQuery<Promotion[]>({
    queryKey: ['promotions', hotelId],
    queryFn: async () => {
      if (!hotelId) return []
      const response = await fetch(`/api/promotions?hotel_id=${hotelId}`)
      if (!response.ok) throw new Error('Failed to fetch promotions')
      const data = await response.json()
      return data.promotions
    },
    enabled: !!hotelId,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/promotions/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete promotion')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', hotelId] })
      toast.success('Promotion deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete promotion')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/promotions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive }),
      })
      if (!response.ok) throw new Error('Failed to update promotion')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions', hotelId] })
      toast.success('Promotion updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update promotion')
    },
  })

  if (!hotelId) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Please select a hotel first</p>
      </div>
    )
  }

  // Calculate statistics
  const stats = {
    total: promotions.length,
    active: promotions.filter(p => p.is_active && p.show_banner).length,
    inactive: promotions.filter(p => !p.is_active || !p.show_banner).length,
    withBanner: promotions.filter(p => p.show_banner && p.image_url).length,
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5)
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Promotions</h1>
            <p className="text-sm sm:text-base text-gray-600">Create and manage special offers, discounts, and promotional campaigns</p>
        </div>
          <Button 
            onClick={() => router.push('/admin/promotions/new')}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
          Create Promotion
        </Button>
        </div>

        {/* Statistics Cards */}
        {!isLoading && promotions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Active</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Inactive</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-600">{stats.inactive}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                  <EyeOff className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">With Banner</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.withBanner}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading promotions...</p>
          </div>
        </div>
      ) : promotions.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No promotions yet</h3>
            <p className="text-gray-600 mb-6">Create your first promotion to start offering special deals and discounts to your guests.</p>
            <Button 
              onClick={() => router.push('/admin/promotions/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Create Your First Promotion
            </Button>
        </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {promotions.map((promotion) => {
            const isActive = promotion.is_active && promotion.show_banner
            const discountText = promotion.discount_type === 'percentage'
              ? `${promotion.discount_value}% OFF`
              : `$${promotion.discount_value.toFixed(2)} OFF`

            return (
              <Card
              key={promotion.id}
                className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200"
              >
                {/* Image Header */}
                {promotion.image_url ? (
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    <Image
                      src={promotion.image_url}
                      alt={promotion.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                        isActive
                          ? 'bg-green-500/90 text-white border border-green-400'
                          : 'bg-gray-500/90 text-white border border-gray-400'
                      }`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Discount Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg border-2 border-white/30">
                        {discountText}
                      </span>
                    </div>

                    {/* Title Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-lg font-bold text-white mb-1 drop-shadow-lg line-clamp-1">
                        {promotion.title}
                      </h3>
                  {promotion.short_description && (
                        <p className="text-sm text-white/90 drop-shadow-md line-clamp-1">
                          {promotion.short_description}
                        </p>
                  )}
                </div>
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                        isActive
                          ? 'bg-green-500/90 text-white border border-green-400'
                          : 'bg-gray-500/90 text-white border border-gray-400'
                      }`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-bold rounded-full border border-white/30">
                        {discountText}
                      </span>
                    </div>
                    <div className="relative z-10 text-center px-4">
                      <ImageIcon className="w-12 h-12 text-white/80 mx-auto mb-2" />
                      <h3 className="text-lg font-bold text-white mb-1 drop-shadow-lg">
                        {promotion.title}
                      </h3>
                      {promotion.short_description && (
                        <p className="text-sm text-white/90 drop-shadow-md">
                          {promotion.short_description}
                        </p>
                      )}
                </div>
              </div>
                )}

                {/* Content Section */}
                <div className="p-4 sm:p-5">
                  {/* Details */}
                  <div className="space-y-3 mb-4">
                    {/* Discount Info */}
                    <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg">
                      <span className="text-xs font-medium text-gray-600">Discount</span>
                      <span className="text-sm font-bold text-blue-700">
                    {promotion.discount_type === 'percentage'
                      ? `${promotion.discount_value}%`
                      : `$${promotion.discount_value.toFixed(2)}`}
                  </span>
                </div>

                    {/* Time Range */}
                {(promotion.start_time || promotion.end_time) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">
                      {promotion.start_time && promotion.end_time
                            ? `${formatTime(promotion.start_time)} - ${formatTime(promotion.end_time)}`
                            : promotion.start_time ? formatTime(promotion.start_time) : formatTime(promotion.end_time!)}
                    </span>
                  </div>
                )}

                    {/* Date Range */}
                {(promotion.start_date || promotion.end_date) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">
                      {promotion.start_date && promotion.end_date
                            ? `${formatDate(promotion.start_date)} - ${formatDate(promotion.end_date)}`
                            : promotion.start_date ? `From ${formatDate(promotion.start_date)}` : `Until ${formatDate(promotion.end_date!)}`}
                    </span>
                  </div>
                )}

                    {/* Service Types */}
                    {promotion.applies_to_service_types && promotion.applies_to_service_types.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {promotion.applies_to_service_types.slice(0, 3).map((type) => (
                          <span
                            key={type}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md capitalize"
                          >
                            {type}
                          </span>
                        ))}
                        {promotion.applies_to_service_types.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md">
                            +{promotion.applies_to_service_types.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Additional Info */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      {promotion.show_banner && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5" />
                          Banner
                        </span>
                      )}
                      {promotion.show_always && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Always On
                        </span>
                      )}
                      {promotion.min_order_amount > 0 && (
                        <span className="flex items-center gap-1">
                          Min: ${promotion.min_order_amount}
                  </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <Button
                      onClick={() => router.push(`/admin/promotions/${promotion.id}/edit`)}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs sm:text-sm"
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => toggleActiveMutation.mutate({ id: promotion.id, isActive: !promotion.is_active })}
                      variant="outline"
                      size="sm"
                      className={`text-xs sm:text-sm ${
                        promotion.is_active
                          ? 'text-orange-600 hover:bg-orange-50 border-orange-200'
                          : 'text-green-600 hover:bg-green-50 border-green-200'
                      }`}
                    >
                      {promotion.is_active ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Deactivate</span>
                          <span className="sm:hidden">Off</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Activate</span>
                          <span className="sm:hidden">On</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this promotion? This action cannot be undone.')) {
                          deleteMutation.mutate(promotion.id)
                        }
                      }}
                      variant="danger"
                      size="sm"
                      className="text-xs sm:text-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
