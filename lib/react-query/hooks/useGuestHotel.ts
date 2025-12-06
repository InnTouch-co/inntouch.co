'use client'

import { useQuery } from '@tanstack/react-query'
import { getHotelById } from '@/lib/database/hotels'
import type { Hotel } from '@/types/database'

export function useGuestHotel(hotelId: string) {
  return useQuery({
    queryKey: ['guest-hotel', hotelId],
    queryFn: async () => {
      const hotel = await getHotelById(hotelId)
      if (!hotel.active) {
        throw new Error('Hotel is not active')
      }
      return hotel
    },
    enabled: !!hotelId,
    staleTime: 30 * 1000, // 30 seconds - shorter cache for faster updates
  })
}

