import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveBookingByRoomId } from '@/lib/database/bookings'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('room_id')

    if (!roomId) {
      return NextResponse.json(
        { error: 'room_id is required' },
        { status: 400 }
      )
    }

    const booking = await getActiveBookingByRoomId(roomId)

    if (!booking) {
      return NextResponse.json({
        guest: null,
      })
    }

    return NextResponse.json({
      guest: {
        name: booking.guest_name,
        email: booking.guest_email,
        phone: booking.guest_phone,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
      },
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

