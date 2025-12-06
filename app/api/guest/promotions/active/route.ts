import { NextRequest, NextResponse } from 'next/server'
import { getActivePromotions } from '@/lib/database/promotions'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/guest/promotions/active?hotel_id=xxx
 * Get all active promotions for guest site (public endpoint)
 * Returns multiple promotions for Instagram stories-style banner display
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const hotelId = searchParams.get('hotel_id')

    if (!hotelId) {
      return NextResponse.json({ error: 'hotel_id is required' }, { status: 400 })
    }

    const promotions = await getActivePromotions(hotelId)

    if (!promotions || promotions.length === 0) {
      return NextResponse.json({ promotions: [] })
    }

    return NextResponse.json({ promotions })
  } catch (error: any) {
    logger.error('Error fetching active promotions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch active promotions' },
      { status: 500 }
    )
  }
}

