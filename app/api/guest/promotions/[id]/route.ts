import { NextRequest, NextResponse } from 'next/server'
import { getPromotionById } from '@/lib/database/promotions'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/guest/promotions/[id]?hotel_id=xxx
 * Get promotion by ID for guest site (public endpoint)
 * Validates that promotion belongs to the specified hotel
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const hotelId = searchParams.get('hotel_id')

    if (!hotelId) {
      return NextResponse.json({ error: 'hotel_id is required' }, { status: 400 })
    }

    const promotion = await getPromotionById(id)

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    // Validate that promotion belongs to the specified hotel
    if (promotion.hotel_id !== hotelId) {
      logger.warn('Promotion hotel_id mismatch:', { 
        promotionId: id, 
        promotionHotelId: promotion.hotel_id, 
        requestedHotelId: hotelId 
      })
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

