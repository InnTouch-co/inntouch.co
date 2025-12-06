'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import { getHotelById } from '@/lib/database/hotels'
import { createRoomsBatch, getRooms } from '@/lib/database/rooms'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance'

function BulkAddRoomsForm() {
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
    room_numbers: '',
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

  const parseRoomNumbers = (input: string): string[] => {
    const roomNumbers: string[] = []
    const parts = input.split(',').map(p => p.trim()).filter(p => p)
    
    for (const part of parts) {
      if (part.includes('-')) {
        // Handle range like "100-199"
        const [start, end] = part.split('-').map(s => s.trim())
        const startNum = parseInt(start)
        const endNum = parseInt(end)
        
        if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
          for (let i = startNum; i <= endNum; i++) {
            roomNumbers.push(i.toString())
          }
        } else {
          throw new Error(`Invalid range: ${part}`)
        }
      } else {
        // Single room number
        roomNumbers.push(part)
      }
    }
    
    return roomNumbers
  }


  const handleSubmit = async () => {
    if (!selectedHotel) {
      setError('Please select a hotel')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      if (!formData.room_numbers.trim()) {
        setError('Room numbers are required')
        setSubmitting(false)
        return
      }

      // Parse room numbers
      let roomNumbers: string[]
      try {
        roomNumbers = parseRoomNumbers(formData.room_numbers)
      } catch (err: any) {
        setError(err.message || 'Invalid room number format')
        setSubmitting(false)
        return
      }

      if (roomNumbers.length === 0) {
        setError('No valid room numbers found')
        setSubmitting(false)
        return
      }

      // Check max room limit
      if (currentHotel && currentHotel.room_count) {
        const currentRoomCount = rooms.length
        const newTotalCount = currentRoomCount + roomNumbers.length
        if (newTotalCount > currentHotel.room_count) {
          const canAdd = currentHotel.room_count - currentRoomCount
          setError(`Cannot add ${roomNumbers.length} rooms. Only ${canAdd} room(s) can be added (max limit: ${currentHotel.room_count})`)
          setSubmitting(false)
          return
        }
      }

      // Check for duplicate room numbers (both in input and existing rooms)
      const existingRoomNumbers = new Set(rooms.map(r => r.room_number))
      const duplicatesInInput: string[] = []
      const duplicatesExisting: string[] = []

      roomNumbers.forEach(num => {
        if (existingRoomNumbers.has(num)) {
          duplicatesExisting.push(num)
        }
      })

      // Find duplicates within input
      const seen = new Set<string>()
      roomNumbers.forEach(num => {
        if (seen.has(num)) {
          duplicatesInInput.push(num)
        } else {
          seen.add(num)
        }
      })

      if (duplicatesExisting.length > 0) {
        setError(`Room numbers already exist: ${duplicatesExisting.join(', ')}`)
        setSubmitting(false)
        return
      }

      if (duplicatesInInput.length > 0) {
        setError(`Duplicate room numbers in input: ${duplicatesInInput.join(', ')}`)
        setSubmitting(false)
        return
      }

      // Create rooms in bulk
      const roomsToCreate = roomNumbers.map(roomNumber => ({
        hotel_id: selectedHotel,
        room_number: roomNumber,
        status: formData.status,
      }))

      // Batch create rooms for better performance
      try {
        await createRoomsBatch(roomsToCreate)
      } catch (err: any) {
        if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
          // Try to identify which room(s) failed
          const failedRooms = err.details || err.message
          throw new Error(`Some rooms already exist: ${failedRooms}`)
        }
        throw err
      }

      router.push('/rooms')
    } catch (error: any) {
      logger.error('Failed to create rooms:', error)
      setError(error.message || 'Failed to create rooms')
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
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Bulk Add Rooms</h1>
        <p className="text-xs md:text-sm text-gray-600">Add multiple rooms at once</p>
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
                Room Numbers *
              </label>
              <input
                type="text"
                value={formData.room_numbers}
                onChange={(e) => setFormData({ ...formData, room_numbers: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="101,102,103 or 100-199 or 101,105,110-115"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter room numbers separated by commas (e.g., 101,102,103) or use ranges (e.g., 100-199)
              </p>
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
              {submitting ? 'Creating...' : 'Create Rooms'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default function BulkAddRoomsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    }>
      <BulkAddRoomsForm />
    </Suspense>
  )
}

