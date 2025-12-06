import { NextRequest, NextResponse } from 'next/server'
import { validateRoomForOrder } from '@/lib/validation/room-validation'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomNumber = searchParams.get('room_number')
    const hotelId = searchParams.get('hotel_id')
    const guestName = searchParams.get('guest_name') || undefined

    if (!roomNumber || !hotelId) {
      return NextResponse.json(
        { error: 'room_number and hotel_id are required' },
        { status: 400 }
      )
    }

    const validation = await validateRoomForOrder(roomNumber, hotelId, guestName)

    return NextResponse.json({
      valid: validation.valid,
      reason: validation.reason,
      room: validation.room,
      booking: validation.booking ? {
        id: validation.booking.id,
        guest_name: validation.booking.guest_name,
        guest_email: validation.booking.guest_email,
        guest_phone: validation.booking.guest_phone,
        check_in_date: validation.booking.check_in_date,
        check_out_date: validation.booking.check_out_date,
        status: validation.booking.status,
        room_number: validation.booking.room_number,
      } : null,
    })
  } catch (error: any) {
    logger.error('Error validating room:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to validate room',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

