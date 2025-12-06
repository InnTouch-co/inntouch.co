import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRoomByNumber } from '@/lib/database/room-validation'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/debug/room-bookings
 * Debug endpoint to check room and booking status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotel_id')
    const roomNumber = searchParams.get('room_number')

    if (!hotelId || !roomNumber) {
      return NextResponse.json(
        { error: 'hotel_id and room_number are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get room
    const room = await getRoomByNumber(roomNumber, hotelId)
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Get ALL bookings for this room (not just active ones)
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('room_id', room.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    // Get active bookings
    const today = new Date().toISOString().split('T')[0]
    const { data: activeBookings, error: activeError } = await supabase
      .from('bookings')
      .select('*')
      .eq('room_id', room.id)
      .in('status', ['confirmed', 'checked_in'])
      .gte('check_out_date', today)
      .eq('is_deleted', false)

    return NextResponse.json({
      room: {
        id: room.id,
        room_number: room.room_number,
        status: room.status,
      },
      all_bookings: allBookings || [],
      active_bookings: activeBookings || [],
      today,
      issue: room.status === 'occupied' && (!activeBookings || activeBookings.length === 0)
        ? 'Room is marked as occupied but has no active booking'
        : null,
    })
  } catch (error: any) {
    logger.error('Error checking room bookings:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to check room bookings',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

