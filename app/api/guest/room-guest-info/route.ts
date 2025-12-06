import { NextRequest, NextResponse } from 'next/server'
import { getActiveBookingForRoom } from '@/lib/database/room-validation'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomNumber = searchParams.get('room_number')
    const hotelId = searchParams.get('hotel_id')

    if (!roomNumber || !hotelId) {
      return NextResponse.json(
        { error: 'room_number and hotel_id are required' },
        { status: 400 }
      )
    }

    // Get active booking for the room
    const booking = await getActiveBookingForRoom(roomNumber, hotelId)

    if (!booking) {
      return NextResponse.json({
        guest_name: null,
      })
    }

    // Don't return "Deleted User" - this means the guest data was anonymized
    // Return null instead so the guest site doesn't display "Deleted User"
    const guestName = booking.guest_name === 'Deleted User' ? null : booking.guest_name

    return NextResponse.json({
      guest_name: guestName,
    })
  } catch (error: any) {
    logger.error('Error getting guest info:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to get guest information',
      },
      { status: 500 }
    )
  }
}

