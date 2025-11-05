'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { getRooms } from '@/lib/database/rooms'
import type { Room } from '@/types/database-extended'

const REQUEST_TYPES = [
  { id: 'food', name: 'Room Service' },
  { id: 'housekeeping', name: 'Housekeeping' },
  { id: 'maintenance', name: 'Maintenance' },
  { id: 'concierge', name: 'Concierge' },
  { id: 'other', name: 'Other' },
]

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const TYPE_ICONS: Record<string, React.ReactElement> = {
  food: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  housekeeping: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  maintenance: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  concierge: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  other: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
}

function NewServiceRequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedHotelId = searchParams.get('hotel_id')

  const [user, setUser] = useState<any>(null)
  const [hotels, setHotels] = useState<any[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [guestName, setGuestName] = useState('')
  const [roomId, setRoomId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [requestType, setRequestType] = useState<string>('food')
  const [priority, setPriority] = useState<string>('medium')

  useEffect(() => {
    loadUserAndHotels()
  }, [])

  useEffect(() => {
    if (preSelectedHotelId && hotels.length > 0) {
      const hotel = hotels.find(h => h.id === preSelectedHotelId)
      if (hotel && selectedHotel !== preSelectedHotelId) {
        setSelectedHotel(preSelectedHotelId)
      }
    } else if (hotels.length > 0 && !selectedHotel) {
      // Auto-select first hotel if no pre-selection
      setSelectedHotel(hotels[0].id)
    }
  }, [preSelectedHotelId, hotels, selectedHotel])

  useEffect(() => {
    if (selectedHotel) {
      loadRooms()
    }
  }, [selectedHotel])

  const loadUserAndHotels = useCallback(async () => {
    try {
      setLoading(true)
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Only get hotels assigned to this user (not all hotels)
      const { data: hotelAssignments, error } = await supabase
        .from('hotel_users')
        .select('hotel_id, hotels(*)')
        .eq('user_id', currentUser.id)
        .eq('is_deleted', false)

      if (error) throw error

      const userHotels = (hotelAssignments || [])
        .map((assignment: any) => assignment.hotels)
        .filter((hotel): hotel is any => Boolean(hotel) && typeof hotel === 'object' && 'id' in hotel)
      
      console.log('Service Request New - Hotel assignments:', hotelAssignments)
      console.log('Service Request New - User ID:', currentUser.id)
      console.log('Service Request New - Filtered hotels:', userHotels)
      
      setHotels(userHotels)

      if (userHotels.length === 0) {
        setError(`No hotels assigned to your account. User ID: ${currentUser.id}. Please contact an administrator.`)
      }
    } catch (error) {
      console.error('Failed to load user/hotels:', error)
      setError('Failed to load hotel information')
    } finally {
      setLoading(false)
    }
  }, [router])

  const loadRooms = useCallback(async () => {
    if (!selectedHotel) return

    try {
      setLoadingRooms(true)
      const roomsData = await getRooms(selectedHotel)
      setRooms(roomsData)
    } catch (error) {
      console.error('Failed to load rooms:', error)
    } finally {
      setLoadingRooms(false)
    }
  }, [selectedHotel])

  const handleCreateRequest = useCallback(async () => {
    if (!selectedHotel || !guestName.trim() || !roomId || !description.trim()) {
      alert('Please fill in all required fields')
      return
    }

    // Verify the selected hotel is in the user's assigned hotels
    const isHotelAssigned = hotels.some(h => h.id === selectedHotel)
    if (!isHotelAssigned) {
      setError(`Selected hotel is not assigned to your account. Please select a valid hotel.`)
      return
    }

    setIsCreating(true)
    setError('')

    try {
      console.log('Creating service request with:', {
        hotel_id: selectedHotel,
        room_id: roomId,
        request_type: requestType,
        guest_name: guestName.trim(),
      })

      const response = await fetch('/api/service-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotel_id: selectedHotel,
          room_id: roomId,
          title: requestType === 'food' ? 'Breakfast Order' : 
                requestType === 'housekeeping' ? 'Housekeeping Request' :
                requestType === 'maintenance' ? 'Maintenance Request' :
                requestType === 'concierge' ? 'Concierge Request' : 'Service Request',
          description,
          request_type: requestType,
          priority,
          status: 'pending',
          guest_name: guestName.trim(),
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error('API Error:', responseData)
        throw new Error(responseData.error || 'Failed to create service request')
      }

      // Navigate back to service requests list
      router.push('/service-requests')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create service request'
      console.error('Error creating service request:', error)
      setError(errorMessage)
      setIsCreating(false)
    }
  }, [selectedHotel, guestName, roomId, description, requestType, priority, router, hotels])

  const handleCancel = useCallback(() => {
    router.push('/service-requests')
  }, [router])

  // Memoize selected hotel name
  const selectedHotelName = useMemo(() => {
    const hotel = hotels.find(h => h.id === selectedHotel)
    return hotel ? extractTextFromJson(hotel.title) : ''
  }, [hotels, selectedHotel])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  if (error && hotels.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <div className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleCancel}>Back to Service Requests</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
          <button
            onClick={handleCreateRequest}
            disabled={isCreating || !guestName.trim() || !roomId || !description.trim() || !selectedHotel}
            className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Create Service Request</h1>
        <p className="text-sm md:text-base text-gray-600">Add a new service request for a guest</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <Card>
        <div className="p-6">
          <div className="space-y-6">
            {/* Priority/Type/Status Tags */}
            <div className="flex items-center gap-2 mb-4">
              {requestType && TYPE_ICONS[requestType] && (
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
                  {TYPE_ICONS[requestType]}
                </div>
              )}
              <div className="flex-1">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium}`}>
                    {priority}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 uppercase">
                    {REQUEST_TYPES.find(t => t.id === requestType)?.name || requestType}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-900 text-white">
                    PENDING
                  </span>
                </div>
              </div>
            </div>

            {/* Hotel Selection - Only show if multiple hotels */}
            {hotels.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hotel * <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedHotel}
                  onChange={(e) => setSelectedHotel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                >
                  <option value="">Select a hotel</option>
                  {hotels.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {extractTextFromJson(hotel.title)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {hotels.length === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hotel</label>
                <p className="text-sm text-gray-900">{selectedHotelName}</p>
              </div>
            )}

            <Input
              label="Guest *"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g., Sarah Johnson"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room * <span className="text-red-500">*</span>
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                disabled={loadingRooms || !selectedHotel}
              >
                <option value="">{!selectedHotel ? 'Select a hotel first' : 'Select a room'}</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_number}
                  </option>
                ))}
              </select>
              {loadingRooms && (
                <p className="mt-1 text-xs text-gray-500">Loading rooms...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requested
              </label>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To
              </label>
              <p className="text-sm text-gray-600">Unassigned</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description * <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Continental breakfast for 2, allergies: gluten"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Type *
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {REQUEST_TYPES.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4">* Required fields</p>
          </div>
        </div>
      </Card>

      {/* Bottom Action Buttons */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateRequest}
          disabled={isCreating || !guestName.trim() || !roomId || !description.trim() || !selectedHotel}
          className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Creating...' : 'Create Request'}
        </button>
      </div>
    </div>
  )
}

export default function NewServiceRequestPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    }>
      <NewServiceRequestForm />
    </Suspense>
  )
}

