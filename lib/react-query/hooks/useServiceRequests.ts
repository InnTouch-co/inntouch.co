import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ServiceRequest } from '@/lib/database/service-requests'

export interface ServiceRequestStats {
  pending: number
  inProgress: number
  completedToday: number
  avgResponseMinutes: number
}

// Fetch service requests for a hotel
export function useServiceRequests(hotelId: string | null) {
  return useQuery<ServiceRequest[]>({
    queryKey: ['service-requests', hotelId],
    queryFn: async () => {
      if (!hotelId) throw new Error('Hotel ID is required')
      
      const response = await fetch(`/api/service-requests?hotel_id=${hotelId}`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch service requests' }))
        throw new Error(error.error || 'Failed to fetch service requests')
      }
      return response.json()
    },
    enabled: !!hotelId, // Only fetch if hotelId exists
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 minutes
  })
}

// Fetch service request stats for a hotel
export function useServiceRequestStats(hotelId: string | null) {
  return useQuery<ServiceRequestStats>({
    queryKey: ['service-request-stats', hotelId],
    queryFn: async () => {
      if (!hotelId) throw new Error('Hotel ID is required')
      
      const response = await fetch(`/api/service-requests?hotel_id=${hotelId}&stats_only=true`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch stats' }))
        throw new Error(error.error || 'Failed to fetch stats')
      }
      return response.json()
    },
    enabled: !!hotelId,
    staleTime: 2 * 60 * 1000, // 2 minutes - stats change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
  })
}

// Mutation to update a service request (assign, change status, etc.)
export function useUpdateServiceRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ServiceRequest> }) => {
      const response = await fetch(`/api/service-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update request' }))
        throw new Error(error.error || 'Failed to update request')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch service requests and stats
      const hotelId = data.hotel_id
      queryClient.invalidateQueries({ queryKey: ['service-requests', hotelId] })
      queryClient.invalidateQueries({ queryKey: ['service-request-stats', hotelId] })
    },
  })
}

