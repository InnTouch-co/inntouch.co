import { supabase } from '@/lib/supabase/client'
import type { Hotel, HotelInsert } from '@/types/database'

export async function getHotels() {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  
  // Get actual user counts for each hotel
  const hotelsWithCounts = await Promise.all(
    (data as Hotel[]).map(async (hotel) => {
      const { count } = await supabase
        .from('hotel_users')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotel.id)
        .eq('is_deleted', false)
      
      return {
        ...hotel,
        user_count: count || 0
      }
    })
  )
  
  return hotelsWithCounts as (Hotel & { user_count: number })[]
}

export async function getHotelById(id: string) {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Hotel
}

export async function createHotel(hotel: HotelInsert) {
  // Ensure active has a default value
  const hotelData = {
    ...hotel,
    active: hotel.active ?? true
  }
  
  const { data, error } = await supabase
    .from('hotels')
    .insert(hotelData)
    .select()
    .single()

  if (error) throw error
  return data as Hotel
}

export async function updateHotel(id: string, hotel: Partial<HotelInsert>) {
  const { data, error } = await supabase
    .from('hotels')
    .update({ ...hotel, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Hotel
}

export async function deleteHotel(id: string) {
  const { error } = await supabase
    .from('hotels')
    .delete()
    .eq('id', id)

  if (error) throw error
}

