'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getRoomById, updateRoom } from '@/lib/database/rooms'
import { textToJson } from '@/lib/utils/json-text'
import { extractTextFromJson } from '@/lib/utils/json-text'
import type { Room } from '@/types/database-extended'

type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance'

const AMENITIES_OPTIONS = [
  { id: 'wifi', label: 'WiFi', icon: '📶' },
  { id: 'tv', label: 'TV', icon: '📺' },
  { id: 'ac', label: 'AC', icon: '❄️' },
  { id: 'coffee', label: 'Coffee Maker', icon: '☕' },
  { id: 'minibar', label: 'Minibar', icon: '🍷' },
  { id: 'safe', label: 'Safe', icon: '🔒' },
  { id: 'balcony', label: 'Balcony', icon: '🌅' },
  { id: 'bathtub', label: 'Bathtub', icon: '🛁' },
]

const BED_TYPES = ['Single', 'Double', 'Queen', 'King', 'Twin']
const ROOM_TYPES = ['Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential']

export default function EditRoomPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    room_number: '',
    room_type: 'Standard',
    floor: '',
    bed_type: 'Queen',
    max_occupancy: '2',
    nightly_rate: '',
    status: 'available' as RoomStatus,
    amenities: [] as string[],
  })

  // Memoize loadRoom to prevent unnecessary re-renders
  const loadRoom = useCallback(async () => {
    if (!roomId) return
    
    try {
      setLoading(true)
      setError('')
      const roomData = await getRoomById(roomId)
      setRoom(roomData)
      
      // Process data more efficiently
      const roomTypeText = extractTextFromJson(roomData.room_type)
      const amenitiesList = Array.isArray(roomData.amenities) ? roomData.amenities : []
      
      // Set form data in one operation to reduce re-renders
      setFormData({
        room_number: roomData.room_number || '',
        room_type: roomTypeText || 'Standard',
        floor: roomData.floor?.toString() || '',
        bed_type: roomData.bed_type || 'Queen',
        max_occupancy: roomData.capacity?.toString() || '2',
        nightly_rate: roomData.price_per_night?.toString() || '',
        status: (roomData.status as RoomStatus) || 'available',
        amenities: amenitiesList.map((a: any) => typeof a === 'string' ? a : a.id || a),
      })
    } catch (error) {
      console.error('Failed to load room:', error)
      setError('Failed to load room')
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    loadRoom()
  }, [loadRoom])

  // Memoize toggleAmenity to prevent unnecessary re-renders
  const toggleAmenity = useCallback((amenityId: string) => {
    setFormData(prev => {
      const isSelected = prev.amenities.includes(amenityId)
      return {
        ...prev,
        amenities: isSelected
          ? prev.amenities.filter(a => a !== amenityId)
          : [...prev.amenities, amenityId]
      }
    })
  }, [])

  // Memoize handleSubmit to prevent unnecessary re-renders
  const handleSubmit = useCallback(async () => {
    if (!room) return

    setError('')
    setSubmitting(true)

    // Validation
    if (!formData.room_number.trim()) {
      setError('Room number is required')
      setSubmitting(false)
      return
    }

    try {
      // Prepare data more efficiently
      const roomData = {
        room_number: formData.room_number.trim(),
        room_type: textToJson(formData.room_type),
        floor: formData.floor ? parseInt(formData.floor, 10) : null,
        capacity: parseInt(formData.max_occupancy, 10) || 2,
        status: formData.status,
        amenities: formData.amenities,
        price_per_night: formData.nightly_rate ? parseFloat(formData.nightly_rate) : null,
        bed_type: formData.bed_type || null,
      }

      await updateRoom(room.id, roomData)
      router.push('/rooms')
    } catch (error: any) {
      console.error('Failed to update room:', error)
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        setError('Room number already exists for this hotel')
      } else {
        setError(error.message || 'Failed to update room')
      }
    } finally {
      setSubmitting(false)
    }
  }, [room, formData, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Room not found</p>
          <Button onClick={() => router.push('/rooms')}>Back to Rooms</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Edit Room</h1>
        <p className="text-xs md:text-sm text-gray-600">Update room information</p>
      </div>

      <Card>
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Number *
                </label>
                <input
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, room_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="101"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Type *
                </label>
                <select
                  value={formData.room_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, room_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROOM_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor
                </label>
                <input
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bed Type
                </label>
                <select
                  value={formData.bed_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, bed_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {BED_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Occupancy
                </label>
                <input
                  type="number"
                  value={formData.max_occupancy}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_occupancy: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nightly Rate ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.nightly_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, nightly_rate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="150.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as RoomStatus }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="cleaning">Cleaning</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amenities
              </label>
              <div className="grid grid-cols-4 gap-2">
                {AMENITIES_OPTIONS.map(amenity => {
                  const isSelected = formData.amenities.includes(amenity.id)
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`p-2 rounded-lg border text-xs transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-lg mb-1">{amenity.icon}</div>
                      <div>{amenity.label}</div>
                    </button>
                  )
                })}
              </div>
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
              {submitting ? 'Updating...' : 'Update Room'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

