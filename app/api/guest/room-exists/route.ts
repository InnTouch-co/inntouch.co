import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const hotelId = searchParams.get('hotel_id')
    const roomNumber = searchParams.get('room_number')

    if (!hotelId || !roomNumber) {
      return NextResponse.json(
        { error: 'hotel_id and room_number are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('rooms')
      .select('id')
      .eq('hotel_id', hotelId)
      .eq('room_number', roomNumber)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) {
      logger.error('Error checking room existence:', error)
      return NextResponse.json(
        { error: 'Failed to check room existence' },
        { status: 500 }
      )
    }

    return NextResponse.json({ exists: !!data })
  } catch (error) {
    logger.error('Error in room-exists API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

