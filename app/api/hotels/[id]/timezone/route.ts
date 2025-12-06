import { NextRequest, NextResponse } from 'next/server'
import { getHotelById } from '@/lib/database/hotels'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const hotel = await getHotelById(id)
    const timezone = (hotel as any).timezone || 'America/Chicago'
    
    return NextResponse.json({ timezone })
  } catch (error) {
    return NextResponse.json(
      { timezone: 'America/Chicago' }, // Default fallback
      { status: 200 }
    )
  }
}


