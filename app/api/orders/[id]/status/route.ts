import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateOrderStatus, getOrderById } from '@/lib/database/orders'
import { sendOrderReadyNotification, sendOrderDeliveredNotification } from '@/lib/messaging/notifications'
import { logger, messagingLogger } from '@/lib/utils/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    // Get order to verify it exists and user has access
    const order = await getOrderById(id)
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this hotel
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', order.hotel_id)
      .eq('user_id', currentUserData.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (hotelUserError) {
      return NextResponse.json({ error: 'Error verifying hotel access' }, { status: 500 })
    }

    if (!hotelUser) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this hotel' },
        { status: 403 }
      )
    }

    // Update order status
    logger.info(`Updating order ${id} to status: ${status}`)
    const updatedOrder = await updateOrderStatus(id, status)

    // Send WhatsApp notifications for status changes (non-blocking)
    if (status === 'ready') {
      if (order.guest_phone) {
        messagingLogger.debug('OrderStatusAPI', `Triggering order ready notification for ${order.order_number}`)
        sendOrderReadyNotification(order.order_number, order.room_number, order.guest_phone)
          .catch(error => {
            messagingLogger.error('OrderStatusAPI', error, `Failed to send order ready notification for ${order.order_number}`)
          })
      } else {
        messagingLogger.warn('OrderStatusAPI', `Order ${order.order_number} marked as ready but no guest phone number`)
      }
    } else if (status === 'delivered') {
      if (order.guest_phone) {
        messagingLogger.debug('OrderStatusAPI', `Triggering order delivered notification for ${order.order_number}`)
        sendOrderDeliveredNotification(order.order_number, order.room_number, order.guest_phone)
          .catch(error => {
            messagingLogger.error('OrderStatusAPI', error, `Failed to send order delivered notification for ${order.order_number}`)
          })
      } else {
        messagingLogger.warn('OrderStatusAPI', `Order ${order.order_number} marked as delivered but no guest phone number`)
      }
    }

    return NextResponse.json(updatedOrder)

  } catch (error: any) {
    logger.error('Error updating order status:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to update order status',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

