import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRequest } from '@/lib/database/service-requests'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { hotel_id, room_id, booking_id, title, description, request_type, priority, guest_name, guest_email, guest_phone, assigned_to } = body

    if (!hotel_id || !title || !request_type) {
      return NextResponse.json(
        { error: 'hotel_id, title, and request_type are required' },
        { status: 400 }
      )
    }

    // Get user from users table to get the correct user ID (might differ from auth user ID)
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id, role_id, email')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError) {
      console.error('Error loading user:', userError)
      return NextResponse.json({ 
        error: `Error loading user information: ${userError.message}` 
      }, { status: 500 })
    }

    if (!currentUserData) {
      return NextResponse.json({ 
        error: 'User not found in database' 
      }, { status: 404 })
    }

    // Use the user ID from users table, not auth user ID
    const userId = currentUserData.id

    // Verify user has access to this hotel (user can only create requests for assigned hotels)
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id, hotel_id, user_id')
      .eq('hotel_id', hotel_id)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (hotelUserError) {
      console.error('Error checking hotel assignment:', hotelUserError)
      return NextResponse.json({ 
        error: `Error verifying hotel access: ${hotelUserError.message}` 
      }, { status: 500 })
    }

    if (!hotelUser) {
      // Get user's actual hotel assignments for debugging
      const { data: userAssignments } = await supabase
        .from('hotel_users')
        .select('hotel_id')
        .eq('user_id', userId)
        .eq('is_deleted', false)

      console.error('Hotel access denied:', {
        requestedHotelId: hotel_id,
        authUserId: authUser.id,
        dbUserId: userId,
        userEmail: authUser.email,
        userRole: currentUserData.role_id,
        assignedHotels: userAssignments?.map((a: any) => a.hotel_id) || []
      })

      return NextResponse.json({ 
        error: `Forbidden: You can only create service requests for hotels assigned to you. Requested hotel: ${hotel_id}` 
      }, { status: 403 })
    }

    const userRole = currentUserData.role_id

    // Admin/front_desk can create requests, guests create them from room website (will be handled separately)
    const newRequest = await createServiceRequest({
      hotel_id,
      room_id: room_id || null,
      booking_id: booking_id || null,
      title,
      description: description || null,
      request_type,
      priority: priority || 'medium',
      status: 'pending',
      guest_name: guest_name || null,
      guest_email: guest_email || null,
      guest_phone: guest_phone || null,
      assigned_to: assigned_to || null,
      created_by: userRole ? userId : null, // Use user ID from users table
    })

    return NextResponse.json(newRequest, { status: 201 })

  } catch (error) {
    console.error('Error creating service request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create service request' },
      { status: 500 }
    )
  }
}

