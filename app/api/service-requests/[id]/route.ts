import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateServiceRequest, deleteServiceRequest, getServiceRequestById } from '@/lib/database/service-requests'
import { logger } from '@/lib/utils/logger'

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

    const { id: requestId } = await params
    const body = await request.json()

    // Get the request to verify hotel access
    const existingRequest = await getServiceRequestById(requestId)

    // Get user from users table to get the correct user ID
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      logger.error('Error loading user or user not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user has access to this hotel using the database user ID
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', existingRequest.hotel_id)
      .eq('user_id', currentUserData.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (hotelUserError) {
      logger.error('Error checking hotel assignment:', hotelUserError)
      return NextResponse.json({ error: 'Error verifying hotel access' }, { status: 500 })
    }

    if (!hotelUser) {
      return NextResponse.json({ 
        error: 'Forbidden: You do not have access to this hotel' 
      }, { status: 403 })
    }

    // If status is being changed to completed, set completed_at
    const updates: any = { ...body }
    if (body.status === 'completed' && existingRequest.status !== 'completed') {
      updates.completed_at = new Date().toISOString()
      
      // Calculate response time (time from creation to completion)
      const created = new Date(existingRequest.created_at)
      const completed = new Date(updates.completed_at)
      updates.response_time_minutes = Math.floor((completed.getTime() - created.getTime()) / 60000)
    }

    const updatedRequest = await updateServiceRequest(requestId, updates)

    return NextResponse.json(updatedRequest)

  } catch (error) {
    logger.error('Error updating service request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update service request' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { id: requestId } = await params

    // Get the request to verify hotel access
    const existingRequest = await getServiceRequestById(requestId)

    // Get user from users table to get the correct user ID
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      logger.error('Error loading user or user not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user has access to this hotel using the database user ID
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', existingRequest.hotel_id)
      .eq('user_id', currentUserData.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (hotelUserError) {
      logger.error('Error checking hotel assignment:', hotelUserError)
      return NextResponse.json({ error: 'Error verifying hotel access' }, { status: 500 })
    }

    if (!hotelUser) {
      return NextResponse.json({ 
        error: 'Forbidden: You do not have access to this hotel' 
      }, { status: 403 })
    }

    await deleteServiceRequest(requestId)

    return NextResponse.json({ message: 'Service request deleted successfully' })

  } catch (error) {
    logger.error('Error deleting service request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete service request' },
      { status: 500 }
    )
  }
}

