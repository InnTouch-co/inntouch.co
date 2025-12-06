import { useQuery } from '@tanstack/react-query'
import type { Order } from '@/lib/database/orders'

export function useOrders(hotelId: string | null) {
  return useQuery<Order[]>({
    queryKey: ['orders', hotelId],
    queryFn: async () => {
      if (!hotelId) return []
      
      const response = await fetch(`/api/orders?hotel_id=${hotelId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      return response.json()
    },
    enabled: !!hotelId,
    refetchInterval: 60000, // Refetch every 60 seconds (reduced from 30s)
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes (formerly cacheTime)
  })
}

