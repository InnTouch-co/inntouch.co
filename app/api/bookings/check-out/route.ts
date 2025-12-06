import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRoomByNumber } from '@/lib/database/room-validation'
import { getActiveBookingByRoomId, updateBooking } from '@/lib/database/bookings'
import { getPendingOrdersForRoom } from '@/lib/database/orders'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      hotel_id,
      room_number,
    } = body

    // Validate required fields
    if (!hotel_id || !room_number) {
      return NextResponse.json(
        { error: 'hotel_id and room_number are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get room by number
    const room = await getRoomByNumber(room_number, hotel_id)
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Get active booking for this room first
    const booking = await getActiveBookingByRoomId(room.id)
    
    // If no active booking, check if room is occupied (inconsistent state)
    if (!booking) {
      // If room is not occupied and no booking, nothing to check out
      if (room.status !== 'occupied') {
        return NextResponse.json(
          { error: 'Room is not occupied and has no active booking' },
          { status: 400 }
        )
      }
      // If room is occupied but no booking (inconsistent state), fix it
      await supabase
        .from('rooms')
        .update({ 
          status: 'available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', room.id)
      
      return NextResponse.json(
        { error: 'Room status fixed: no active booking found' },
        { status: 400 }
      )
    }
    
    // If there's an active booking, proceed with checkout (even if room status is wrong)
    // This handles inconsistent states where room is "available" but booking is "checked_in"

    // Get pending orders for this room
    const pendingOrders = await getPendingOrdersForRoom(room.id, booking.id)
    const totalPending = pendingOrders.reduce((sum, order) => sum + order.total_amount, 0)

    // Update booking status to checked_out
    await updateBooking(booking.id, {
      status: 'checked_out',
    })

    // Update room status to available (room is now available for next guest)
    // Note: Orders remain pending until paid in folio
    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({ 
        status: 'available',
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id)

    if (roomUpdateError) {
      logger.error('Error updating room status:', roomUpdateError)
      // Don't fail checkout if room update fails
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        guest_name: booking.guest_name,
        room_number,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
      },
      pending_orders: {
        count: pendingOrders.length,
        total: totalPending,
        orders: pendingOrders.map(order => ({
          id: order.id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          created_at: order.created_at,
        })),
      },
      message: 'Guest checked out successfully. Folio generated with pending orders.',
    })
  } catch (error: any) {
    logger.error('Error in check-out:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to check out guest',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

