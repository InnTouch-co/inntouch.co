import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { sendDataRequestVerificationEmail } from '@/lib/guest/email-verification'
import { getActiveBookingForRoom } from '@/lib/database/room-validation'

/**
 * POST /api/admin/data-requests/[id]/resend-verification
 * Resend verification email for a data request (admin only)
 */
export async function POST(
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
        { error: 'Forbidden - Super admin access required' },
        { status: 403 }
      )
    }

    const { id: requestId } = await params

    // Get the data request
    const { data: dataRequest, error: fetchError } = await supabase
      .from('data_requests')
      .select('id, guest_id, request_type, verification_token, hotel_id')
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !dataRequest) {
      return NextResponse.json(
        { error: 'Data request not found' },
        { status: 404 }
      )
    }

    if (!dataRequest.verification_token) {
      return NextResponse.json(
        { error: 'No verification token found for this request' },
        { status: 400 }
      )
    }

    // Get guest information
    let guestEmail: string | null = null
    let guestName: string | null = null

    if (dataRequest.guest_id) {
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('email, name')
        .eq('id', dataRequest.guest_id)
        .eq('is_deleted', false)
        .single()

      if (!guestError && guest) {
        guestEmail = guest.email || null
        guestName = guest.name || null
      }
    }

    // If no guest email from guests table, try to get from bookings
    if (!guestEmail && dataRequest.hotel_id) {
      // We need room_number to get booking, but we don't have it
      // Try to get from the most recent booking for this guest
      if (dataRequest.guest_id) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('guest_email, guest_name')
          .eq('guest_id', dataRequest.guest_id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (booking) {
          guestEmail = booking.guest_email || null
          guestName = booking.guest_name || null
        }
      }
    }

    if (!guestEmail) {
      return NextResponse.json(
        { error: 'No email address found for this guest' },
        { status: 400 }
      )
    }

    // Send verification email
    try {
      await sendDataRequestVerificationEmail({
        email: guestEmail,
        name: guestName || 'Guest',
        requestType: dataRequest.request_type as 'access' | 'deletion' | 'portability' | 'rectification',
        verificationToken: dataRequest.verification_token,
      })

      logger.info(`Verification email resent to ${guestEmail} for request ${requestId}`)

      return NextResponse.json({
        success: true,
        message: 'Verification email sent successfully',
      })
    } catch (emailError: any) {
      logger.error('Error sending verification email:', emailError)
      return NextResponse.json(
        {
          error: 'Failed to send verification email',
          details: emailError.message,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logger.error('Error resending verification email:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to resend verification email',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

