import { createClient } from '@/lib/supabase/server'
import { getPendingOrdersForBooking, getAllOrdersForBooking, getAllOrdersForBookings } from './orders'
import type { Booking } from './bookings'
import type { Order } from './orders'

export interface Folio {
  booking_id: string
  booking: Booking
  orders: Order[]
  total_amount: number
  payment_status: 'pending' | 'paid'
  created_at: string
  updated_at?: string | null
}

/**
 * Get folio for a booking (all pending orders)
 */
export async function getFolioByBookingId(bookingId: string): Promise<Folio | null> {
  const supabase = await createClient()

  // Get booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('is_deleted', false)
    .single()

  if (bookingError || !booking) {
    return null
  }

  // Get all orders for this booking (not just pending)
  const orders = await getAllOrdersForBooking(bookingId)

  const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0)
  // Payment status: paid if all orders are paid, pending otherwise
  const paymentStatus = orders.length > 0 && orders.every(o => o.payment_status === 'paid') ? 'paid' : 'pending'

  return {
    booking_id: bookingId,
    booking: booking as Booking,
    orders,
    total_amount: totalAmount,
    payment_status: paymentStatus,
    created_at: booking.created_at,
    updated_at: booking.updated_at,
  }
}

/**
 * Get all folios for a hotel (newest first)
 */
export async function getFolios(hotelId: string, filters?: {
  payment_status?: 'pending' | 'paid'
  room_number?: string
  guest_name?: string
  limit?: number
}): Promise<Folio[]> {
  const supabase = await createClient()

  // Get all checked-out bookings (select only needed columns for list view)
  let query = supabase
    .from('bookings')
    .select('id, hotel_id, room_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date, status, total_amount, payment_status, created_at, updated_at')
    .eq('hotel_id', hotelId)
    .eq('status', 'checked_out')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })

  if (filters?.guest_name) {
    query = query.ilike('guest_name', `%${filters.guest_name}%`)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data: bookings, error } = await query

  if (error) {
    throw error
  }

  if (!bookings || bookings.length === 0) {
    return []
  }

  // Batch load all orders for all bookings at once
  const bookingIds = bookings.map(b => b.id)
  const ordersByBooking = await getAllOrdersForBookings(bookingIds)

  // Batch load all rooms if room_number filter is provided
  const roomIds = bookings.filter(b => b.room_id).map(b => b.room_id!)
  let roomsMap = new Map<string, { room_number: string }>()
  if (filters?.room_number && roomIds.length > 0) {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, room_number')
      .in('id', roomIds)
      .eq('is_deleted', false)
    
    if (rooms) {
      for (const room of rooms) {
        roomsMap.set(room.id, { room_number: room.room_number })
      }
    }
  }

  // Get folios for each booking
  const folios: Folio[] = []

  for (const booking of bookings) {
    // Filter by room_number if provided
    if (filters?.room_number && booking.room_id) {
      const room = roomsMap.get(booking.room_id)
      if (!room || room.room_number !== filters.room_number) {
        continue
      }
    }

    // Get orders from batch-loaded map
    const orders = ordersByBooking.get(booking.id) || []
    
    // Calculate payment status
    const allPaid = orders.length > 0 && orders.every(o => o.payment_status === 'paid')
    const paymentStatus = allPaid ? 'paid' : 'pending'
    
    // Apply payment status filter
    if (filters?.payment_status) {
      if (filters.payment_status === 'paid' && !allPaid) continue
      if (filters.payment_status === 'pending' && allPaid) continue
    }

    const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0)

    // Filter out folios with no orders or $0 total
    if (orders.length === 0 || totalAmount === 0) {
      continue
    }

    folios.push({
      booking_id: booking.id,
      booking: booking as Booking,
      orders,
      total_amount: totalAmount,
      payment_status: paymentStatus,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
    })
  }

  return folios
}

