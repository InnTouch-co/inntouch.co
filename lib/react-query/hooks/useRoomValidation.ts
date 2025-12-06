'use client'

import { useQuery } from '@tanstack/react-query'

export function useRoomValidation(hotelId: string | undefined, roomNumber: string | null) {
  return useQuery({
    queryKey: ['room-validation', hotelId, roomNumber],
    queryFn: async () => {
      if (!hotelId || !roomNumber) {
        return { exists: true } // If no room number provided, don't validate
      }
      
      const response = await fetch(
        `/api/guest/room-exists?hotel_id=${encodeURIComponent(hotelId)}&room_number=${encodeURIComponent(roomNumber)}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to validate room')
      }
      
      const data = await response.json()
      return { exists: data.exists }
    },
    enabled: !!hotelId && !!roomNumber, // Only run if both hotelId and roomNumber are provided
    staleTime: 5 * 60 * 1000, // 5 minutes - rooms don't change often
  })
}

