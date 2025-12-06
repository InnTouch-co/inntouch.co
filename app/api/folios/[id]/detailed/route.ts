import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFolioByBookingId } from '@/lib/database/folios'
import { getOrderItemsBatch } from '@/lib/database/orders'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from users table
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id, role_id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get folio
    const folio = await getFolioByBookingId(bookingId)
    if (!folio) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 })
    }

    // Verify user has access to this hotel
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', folio.booking.hotel_id)
      .eq('user_id', currentUserData.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (hotelUserError) {
      return NextResponse.json({ error: 'Error verifying hotel access' }, { status: 500 })
    }

    if (!hotelUser) {
      return NextResponse.json({ 
        error: 'Forbidden: You do not have access to this hotel' 
      }, { status: 403 })
    }

    // Get room number
    let roomNumber = 'N/A'
    if (folio.booking.room_id) {
      const { data: room } = await supabase
        .from('rooms')
        .select('room_number')
        .eq('id', folio.booking.room_id)
        .eq('is_deleted', false)
        .maybeSingle()
      
      if (room) {
        roomNumber = room.room_number
      }
    }

    // Get hotel details (don't filter by is_deleted for historical records)
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('title, address, phone, email, site')
      .eq('id', folio.booking.hotel_id)
      .maybeSingle()
    
    if (hotelError) {
      logger.error('Error fetching hotel details:', hotelError)
    }
    
    if (!hotel) {
      logger.warn(`Hotel not found for folio booking_id: ${bookingId}, hotel_id: ${folio.booking.hotel_id}`)
    }

    // Get all order items for all orders in this folio
    const orderIds = folio.orders.map(o => o.id)
    const orderItemsMap = await getOrderItemsBatch(orderIds)

    // Get adjustment if paid
    let adjustment = null
    if (folio.payment_status === 'paid') {
      const { data: adj } = await supabase
        .from('folio_adjustments')
        .select('subtotal_amount, tax_amount, final_amount, pos_receipt_number, notes, adjusted_at, created_by')
        .eq('booking_id', bookingId)
        .eq('is_deleted', false)
        .order('adjusted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (adj) {
        // Get user who created the adjustment
        let adjustedBy = null
        if (adj.created_by) {
          const { data: user } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', adj.created_by)
            .eq('is_deleted', false)
            .maybeSingle()
          
          if (user) {
            adjustedBy = user.name || user.email
          }
        }

        adjustment = {
          subtotal_amount: parseFloat(adj.subtotal_amount.toString()),
          tax_amount: parseFloat(adj.tax_amount.toString()),
          final_amount: parseFloat(adj.final_amount.toString()),
          pos_receipt_number: adj.pos_receipt_number,
          notes: adj.notes,
          adjusted_at: adj.adjusted_at,
          adjusted_by: adjustedBy,
        }
      }
    }

    // Format orders with items
    const ordersWithItems = folio.orders.map(order => ({
      ...order,
      items: orderItemsMap[order.id] || [],
    }))

    return NextResponse.json({
      folio: {
        booking_id: folio.booking_id,
        booking: {
          ...folio.booking,
          room_number: roomNumber,
        },
        orders: ordersWithItems,
        total_amount: folio.total_amount,
        payment_status: folio.payment_status,
        created_at: folio.created_at,
        updated_at: folio.updated_at,
        adjustment,
        hotel: hotel || null,
      },
    })

  } catch (error) {
    logger.error('Error fetching detailed folio:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

