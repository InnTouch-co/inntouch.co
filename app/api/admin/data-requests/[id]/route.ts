import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { getActiveBookingsByGuestId } from '@/lib/database/bookings'
import { anonymizeGuestData } from '@/lib/database/anonymize-guest'

/**
 * PATCH /api/admin/data-requests/[id]
 * Update data request status (admin only)
 */
export async function PATCH(
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
    
    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { status, force_proceed } = body

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    if (status !== 'completed' && status !== 'rejected' && status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: completed, rejected, in_progress' },
        { status: 400 }
      )
    }

    // Get the request to verify it exists and get guest_id
    const { data: dataRequest, error: fetchError } = await supabase
      .from('data_requests')
      .select('hotel_id, guest_id, request_type')
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !dataRequest) {
      return NextResponse.json(
        { error: 'Data request not found' },
        { status: 404 }
      )
    }

    // If completing a deletion request, check for active bookings
    if (status === 'completed' && dataRequest.request_type === 'deletion' && dataRequest.guest_id) {
      const activeBookings = await getActiveBookingsByGuestId(dataRequest.guest_id)
      
      if (activeBookings.length > 0 && !force_proceed) {
        return NextResponse.json(
          {
            error: 'Guest is still checked in',
            has_active_booking: true,
            active_bookings: activeBookings.map(b => ({
              id: b.id,
              check_out_date: b.check_out_date,
            })),
          },
          { status: 400 }
        )
      }

      // Proceed with anonymization
      try {
        await anonymizeGuestData(dataRequest.guest_id)
        logger.info(`Anonymized guest data for guest_id: ${dataRequest.guest_id}, request_id: ${requestId}`)
      } catch (anonymizeError: any) {
        logger.error('Error anonymizing guest data:', anonymizeError)
        return NextResponse.json(
          {
            error: 'Failed to anonymize guest data',
            details: anonymizeError.message,
          },
          { status: 500 }
        )
      }
    }

    // Update request
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
      updateData.processed_by = currentUserData.id
    }

    if (status === 'rejected') {
      // Optionally set processed_by for rejected requests too
      updateData.processed_by = currentUserData.id
    }

    const { data, error } = await supabase
      .from('data_requests')
      .update(updateData)
      .eq('id', requestId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      logger.error('Database error updating data request:', error)
      throw error
    }

    if (!data) {
      logger.error('No data returned after update for request:', requestId)
      return NextResponse.json(
        { error: 'Failed to update data request - no data returned' },
        { status: 500 }
      )
    }

    logger.info(`Data request ${requestId} updated to status: ${status}`)

    return NextResponse.json({
      success: true,
      request: data,
    })
  } catch (error: any) {
    logger.error('Error updating data request:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to update data request',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

