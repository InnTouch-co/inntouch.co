import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/admin/data-requests
 * Get all data requests for a hotel (admin only)
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
      .select('id, role_id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is super admin
    if (currentUserData.role_id !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Super admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotel_id')
    const status = searchParams.get('status')

    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotel_id is required' },
        { status: 400 }
      )
    }

    // Get data requests first
    let query = supabase
      .from('data_requests')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('is_deleted', false)
      .order('requested_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query

    if (error) throw error

    if (!requests || requests.length === 0) {
      return NextResponse.json([])
    }

    // Get unique guest_ids and user_ids
    const guestIds = [...new Set(requests.map((r: any) => r.guest_id).filter(Boolean))]
    const userIds = [...new Set(requests.map((r: any) => r.user_id).filter(Boolean))]

    // Fetch guests, users, and active bookings in parallel
    const [guestsResult, usersResult, bookingsResult] = await Promise.all([
      guestIds.length > 0
        ? supabase
            .from('guests')
            .select('id, name, email, phone')
            .in('id', guestIds)
            .eq('is_deleted', false)
        : Promise.resolve({ data: [], error: null }),
      userIds.length > 0
        ? supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds)
            .eq('is_deleted', false)
        : Promise.resolve({ data: [], error: null }),
      guestIds.length > 0
        ? supabase
            .from('bookings')
            .select('id, guest_id, status, check_out_date, rooms(room_number)')
            .in('guest_id', guestIds)
            .eq('status', 'checked_in')
            .eq('is_deleted', false)
        : Promise.resolve({ data: [], error: null }),
    ])

    // Create lookup maps
    const guestsMap = new Map((guestsResult.data || []).map((g: any) => [g.id, g]))
    const usersMap = new Map((usersResult.data || []).map((u: any) => [u.id, u]))
    
    // Group active bookings by guest_id
    const activeBookingsMap = new Map<string, any[]>()
    ;(bookingsResult.data || []).forEach((booking: any) => {
      if (booking.guest_id) {
        if (!activeBookingsMap.has(booking.guest_id)) {
          activeBookingsMap.set(booking.guest_id, [])
        }
        activeBookingsMap.get(booking.guest_id)!.push(booking)
      }
    })

    // Transform the data to include guest/user info and active booking status
    const transformedData = requests.map((request: any) => {
      const guest = request.guest_id ? guestsMap.get(request.guest_id) : null
      const user = request.user_id ? usersMap.get(request.user_id) : null
      const activeBookings = request.guest_id ? (activeBookingsMap.get(request.guest_id) || []) : []
      const activeBooking = activeBookings.length > 0 ? activeBookings[0] : null

      return {
        ...request,
        guest_name: guest?.name || null,
        guest_email: guest?.email || null,
        guest_phone: guest?.phone || null,
        user_name: user?.name || null,
        user_email: user?.email || null,
        // Active booking info
        has_active_booking: activeBooking !== null,
        active_booking_checkout_date: activeBooking?.check_out_date || null,
        active_booking_room_number: activeBooking?.rooms?.room_number || null,
      }
    })

    return NextResponse.json(transformedData)
  } catch (error: any) {
    logger.error('Error fetching data requests:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch data requests',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

