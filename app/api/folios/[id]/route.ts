import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteBooking } from '@/lib/database/bookings'
import { logger } from '@/lib/utils/logger'

/**
 * DELETE /api/folios/[id]
 * Delete a folio by soft-deleting the associated booking
 * Super admin only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if user is super admin
    if (currentUserData.role_id !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Super admin only' },
        { status: 403 }
      )
    }

    const { id: bookingId } = await params

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    // Verify booking exists and is checked out (folio condition)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, is_deleted')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.is_deleted) {
      return NextResponse.json(
        { error: 'Folio already deleted' },
        { status: 400 }
      )
    }

    // Soft delete the booking (which will hide the folio)
    await deleteBooking(bookingId)

    return NextResponse.json({
      success: true,
      message: 'Folio deleted successfully',
    })
  } catch (error: any) {
    logger.error('Error deleting folio:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to delete folio',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

