'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import { getHotelById, updateHotel } from '@/lib/database/hotels'
import { getServices, updateService } from '@/lib/database/services'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import type { Hotel, Service } from '@/types/database'
import { GuestSiteSettings } from '@/components/guest-settings/GuestSiteSettings'
import { logger } from '@/lib/utils/logger'

export default function GuestSettingsPage() {
  const router = useRouter()
  const selectedHotel = useSelectedHotel()
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [waitingForHotel, setWaitingForHotel] = useState(true)

  // Wait a moment for useSelectedHotel to initialize from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      setWaitingForHotel(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (waitingForHotel) return
    
    if (selectedHotel) {
      loadData()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotel, waitingForHotel])

  const loadData = async () => {
    if (!selectedHotel) return
    try {
      setLoading(true)
      setError(null)
      
      // First verify user has access to this hotel
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        throw new Error('User not authenticated')
      }
      
      // Check if user has access to this hotel
      const { data: hotelAccess, error: accessError } = await supabase
        .from('hotel_users')
        .select('id')
        .eq('hotel_id', selectedHotel)
        .eq('user_id', currentUser.id)
        .eq('is_deleted', false)
        .maybeSingle()
      
      if (accessError) {
        logger.error('Error checking hotel access:', accessError)
        throw new Error(`Access check failed: ${accessError.message}`)
      }
      
      if (!hotelAccess) {
        throw new Error('You do not have access to this hotel. Please select a different hotel from the dropdown.')
      }
      
      // Try to load hotel first
      let hotelData: Hotel | null = null
      try {
        hotelData = await getHotelById(selectedHotel)
        logger.info('Hotel loaded successfully:', hotelData)
      } catch (hotelError: any) {
        logger.error('Error loading hotel - full error:', hotelError)
        logger.error('Error type:', typeof hotelError)
        logger.error('Error keys:', Object.keys(hotelError || {}))
        
        // Extract error message from various possible formats
        let errorMsg = 'Unknown error'
        if (hotelError instanceof Error) {
          errorMsg = hotelError.message
        } else if (hotelError?.message) {
          errorMsg = hotelError.message
        } else if (hotelError?.error?.message) {
          errorMsg = hotelError.error.message
        } else if (typeof hotelError === 'string') {
          errorMsg = hotelError
        } else if (hotelError) {
          errorMsg = JSON.stringify(hotelError)
        }
        
        logger.error('Extracted error message:', errorMsg)
        
        // Check if it's a "not found" error (common Supabase error codes)
        if (
          errorMsg.includes('No rows') || 
          errorMsg.includes('not found') || 
          errorMsg.includes('PGRST116') ||
          errorMsg.includes('does not exist') ||
          hotelError?.code === 'PGRST116' ||
          hotelError?.error?.code === 'PGRST116'
        ) {
          throw new Error(`Hotel with ID ${selectedHotel} does not exist or has been deleted. Please select a different hotel from the dropdown.`)
        }
        
        throw new Error(`Failed to load hotel: ${errorMsg}`)
      }
      
      // Then load services
      let servicesData: Service[] = []
      try {
        servicesData = await getServices(selectedHotel)
        logger.info('Services loaded successfully:', servicesData.length)
      } catch (servicesError) {
        logger.error('Error loading services:', servicesError)
        // Don't fail completely if services fail, just log it
        servicesData = []
      }
      
      setHotel(hotelData)
      setServices(servicesData)
    } catch (error) {
      logger.error('Failed to load data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load hotel data'
      setError(errorMessage)
      setHotel(null)
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (settings: any) => {
    if (!hotel) return
    try {
      await updateHotel(hotel.id, settings)
      await loadData()
    } catch (error) {
      throw error
    }
  }

  const handleReorderServices = async (reorderedServices: Service[]) => {
    try {
      // Update display_order for each service
      const updates = reorderedServices.map((service, index) => 
        updateService(service.id, { display_order: index + 1 })
      )
      await Promise.all(updates)
      await loadData()
    } catch (error) {
      throw error
    }
  }

  if (waitingForHotel || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!selectedHotel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <svg className="w-16 h-16 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Hotel Selected</h2>
          <p className="text-gray-600 mb-4">
            Please select a hotel from the dropdown in the left sidebar to configure guest site settings.
          </p>
        </div>
      </div>
    )
  }

  if (error || !hotel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <svg className="w-16 h-16 text-red-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Hotel Not Found</h2>
          <p className="text-gray-600 mb-4">
            {error || 'The selected hotel could not be loaded. Please try selecting a different hotel from the dropdown.'}
          </p>
          <p className="text-sm text-gray-500">
            Selected Hotel ID: {selectedHotel}
          </p>
        </div>
      </div>
    )
  }

  return (
    <GuestSiteSettings
      hotel={hotel}
      services={services}
      onSaveSettings={handleSaveSettings}
      onReorderServices={handleReorderServices}
    />
  )
}

