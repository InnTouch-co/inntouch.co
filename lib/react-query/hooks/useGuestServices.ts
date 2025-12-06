'use client'

import { useQuery } from '@tanstack/react-query'
import { getServices } from '@/lib/database/services'
import { transformDatabaseServiceToGuestService } from '@/lib/guest/utils/transformService'
import { Service } from '@/lib/guest/types'

export function useGuestServices(hotelId: string) {
  return useQuery({
    queryKey: ['guest-services', hotelId],
    queryFn: async () => {
      const dbServices = await getServices(hotelId)
      const guestServices = dbServices
        .map(transformDatabaseServiceToGuestService)
        .filter((s): s is Service => s !== null)
        .sort((a, b) => {
          // Sort by display_order if available, otherwise by title
          const orderA = a.display_order ?? 999
          const orderB = b.display_order ?? 999
          if (orderA !== orderB) {
            return orderA - orderB
          }
          // If display_order is the same, sort by title
          return a.title.localeCompare(b.title)
        })
      return guestServices
    },
    enabled: !!hotelId,
    staleTime: 30 * 1000, // 30 seconds - shorter cache for faster updates
  })
}

export function useGuestService(serviceId: string, hotelId: string) {
  return useQuery({
    queryKey: ['guest-service', serviceId, hotelId],
    queryFn: async () => {
      const { getServiceById } = await import('@/lib/database/services')
      const dbService = await getServiceById(serviceId)
      if (dbService.hotel_id !== hotelId) {
        throw new Error('Service does not belong to this hotel')
      }
      const guestService = transformDatabaseServiceToGuestService(dbService)
      if (!guestService) {
        throw new Error('Service not found or inactive')
      }
      return guestService
    },
    enabled: !!serviceId && !!hotelId,
    staleTime: 5 * 60 * 1000,
  })
}

