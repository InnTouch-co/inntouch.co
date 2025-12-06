import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateBooking } from '@/lib/database/bookings'
import { updateGuest } from '@/lib/database/guests'
import { getActiveBookingByRoomId } from '@/lib/database/bookings'
import { logger } from '@/lib/utils/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { guest_name, guest_email, guest_phone, check_in_date, check_out_date } = body

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('is_deleted', false)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Update booking guest info and dates
    const updates: any = {}
    if (guest_name !== undefined) updates.guest_name = guest_name
    if (guest_email !== undefined) updates.guest_email = guest_email
    if (guest_phone !== undefined) updates.guest_phone = guest_phone
    if (check_in_date !== undefined) updates.check_in_date = check_in_date
    if (check_out_date !== undefined) updates.check_out_date = check_out_date

    const updatedBooking = await updateBooking(bookingId, updates)

    // Also update guest record if guest_id exists
    if (booking.guest_id) {
      const guestUpdates: any = {}
      if (guest_name !== undefined) guestUpdates.name = guest_name
      if (guest_email !== undefined) guestUpdates.email = guest_email
      if (guest_phone !== undefined) guestUpdates.phone = guest_phone

      try {
        await updateGuest(booking.guest_id, guestUpdates)
      } catch (error) {
        logger.error('Failed to update guest record:', error)
        // Don't fail the request if guest update fails
      }
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
    })
  } catch (error: any) {
    logger.error('Error updating guest info:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to update guest information',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

