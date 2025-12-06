import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/admin/cookie-consents
 * Get all cookie consents for a hotel (admin only)
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

    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotel_id is required' },
        { status: 400 }
      )
    }

    // Get cookie consents
    const { data, error } = await supabase
      .from('cookie_consents')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100) // Limit to recent 100 consents

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error: any) {
    logger.error('Error fetching cookie consents:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch cookie consents',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

