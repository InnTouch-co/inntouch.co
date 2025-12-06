import { NextRequest, NextResponse } from 'next/server'
import { createServiceRequest } from '@/lib/database/service-requests'
import { sendServiceRequestNotification } from '@/lib/messaging/notifications'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotel_id, title, description, request_type, priority, guest_name, guest_email, guest_phone, room_number } = body

    if (!hotel_id || !title || !request_type) {
      return NextResponse.json(
        { error: 'hotel_id, title, and request_type are required' },
        { status: 400 }
      )
    }

    // Verify hotel exists and is active
    const { getHotelById } = await import('@/lib/database/hotels')
    try {
      const hotel = await getHotelById(hotel_id)
      if (!hotel.active) {
        return NextResponse.json(
          { error: 'Hotel is not active' },
          { status: 403 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    // Find room_id from room_number if provided
    let room_id: string | null = null
    if (room_number) {
      try {
        const { getRooms } = await import('@/lib/database/rooms')
        const rooms = await getRooms(hotel_id)
        const room = rooms.find(r => r.room_number === room_number)
        if (room) {
          room_id = room.id
        }
      } catch (error) {
        logger.error('Error finding room:', error)
        // Continue without room_id if lookup fails
      }
    }

    // Create service request (public, no authentication required)
    const newRequest = await createServiceRequest({
      hotel_id,
      room_id: room_id || null,
      booking_id: null,
      title,
      description: description || null,
      request_type,
      priority: priority || 'normal',
      status: 'pending',
      guest_name: guest_name || null,
      guest_email: guest_email || null,
      guest_phone: guest_phone || null,
      assigned_to: null,
      created_by: null, // No user ID for guest requests
    })

    // Send service request notification (non-blocking)
    // Extract date/time from description for service bookings (spa, fitness)
    if (guest_phone && guest_name && room_number && request_type) {
      // Check if this is a service booking (spa_booking or fitness_booking)
      const isServiceBooking = request_type === 'spa_booking' || request_type === 'fitness_booking'
      
      if (isServiceBooking && description) {
        // Parse date and time from description
        // Format: "Booking Details:\nService: ...\nDate: YYYY-MM-DD\nTime: HH:MM\n..."
        const dateMatch = description.match(/Date:\s*(\d{4}-\d{2}-\d{2})/i)
        const timeMatch = description.match(/Time:\s*(\d{1,2}:\d{2})/i)
        const serviceMatch = description.match(/Service:\s*([^\n]+)/i)
        
        if (dateMatch && timeMatch) {
          const bookingDate = dateMatch[1]
          const bookingTime = timeMatch[1]
          const serviceType = serviceMatch ? serviceMatch[1].trim() : title.replace('Booking: ', '').split(' - ')[0] || 'Service'
          
          // Format date for display
          const dateFormatted = new Date(bookingDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
          
          sendServiceRequestNotification(
            guest_name,
            serviceType,
            room_number,
            dateFormatted,
            bookingTime,
            guest_phone
          ).catch(error => logger.error('Failed to send service request notification:', error))
        }
      }
    }

    return NextResponse.json(newRequest, { status: 201 })

  } catch (error) {
    logger.error('Error creating guest service request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create service request' },
      { status: 500 }
    )
  }
}

