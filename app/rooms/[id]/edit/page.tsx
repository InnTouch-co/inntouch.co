'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getRoomById } from '@/lib/database/rooms'
import type { Room } from '@/types/database-extended'
import { formatPhoneNumber } from '@/lib/utils/phone-mask'
import { formatEmail } from '@/lib/utils/email-validation'
import { logger } from '@/lib/utils/logger'

interface GuestInfo {
  id: string
  name: string
  email: string | null
  phone: string | null
  check_in_date: string
  check_out_date: string
}

export default function EditRoomPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null)
  const [loadingGuestInfo, setLoadingGuestInfo] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in_date: '',
    check_out_date: '',
  })

  // Memoize loadRoom to prevent unnecessary re-renders
  const loadRoom = useCallback(async () => {
    if (!roomId) return
    
    try {
      setLoading(true)
      setError('')
      const roomData = await getRoomById(roomId)
      setRoom(roomData)

      // Load guest info if room is occupied
      if (roomData.status === 'occupied') {
        setLoadingGuestInfo(true)
        try {
          const response = await fetch(`/api/rooms/details?room_id=${roomId}`)
          const data = await response.json()
          if (data.guest_info && data.booking_id) {
            setGuestInfo(data.guest_info)
            setBookingId(data.booking_id)
            // Set form data with guest info
            setFormData({
              guest_name: data.guest_info.name || '',
              guest_email: data.guest_info.email || '',
              guest_phone: data.guest_info.phone || '',
              check_in_date: data.guest_info.check_in_date || '',
              check_out_date: data.guest_info.check_out_date || '',
            })
          }
        } catch (error) {
          logger.error('Failed to load guest info:', error)
        } finally {
          setLoadingGuestInfo(false)
        }
      } else {
        setGuestInfo(null)
        setBookingId(null)
        // If room is not occupied, redirect back to rooms page
        router.push('/rooms')
      }
    } catch (error) {
      logger.error('Failed to load room:', error)
      setError('Failed to load room')
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    loadRoom()
  }, [loadRoom])

  // Memoize handleSubmit to prevent unnecessary re-renders
  const handleSubmit = useCallback(async () => {
    if (!room || !bookingId) return

    setError('')
    setSubmitting(true)

    // Validation
    if (!formData.guest_name.trim()) {
      setError('Guest name is required')
      setSubmitting(false)
      return
    }

    try {
      // Validate dates
      if (!formData.check_in_date || !formData.check_out_date) {
        setError('Check-in and check-out dates are required')
        setSubmitting(false)
        return
      }

      const checkIn = new Date(formData.check_in_date)
      const checkOut = new Date(formData.check_out_date)
      if (checkOut <= checkIn) {
        setError('Check-out date must be after check-in date')
        setSubmitting(false)
        return
      }

      const response = await fetch(`/api/bookings/${bookingId}/guest-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: formData.guest_name.trim(),
          guest_email: formData.guest_email.trim() || null,
          guest_phone: formData.guest_phone.trim() || null,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update guest information')
      }

      router.push('/rooms')
    } catch (error: any) {
      logger.error('Failed to update guest info:', error)
      setError(error.message || 'Failed to update guest information')
    } finally {
      setSubmitting(false)
    }
  }, [room, bookingId, formData, router])

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
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Edit Guest Information</h1>
        <p className="text-xs md:text-sm text-gray-600">Update guest information for room {room.room_number}</p>
      </div>

      <Card>
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Room Information (Read-only) */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Room Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Room Number:</span>{' '}
                <span className="text-gray-900">{room.room_number}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Status:</span>{' '}
                <span className="text-gray-900 capitalize">{room.status}</span>
              </div>
            </div>
          </div>

          {/* Guest Information Section */}
          {loadingGuestInfo ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-500">Loading guest information...</div>
            </div>
          ) : guestInfo ? (
            <>
              {/* Booking Dates (Editable) */}
              <div className="mb-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Booking Dates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check-In Date *
                    </label>
                    <input
                      type="date"
                      value={formData.check_in_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, check_in_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check-Out Date *
                    </label>
                    <input
                      type="date"
                      value={formData.check_out_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, check_out_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={formData.check_in_date || undefined}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Guest Information Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    value={formData.guest_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guest Email
                  </label>
                  <input
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_email: formatEmail(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="guest@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guest Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.guest_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_phone: formatPhoneNumber(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-sm text-gray-500">No guest information available</div>
            </div>
          )}

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
              disabled={submitting || !guestInfo || !bookingId}
            >
              {submitting ? 'Updating...' : 'Update Guest Information'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

