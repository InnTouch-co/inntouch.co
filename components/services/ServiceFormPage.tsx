'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { getHotels } from '@/lib/database/hotels'
import { getServiceById } from '@/lib/database/services'
import { ServiceForm } from './ServiceForm'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import type { Service } from '@/types/database'
import { logger } from '@/lib/utils/logger'

export function ServiceFormPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const serviceId = params?.id as string | undefined
  const serviceTypeFromParams = searchParams?.get('service_type') || ''
  const hotelIdFromParams = searchParams?.get('hotel_id') || ''

  const [user, setUser] = useState<any>(null)
  const [hotels, setHotels] = useState<any[]>([])
  const selectedHotelFromNav = useSelectedHotel()
  const [selectedHotel, setSelectedHotel] = useState<string>(hotelIdFromParams || selectedHotelFromNav)
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserAndHotels()
  }, [])

  useEffect(() => {
    if (serviceId) {
      loadService()
    } else {
      setLoading(false)
    }
  }, [serviceId])

  const loadUserAndHotels = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      const userHotels = await getHotels()
      setHotels(userHotels)

      // Use hotel from navbar selector or first hotel
      const hotelFromNav = typeof window !== 'undefined' ? localStorage.getItem('selectedHotelId') : null
      const finalHotel = hotelIdFromParams || hotelFromNav || (userHotels.length > 0 ? userHotels[0].id : '')
      if (finalHotel && !selectedHotel) {
        setSelectedHotel(finalHotel)
      }
    } catch (error) {
      logger.error('Failed to load user/hotels:', error)
    }
  }

  const loadService = async () => {
    if (!serviceId) return

    try {
      setLoading(true)
      const serviceData = await getServiceById(serviceId)
      setService(serviceData)
      setSelectedHotel(serviceData.hotel_id)
    } catch (error) {
      logger.error('Failed to load service:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: any) => {
    try {
      logger.info('ServiceFormPage - Received data:', JSON.stringify(data, null, 2))
      
      if (serviceId) {
        // Update existing service
        logger.info('ServiceFormPage - Updating service:', serviceId)
        const response = await fetch(`/api/services/${serviceId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const errorData = await response.json()
          logger.error('ServiceFormPage - Update failed:', errorData)
          throw new Error(errorData.error || 'Failed to update service')
        }
        
        const result = await response.json()
        logger.info('ServiceFormPage - Update successful, menu:', JSON.stringify(result.menu, null, 2))
      } else {
        // Create new service
        logger.info('ServiceFormPage - Creating new service')
        logger.info('ServiceFormPage - Selected hotel:', selectedHotel)
        logger.info('ServiceFormPage - Data being sent:', JSON.stringify({ ...data, hotel_id: selectedHotel }, null, 2))
        logger.info('ServiceFormPage - Menu in data:', data.menu !== undefined ? 'YES' : 'NO')
        
        if (!selectedHotel) {
          throw new Error('Please select a hotel before creating a service')
        }
        
        const response = await fetch('/api/services/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            hotel_id: selectedHotel,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          logger.error('ServiceFormPage - Create failed:', errorData)
          throw new Error(errorData.error || 'Failed to create service')
        }
        
        const result = await response.json()
        logger.info('ServiceFormPage - Create successful')
        logger.info('ServiceFormPage - Created service ID:', result.id)
        logger.info('ServiceFormPage - Created service menu:', JSON.stringify(result.menu, null, 2))
      }

      router.push('/services')
    } catch (error) {
      logger.error('Failed to save service:', error)
      alert(error instanceof Error ? error.message : 'Failed to save service')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!selectedHotel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-12 text-center">
            <p className="text-gray-500">Please select a hotel first.</p>
            <Button onClick={() => router.push('/services')} className="mt-4">
              Back to Services
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
            {serviceId ? 'Edit Service' : 'Create New Service'}
          </h1>
          <p className="text-xs md:text-sm text-gray-600">
            {serviceId ? 'Update service details and configuration' : 'Add a new service to your hotel'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push('/services')}
            variant="outline"
            size="sm"
            className="text-xs md:text-sm"
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
        </div>
      </div>

      <div>
        <ServiceForm
          service={service || undefined}
          serviceType={serviceTypeFromParams || undefined}
          hotelId={selectedHotel}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/services')}
        />
      </div>
    </div>
  )
}

