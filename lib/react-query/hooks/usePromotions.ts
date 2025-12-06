'use client'

import { useQuery } from '@tanstack/react-query'

export interface Promotion {
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
  created_by: string | null
  created_at: string
  updated_at: string | null
  is_deleted: boolean
}

/**
 * Hook to fetch all active promotions for guest site (Instagram stories style)
 * Optimized with caching and refetch intervals
 */
export function useActivePromotion(hotelId: string | undefined) {
  return useQuery<Promotion[]>({
    queryKey: ['active-promotions', hotelId],
    queryFn: async () => {
      if (!hotelId) return []
      
      const response = await fetch(`/api/guest/promotions/active?hotel_id=${encodeURIComponent(hotelId)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch active promotions')
      }
      const data = await response.json()
      return data.promotions || []
    },
    enabled: !!hotelId,
    staleTime: 60 * 1000, // 1 minute - promotions don't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes to check for new promotions
  })
}

/**
 * Hook to fetch active promotion for discount purposes (not just banner)
 * This checks all active promotions, not just those with banners
 */
export function useActivePromotionForDiscount(hotelId: string | undefined, serviceType?: string) {
  return useQuery<Promotion | null>({
    queryKey: ['active-promotion-discount', hotelId, serviceType],
    queryFn: async () => {
      if (!hotelId) {
        console.log('[useActivePromotionForDiscount] No hotelId, returning null')
        return null
      }
      
      const params = new URLSearchParams({ hotel_id: hotelId })
      if (serviceType) {
        params.append('service_type', serviceType)
      }
      
      const url = `/api/guest/promotions/active-for-discount?${params.toString()}`
      console.log('[useActivePromotionForDiscount] Fetching:', url)
      
      const response = await fetch(url)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[useActivePromotionForDiscount] API error:', response.status, errorText)
        throw new Error(`Failed to fetch active promotion for discount: ${response.status}`)
      }
      const data = await response.json()
      console.log('[useActivePromotionForDiscount] API response:', data)
      return data.promotion
    },
    enabled: !!hotelId,
    staleTime: 60 * 1000, // 1 minute - promotions don't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes to check for new promotions
  })
}

