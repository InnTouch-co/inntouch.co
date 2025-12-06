import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBooking } from '@/lib/database/bookings'
import { getRoomByNumber } from '@/lib/database/room-validation'
import { getActiveBookingByRoomId } from '@/lib/database/bookings'
import { findOrCreateGuest } from '@/lib/database/guests'
import { getHotelById } from '@/lib/database/hotels'
import { sendCheckInNotification } from '@/lib/messaging/notifications'
import { logger, messagingLogger } from '@/lib/utils/logger'
import { getHotelTimezone, getHotelCurrentDate, formatDateForHotel } from '@/lib/utils/hotel-timezone'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      hotel_id,
      room_number,
      guest_name,
      guest_email,
      guest_phone,
      check_in_date,
      check_out_date,
      special_requests,
    } = body

    // Validate required fields
    if (!hotel_id || !room_number || !guest_name || !check_in_date || !check_out_date) {
      return NextResponse.json(
        { error: 'hotel_id, room_number, guest_name, check_in_date, and check_out_date are required' },
        { status: 400 }
      )
    }

    // Validate dates using hotel timezone
    const hotelCurrentDate = await getHotelCurrentDate(hotel_id)
    
    // Check-in date should not be in the past (in hotel timezone)
    if (check_in_date < hotelCurrentDate) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      )
    }
    
    // Check-out date should be after check-in date
    if (check_out_date <= check_in_date) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user from auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from users table (for created_by foreign key)
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
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

    // Check if room is already occupied
    if (room.status === 'occupied') {
      // Check if there's an active booking
      const activeBooking = await getActiveBookingByRoomId(room.id)
      if (activeBooking) {
        return NextResponse.json(
          { 
            error: 'Room is already occupied',
            existing_booking: {
              guest_name: activeBooking.guest_name,
              check_in_date: activeBooking.check_in_date,
              check_out_date: activeBooking.check_out_date,
            }
          },
          { status: 400 }
        )
      }
    }

    // Check if room is available
    if (room.status !== 'available' && room.status !== 'occupied') {
      return NextResponse.json(
        { error: `Room is ${room.status} and cannot be checked in` },
        { status: 400 }
      )
    }

    // Find or create guest
    const guest = await findOrCreateGuest(
      hotel_id,
      guest_name,
      guest_email || null,
      guest_phone || null
    )

    // Create booking
    const booking = await createBooking({
      hotel_id,
      room_id: room.id,
      guest_id: guest.id, // Link to guest
      guest_name,
      guest_email: guest_email || null,
      guest_phone: guest_phone || null,
      check_in_date,
      check_out_date,
      status: 'checked_in',
      total_amount: 0, // Room charge is handled separately
      payment_status: 'pending',
      special_requests: special_requests || null,
      created_by: currentUserData.id,
    })

    // Update room status to occupied
    const { error: roomUpdateError } = await supabase
      .from('rooms')
      .update({ 
        status: 'occupied',
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id)

    if (roomUpdateError) {
      logger.error('Error updating room status:', roomUpdateError)
      // Don't fail the check-in if room update fails, but log it
    }

    // Send check-in notification (non-blocking)
    if (guest_phone) {
      try {
        const hotel = await getHotelById(hotel_id)
        const hotelName = hotel.title || 'Hotel'
        
        // Construct guest site link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const guestSiteLink = `${baseUrl}/guest/${hotel_id}?room=${encodeURIComponent(room_number)}`
        
        // Format dates for display
        const checkInDateFormatted = new Date(check_in_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
        const checkOutDateFormatted = new Date(check_out_date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
        
        messagingLogger.debug('CheckInAPI', `Sending check-in notification to ${guest_name}, Room ${room_number}, ${checkInDateFormatted} to ${checkOutDateFormatted}`)
        sendCheckInNotification(
          hotelName,
          guest_name,
          room_number,
          checkInDateFormatted,
          checkOutDateFormatted,
          guestSiteLink,
          guest_phone
        ).catch(error => {
          messagingLogger.error('CheckInAPI', error, `Failed to send check-in notification to ${guest_name}`)
        })
      } catch (error) {
        messagingLogger.error('CheckInAPI', error as Error, `Error preparing check-in notification for ${guest_name}`)
        // Don't fail check-in if notification fails
      }
    } else {
      messagingLogger.warn('CheckInAPI', `No guest phone number provided for ${guest_name}, skipping notification`)
    }

    // Format created_at in hotel timezone for display
    const formattedCreatedAt = await formatDateForHotel(
      booking.created_at,
      hotel_id,
      'datetime'
    )

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        guest_name: booking.guest_name,
        room_number,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        status: booking.status,
        created_at: formattedCreatedAt, // Formatted in hotel timezone
        created_at_utc: booking.created_at, // Keep UTC for reference
      },
      message: 'Guest checked in successfully',
    })
  } catch (error: any) {
    logger.error('Error in check-in:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to check in guest',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

