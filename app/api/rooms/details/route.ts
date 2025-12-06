import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveBookingByRoomId } from '@/lib/database/bookings'
import { getPendingOrdersForRoom } from '@/lib/database/orders'
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

    const supabase = await createClient()

    // Get room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .eq('is_deleted', false)
      .single()

    if (roomError || !room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Get guest info if room is occupied
    let guestInfo = null
    let bookingId = null
    let pendingOrdersCount = 0
    let pendingOrdersTotal = 0

    if (room.status === 'occupied') {
      const booking = await getActiveBookingByRoomId(roomId)
      if (booking) {
        bookingId = booking.id
        guestInfo = {
          id: booking.id,
          name: booking.guest_name,
          email: booking.guest_email,
          phone: booking.guest_phone,
          check_in_date: booking.check_in_date,
          check_out_date: booking.check_out_date,
        }

        // Get pending orders
        const pendingOrders = await getPendingOrdersForRoom(roomId, booking.id)
        pendingOrdersCount = pendingOrders.length
        pendingOrdersTotal = pendingOrders.reduce((sum, order) => sum + order.total_amount, 0)
      }
    }

    return NextResponse.json({
      room,
      booking_id: bookingId,
      guest_info: guestInfo,
      pending_orders_count: pendingOrdersCount,
      pending_orders_total: pendingOrdersTotal,
    })
  } catch (error: any) {
    logger.error('Error getting room details:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to get room details',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

