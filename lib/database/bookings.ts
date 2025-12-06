import { createClient } from '@/lib/supabase/server'

export interface Booking {
  id: string
  hotel_id: string
  room_id: string | null
  guest_id: string | null
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  check_in_date: string
  check_out_date: string
  status: string
  total_amount: number
  payment_status: string
  special_requests: string | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  is_deleted: boolean
}

export interface BookingInsert {
  hotel_id: string
  room_id: string | null
  guest_id?: string | null
  guest_name: string
  guest_email?: string | null
  guest_phone?: string | null
  check_in_date: string
  check_out_date: string
  status?: string
  total_amount?: number
  payment_status?: string
  special_requests?: string | null
  created_by?: string | null
}

/**
 * Create a new booking
 */
export async function createBooking(bookingData: BookingInsert): Promise<Booking> {
  const supabase = await createClient()

  const bookingToInsert = {
    hotel_id: bookingData.hotel_id,
    room_id: bookingData.room_id || null,
    guest_id: bookingData.guest_id || null,
    guest_name: bookingData.guest_name,
    guest_email: bookingData.guest_email || null,
    guest_phone: bookingData.guest_phone || null,
    check_in_date: bookingData.check_in_date,
    check_out_date: bookingData.check_out_date,
    status: bookingData.status || 'checked_in',
    total_amount: bookingData.total_amount || 0,
    payment_status: bookingData.payment_status || 'pending',
    special_requests: bookingData.special_requests || null,
    created_by: bookingData.created_by || null,
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert(bookingToInsert)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create booking: ${error.message}`)
  }

  return data as Booking
}

/**
 * Get booking by ID
 */
export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('is_deleted', false)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data as Booking
}

/**
 * Get bookings for a hotel
 */
export async function getBookings(hotelId: string, filters?: {
  status?: string
  room_id?: string
}): Promise<Booking[]> {
  const supabase = await createClient()

  let query = supabase
    .from('bookings')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)
    .order('check_in_date', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.room_id) {
    query = query.eq('room_id', filters.room_id)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []) as Booking[]
}

/**
 * Update booking
 */
export async function updateBooking(
  bookingId: string,
  updates: Partial<BookingInsert>
): Promise<Booking> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bookings')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update booking: ${error.message}`)
  }

  return data as Booking
}

/**
 * Get active booking for a room
 */
export async function getActiveBookingByRoomId(roomId: string): Promise<Booking | null> {
  const supabase = await createClient()

  // NOTE: We DO NOT filter by checkout date anymore
  // Staff has full control over checkout process
  // Bookings remain active until manually checked out
  const { data, error} = await supabase
    .from('bookings')
    .select('id, hotel_id, room_id, guest_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, status, total_amount, payment_status, special_requests, created_by, created_at, updated_at, is_deleted')
    .eq('room_id', roomId)
    .in('status', ['confirmed', 'checked_in'])
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

  return data as Booking | null
}

/**
 * Get active bookings for a guest
 * Active means: status is 'checked_in' (not 'checked_out')
 */
export async function getActiveBookingsByGuestId(guestId: string): Promise<Booking[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select('id, hotel_id, room_id, guest_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, status, total_amount, payment_status, special_requests, created_by, created_at, updated_at, is_deleted')
    .eq('guest_id', guestId)
    .eq('status', 'checked_in')
    .eq('is_deleted', false)
    .order('check_out_date', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []) as Booking[]
}

/**
 * Soft delete a booking (used for deleting folios)
 */
export async function deleteBooking(bookingId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('bookings')
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (error) {
    throw new Error(`Failed to delete booking: ${error.message}`)
  }
}

