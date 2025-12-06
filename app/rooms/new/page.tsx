'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import { getHotelById } from '@/lib/database/hotels'
import { createRoom, getRooms } from '@/lib/database/rooms'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance'

function NewRoomForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hotelId = searchParams.get('hotel_id') || ''

  const [user, setUser] = useState<any>(null)
  const [hotels, setHotels] = useState<any[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>(hotelId)
  const [currentHotel, setCurrentHotel] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    room_number: '',
    status: 'available' as RoomStatus,
  })

  useEffect(() => {
    loadUserAndHotels()
  }, [])

  useEffect(() => {
    if (selectedHotel) {
      loadHotelData()
      loadRooms()
    }
  }, [selectedHotel])

  const loadUserAndHotels = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      const { data: hotelAssignments, error } = await supabase
        .from('hotel_users')
        .select('hotel_id, hotels(*)')
        .eq('user_id', currentUser.id)
        .eq('is_deleted', false)

      if (error) throw error

      const userHotels = (hotelAssignments || []).map((assignment: any) => assignment.hotels).filter(Boolean)
      setHotels(userHotels)

      if (userHotels.length > 0 && !selectedHotel) {
        setSelectedHotel(userHotels[0].id)
      }
    } catch (error) {
      logger.error('Failed to load user/hotels:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHotelData = async () => {
    if (!selectedHotel) return
    try {
      const hotel = await getHotelById(selectedHotel)
      setCurrentHotel(hotel)
    } catch (error) {
      logger.error('Failed to load hotel:', error)
    }
  }

  const loadRooms = async () => {
    if (!selectedHotel) return
    try {
      const roomsData = await getRooms(selectedHotel)
      setRooms(roomsData)
    } catch (error) {
      logger.error('Failed to load rooms:', error)
    }
  }


  const handleSubmit = async () => {
    if (!selectedHotel) {
      setError('Please select a hotel')
      return
    }

    setError('')
    setSubmitting(true)

    // Validation
    if (!formData.room_number.trim()) {
      setError('Room number is required')
      setSubmitting(false)
      return
    }

    // Check max room limit
    if (currentHotel && currentHotel.room_count) {
      if (rooms.length >= currentHotel.room_count) {
        setError(`Cannot add more rooms. Maximum room limit is ${currentHotel.room_count}`)
        setSubmitting(false)
        return
      }
    }

    try {
      const roomData = {
        hotel_id: selectedHotel,
        room_number: formData.room_number.trim(),
        status: formData.status,
      }

      await createRoom(roomData)
      router.push('/rooms')
    } catch (error: any) {
      logger.error('Failed to save room:', error)
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        setError('Room number already exists for this hotel')
      } else {
        setError(error.message || 'Failed to save room')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Add New Room</h1>
        <p className="text-xs md:text-sm text-gray-600">Create a new room for your property</p>
      </div>

      <Card>
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Hotel Selector */}
          {hotels.length > 1 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Hotel *
              </label>
              <select
                value={selectedHotel}
                onChange={(e) => setSelectedHotel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {hotels.map((hotel) => (
                  <option key={hotel.id} value={hotel.id}>
                    {extractTextFromJson(hotel.title)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Number *
              </label>
              <input
                type="text"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RoomStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="cleaning">Cleaning</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => router.push('/rooms')}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function NewRoomPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    }>
      <NewRoomForm />
    </Suspense>
  )
}

