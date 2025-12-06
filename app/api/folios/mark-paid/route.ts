import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFolioByBookingId } from '@/lib/database/folios'
import { markOrdersAsPaid } from '@/lib/database/orders'
import { getActiveBookingByRoomId } from '@/lib/database/bookings'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { booking_id, subtotal_amount, tax_amount, final_amount, pos_receipt_number, notes } = body

    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    if (tax_amount === undefined || tax_amount === null || tax_amount < 0) {
      return NextResponse.json({ error: 'tax_amount is required and must be >= 0' }, { status: 400 })
    }

    if (subtotal_amount === undefined || final_amount === undefined) {
      return NextResponse.json({ error: 'subtotal_amount and final_amount are required' }, { status: 400 })
    }

    // Get user ID for audit trail
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get folio
    const folio = await getFolioByBookingId(booking_id)
    if (!folio) {
      return NextResponse.json({ error: 'Folio not found' }, { status: 404 })
    }

    // Get all order IDs
    const orderIds = folio.orders.map(order => order.id)

    if (orderIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to mark as paid',
      })
    }

    // Mark orders as paid
    await markOrdersAsPaid(orderIds)

    // Save adjustment record for audit trail
    const { error: adjustmentError } = await supabase
      .from('folio_adjustments')
      .insert({
        booking_id,
        subtotal_amount,
        tax_amount,
        final_amount,
        pos_receipt_number: pos_receipt_number || null,
        notes: notes || null,
        adjusted_by: currentUserData.id,
      })

    if (adjustmentError) {
      logger.error('Error saving folio adjustment:', adjustmentError)
      // Don't fail the request, but log the error
    }

    // Check if room should be made available
    // Only if there's no other active booking for this room
    if (folio.booking.room_id) {
      const activeBooking = await getActiveBookingByRoomId(folio.booking.room_id)
      
      // If no active booking, room can be made available
      // But since guest already checked out, room should already be available
      // This is just a safety check
    }

    return NextResponse.json({
      success: true,
      message: 'Folio marked as paid successfully',
      orders_marked: orderIds.length,
    })

  } catch (error: any) {
    logger.error('Error marking folio as paid:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to mark folio as paid',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

