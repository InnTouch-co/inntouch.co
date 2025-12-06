import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveBookingForRoom } from '@/lib/database/room-validation'
import { getRooms } from '@/lib/database/rooms'
import { validateOrderRequest } from '@/lib/validation/order-validation'
import { createOrder } from '@/lib/database/orders'
import { sendWhatsAppMessage } from '@/lib/messaging/twilio'
import { 
  orderConfirmationTemplate, 
  orderConfirmationTemplateVariables,
  formatPhoneNumberForTwilio 
} from '@/lib/messaging/templates'
import { logger, messagingLogger } from '@/lib/utils/logger'

/**
 * POST /api/guest/orders
 * Create a new order (public endpoint, no auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      hotel_id,
      room_number,
      guest_name,
      guest_phone,
      items,
      total,
      subtotal,
      discount_amount,
      order_type,
      special_instructions,
      payment_method = 'room_charge',
      idempotency_key,
    } = body

    if (!hotel_id || !room_number || !guest_phone || !items || !total) {
      return NextResponse.json(
        { error: 'hotel_id, room_number, guest_phone, items, and total are required' },
        { status: 400 }
      )
    }

    // Validate order request first (needed for booking_id in duplicate check)
    const validation = await validateOrderRequest({
      hotel_id,
      room_number,
      guest_name: guest_name || '',
      guest_phone,
      items,
      total,
    })

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.reason || 'Order validation failed',
          validation_details: {
            room: validation.room,
            booking: validation.booking,
          },
        },
        { status: 400 }
      )
    }

    if (!validation.room || !validation.booking) {
      return NextResponse.json(
        { error: 'Room or booking information is missing' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Duplicate order detection: same items + guest + room + booking within 5 seconds
    const fiveSecondsAgo = new Date(Date.now() - 5 * 1000).toISOString()
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id, order_number, items, total_amount, created_at, booking_id')
      .eq('hotel_id', hotel_id)
      .eq('booking_id', validation.booking.id) // Match by booking to ensure same guest session
      .eq('room_number', room_number)
      .eq('guest_phone', guest_phone)
      .eq('is_deleted', false)
      .gte('created_at', fiveSecondsAgo)
      .order('created_at', { ascending: false })

    if (recentOrders && recentOrders.length > 0) {
      // Check if any recent order has matching items and total
      const itemsFingerprint = JSON.stringify(items.map((item: any) => ({
        id: item.menuItem?.id || item.id,
        quantity: item.quantity || 1,
      })).sort((a: any, b: any) => (a.id || '').localeCompare(b.id || '')))

      for (const recentOrder of recentOrders) {
        const recentItems = JSON.stringify((recentOrder.items || []).map((item: any) => ({
          id: item.menuItem?.id || item.id,
          quantity: item.quantity || 1,
        })).sort((a: any, b: any) => (a.id || '').localeCompare(b.id || '')))

        if (recentItems === itemsFingerprint && parseFloat(recentOrder.total_amount?.toString() || '0') === total) {
          logger.warn('Duplicate order detected (within 5 seconds)', {
            existing_order_number: recentOrder.order_number,
            existing_created_at: recentOrder.created_at,
          })
          return NextResponse.json({
            success: true,
            order: {
              id: recentOrder.id,
              order_number: recentOrder.order_number,
              status: 'pending',
              total_amount: total,
            },
            duplicate: true,
            message: 'Order already exists',
          })
        }
      }
    }

    // Get room_id from room_number
    const rooms = await getRooms(hotel_id)
    const room = rooms.find(r => r.room_number === room_number && !r.is_deleted)

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Create order
    // Use provided subtotal and discount_amount, or calculate from total if not provided
    const orderSubtotal = subtotal !== undefined ? subtotal : total
    const orderDiscountAmount = discount_amount !== undefined ? discount_amount : 0
    const orderTotal = total // This is the final total after discount
    
    const order = await createOrder({
      hotel_id,
      room_id: room.id,
      booking_id: validation.booking.id,
      order_type: order_type || 'room_service_order',
      guest_name: guest_name || validation.booking.guest_name,
      guest_email: validation.booking.guest_email || null,
      guest_phone,
      room_number,
      subtotal: orderSubtotal,
      tax_amount: 0, // Tax calculated at checkout
      tip_amount: 0,
      delivery_fee: 0,
      discount_amount: orderDiscountAmount,
      total_amount: orderTotal,
      payment_status: 'pending',
      payment_method,
      status: 'pending',
      special_instructions: special_instructions || null,
      items,
    })

    // Send WhatsApp confirmation to guest (non-blocking)
    // Order is already created, so if WhatsApp fails, order still succeeds
    messagingLogger.debug('OrderAPI', `Preparing WhatsApp notification for order ${order.order_number}, Room ${room_number}, Guest: ${guest_name || validation.booking.guest_name}`)
    
    try {
      const rawPhone = guest_phone || validation.booking.guest_phone
      const phoneNumber = formatPhoneNumberForTwilio(rawPhone)
      
      if (phoneNumber) {
        // Format order items for message
        const formattedItems = items.map((item: any) => ({
          name: item.menuItem?.name || item.name || 'Item',
          quantity: item.quantity || 1,
          price: item.menuItem?.price || item.price || 0,
        }))

        // Generate confirmation message (fallback)
        const message = orderConfirmationTemplate({
          order_number: order.order_number,
          guest_name: guest_name || validation.booking.guest_name,
          room_number,
          items: formattedItems,
          total_amount: total,
          special_instructions: special_instructions || null,
          estimated_delivery_minutes: 25, // Default ETA, can be made configurable
        })

        // Send WhatsApp message using approved template (don't await - fire and forget)
        const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_ORDER_CONFIRMATION
        
        let messagePromise: Promise<string>
        
        if (templateSid) {
          // Use approved template with variables
          const templateVariables = orderConfirmationTemplateVariables({
            order_number: order.order_number,
            guest_name: guest_name || validation.booking.guest_name,
            room_number,
            items: formattedItems,
            total_amount: total,
            special_instructions: special_instructions || null,
            estimated_delivery_minutes: 25,
          })
          
          messagingLogger.send('OrderAPI', phoneNumber, `order confirmation #${order.order_number}`)
          messagePromise = sendWhatsAppMessage(phoneNumber, '', templateSid, templateVariables)
        } else {
          // Fallback to freeform message (may fail if outside 24-hour window)
          messagingLogger.warn('OrderAPI', `ORDER_CONFIRMATION template SID not configured, using freeform (set TWILIO_WHATSAPP_TEMPLATE_ORDER_CONFIRMATION)`)
          messagePromise = sendWhatsAppMessage(phoneNumber, message)
        }
        
        messagePromise
          .then((messageSid) => {
            messagingLogger.success('OrderAPI', messageSid, `Order confirmation sent for ${order.order_number}`)
          })
          .catch((error: any) => {
            // Log error but don't fail the order
            messagingLogger.error('OrderAPI', error, `Failed to send WhatsApp confirmation for order ${order.order_number}. Order was still created successfully.`)
            
            // Special handling for template requirement
            if (error.message?.includes('WHATSAPP_TEMPLATE_REQUIRED') || error.code === 63016) {
              messagingLogger.warn('OrderAPI', `Template required. Create one at https://console.twilio.com/us1/develop/sms/content-manager`)
            }
          })
      } else {
        messagingLogger.warn('OrderAPI', `No valid phone number for order ${order.order_number} (raw: ${rawPhone}), WhatsApp confirmation skipped`)
      }
    } catch (error) {
      // Log error but don't fail the order creation
      messagingLogger.error('OrderAPI', error as Error, `Error preparing WhatsApp confirmation for order ${order.order_number}. Order was still created successfully.`)
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
      },
    })
  } catch (error: any) {
    logger.error('Error creating order:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to create order',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/guest/orders
 * Get orders for a guest by room number (public endpoint, no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotel_id')
    const roomNumber = searchParams.get('room_number')

    if (!hotelId || !roomNumber) {
      return NextResponse.json(
        { error: 'hotel_id and room_number are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get room by number
    const rooms = await getRooms(hotelId)
    const room = rooms.find(r => r.room_number === roomNumber && !r.is_deleted)

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Get active booking for this room
    const booking = await getActiveBookingForRoom(roomNumber, hotelId)

    if (!booking) {
      // Return empty array if no active booking
      return NextResponse.json([])
    }

    // Get all orders for this booking
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('booking_id', booking.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (ordersError) {
      logger.error('Error fetching orders:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // Format orders for guest view
    const formattedOrders = (orders || []).map(order => ({
      id: order.id,
      order_number: order.order_number,
      order_type: order.order_type,
      status: order.status,
      total_amount: parseFloat(order.total_amount?.toString() || '0'),
      payment_status: order.payment_status,
      created_at: order.created_at,
      delivered_at: order.delivered_at,
      special_instructions: order.special_instructions,
      items: order.items || [],
    }))

    return NextResponse.json(formattedOrders)
  } catch (error: any) {
    logger.error('Error fetching guest orders:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch orders',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}
