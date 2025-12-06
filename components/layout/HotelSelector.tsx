'use client'

import { useState, useEffect } from 'react'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export function HotelSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const [hotels, setHotels] = useState<any[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHotels()
  }, [])

  useEffect(() => {
    // Get selected hotel from localStorage, but only if it's in the user's accessible hotels
    if (typeof window !== 'undefined' && hotels.length > 0) {
      const savedHotel = localStorage.getItem('selectedHotelId')
      if (savedHotel && hotels.find((h: any) => h.id === savedHotel)) {
        // Saved hotel is still accessible, use it
        setSelectedHotel(savedHotel)
      } else {
        // Saved hotel is no longer accessible or doesn't exist, use first available
        setSelectedHotel(hotels[0].id)
        localStorage.setItem('selectedHotelId', hotels[0].id)
      }
    } else if (hotels.length === 0 && typeof window !== 'undefined') {
      // User has no accessible hotels, clear selection
      setSelectedHotel('')
      localStorage.removeItem('selectedHotelId')
    }
  }, [hotels])

  const loadHotels = async () => {
    try {
      const user = await getCurrentUserClient()
      if (!user) return

      // Get hotels assigned to this user from hotel_users table
      const { data: hotelAssignments, error } = await supabase
        .from('hotel_users')
        .select('hotel_id, hotels(*)')
        .eq('user_id', user.id)
        .eq('is_deleted', false)

      if (error) {
        logger.error('Failed to load hotel assignments:', error)
        throw error
      }

      // Extract hotels from assignments and filter out null/undefined
      const userHotels = (hotelAssignments || [])
        .map((assignment: any) => assignment.hotels)
        .filter((hotel): hotel is any => Boolean(hotel) && typeof hotel === 'object' && 'id' in hotel)
        // Also filter out inactive hotels if needed
        .filter((hotel: any) => hotel.active !== false)

      setHotels(userHotels)

      if (userHotels.length > 0) {
        const savedHotel = typeof window !== 'undefined' ? localStorage.getItem('selectedHotelId') : null
        // Only use saved hotel if it's in the user's accessible hotels
        const initialHotel = savedHotel && userHotels.find((h: any) => h.id === savedHotel)
          ? savedHotel
          : userHotels[0].id
        setSelectedHotel(initialHotel)
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedHotelId', initialHotel)
        }
      } else {
        // Clear selected hotel if user has no accessible hotels
        setSelectedHotel('')
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedHotelId')
        }
      }
    } catch (error) {
      logger.error('Failed to load hotels:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleHotelChange = (hotelId: string) => {
    // Validate that the selected hotel is in the user's accessible hotels
    const isValidHotel = hotels.find((h: any) => h.id === hotelId)
    if (!isValidHotel) {
      logger.error('Selected hotel is not accessible to user')
      return
    }

    setSelectedHotel(hotelId)
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedHotelId', hotelId)
      // Dispatch custom event to notify other components
      window.dispatchEvent(new Event('hotelSelectionChanged'))
    }
    // Refresh the page to update data
    router.refresh()
  }

  // Don't show if:
  // - Still loading
  // - User has no hotels assigned
  // - User has only one hotel (no need to select)
  // - User is super admin (they can access all hotels, but we still show selector if they have multiple assigned)
  if (loading || hotels.length === 0 || hotels.length === 1) {
    return null
  }

  return (
    <div className="px-3 py-2 border-b border-gray-200">
      <label className="block text-xs font-medium text-gray-700 mb-1.5">Hotel</label>
      <select
        value={selectedHotel}
        onChange={(e) => handleHotelChange(e.target.value)}
        className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        {hotels.map((hotel) => (
          <option key={hotel.id} value={hotel.id}>
            {extractTextFromJson(hotel.title)}
          </option>
        ))}
      </select>
    </div>
  )
}

// Hook to get selected hotel ID - synchronized across all pages
export function useSelectedHotel() {
  const [selectedHotel, setSelectedHotel] = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Get initial value from localStorage
    const saved = localStorage.getItem('selectedHotelId')
    if (saved) {
      setSelectedHotel(saved)
    }

    // Listen for storage changes (when hotel is changed in another tab/component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedHotelId' && e.newValue) {
        setSelectedHotel(e.newValue)
      }
    }

    // Listen for custom events (when hotel is changed in same tab)
    const handleCustomStorageChange = () => {
      const saved = localStorage.getItem('selectedHotelId')
      if (saved) {
        setSelectedHotel(saved)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('hotelSelectionChanged', handleCustomStorageChange)

    // Removed periodic polling - storage events and custom events are sufficient
    // This reduces unnecessary localStorage reads and state updates

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('hotelSelectionChanged', handleCustomStorageChange)
    }
  }, [selectedHotel])

  return selectedHotel
}

