import { createClient } from '@/lib/supabase/server'

export interface ActiveBookingData {
  id: string
  hotel_id: string
  room_id: string
  guest_id: string | null
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  check_in_date: string
  check_out_date: string
  status: string
  room_number: string
}

/**
 * Get room by room number and hotel ID
 */
export async function getRoomByNumber(roomNumber: string, hotelId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('rooms')
    .select('id, hotel_id, room_number, status, is_deleted')
    .eq('hotel_id', hotelId)
    .eq('room_number', roomNumber)
    .eq('is_deleted', false)
    .single()

  if (error) {
    // If no rows found, return null instead of throwing
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data
}

/**
 * Get active booking for a room
 * Active means: checked in, not checked out (regardless of checkout date)
 * NOTE: This will return bookings even if checkout date has passed
 * Staff must manually checkout guests
 */
export async function getActiveBookingForRoom(roomNumber: string, hotelId: string): Promise<ActiveBookingData | null> {
  const supabase = await createClient()
  
  // First, get the room to get room_id
  const room = await getRoomByNumber(roomNumber, hotelId)
  
  if (!room) {
    return null
  }

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  const currentTime = new Date().toTimeString().slice(0, 5) // HH:MM format

  // Check room status - if room is available, there's no active booking
  if (room.status === 'available') {
    return null
  }

  // Get active booking
  // Active booking means:
  // 1. Status is 'checked_in' (not 'checked_out')
  // 2. Room status is 'occupied' (not 'available')
  // NOTE: We DO NOT filter by check_out_date anymore
  // Staff has full control over checkout process
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      hotel_id,
      room_id,
      guest_id,
      guest_name,
      guest_email,
      guest_phone,
      check_in_date,
      check_out_date,
      status,
      rooms!inner(room_number, status)
    `)
    .eq('hotel_id', hotelId)
    .eq('room_id', room.id)
    .eq('status', 'checked_in') // Only checked_in, not checked_out
    .eq('is_deleted', false)
    .order('check_out_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  if (!data) {
    return null
  }

  // Double-check room status from the joined data
  const roomData = data.rooms as any
  if (roomData?.status !== 'occupied') {
    return null
  }

  // Note: We return the booking even if checkout date has passed
  // Staff must manually checkout guests
  // The room will show as "overdue" in the UI if checkout date is in the past
  // This gives staff full control over the checkout process

  return {
    id: data.id,
    hotel_id: data.hotel_id,
    room_id: data.room_id,
    guest_id: data.guest_id || null,
    guest_name: data.guest_name,
    guest_email: data.guest_email,
    guest_phone: data.guest_phone,
    check_in_date: data.check_in_date,
    check_out_date: data.check_out_date,
    status: data.status,
    room_number: roomData.room_number,
  } as ActiveBookingData
}

/**
 * Room info interface
 */
export interface RoomInfo {
  id: string
  hotel_id: string
  room_number: string
  status: string
}

/**
 * Check if room exists and is active
 */
export async function validateRoomExists(roomNumber: string, hotelId: string): Promise<{
  exists: boolean
  room: RoomInfo | null
  reason: string | null
}> {
  const room = await getRoomByNumber(roomNumber, hotelId)
  
  if (!room) {
    return {
      exists: false,
      room: null,
      reason: 'Room not found',
    }
  }

  // Check if room is in maintenance or out of order
  if (room.status === 'maintenance') {
    return {
      exists: true,
      room,
      reason: 'Room is in maintenance',
    }
  }

  return {
    exists: true,
    room,
    reason: null,
  }
}

