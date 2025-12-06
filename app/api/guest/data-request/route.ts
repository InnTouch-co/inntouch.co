import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveBookingForRoom } from '@/lib/database/room-validation'
import { getOrders } from '@/lib/database/orders'
import { getServiceRequests } from '@/lib/database/service-requests'
import { logger } from '@/lib/utils/logger'
import { sendDataRequestVerificationEmail } from '@/lib/guest/email-verification'

/**
 * GET /api/guest/data-request
 * Export guest data (GDPR right to access)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotel_id')
    const roomNumber = searchParams.get('room_number')
    const type = searchParams.get('type') || 'access'

    if (!hotelId || !roomNumber) {
      return NextResponse.json(
        { error: 'hotel_id and room_number are required' },
        { status: 400 }
      )
    }

    // Get active booking for the room
    const booking = await getActiveBookingForRoom(roomNumber, hotelId)

    if (!booking) {
      return NextResponse.json(
        { error: 'No active booking found for this room' },
        { status: 404 }
      )
    }

    // Collect all guest data
    const guestData: any = {
      personal_information: {
        name: booking.guest_name,
        email: booking.guest_email,
        phone: booking.guest_phone,
        room_number: roomNumber,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
      },
      bookings: [{
        id: booking.id,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        status: booking.status,
      }],
      orders: [],
      service_requests: [],
      exported_at: new Date().toISOString(),
    }

    // Get all orders for this booking
    try {
      const orders = await getOrders(hotelId, {
        room_number: roomNumber,
      })
      
      guestData.orders = orders
        .filter(order => order.booking_id === booking.id)
        .map(order => ({
          id: order.id,
          order_number: order.order_number,
          order_type: order.order_type,
          status: order.status,
          items: order.items,
          total_amount: order.total_amount,
          payment_status: order.payment_status,
          special_instructions: order.special_instructions,
          created_at: order.created_at,
          delivered_at: order.delivered_at,
        }))
    } catch (error) {
      logger.error('Error fetching orders:', error)
    }

    // Get service requests for this booking
    try {
      const serviceRequests = await getServiceRequests(hotelId, {
        search: booking.guest_name,
      })
      
      // Filter by booking_id if available, otherwise by guest name match
      guestData.service_requests = serviceRequests
        .filter(req => {
          if (req.booking_id) {
            return req.booking_id === booking.id
          }
          // Fallback: match by guest name
          return req.guest_name?.toLowerCase() === booking.guest_name?.toLowerCase()
        })
        .map(req => ({
          id: req.id,
          title: req.title,
          description: req.description,
          request_type: req.request_type,
          priority: req.priority,
          status: req.status,
          created_at: req.created_at,
          completed_at: req.completed_at,
        }))
    } catch (error) {
      logger.error('Error fetching service requests:', error)
    }

    // Return as JSON
    return NextResponse.json(guestData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="my-data-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error: any) {
    logger.error('Error exporting guest data:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to export data',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/guest/data-request
 * Create a data request (deletion, rectification, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      hotel_id,
      room_number,
      request_type, // 'deletion', 'rectification', 'portability'
      description,
    } = body

    if (!hotel_id || !room_number || !request_type) {
      return NextResponse.json(
        { error: 'hotel_id, room_number, and request_type are required' },
        { status: 400 }
      )
    }

    // Get active booking for the room
    const booking = await getActiveBookingForRoom(room_number, hotel_id)

    if (!booking) {
      return NextResponse.json(
        { error: 'No active booking found for this room' },
        { status: 404 }
      )
    }

    // Generate verification token
    const verificationToken = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // Create data request
    // Note: ip_address and user_agent columns don't exist in data_requests table
    // They exist in cookie_consents and data_consents tables, but not here
    const { data, error } = await supabase
      .from('data_requests')
      .insert({
        hotel_id,
        guest_id: booking.guest_id || null,
        request_type,
        status: 'pending',
        description: description || null,
        verification_token: verificationToken,
        verified: false, // Will need to verify via email or other method
      })
      .select()
      .single()

    if (error) throw error

    // Send verification email to guest
    if (booking.guest_email) {
      try {
        await sendDataRequestVerificationEmail({
          email: booking.guest_email,
          name: booking.guest_name || 'Guest',
          requestType: request_type as 'access' | 'deletion' | 'portability' | 'rectification',
          verificationToken: verificationToken,
        })
        logger.info(`Verification email sent to ${booking.guest_email} for request ${data.id}`)
      } catch (emailError: any) {
        // Log error but don't fail the request creation
        logger.error('Failed to send verification email:', emailError)
        // Request is still created, but verification will need to be done manually
      }
    } else {
      logger.warn(`No email address for guest, verification email not sent for request ${data.id}`)
    }

    return NextResponse.json({
      success: true,
      request_id: data.id,
      message: 'Data request submitted successfully. Please check your email to verify your request. We will process it within 30 days after verification.',
      verification_sent: !!booking.guest_email,
    })
  } catch (error: any) {
    logger.error('Error creating data request:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to create data request',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

