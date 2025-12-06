import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { extractTextFromJson } from '@/lib/utils/json-text'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from users table and verify super-admin role
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id, role_id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is super-admin
    if (currentUserData.role_id !== 'super_admin') {
      return NextResponse.json({ 
        error: 'Forbidden: Super admin access required' 
      }, { status: 403 })
    }

    // Get all stats in parallel for better performance
    const [
      hotelsResult,
      activeHotelsResult,
      totalRoomsResult,
      totalUsersResult,
      totalStaffResult,
      totalServiceRequestsResult,
      pendingServiceRequestsResult,
      totalOrdersResult,
      totalRevenueResult,
      totalBookingsResult,
      activeBookingsResult,
    ] = await Promise.all([
      // Total hotels
      supabase
        .from('hotels')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      // Active hotels
      supabase
        .from('hotels')
        .select('*', { count: 'exact', head: true })
        .eq('active', true)
        .eq('is_deleted', false),
      // Total rooms across all hotels
      supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      // Total users
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      // Total staff (non-admin roles)
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .in('role_id', ['staff', 'front_desk', 'housekeeping', 'maintenance'])
        .eq('is_deleted', false)
        .eq('active', 1),
      // Total service requests
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      // Pending service requests
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('is_deleted', false),
      // Total orders
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      // Total revenue (sum of all orders)
      supabase
        .from('orders')
        .select('total_amount')
        .eq('is_deleted', false),
      // Total bookings
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false),
      // Active bookings
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'checked_in')
        .eq('is_deleted', false),
    ])

    // Calculate total revenue
    const totalRevenue = totalRevenueResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

    // Get recent hotels (last 5) - fetch all fields to ensure we get title
    const { data: recentHotelsData, error: recentHotelsError } = await supabase
      .from('hotels')
      .select('id, title, active, created_at')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentHotelsError) {
      logger.error('Error fetching recent hotels:', recentHotelsError)
    }

    // Get recent users (last 5)
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, name, email, role_id, created_at')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get recent service requests (last 5) with hotel and room info
    const { data: recentServiceRequestsData, error: recentServiceRequestsError } = await supabase
      .from('service_requests')
      .select(`
        id,
        request_type,
        status,
        guest_name,
        created_at,
        priority,
        hotel_id,
        hotels(id, title),
        rooms(room_number)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentServiceRequestsError) {
      logger.error('Error fetching recent service requests:', recentServiceRequestsError)
      logger.error('Error details:', JSON.stringify(recentServiceRequestsError, null, 2))
    }

    // Get recent orders (last 5) with hotel info
    const { data: recentOrdersData, error: recentOrdersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        status,
        guest_name,
        room_number,
        created_at,
        hotel_id,
        hotels(id, title)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentOrdersError) {
      logger.error('Error fetching recent orders:', recentOrdersError)
      logger.error('Error details:', JSON.stringify(recentOrdersError, null, 2))
    }

    // Format recent service requests with hotel name and room number
    const recentServiceRequests = (recentServiceRequestsData || []).map((req: any) => {
      const hotelName = req.hotels?.title 
        ? extractTextFromJson(req.hotels.title) 
        : 'Unknown Hotel'
      const roomNumber = req.rooms?.room_number || null
      
      return {
        id: req.id,
        request_type: req.request_type,
        status: req.status,
        room_number: roomNumber,
        guest_name: req.guest_name,
        created_at: req.created_at,
        priority: req.priority,
        hotel_id: req.hotel_id,
        hotel_name: hotelName,
      }
    })

    // Format recent orders with hotel name
    const recentOrders = (recentOrdersData || []).map((order: any) => {
      const hotelName = order.hotels?.title 
        ? extractTextFromJson(order.hotels.title) 
        : 'Unknown Hotel'
      
      return {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        status: order.status,
        guest_name: order.guest_name,
        room_number: order.room_number,
        created_at: order.created_at,
        hotel_id: order.hotel_id,
        hotel_name: hotelName,
      }
    })

    // Log for debugging
    logger.info(`Fetched ${recentServiceRequests.length} recent service requests`)
    logger.info(`Fetched ${recentOrders.length} recent orders`)

    // Log for debugging
    logger.info(`Hotels - Total: ${hotelsResult.count ?? 0}, Active: ${activeHotelsResult.count ?? 0}`)
    logger.info(`Recent hotels fetched: ${recentHotelsData?.length || 0}`)
    
    if (hotelsResult.count === null || hotelsResult.count === undefined) {
      logger.warn('Hotels count is null/undefined, checking data directly')
    }
    
    if (recentHotelsError) {
      logger.error('Error fetching recent hotels:', recentHotelsError)
    }

    return NextResponse.json({
      hotels: {
        total: hotelsResult.count ?? 0,
        active: activeHotelsResult.count ?? 0,
      },
      rooms: {
        total: totalRoomsResult.count || 0,
      },
      users: {
        total: totalUsersResult.count || 0,
        staff: totalStaffResult.count || 0,
      },
      serviceRequests: {
        total: totalServiceRequestsResult.count || 0,
        pending: pendingServiceRequestsResult.count || 0,
      },
      orders: {
        total: totalOrdersResult.count || 0,
      },
      revenue: {
        total: totalRevenue,
      },
      bookings: {
        total: totalBookingsResult.count || 0,
        active: activeBookingsResult.count || 0,
      },
      recentHotels: recentHotelsData || [],
      recentUsers: recentUsers || [],
      recentServiceRequests: recentServiceRequests || [],
      recentOrders: recentOrders || [],
    })
  } catch (error: any) {
    logger.error('Error fetching super-admin dashboard stats:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch dashboard statistics',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

