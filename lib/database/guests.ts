import { createClient } from '@/lib/supabase/server'

export interface Guest {
  id: string
  hotel_id: string
  name: string
  email: string | null
  phone: string | null
  preferences: any
  notes: string | null
  loyalty_points: number
  first_visit_date: string | null
  last_visit_date: string | null
  total_visits: number
  total_spent: number
  created_at: string
  updated_at: string | null
  is_deleted: boolean
}

export interface GuestInsert {
  hotel_id: string
  name: string
  email?: string | null
  phone?: string | null
  preferences?: any
  notes?: string | null
}

/**
 * Find or create a guest
 * Uses the database function to find existing guest by email/phone or create new one
 */
export async function findOrCreateGuest(
  hotelId: string,
  name: string,
  email?: string | null,
  phone?: string | null
): Promise<Guest> {
  const supabase = await createClient()

  // Call the database function
  const { data, error } = await supabase.rpc('find_or_create_guest', {
    p_hotel_id: hotelId,
    p_name: name,
    p_email: email || null,
    p_phone: phone || null,
  })

  if (error) {
    throw new Error(`Failed to find or create guest: ${error.message}`)
  }

  // Get the guest by ID
  const guestId = data as string
  const guest = await getGuestById(guestId)

  if (!guest) {
    throw new Error('Failed to retrieve created guest')
  }

  return guest
}

/**
 * Get guest by ID
 */
export async function getGuestById(guestId: string): Promise<Guest | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('id', guestId)
    .eq('is_deleted', false)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data as Guest
}

/**
 * Get guests for a hotel
 */
export async function getGuests(hotelId: string, filters?: {
  search?: string
}): Promise<Guest[]> {
  const supabase = await createClient()

  let query = supabase
    .from('guests')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)
    .order('last_visit_date', { ascending: false })

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []) as Guest[]
}

/**
 * Update guest
 */
export async function updateGuest(
  guestId: string,
  updates: Partial<GuestInsert>
): Promise<Guest> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('guests')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', guestId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update guest: ${error.message}`)
  }

  return data as Guest
}

/**
 * Get guest history (all bookings and orders)
 */
export async function getGuestHistory(guestId: string): Promise<{
  bookings: any[]
  orders: any[]
  serviceRequests: any[]
}> {
  const supabase = await createClient()

  // Get bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('guest_id', guestId)
    .eq('is_deleted', false)
    .order('check_in_date', { ascending: false })

  // Get orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('guest_id', guestId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  // Get service requests
  const { data: serviceRequests } = await supabase
    .from('service_requests')
    .select('*')
    .eq('guest_id', guestId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  return {
    bookings: bookings || [],
    orders: orders || [],
    serviceRequests: serviceRequests || [],
  }
}

