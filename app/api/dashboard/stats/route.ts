import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

// Import service request stats function - need to use server-side supabase
async function getServiceRequestStats(hotelId: string) {
  const supabase = await createClient()
  
  // Use database function for optimized calculation
  const { data, error } = await supabase
    .rpc('get_service_request_stats', { p_hotel_id: hotelId })

  if (error) {
    // Fallback to SQL aggregation if function doesn't exist
    logger.warn('Database function not available, using SQL aggregation fallback:', error)
    
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('service_requests')
      .select('status, updated_at, created_at')
      .eq('hotel_id', hotelId)
      .eq('is_deleted', false)

    if (fallbackError) {
      return {
        pending: 0,
        inProgress: 0,
        completedToday: 0,
        avgResponseMinutes: 0,
      }
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const pending = (fallbackData || []).filter(r => r.status === 'pending').length
    const inProgress = (fallbackData || []).filter(r => r.status === 'in_progress').length
    const completedToday = (fallbackData || []).filter(r => {
      if (r.status !== 'completed') return false
      const updatedAt = r.updated_at ? new Date(r.updated_at) : null
      return updatedAt && updatedAt >= todayStart
    }).length

    // Calculate average response time
    const completed = (fallbackData || []).filter(r => 
      (r.status === 'in_progress' || r.status === 'completed') && 
      r.updated_at && 
      new Date(r.updated_at) > new Date(r.created_at)
    )
    
    let avgResponseMinutes = 0
    if (completed.length > 0) {
      const totalMinutes = completed.reduce((sum, r) => {
        const created = new Date(r.created_at).getTime()
        const updated = new Date(r.updated_at!).getTime()
        return sum + ((updated - created) / 60000)
      }, 0)
      avgResponseMinutes = Math.round(totalMinutes / completed.length)
    }

    return {
      pending,
      inProgress,
      completedToday,
      avgResponseMinutes,
    }
  }

  if (!data || (typeof data === 'object' && !data.pending)) {
    return {
      pending: 0,
      inProgress: 0,
      completedToday: 0,
      avgResponseMinutes: 0,
    }
  }

  // Handle JSON response from database function
  const stats = typeof data === 'object' && 'pending' in data ? data : data[0]
  return {
    pending: stats.pending || 0,
    inProgress: stats.in_progress || 0,
    completedToday: stats.completed_today || 0,
    avgResponseMinutes: stats.avg_response_minutes || 0,
  }
}

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
      .select('id, role_id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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
      return NextResponse.json({ 
        error: 'Forbidden: You do not have access to this hotel' 
      }, { status: 403 })
    }

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.toISOString()
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    const todayEndISO = todayEnd.toISOString()

    // Get all stats in parallel for better performance
    const [
      roomsResult,
      availableRoomsResult,
      occupiedRoomsResult,
      maintenanceRoomsResult,
      staffResult,
      serviceRequestStats,
      todayOrdersResult,
      todayRevenueResult,
      pendingFoliosResult,
      todayCheckInsResult,
      todayCheckOutsResult,
      activeBookingsResult,
      recentOrdersResult,
      recentServiceRequestsResult,
    ] = await Promise.all([
      // Room stats
      supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('is_deleted', false),
      supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('status', 'available')
        .eq('is_deleted', false),
      supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('status', 'occupied')
        .eq('is_deleted', false),
      supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('status', 'maintenance')
        .eq('is_deleted', false),
      // Staff count
      supabase
        .from('hotel_users')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('is_deleted', false),
      // Service request stats (uses optimized function)
      getServiceRequestStats(hotelId).catch(() => ({
        pending: 0,
        inProgress: 0,
        completedToday: 0,
        avgResponseMinutes: 0,
      })),
      // Today's orders count
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEndISO)
        .eq('is_deleted', false),
      // Today's revenue (sum of total_amount)
      supabase
        .from('orders')
        .select('total_amount')
        .eq('hotel_id', hotelId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEndISO)
        .eq('is_deleted', false),
      // Pending folios count
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('status', 'checked_out')
        .eq('payment_status', 'pending')
        .eq('is_deleted', false),
      // Today's check-ins
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('status', 'checked_in')
        .gte('check_in_date', todayStart.split('T')[0])
        .lte('check_in_date', todayEndISO.split('T')[0])
        .eq('is_deleted', false),
      // Today's check-outs
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('status', 'checked_out')
        .gte('check_out_date', todayStart.split('T')[0])
        .lte('check_out_date', todayEndISO.split('T')[0])
        .eq('is_deleted', false),
      // Active bookings
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('status', 'checked_in')
        .eq('is_deleted', false),
      // Recent orders (last 5)
      supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, guest_name, room_number')
        .eq('hotel_id', hotelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(5),
      // Recent service requests (last 5)
      supabase
        .from('service_requests')
        .select('id, request_type, status, room_number, guest_name, created_at, priority')
        .eq('hotel_id', hotelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    // Calculate today's revenue
    const todayRevenue = (todayRevenueResult.data || []).reduce(
      (sum, order) => sum + parseFloat(order.total_amount?.toString() || '0'),
      0
    )

    return NextResponse.json({
      rooms: {
        total: roomsResult.count || 0,
        available: availableRoomsResult.count || 0,
        occupied: occupiedRoomsResult.count || 0,
        maintenance: maintenanceRoomsResult.count || 0,
      },
      staff: {
        total: staffResult.count || 0,
      },
      serviceRequests: {
        pending: serviceRequestStats.pending,
        inProgress: serviceRequestStats.inProgress,
        completedToday: serviceRequestStats.completedToday,
        avgResponseMinutes: serviceRequestStats.avgResponseMinutes,
      },
      revenue: {
        today: todayRevenue,
        todayOrders: todayOrdersResult.count || 0,
      },
      folios: {
        pending: pendingFoliosResult.count || 0,
      },
      bookings: {
        checkInsToday: todayCheckInsResult.count || 0,
        checkOutsToday: todayCheckOutsResult.count || 0,
        active: activeBookingsResult.count || 0,
      },
      recentOrders: (recentOrdersResult.data || []).map(order => ({
        id: order.id,
        order_number: order.order_number,
        total_amount: parseFloat(order.total_amount?.toString() || '0'),
        status: order.status,
        created_at: order.created_at,
        guest_name: order.guest_name,
        room_number: order.room_number,
      })),
      recentServiceRequests: (recentServiceRequestsResult.data || []).map(req => ({
        id: req.id,
        request_type: req.request_type,
        status: req.status,
        room_number: req.room_number,
        guest_name: req.guest_name,
        created_at: req.created_at,
        priority: req.priority,
      })),
    })

  } catch (error) {
    logger.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

