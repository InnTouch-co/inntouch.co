import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateService, getServiceById } from '@/lib/database/services'
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

    const { id: serviceId } = await params
    const body = await request.json()
    const { menu, categories } = body

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

    // Prepare menu data structure
    // Always save the menu structure, even if empty (allows deletions to persist)
    let menuData: any = null
    
    if (menu && typeof menu === 'object') {
      // If menu is provided, use it directly
      menuData = menu
      
      // If categories are also provided separately, merge them
      if (categories && Array.isArray(categories)) {
        menuData = {
          ...menuData,
          categories: categories,
        }
      }
    } else if (categories && Array.isArray(categories)) {
      // If only categories provided, create menu structure with empty items
      menuData = {
        categories: categories,
        items: [],
      }
    } else {
      // If nothing provided, set to empty structure to clear menu
      menuData = { items: [] }
    }

    // Always update menu, even if empty (this ensures deletions persist)
    const updatedService = await updateService(serviceId, { menu: menuData }, supabase)

    return NextResponse.json(updatedService)

  } catch (error) {
    logger.error('Error updating menu:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update menu' },
      { status: 500 }
    )
  }
}

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

    // Return menu data
    const menu = existingService.menu as any || {}
    return NextResponse.json({
      menu: menu,
      categories: menu.categories || [],
      items: menu.items || [],
      drinks: menu.drinks || [],
    })

  } catch (error) {
    logger.error('Error fetching menu:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch menu' },
      { status: 500 }
    )
  }
}

