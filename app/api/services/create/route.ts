import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createService } from '@/lib/database/services'
import type { ServiceInsert } from '@/types/database'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { hotel_id, title, description, service_type, menu, photos, operating_hours, contact_info, settings, display_order } = body

    logger.info('CREATE API - Received body keys:', Object.keys(body))
    logger.info('CREATE API - Menu in body:', menu !== undefined ? 'YES' : 'NO')
    logger.info('CREATE API - Menu data:', JSON.stringify(menu, null, 2))
    logger.info('CREATE API - Hotel ID:', hotel_id)
    logger.info('CREATE API - Service type:', service_type)

    if (!hotel_id || !title || !service_type) {
      return NextResponse.json(
        { error: 'hotel_id, title, and service_type are required' },
        { status: 400 }
      )
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

    // Verify user has access to this hotel
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', hotel_id)
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

    // Ensure menu is properly formatted
    let menuData = null
    if (menu !== undefined && menu !== null) {
      if (typeof menu === 'object') {
        menuData = menu
      } else if (typeof menu === 'string') {
        try {
          menuData = JSON.parse(menu)
        } catch (e) {
          logger.error('CREATE API - Failed to parse menu string:', e)
          menuData = menu
        }
      }
    }

    const serviceData: ServiceInsert = {
      hotel_id,
      title: typeof title === 'string' ? { en: title } : title,
      description: description ? (typeof description === 'string' ? { en: description } : description) : null,
      service_type,
      menu: menuData, // Use processed menu data
      photos: photos || [],
      operating_hours: operating_hours || null,
      contact_info: contact_info || null,
      settings: settings || null,
      display_order: display_order || 100,
      sort: 100,
      active: 1,
      is_deleted: false,
    }

    logger.info('CREATE API - Service data to insert:', JSON.stringify(serviceData, null, 2))
    logger.info('CREATE API - Menu in serviceData:', serviceData.menu !== undefined ? 'YES' : 'NO')

    const newService = await createService(serviceData, supabase)

    logger.info('CREATE API - Created service:', newService.id)
    logger.info('CREATE API - Created service menu:', JSON.stringify(newService.menu, null, 2))

    return NextResponse.json(newService, { status: 201 })

  } catch (error) {
    logger.error('Error creating service:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create service' },
      { status: 500 }
    )
  }
}

