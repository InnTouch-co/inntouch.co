import { NextRequest, NextResponse } from 'next/server'
import { getActivePromotionForDiscount } from '@/lib/database/promotions'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/guest/promotions/active-for-discount?hotel_id=xxx&service_type=restaurant
 * Get active promotion for discount purposes (not just banner promotions)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const hotelId = searchParams.get('hotel_id')
    const serviceType = searchParams.get('service_type')

    logger.info('Fetching active promotion for discount:', { hotelId, serviceType })

    if (!hotelId) {
      return NextResponse.json({ error: 'hotel_id is required' }, { status: 400 })
    }

    const promotion = await getActivePromotionForDiscount(hotelId, serviceType || undefined)

    logger.info('Active promotion result:', { 
      found: !!promotion, 
      promotionId: promotion?.id, 
      title: promotion?.title,
      hotelId,
      serviceType 
    })

    if (!promotion) {
      return NextResponse.json({ promotion: null })
    }

    return NextResponse.json({ promotion })
  } catch (error: any) {
    logger.error('Error fetching active promotion for discount:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch active promotion' },
      { status: 500 }
    )
  }
}

