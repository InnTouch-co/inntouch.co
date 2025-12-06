import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrders, getOrderItemsBatch, calculateDepartmentStatusFromItems } from '@/lib/database/orders'
import { logger } from '@/lib/utils/logger'
import { formatTimestamp, parseTimestampAsUTC } from '@/lib/utils/formatTimestamp'
import { getHotelTimezone } from '@/lib/utils/hotel-timezone'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bar/orders
 * Get pending and in-progress orders for bar staff
 * Filters by order_type: 'bar_order' (drink orders)
 */
export async function GET(request: NextRequest) {
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
      .select('id, role_id, department')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is staff with bar department
    if (currentUserData.role_id !== 'staff') {
      return NextResponse.json({ error: 'Access denied. Bar staff only.' }, { status: 403 })
    }

    if (currentUserData.department !== 'bar' && currentUserData.department !== 'both') {
      return NextResponse.json({ error: 'Access denied. Bar department required.' }, { status: 403 })
    }

    // Get hotel_id from query params
    const searchParams = request.nextUrl.searchParams
    const hotelId = searchParams.get('hotel_id')

    if (!hotelId) {
      return NextResponse.json({ error: 'hotel_id is required' }, { status: 400 })
    }

    // Verify user has access to this hotel
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('user_id', currentUserData.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (hotelUserError) {
      return NextResponse.json({ error: 'Error verifying hotel access' }, { status: 500 })
    }

    if (!hotelUser) {
      return NextResponse.json({ error: 'Access denied to this hotel' }, { status: 403 })
    }

    // Get hotel timezone for timestamp formatting
    const hotelTimezone = await getHotelTimezone(hotelId)

    // Get all orders (we'll filter by items, not just order_type)
    const orders = await getOrders(hotelId, {
      status: undefined, // Get all statuses, we'll filter client-side
    })

    // Get all order IDs first
    const orderIds = orders.map(order => order.id)

    // Fetch order items from order_items table for all orders
    const orderItemsMap = await getOrderItemsBatch(orderIds)

    // Get services to check service types
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, service_type')
      .eq('hotel_id', hotelId)
      .eq('is_deleted', false)

    const serviceTypeMap = new Map<string, string>()
    if (services) {
      services.forEach(service => {
        serviceTypeMap.set(service.id, service.service_type || 'other')
      })
    }

    // Helper function to check if an item is a bar item
    const isBarItem = (item: any): boolean => {
      // Check serviceType in item metadata
      const serviceType = item.serviceType || item.service_type || item.menuItem?.serviceType
      if (serviceType === 'bar' || serviceType === 'bar_order') {
        return true
      }

      // Check service_id if available and look up in services table
      const serviceId = item.service_id || item.serviceId || item.menuItem?.serviceId
      if (serviceId && serviceTypeMap.get(serviceId) === 'bar') {
        return true
      }

      // Check item name/category for drink keywords (fallback)
      const itemName = (item.menuItem?.name || item.name || item.menu_item_name || '').toLowerCase()
      const category = (item.menuItem?.category || item.category || '').toLowerCase()
      
      // Food keywords that should NOT be considered drinks
      const foodKeywords = ['burger', 'pizza', 'steak', 'chicken', 'salmon', 'beef', 'grilled', 'toast', 'cake', 'salad', 'peppers', 'potatoes', 'mashed', 'stuffed']
      if (foodKeywords.some(keyword => itemName.includes(keyword))) {
        return false
      }
      
      // Drink keywords
      const drinkKeywords = ['drink', 'cocktail', 'wine', 'beer', 'mojito', 'martini', 'whiskey', 'vodka', 'rum', 'tequila', 'coffee', 'tea', 'juice', 'soda', 'water', 'beverage', 'iced']
      const isDrink = drinkKeywords.some(keyword => itemName.includes(keyword) || category.includes(keyword))
      
      return isDrink
    }

    // Filter orders and items: only include orders with bar items, and only show bar items
    const barOrdersWithItems = orders.map(order => {
      // Get items from order_items table (preferred) or fallback to items JSONB
      const dbItems = orderItemsMap[order.id] || []
      const jsonbItems = Array.isArray(order.items) ? order.items : []
      const allItems = dbItems.length > 0 ? dbItems : jsonbItems

      // Filter to only bar items
      // Priority: 1) department column (new items), 2) fallback to keyword matching (existing items)
      const barItems = allItems.filter(item => {
        // Check department column first (for new items with department set)
        if (item.department) {
          return item.department === 'bar'
        }
        // Fallback to keyword matching for existing items without department
        return isBarItem(item)
      })

      // Only include order if it has at least one bar item
      if (barItems.length === 0) {
        return null
      }

      return {
        order,
        barItems
      }
    }).filter((result): result is { order: typeof orders[0], barItems: any[] } => result !== null)

    // Format orders with additional metadata (async map for status calculation)
    const formattedOrders = await Promise.all(barOrdersWithItems.map(async ({ order, barItems }) => {
      // Format items for frontend
      const items = barItems.map(item => {
        // Handle both database items and JSONB items
        if (item.id && item.menu_item_id) {
          // Database item
          return {
            id: item.id,
            menu_item_id: item.menu_item_id,
            menu_item_name: item.menu_item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            special_instructions: item.special_instructions,
            status: item.status || 'pending', // Include item status
            // For compatibility with frontend
            name: item.menu_item_name,
            price: item.unit_price,
            menuItem: {
              name: item.menu_item_name,
              price: item.unit_price
            }
          }
        } else {
          // JSONB item
          return {
            id: item.id || item.menuItem?.id || '',
            menu_item_id: item.menuItem?.id || item.id || '',
            menu_item_name: item.menuItem?.name || item.name || '',
            quantity: item.quantity || 1,
            unit_price: item.menuItem?.price || item.price || 0,
            total_price: (item.menuItem?.price || item.price || 0) * (item.quantity || 1),
            special_instructions: item.specialInstructions || item.special_instructions || null,
            status: item.status || 'pending', // Include item status (default to pending for JSONB items)
            // For compatibility with frontend
            name: item.menuItem?.name || item.name || '',
            price: item.menuItem?.price || item.price || 0,
            menuItem: {
              name: item.menuItem?.name || item.name || '',
              price: item.menuItem?.price || item.price || 0
            }
          }
        }
      })
      
      const itemCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
      
      // Recalculate subtotal and total based on filtered bar items only
      const filteredSubtotal = items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0)
      const filteredTotal = filteredSubtotal - parseFloat(order.discount_amount?.toString() || '0')
      
      // Calculate time waiting (in minutes) - use UTC for consistency
      // Parse created_at timestamp using shared utility
      const createdAt = parseTimestampAsUTC(order.created_at)
      const now = new Date() // Server time in UTC
      
      // Calculate difference in milliseconds, then convert to minutes
      const diffMs = now.getTime() - createdAt.getTime()
      const minutesWaiting = Math.floor(diffMs / (1000 * 60))
      
      // Ensure non-negative (if somehow in the future, show 0)
      const finalMinutesWaiting = Math.max(0, minutesWaiting)

      // Calculate department-specific status from bar items only
      // Convert items to OrderItem format for status calculation
      const barItemsForStatus = barItems.map(item => ({
        id: item.id || '',
        order_id: order.id,
        menu_item_id: item.menu_item_id || item.menuItem?.id || '',
        menu_item_name: item.menu_item_name || item.menuItem?.name || item.name || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || item.menuItem?.price || item.price || 0,
        total_price: item.total_price || 0,
        special_instructions: item.special_instructions || null,
        status: item.status || 'pending',
        department: item.department || 'bar' as const,
        created_at: item.created_at || order.created_at,
      }))
      
      // Calculate status based on bar items only
      const barStatus = await calculateDepartmentStatusFromItems(
        order.id,
        'bar',
        barItemsForStatus
      )

      return {
        id: order.id,
        order_number: order.order_number,
        order_type: order.order_type,
        status: barStatus, // Department-specific status (bar items only)
        guest_name: order.guest_name,
        room_number: order.room_number,
        special_instructions: order.special_instructions,
        items: items,
        item_count: itemCount,
        total_amount: filteredTotal,
        subtotal: filteredSubtotal,
        discount_amount: parseFloat(order.discount_amount?.toString() || '0'),
        created_at: order.created_at,
        created_at_formatted: formatTimestamp(order.created_at, hotelTimezone, { format: 'datetime' }),
        minutes_waiting: finalMinutesWaiting,
        is_urgent: finalMinutesWaiting >= 60 && barStatus !== 'delivered' && barStatus !== 'ready', // Urgent if waiting 1 hour or more, not delivered, and not ready
      }
    }))

    // Sort: pending first, then by time waiting (oldest first)
    formattedOrders.sort((a, b) => {
      // Status priority: pending > preparing > ready > others
      const statusPriority: Record<string, number> = {
        'pending': 0,
        'preparing': 1,
        'ready': 2,
        'out_for_delivery': 3,
        'delivered': 4,
        'cancelled': 5,
      }
      const aPriority = statusPriority[a.status] ?? 99
      const bPriority = statusPriority[b.status] ?? 99
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      // Same status, sort by time waiting (oldest first)
      return a.minutes_waiting - b.minutes_waiting
    })

    // Calculate statistics based on department-specific status
    const stats = {
      pending: formattedOrders.filter(o => o.status === 'pending').length,
      preparing: formattedOrders.filter(o => o.status === 'preparing').length,
      ready: formattedOrders.filter(o => o.status === 'ready').length,
      delivered: formattedOrders.filter(o => o.status === 'delivered').length,
      total_today: formattedOrders.length,
    }

    return NextResponse.json({
      orders: formattedOrders,
      stats,
    })
  } catch (error: any) {
    logger.error('Error fetching bar orders:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch bar orders' },
      { status: 500 }
    )
  }
}

