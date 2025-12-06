import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPromotionById, updatePromotion, deletePromotion, PromotionInsert } from '@/lib/database/promotions'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/promotions/[id]
 * Get promotion by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const promotion = await getPromotionById(id)

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    return NextResponse.json({ promotion })
  } catch (error: any) {
    logger.error('Error fetching promotion:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch promotion' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/promotions/[id]
 * Update a promotion
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const promotion = await getPromotionById(id)

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
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
      .eq('hotel_id', promotion.hotel_id)
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

    const body = await request.json()
    const updatedPromotion = await updatePromotion(id, body)

    return NextResponse.json({ promotion: updatedPromotion })
  } catch (error: any) {
    logger.error('Error updating promotion:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update promotion' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/promotions/[id]
 * Delete a promotion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const promotion = await getPromotionById(id)

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
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
      .eq('hotel_id', promotion.hotel_id)
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

    await deletePromotion(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Error deleting promotion:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete promotion' },
      { status: 500 }
    )
  }
}

