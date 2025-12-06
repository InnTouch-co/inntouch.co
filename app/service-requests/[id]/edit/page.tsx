'use client'

import { useRouter, useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { formatPhoneNumber } from '@/lib/utils/phone-mask'
import { formatEmail } from '@/lib/utils/email-validation'
import { getRooms } from '@/lib/database/rooms'
import { getServiceRequestById } from '@/lib/database/service-requests'
import type { Room } from '@/types/database-extended'
import type { ServiceRequest } from '@/lib/database/service-requests'
import { logger } from '@/lib/utils/logger'

const REQUEST_TYPES = [
  { id: 'food', name: 'Room Service' },
  { id: 'housekeeping', name: 'Housekeeping' },
  { id: 'maintenance', name: 'Maintenance' },
  { id: 'concierge', name: 'Concierge' },
  { id: 'other', name: 'Other' },
]

const PRIORITIES = [
  { id: 'low', name: 'Low' },
  { id: 'medium', name: 'Medium' },
  { id: 'high', name: 'High' },
  { id: 'urgent', name: 'Urgent' },
]

const STATUSES = [
  { id: 'pending', name: 'Pending' },
  { id: 'in_progress', name: 'In Progress' },
  { id: 'completed', name: 'Completed' },
  { id: 'cancelled', name: 'Cancelled' },
]

export default function EditServiceRequestPage() {
  const router = useRouter()
  const params = useParams()
  const requestId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [request, setRequest] = useState<ServiceRequest | null>(null)
  const [hotels, setHotels] = useState<any[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [roomId, setRoomId] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [requestType, setRequestType] = useState<string>('food')
  const [priority, setPriority] = useState<string>('medium')
  const [status, setStatus] = useState<string>('pending')

  useEffect(() => {
    loadData()
  }, [requestId])

  useEffect(() => {
    if (request?.hotel_id) {
      loadRooms()
    }
  }, [request?.hotel_id])

  const loadData = useCallback(async () => {
    if (!requestId) return

    try {
      setLoading(true)
      setError('')

      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Load service request
      const requestData = await getServiceRequestById(requestId)
      if (!requestData) {
        setError('Service request not found')
        return
      }

      setRequest(requestData)

      // Set form values
      setGuestName(requestData.guest_name || '')
      setGuestEmail(requestData.guest_email || '')
      setGuestPhone(requestData.guest_phone || '')
      setRoomId(requestData.room_id || '')
      setTitle(requestData.title)
      setDescription(requestData.description || '')
      setRequestType(requestData.request_type)
      setPriority(requestData.priority)
      setStatus(requestData.status)

      // Load hotels (only assigned to user)
      const { data: hotelAssignments, error: hotelError } = await supabase
        .from('hotel_users')
        .select('hotel_id, hotels(*)')
        .eq('user_id', currentUser.id)
        .eq('is_deleted', false)

      if (hotelError) throw hotelError

      const userHotels = (hotelAssignments || [])
        .map((assignment: any) => assignment.hotels)
        .filter((hotel): hotel is any => Boolean(hotel) && typeof hotel === 'object' && 'id' in hotel)
      
      setHotels(userHotels)

      // Verify user has access to this hotel
      if (!userHotels.find((h: any) => h.id === requestData.hotel_id)) {
        setError('You do not have access to edit this service request')
      }
    } catch (err) {
      logger.error('Failed to load service request:', err)
      setError(err instanceof Error ? err.message : 'Failed to load service request')
    } finally {
      setLoading(false)
    }
  }, [requestId, router])

  const loadRooms = useCallback(async () => {
    if (!request?.hotel_id) return

    try {
      setLoadingRooms(true)
      const roomsData = await getRooms(request.hotel_id)
      setRooms(roomsData)
    } catch (error) {
      logger.error('Failed to load rooms:', error)
    } finally {
      setLoadingRooms(false)
    }
  }, [request?.hotel_id])

  const handleUpdate = useCallback(async () => {
    if (!request || !user) return

    setError('')

    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!requestType) {
      setError('Request type is required')
      return
    }

    if (!priority) {
      setError('Priority is required')
      return
    }

    if (!status) {
      setError('Status is required')
      return
    }

    try {
      setIsUpdating(true)

      const response = await fetch(`/api/service-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          request_type: requestType,
          priority,
          status,
          guest_name: guestName.trim() || null,
          guest_email: guestEmail.trim() || null,
          guest_phone: guestPhone.trim() || null,
          room_id: roomId || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update service request')
      }

      router.push('/service-requests')
    } catch (err) {
      logger.error('Failed to update service request:', err)
      setError(err instanceof Error ? err.message : 'Failed to update service request')
    } finally {
      setIsUpdating(false)
    }
  }, [request, user, requestId, title, description, requestType, priority, status, guestName, guestEmail, guestPhone, roomId, router])

  const handleCancel = useCallback(() => {
    router.push('/service-requests')
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service request...</p>
        </div>
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card>
          <div className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/service-requests')}>Back to Service Requests</Button>
          </div>
        </Card>
      </div>
    )
  }

  const selectedHotel = hotels.find((h: any) => h.id === request?.hotel_id)
  const hotelName = selectedHotel ? extractTextFromJson(selectedHotel.title) : ''

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => router.push('/service-requests')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-3 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">Edit Service Request</h1>
        </div>

        {error && (
          <Card className="mb-4 border-red-200 bg-red-50">
            <div className="p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </Card>
        )}

        <Card>
          <div className="p-5 space-y-5">
            {/* Compact Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Guest Name
                </label>
                <Input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter guest name"
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Room
                </label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  disabled={loadingRooms}
                >
                  <option value="">Select a room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.room_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Guest Email
                </label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(formatEmail(e.target.value))}
                  placeholder="guest@example.com"
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Guest Phone
                </label>
                <Input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(formatPhoneNumber(e.target.value))}
                  placeholder="+1 (555) 123-4567"
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Title *
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the request"
                required
                className="text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the request"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Request Type *
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  {REQUEST_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Priority *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Status *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Compact Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

