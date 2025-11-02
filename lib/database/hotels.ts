import { supabase } from '@/lib/supabase/client'
import type { Hotel, HotelInsert } from '@/types/database'

export async function getHotels() {
  const { data, error } = await supabase
    .from('hotels')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  
  // Get actual user counts and room counts for each hotel
  const hotelsWithCounts = await Promise.all(
    (data as Hotel[]).map(async (hotel) => {
      const [userCountResult, roomCountResult] = await Promise.all([
        supabase
          .from('hotel_users')
          .select('*', { count: 'exact', head: true })
          .eq('hotel_id', hotel.id)
          .eq('is_deleted', false),
        supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true })
          .eq('hotel_id', hotel.id)
          .eq('is_deleted', false)
      ])
      
      // Use stored room_count if available, otherwise count from rooms table
      const storedRoomCount = hotel.room_count || 0
      const actualRoomCount = roomCountResult.count || 0
      // Prefer stored value, but if both are 0, show stored (which might be manually set)
      const finalRoomCount = storedRoomCount > 0 ? storedRoomCount : actualRoomCount
      
      return {
        ...hotel,
        user_count: userCountResult.count || 0,
        room_count: finalRoomCount
      }
    })
  )
  
  return hotelsWithCounts as (Hotel & { user_count: number; room_count: number })[]
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

