import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRoomByNumber } from '@/lib/database/room-validation'
import { getActiveBookingByRoomId } from '@/lib/database/bookings'
import { getPendingOrdersForRoom } from '@/lib/database/orders'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotel_id')
    const roomNumber = searchParams.get('room_number')

    if (!hotelId || !roomNumber) {
      return NextResponse.json(
        { error: 'hotel_id and room_number are required' },
        { status: 400 }
      )
    }

    // Get room by number
    const room = await getRoomByNumber(roomNumber, hotelId)
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Get active booking for this room
    const booking = await getActiveBookingByRoomId(room.id)
    if (!booking) {
      return NextResponse.json(
        { error: 'No active booking found for this room' },
        { status: 404 }
      )
    }

    // Get pending orders for this room
    const pendingOrders = await getPendingOrdersForRoom(room.id, booking.id)

    return NextResponse.json({
      booking: {
        id: booking.id,
        guest_name: booking.guest_name,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
      },
      pending_orders: pendingOrders.map(order => ({
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        created_at: order.created_at,
      })),
    })
  } catch (error: any) {
    logger.error('Error getting check-out info:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to get check-out information',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

