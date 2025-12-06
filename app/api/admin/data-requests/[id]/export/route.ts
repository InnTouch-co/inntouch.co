import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveBookingForRoom } from '@/lib/database/room-validation'
import { getOrders } from '@/lib/database/orders'
import { getServiceRequests } from '@/lib/database/service-requests'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/admin/data-requests/[id]/export
 * Export guest data for a data request (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: requestId } = await params

    // Get the data request
    const { data: dataRequest, error: fetchError } = await supabase
      .from('data_requests')
      .select('*')
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !dataRequest) {
      return NextResponse.json(
        { error: 'Data request not found' },
        { status: 404 }
      )
    }

    // Get guest information from booking or guest_id
    let guestData: any = {
      request_id: dataRequest.id,
      request_type: dataRequest.request_type,
      requested_at: dataRequest.requested_at,
      exported_at: new Date().toISOString(),
    }

    // Try to get booking information
    if (dataRequest.guest_id) {
      const { data: guest } = await supabase
        .from('guests')
        .select('*')
        .eq('id', dataRequest.guest_id)
        .eq('is_deleted', false)
        .single()

      if (guest) {
        guestData.personal_information = {
          name: guest.name,
          email: guest.email,
          phone: guest.phone,
        }

        // Get bookings for this guest
        const { data: bookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('guest_id', guest.id)
          .eq('hotel_id', dataRequest.hotel_id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })

        if (bookings) {
          guestData.bookings = bookings

          // Get orders for all bookings
          const bookingIds = bookings.map(b => b.id)
          const orders = await getOrders(dataRequest.hotel_id, {})
          guestData.orders = orders.filter(o => bookingIds.includes(o.booking_id || ''))

          // Get service requests
          const serviceRequests = await getServiceRequests(dataRequest.hotel_id, {
            search: guest.name || '',
          })
          guestData.service_requests = serviceRequests.filter(
            req => req.guest_name?.toLowerCase() === guest.name?.toLowerCase()
          )
        }
      }
    }

    return NextResponse.json(guestData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="guest-data-${requestId}.json"`,
      },
    })
  } catch (error: any) {
    logger.error('Error exporting data:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to export data',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

