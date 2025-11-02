import { supabase } from '@/lib/supabase/client'
import type { HotelUser } from '@/types/database'

export async function getHotelUsers(hotelId: string) {
  const { data, error } = await supabase
    .from('hotel_users')
    .select(`
      *,
      users (*)
    `)
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)

  if (error) throw error
  return data
}

export async function addUserToHotel(hotelId: string, userId: string) {
  // First, check if the relationship already exists (including deleted ones)
  const { data: existing, error: checkError } = await supabase
    .from('hotel_users')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('user_id', userId)
    .maybeSingle()

  if (checkError) {
    throw checkError
  }

  if (existing) {
    // Relationship exists - if it's deleted, restore it; otherwise it's already active
    if (existing.is_deleted) {
      const { data, error } = await supabase
        .from('hotel_users')
        .update({ is_deleted: false })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data as HotelUser
    }
    // Already exists and is active, return it
    return existing as HotelUser
  }

  // Relationship doesn't exist, create it
  const { data, error } = await supabase
    .from('hotel_users')
    .insert({
      hotel_id: hotelId,
      user_id: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data as HotelUser
}

export async function removeUserFromHotel(hotelId: string, userId: string) {
  const { error } = await supabase
    .from('hotel_users')
    .update({ is_deleted: true })
    .eq('hotel_id', hotelId)
    .eq('user_id', userId)

  if (error) throw error
}

