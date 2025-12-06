import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveBookingByRoomId } from '@/lib/database/bookings'
import { logger } from '@/lib/utils/logger'
import { getPendingOrdersForRoom } from '@/lib/database/orders'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { room_ids } = body

    if (!Array.isArray(room_ids) || room_ids.length === 0) {
      return NextResponse.json(
        { error: 'room_ids array is required' },
        { status: 400 }
      )
    }

    // Limit batch size to prevent timeout
    const limitedRoomIds = room_ids.slice(0, 100)
    const details: Record<string, any> = {}

    // Process rooms in parallel batches
    const batchSize = 10
    for (let i = 0; i < limitedRoomIds.length; i += batchSize) {
      const batch = limitedRoomIds.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (roomId: string) => {
          try {
            // Get room to check status
            const { data: room, error: roomError } = await supabase
              .from('rooms')
              .select('id, status')
              .eq('id', roomId)
              .eq('is_deleted', false)
              .single()

            if (roomError || !room) {
              return
            }

            let guestInfo = null
            let bookingId = null
            let pendingOrdersCount = 0
            let pendingOrdersTotal = 0

            // Only fetch guest info if room is occupied
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
                pendingOrdersTotal = pendingOrders.reduce((sum, order) => sum + parseFloat(order.total_amount?.toString() || '0'), 0)
              }
            }

            details[roomId] = {
              booking_id: bookingId,
              guest_info: guestInfo,
              pending_orders_count: pendingOrdersCount,
              pending_orders_total: pendingOrdersTotal,
            }
          } catch (error) {
            logger.error(`Error loading details for room ${roomId}:`, error)
            // Set empty details on error
            details[roomId] = {
              booking_id: null,
              guest_info: null,
              pending_orders_count: 0,
              pending_orders_total: 0,
            }
          }
        })
      )
    }

    return NextResponse.json({ details })
  } catch (error: any) {
    logger.error('Error fetching room details batch:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch room details',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

