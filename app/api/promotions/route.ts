import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPromotions, createPromotion, PromotionInsert } from '@/lib/database/promotions'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/promotions?hotel_id=xxx
 * Get all promotions for a hotel (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const hotelId = searchParams.get('hotel_id')

    if (!hotelId) {
      return NextResponse.json({ error: 'hotel_id is required' }, { status: 400 })
    }

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
      .eq('hotel_id', hotelId)
      .eq('user_id', currentUserData.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (hotelUserError) {
      logger.error('Error checking hotel assignment:', hotelUserError)
      return NextResponse.json({ error: 'Error verifying hotel access' }, { status: 500 })
    }

    if (!hotelUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const promotions = await getPromotions(hotelId)

    return NextResponse.json({ promotions })
  } catch (error: any) {
    logger.error('Error fetching promotions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch promotions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/promotions
 * Create a new promotion
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { hotel_id, ...promotionData } = body

    if (!hotel_id) {
      return NextResponse.json({ error: 'hotel_id is required' }, { status: 400 })
    }

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
      .eq('hotel_id', hotel_id)
      .eq('user_id', currentUserData.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (hotelUserError) {
      logger.error('Error checking hotel assignment:', hotelUserError)
      return NextResponse.json({ error: 'Error verifying hotel access' }, { status: 500 })
    }

    if (!hotelUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Extract menu_item_discounts from promotionData (if present)
    const { menu_item_discounts, ...promotionDataWithoutMenuItems } = promotionData

    const promotion: PromotionInsert = {
      ...promotionDataWithoutMenuItems,
      hotel_id,
      created_by: currentUserData.id,
    }

    const newPromotion = await createPromotion(promotion)

    // Save menu item discounts if provided
    if (menu_item_discounts && Array.isArray(menu_item_discounts) && menu_item_discounts.length > 0) {
      const menuItemDiscountsToInsert = menu_item_discounts.map((item: any) => ({
        promotion_id: newPromotion.id,
        service_id: item.service_id,
        menu_item_name: item.menu_item_name.toLowerCase().trim(), // Normalize name
        item_type: 'menu_item',
        discount_type: item.discount_type || 'percentage',
        discount_value: item.discount_value || 0,
        max_discount_amount: item.max_discount_amount || null,
        product_id: null, // Menu items don't have product_id
        is_deleted: false,
      }))

      const { error: discountError } = await supabase
        .from('promotion_product_discounts')
        .insert(menuItemDiscountsToInsert)

      if (discountError) {
        logger.error('Error creating menu item discounts:', discountError)
        // Don't fail the whole request, just log the error
        // The promotion was created successfully, menu item discounts can be added later
      }
    }

    return NextResponse.json({ promotion: newPromotion }, { status: 201 })
  } catch (error: any) {
    logger.error('Error creating promotion:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create promotion' },
      { status: 500 }
    )
  }
}

