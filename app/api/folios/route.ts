import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFolios } from '@/lib/database/folios'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams
    const hotelId = searchParams.get('hotel_id')
    const paymentStatus = searchParams.get('payment_status') as 'pending' | 'paid' | null

    if (!hotelId) {
      return NextResponse.json({ error: 'hotel_id is required' }, { status: 400 })
    }

    // Verify user has access to this hotel
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', hotelId)
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

    const folios = await getFolios(hotelId, {
      payment_status: paymentStatus || undefined,
      limit: 100, // Limit to 100 folios for performance
    })

    if (folios.length === 0) {
      return NextResponse.json([])
    }

    // Batch load all rooms at once
    const roomIds = folios
      .map(f => f.booking.room_id)
      .filter((id): id is string => id !== null && id !== undefined)
    
    const roomsMap = new Map<string, string>()
    if (roomIds.length > 0) {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, room_number')
        .in('id', roomIds)
        .eq('is_deleted', false)
      
      if (rooms) {
        for (const room of rooms) {
          roomsMap.set(room.id, room.room_number)
        }
      }
    }

    // Batch load all adjustments for paid folios at once
    const paidBookingIds = folios
      .filter(f => f.payment_status === 'paid')
      .map(f => f.booking_id)
    
    const adjustmentsMap = new Map<string, any>()
    if (paidBookingIds.length > 0) {
      // Get all adjustments for paid bookings, then filter to latest per booking
      const { data: adjustments } = await supabase
        .from('folio_adjustments')
        .select('booking_id, subtotal_amount, tax_amount, final_amount, pos_receipt_number, notes, adjusted_at')
        .in('booking_id', paidBookingIds)
        .eq('is_deleted', false)
        .order('adjusted_at', { ascending: false })
      
      if (adjustments) {
        // Keep only the latest adjustment per booking (already sorted by adjusted_at DESC)
        for (const adj of adjustments) {
          if (!adjustmentsMap.has(adj.booking_id)) {
            adjustmentsMap.set(adj.booking_id, {
              subtotal_amount: parseFloat(adj.subtotal_amount.toString()),
              tax_amount: parseFloat(adj.tax_amount.toString()),
              final_amount: parseFloat(adj.final_amount.toString()),
              pos_receipt_number: adj.pos_receipt_number,
              notes: adj.notes,
              adjusted_at: adj.adjusted_at,
            })
          }
        }
      }
    }

    // Format response using batch-loaded data
    const formattedFolios = folios.map((folio) => {
      const roomNumber = folio.booking.room_id 
        ? (roomsMap.get(folio.booking.room_id) || 'N/A')
        : 'N/A'
      
      const adjustment = folio.payment_status === 'paid' 
        ? (adjustmentsMap.get(folio.booking_id) || null)
        : null

      return {
        booking_id: folio.booking_id,
        booking: {
          id: folio.booking.id,
          guest_name: folio.booking.guest_name,
          guest_email: folio.booking.guest_email,
          guest_phone: folio.booking.guest_phone,
          room_number: roomNumber,
          check_in_date: folio.booking.check_in_date,
          check_out_date: folio.booking.check_out_date,
        },
        orders: folio.orders,
        total_amount: folio.total_amount,
        payment_status: folio.payment_status,
        created_at: folio.created_at,
        adjustment,
      }
    })

    return NextResponse.json(formattedFolios)

  } catch (error) {
    logger.error('Error fetching folios:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

