import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { getAllOrdersForBooking } from '@/lib/database/orders'
import { getActiveBookingByRoomId } from '@/lib/database/bookings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: roomId } = await params

    if (!roomId) {
      return NextResponse.json(
        { error: 'room_id is required' },
        { status: 400 }
      )
    }

    // Get pending orders for this room (by both booking_id and room_id)
    let orders: any[] = []

    // First, try to get pending orders by booking_id
    const booking = await getActiveBookingByRoomId(roomId)
    if (booking) {
      const { data: bookingOrders, error: bookingOrdersError } = await supabase
        .from('orders')
        .select('*')
        .eq('booking_id', booking.id)
        .eq('payment_status', 'pending')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      
      if (!bookingOrdersError && bookingOrders) {
        orders = bookingOrders
      }
    }

    // Also get pending orders directly by room_id (in case booking_id is null)
    const { data: roomOrders, error: roomOrdersError } = await supabase
      .from('orders')
      .select('*')
      .eq('room_id', roomId)
      .eq('payment_status', 'pending')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (roomOrdersError) {
      logger.error('Error fetching orders by room_id:', roomOrdersError)
    } else if (roomOrders) {
      // Merge orders, avoiding duplicates
      const existingIds = new Set(orders.map(o => o.id))
      const uniqueRoomOrders = roomOrders.filter(o => !existingIds.has(o.id))
      orders = [...orders, ...uniqueRoomOrders]
    }

    // Sort by created_at descending
    orders.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      orders: orders.map(order => ({
        id: order.id,
        order_number: order.order_number,
        order_type: order.order_type,
        status: order.status,
        total_amount: parseFloat(order.total_amount?.toString() || '0'),
        payment_status: order.payment_status,
        created_at: order.created_at,
        delivered_at: order.delivered_at,
        special_instructions: order.special_instructions,
        items: order.items,
      })),
    })
  } catch (error: any) {
    logger.error('Error fetching room orders:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch orders',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

