'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { getHotels } from '@/lib/database/hotels'
import { RestaurantIcon, BarIcon, SpaIcon, GymIcon, PoolIcon, LaundryIcon, ConciergeIcon, RoomServiceIcon, AdditionalIcon, OtherIcon } from '@/components/ui/ServiceIcons'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import { getBackgroundImage } from '@/lib/services/backgroundUtils'
import type { Service } from '@/types/database'
import { logger } from '@/lib/utils/logger'

// Glass gradient backgrounds for each service type - more vibrant and noticeable
const getGlassGradient = (type: string) => {
  const gradients: Record<string, string> = {
    restaurant: 'bg-gradient-to-br from-amber-500/40 via-orange-400/35 to-amber-600/45 backdrop-blur-md',
    bar: 'bg-gradient-to-br from-purple-500/40 via-indigo-400/35 to-purple-600/45 backdrop-blur-md',
    spa: 'bg-gradient-to-br from-pink-500/40 via-rose-400/35 to-pink-600/45 backdrop-blur-md',
    gym: 'bg-gradient-to-br from-red-500/40 via-orange-400/35 to-red-600/45 backdrop-blur-md',
    pool: 'bg-gradient-to-br from-blue-500/40 via-cyan-400/35 to-blue-600/45 backdrop-blur-md',
    laundry: 'bg-gradient-to-br from-cyan-500/40 via-teal-400/35 to-cyan-600/45 backdrop-blur-md',
    concierge: 'bg-gradient-to-br from-indigo-500/40 via-blue-400/35 to-indigo-600/45 backdrop-blur-md',
    room_service: 'bg-gradient-to-br from-yellow-500/40 via-amber-400/35 to-yellow-600/45 backdrop-blur-md',
    additional: 'bg-gradient-to-br from-gray-500/40 via-slate-400/35 to-gray-600/45 backdrop-blur-md',
    other: 'bg-gradient-to-br from-slate-500/40 via-gray-400/35 to-slate-600/45 backdrop-blur-md',
  }
  return gradients[type] || gradients.other
}

// Service type definitions with icons and colors
const SERVICE_TYPES = [
  { id: 'restaurant', label: 'Restaurant', icon: RestaurantIcon, color: 'bg-orange-100 text-orange-700', borderColor: 'border-orange-300' },
  { id: 'bar', label: 'Bar', icon: BarIcon, color: 'bg-purple-100 text-purple-700', borderColor: 'border-purple-300' },
  { id: 'spa', label: 'Spa & Wellness', icon: SpaIcon, color: 'bg-pink-100 text-pink-700', borderColor: 'border-pink-300' },
  { id: 'gym', label: 'Fitness Center', icon: GymIcon, color: 'bg-red-100 text-red-700', borderColor: 'border-red-300' },
  { id: 'pool', label: 'Pool', icon: PoolIcon, color: 'bg-blue-100 text-blue-700', borderColor: 'border-blue-300' },
  { id: 'laundry', label: 'Laundry Service', icon: LaundryIcon, color: 'bg-cyan-100 text-cyan-700', borderColor: 'border-cyan-300' },
  { id: 'concierge', label: 'Concierge', icon: ConciergeIcon, color: 'bg-indigo-100 text-indigo-700', borderColor: 'border-indigo-300' },
  { id: 'room_service', label: 'Room Service', icon: RoomServiceIcon, color: 'bg-yellow-100 text-yellow-700', borderColor: 'border-yellow-300' },
  { id: 'additional', label: 'Additional Services', icon: AdditionalIcon, color: 'bg-gray-100 text-gray-700', borderColor: 'border-gray-300' },
  { id: 'other', label: 'Other', icon: OtherIcon, color: 'bg-slate-100 text-slate-700', borderColor: 'border-slate-300' },
] as const

type ServiceType = typeof SERVICE_TYPES[number]['id']

interface ServiceWidget extends Service {
  service_type: ServiceType
}

