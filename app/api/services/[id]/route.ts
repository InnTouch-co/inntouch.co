import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateService, deleteService, getServiceById } from '@/lib/database/services'
import { logger } from '@/lib/utils/logger'

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

    const { id: serviceId } = await params

    // Get the service to verify hotel access
    const existingService = await getServiceById(serviceId, supabase)

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

    // Verify user has access to this hotel
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', existingService.hotel_id)
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

    return NextResponse.json(existingService)

  } catch (error) {
    logger.error('Error fetching service:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch service' },
      { status: 500 }
    )
  }
}

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

    const { id: serviceId } = await params
    const body = await request.json()

    // Get the service to verify hotel access
    const existingService = await getServiceById(serviceId, supabase)

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

    // Verify user has access to this hotel
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', existingService.hotel_id)
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

    // Prepare updates
    const updates: any = {}
    if (body.title !== undefined) {
      updates.title = typeof body.title === 'string' ? { en: body.title } : body.title
    }
    if (body.description !== undefined) {
      updates.description = body.description ? (typeof body.description === 'string' ? { en: body.description } : body.description) : null
    }
    if (body.service_type !== undefined) updates.service_type = body.service_type
    
    // CRITICAL: Always update menu if provided (even if empty array - this allows deletions to persist)
    // Ensure menu is explicitly included in updates
    if (body.menu !== undefined) {
      // Ensure menu is a proper object, not null (unless explicitly null)
      if (body.menu === null) {
        updates.menu = null
      } else if (typeof body.menu === 'object') {
        updates.menu = body.menu
      } else if (typeof body.menu === 'string') {
        // Parse if it's a string
        try {
          updates.menu = JSON.parse(body.menu)
        } catch (e) {
          logger.error('Failed to parse menu string:', e)
          updates.menu = body.menu
        }
      }
      logger.info('API Route - Setting menu update:', JSON.stringify(updates.menu, null, 2))
    } else {
      logger.info('API Route - Menu not in body, body keys:', Object.keys(body))
    }
    
    if (body.photos !== undefined) updates.photos = body.photos
    if (body.operating_hours !== undefined) updates.operating_hours = body.operating_hours
    if (body.contact_info !== undefined) updates.contact_info = body.contact_info
    if (body.settings !== undefined) updates.settings = body.settings
    if (body.display_order !== undefined) updates.display_order = body.display_order
    if (body.active !== undefined) updates.active = body.active

    logger.info('API Route - Service updates keys:', Object.keys(updates))
    logger.info('API Route - Menu in updates:', updates.menu !== undefined ? 'YES' : 'NO')
    logger.info('API Route - Service updates:', JSON.stringify(updates, null, 2))
    
    const updatedService = await updateService(serviceId, updates, supabase)
    
    logger.info('API Route - Updated service received')
    logger.info('API Route - Updated service menu:', JSON.stringify(updatedService.menu, null, 2))

    return NextResponse.json(updatedService)

  } catch (error) {
    logger.error('Error updating service:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update service' },
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

    const { id: serviceId } = await params

    // Get the service to verify hotel access
    const existingService = await getServiceById(serviceId, supabase)

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

    // Verify user has access to this hotel
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', existingService.hotel_id)
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

    await deleteService(serviceId, supabase)

    return NextResponse.json({ message: 'Service deleted successfully' })

  } catch (error) {
    logger.error('Error deleting service:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete service' },
      { status: 500 }
    )
  }
}
