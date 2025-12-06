import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrders, getOrderItemsBatch, calculateDepartmentStatusFromItems } from '@/lib/database/orders'
import { logger } from '@/lib/utils/logger'
import { getHotelTimezone, getHotelCurrentDate } from '@/lib/utils/hotel-timezone'

export const dynamic = 'force-dynamic'

/**
 * GET /api/kitchen/stats
 * Get statistics for kitchen staff dashboard
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

    // Verify user is staff with kitchen department
    if (currentUserData.role_id !== 'staff') {
      return NextResponse.json({ error: 'Access denied. Kitchen staff only.' }, { status: 403 })
    }

    if (currentUserData.department !== 'kitchen' && currentUserData.department !== 'both') {
      return NextResponse.json({ error: 'Access denied. Kitchen department required.' }, { status: 403 })
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

    // Get hotel timezone and current date
    const hotelTimezone = await getHotelTimezone(hotelId)
    const currentDate = await getHotelCurrentDate(hotelId)

    // Get all orders
    const allOrders = await getOrders(hotelId, {
      status: undefined,
    })

    // Filter orders from today
    const todayOrders = allOrders.filter(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0]
      return orderDate === currentDate
    })

    // Get all order IDs
    const orderIds = todayOrders.map(order => order.id)

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

    // Helper function to check if an item is a restaurant/food item
    const isRestaurantItem = (item: any): boolean => {
      // Check department column first (for new items with department set)
      if (item.department) {
        return item.department === 'kitchen'
      }

      // Check serviceType in item metadata
      const serviceType = item.serviceType || item.service_type || item.menuItem?.serviceType
      if (serviceType === 'restaurant' || serviceType === 'restaurant_order' || serviceType === 'room_service') {
        return true
      }

      // Check service_id if available and look up in services table
      const serviceId = item.service_id || item.serviceId || item.menuItem?.serviceId
      if (serviceId) {
        const itemServiceType = serviceTypeMap.get(serviceId)
        if (itemServiceType === 'restaurant' || itemServiceType === 'room_service') {
          return true
        }
      }

      // Check item name/category for food keywords (fallback)
      const itemName = (item.menuItem?.name || item.name || item.menu_item_name || '').toLowerCase()
      const category = (item.menuItem?.category || item.category || '').toLowerCase()
      
      // Drink keywords that should NOT be considered food
      const drinkKeywords = ['drink', 'cocktail', 'wine', 'beer', 'mojito', 'martini', 'whiskey', 'vodka', 'rum', 'tequila', 'juice', 'soda', 'water', 'beverage']
      if (drinkKeywords.some(keyword => itemName.includes(keyword) || category.includes(keyword))) {
        return false
      }
      
      // Food keywords
      const foodKeywords = ['burger', 'pizza', 'pasta', 'salad', 'steak', 'chicken', 'fish', 'soup', 'sandwich', 'appetizer', 'entree', 'dessert', 'breakfast', 'lunch', 'dinner', 'grilled', 'toast', 'cake', 'peppers', 'potatoes', 'mashed', 'stuffed', 'salmon', 'beef', 'avocado']
      return foodKeywords.some(keyword => itemName.includes(keyword) || category.includes(keyword))
    }

    // Calculate department-specific status for each order and filter to only kitchen orders
    const kitchenOrdersWithStatus = await Promise.all(
      todayOrders.map(async (order) => {
        // Get items from order_items table (preferred) or fallback to items JSONB
        const dbItems = orderItemsMap[order.id] || []
        const jsonbItems = Array.isArray(order.items) ? order.items : []
        const allItems = dbItems.length > 0 ? dbItems : jsonbItems

        // Filter to only kitchen items
        const kitchenItems = allItems.filter(item => {
          if (item.department) {
            return item.department === 'kitchen'
          }
          return isRestaurantItem(item)
        })

        // Only include order if it has at least one kitchen item
        if (kitchenItems.length === 0) {
          return null
        }

        // Calculate department-specific status from kitchen items
        const kitchenItemsForStatus = kitchenItems.map(item => ({
          id: item.id || '',
          order_id: order.id,
          menu_item_id: item.menu_item_id || item.menuItem?.id || '',
          menu_item_name: item.menu_item_name || item.menuItem?.name || item.name || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || item.menuItem?.price || item.price || 0,
          total_price: item.total_price || 0,
          special_instructions: item.special_instructions || null,
          status: item.status || 'pending',
          department: item.department || 'kitchen' as const,
          created_at: item.created_at || order.created_at,
        }))

        const kitchenStatus = await calculateDepartmentStatusFromItems(
          order.id,
          'kitchen',
          kitchenItemsForStatus
        )

        return {
          order,
          status: kitchenStatus,
        }
      })
    )

    // Filter out null results (orders without kitchen items)
    const validKitchenOrders = kitchenOrdersWithStatus.filter(
      (result): result is { order: typeof todayOrders[0], status: string } => result !== null
    )

    // Calculate statistics based on department-specific status
    const pendingCount = validKitchenOrders.filter(o => o.status === 'pending').length
    const preparingCount = validKitchenOrders.filter(o => o.status === 'preparing').length
    const readyCount = validKitchenOrders.filter(o => o.status === 'ready').length
    const deliveredCount = validKitchenOrders.filter(o => o.status === 'delivered').length
    const completedToday = validKitchenOrders.filter(o => 
      o.status === 'delivered' || o.status === 'cancelled'
    ).length

    // Calculate average preparation time (for completed orders)
    const completedOrders = validKitchenOrders.filter(o => o.status === 'delivered' && o.order.delivered_at)
    let avgPrepTime = 0
    if (completedOrders.length > 0) {
      const totalPrepTime = completedOrders.reduce((sum, orderData) => {
        const created = new Date(orderData.order.created_at).getTime()
        const delivered = new Date(orderData.order.delivered_at!).getTime()
        return sum + (delivered - created)
      }, 0)
      avgPrepTime = Math.round(totalPrepTime / completedOrders.length / (1000 * 60)) // Convert to minutes
    }

    return NextResponse.json({
      stats: {
        completed_today: completedToday,
        pending: pendingCount,
        preparing: preparingCount,
        ready: readyCount,
        delivered: deliveredCount,
        total_today: validKitchenOrders.length,
        avg_prep_time_minutes: avgPrepTime,
      },
    })
  } catch (error: any) {
    logger.error('Error fetching kitchen stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch kitchen stats' },
      { status: 500 }
    )
  }
}