export function ServicesManagement() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const selectedHotel = useSelectedHotel()
  const [hotels, setHotels] = useState<any[]>([])
  const [services, setServices] = useState<ServiceWidget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (selectedHotel) {
      loadServices()
    }
  }, [selectedHotel])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        window.location.href = '/login'
        return
      }
      setUser(currentUser)

      // Load hotels for this user
      const userHotels = await getHotels()
      setHotels(userHotels)
    } catch (error) {
      logger.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadServices = async () => {
    if (!selectedHotel) return

    try {
      setLoading(true)
      const response = await fetch(`/api/services?hotel_id=${selectedHotel}`)
      if (!response.ok) {
        throw new Error('Failed to load services')
      }
      const data = await response.json()

      // Ensure all services have a service_type
      const servicesWithType = (data || []).map((s: any) => ({
        ...s,
        service_type: s.service_type || 'other',
      })) as ServiceWidget[]

      setServices(servicesWithType)
    } catch (error) {
      logger.error('Failed to load services:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleService = async (serviceId: string, newActiveState: number) => {
    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: newActiveState }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update service status')
      }
      await loadServices()
    } catch (error) {
      logger.error('Failed to toggle service:', error)
      alert(error instanceof Error ? error.message : 'Failed to update service status')
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete service')
      }
      await loadServices()
    } catch (error) {
      logger.error('Failed to delete service:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete service')
    }
  }

  const getServiceTypeConfig = (type: ServiceType) => {
    return SERVICE_TYPES.find(t => t.id === type) || SERVICE_TYPES[SERVICE_TYPES.length - 1]
  }

  const getServiceByType = (type: ServiceType) => {
    return services.find(s => s.service_type === type)
  }

  // Get all services to display - one per type + custom services
  const getDisplayServices = () => {
    const displayServices: Array<{ service?: ServiceWidget; type: ServiceType; isPlaceholder: boolean }> = []
    
    // Add one service per type (or placeholder)
    SERVICE_TYPES.forEach((typeConfig) => {
      const service = getServiceByType(typeConfig.id)
      if (service) {
        displayServices.push({ service, type: typeConfig.id, isPlaceholder: false })
      } else {
        displayServices.push({ type: typeConfig.id, isPlaceholder: true })
      }
    })

    // Add custom services (services with types not in SERVICE_TYPES or multiple services of same type)
    const customServices = services.filter(s => {
      const typeExists = SERVICE_TYPES.some(t => t.id === s.service_type)
      if (!typeExists) return true
      // If multiple services of same type, only first one is already added, so add the rest
      const firstOfType = displayServices.find(ds => !ds.isPlaceholder && ds.service?.service_type === s.service_type)
      return firstOfType && firstOfType.service?.id !== s.id
    })

    customServices.forEach(service => {
      displayServices.push({ service, type: service.service_type, isPlaceholder: false })
    })

    return displayServices
  }

  // Calculate stats
  const stats = {
    total: services.length,
    active: services.filter(s => s.active === 1).length,
    inactive: services.filter(s => s.active === 0).length,
  }

  if (loading && !selectedHotel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  if (hotels.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No hotels assigned to your account.</p>
        </div>
      </div>
    )
  }

  const displayServices = getDisplayServices()

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Services Management</h1>
          <p className="text-xs sm:text-sm text-gray-600">Manage and configure hotel services for guests</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => router.push('/services/new')}
            className="bg-black text-white hover:bg-gray-800 text-xs sm:text-sm w-full sm:w-auto"
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Service</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {!selectedHotel ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-sm md:text-base text-gray-500">Please select a hotel to manage services.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Total Services</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Active</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.active}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Inactive</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.inactive}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Service Types</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">
                      {SERVICE_TYPES.length}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {displayServices.map((item) => {
              const typeConfig = getServiceTypeConfig(item.type)
              const service = item.service
              const isPlaceholder = item.isPlaceholder
              const serviceTitle = service && service.title ? extractTextFromJson(service.title) : typeConfig.label
              const serviceDescription = service && service.description ? extractTextFromJson(service.description) : ''
              const isActive = service ? service.active === 1 : false
              const glassGradient = getGlassGradient(item.type)

              return (
                <Card
                  key={service?.id || `placeholder-${item.type}`}
                  className={`overflow-hidden relative h-52 sm:h-48 md:h-56 group hover:shadow-lg transition-all ${
                    isActive ? 'border-2 border-green-300' : 'border-2 border-gray-200'
                  }`}
                >
                  {/* Background Image */}
                  {(() => {
                    // Use item.type (service type from config) if service doesn't exist or doesn't have service_type
                    const serviceType = service?.service_type || item.type
                    const backgroundImage = getBackgroundImage({
                      ...(service || {}),
                      service_type: serviceType
                    })
                    return (
                      <>
                        {backgroundImage && (
                          <div 
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{ backgroundImage: `url(${backgroundImage})` }}
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/50 to-black/30" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-white/5 to-transparent" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-black/15 via-transparent to-transparent" />
                      </>
                    )
                  })()}

                  {/* Content Overlay */}
                  <div className="relative h-full flex flex-col justify-between p-3 sm:p-4 md:p-6 text-white">
                    {/* Top Section - Type Badge and Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5 sm:p-2 flex-shrink-0">
                          <typeConfig.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white/20 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-medium truncate">
                          {typeConfig.label}
                        </span>
                      </div>
                      {!isPlaceholder && (
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => toggleService(service!.id, isActive ? 0 : 1)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 ${
                              isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                            role="switch"
                            aria-checked={isActive}
                            aria-label={isActive ? 'Turn off service' : 'Turn on service'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bottom Section - Title, Description, Actions */}
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1 line-clamp-1 truncate">
                        {serviceTitle}
                      </h3>
                      {serviceDescription && (
                        <p className="text-[11px] sm:text-xs md:text-sm text-white/90 mb-3 sm:mb-4 line-clamp-2">
                          {serviceDescription}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {isPlaceholder ? (
                          <Button
                            onClick={() => router.push(`/services/new?service_type=${item.type}`)}
                            variant="outline"
                            size="sm"
                            className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 flex-1 min-w-0"
                          >
                            <span className="truncate">Add {typeConfig.label}</span>
                          </Button>
                        ) : service ? (
                          <>
                            <Button
                              onClick={() => router.push(`/services/${service.id}/edit`)}
                              variant="outline"
                              size="sm"
                              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 flex-1 sm:flex-initial min-w-0"
                            >
                              Manage
                            </Button>
                            <Button
                              onClick={() => handleDeleteService(service.id)}
                              variant="danger"
                              size="sm"
                              className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 bg-red-600/80 backdrop-blur-sm border-red-500/50 text-white hover:bg-red-700/80 flex-shrink-0"
                            >
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
