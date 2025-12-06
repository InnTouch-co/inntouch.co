import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrderItemsBatch } from '@/lib/database/orders'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { order_ids, hotel_id } = body

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: 'order_ids array is required' },
        { status: 400 }
      )
    }

    if (!hotel_id) {
      return NextResponse.json(
        { error: 'hotel_id is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this hotel
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', hotel_id)
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

    // Verify all orders belong to this hotel
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .in('id', order_ids)
      .eq('hotel_id', hotel_id)
      .eq('is_deleted', false)

    if (ordersError) {
      return NextResponse.json({ error: 'Error verifying orders' }, { status: 500 })
    }

    const validOrderIds = orders?.map(o => o.id) || []
    if (validOrderIds.length === 0) {
      return NextResponse.json({ error: 'No valid orders found' }, { status: 404 })
    }

    // Get order items in batch
    const itemsByOrder = await getOrderItemsBatch(validOrderIds)

    return NextResponse.json(itemsByOrder)

  } catch (error: any) {
    logger.error('Error fetching order items batch:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch order items',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

