import { supabase } from '@/lib/supabase/client'
import type { Hotel, HotelInsert } from '@/types/database'
import { logger } from '@/lib/utils/logger'

export async function getHotels() {
  const { data, error } = await supabase
    .from('hotels')
    .select('id, title, site, email, logo_path, address, phone, active, room_count, created_at, updated_at, guest_settings, timezone')
    .order('created_at', { ascending: false })

  if (error) throw error
  
  if (!data || data.length === 0) {
    return [] as (Hotel & { user_count: number; room_count: number })[]
  }

  // Batch load all counts in 2 queries instead of N*2 queries
  const hotelIds = (data as Hotel[]).map(h => h.id)
  
  // Get all user counts in one query
  const { data: userCounts, error: userCountsError } = await supabase
    .from('hotel_users')
    .select('hotel_id')
    .in('hotel_id', hotelIds)
    .eq('is_deleted', false)

  // Get all room counts in one query
  const { data: roomCounts, error: roomCountsError } = await supabase
    .from('rooms')
    .select('hotel_id')
    .in('hotel_id', hotelIds)
    .eq('is_deleted', false)

  if (userCountsError || roomCountsError) {
    // Fallback to individual queries if batch fails
    logger.warn('Batch query failed, using individual queries')
  }

  // Count occurrences by hotel_id
  const userCountMap: Record<string, number> = {}
  const roomCountMap: Record<string, number> = {}

  if (userCounts) {
    userCounts.forEach((uc: any) => {
      userCountMap[uc.hotel_id] = (userCountMap[uc.hotel_id] || 0) + 1
    })
  }

  if (roomCounts) {
    roomCounts.forEach((rc: any) => {
      roomCountMap[rc.hotel_id] = (roomCountMap[rc.hotel_id] || 0) + 1
    })
  }

  // Combine with hotel data
  const hotelsWithCounts = (data as Hotel[]).map((hotel) => {
    const storedRoomCount = hotel.room_count || 0
    const actualRoomCount = roomCountMap[hotel.id] || 0
    // Prefer stored value, but if both are 0, show stored (which might be manually set)
    const finalRoomCount = storedRoomCount > 0 ? storedRoomCount : actualRoomCount
    
    return {
      ...hotel,
      user_count: userCountMap[hotel.id] || 0,
      room_count: finalRoomCount
    }
  })
  
  return hotelsWithCounts as (Hotel & { user_count: number; room_count: number })[]
}

export async function getHotelById(id: string) {
  const { data, error } = await supabase
    .from('hotels')
    .select('id, title, site, email, logo_path, address, phone, active, room_count, created_at, updated_at, guest_settings, timezone')
    .eq('id', id)
    .single()

  if (error) {
    logger.error('Supabase error in getHotelById:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    throw error
  }
  
  if (!data) {
    throw new Error(`Hotel with ID ${id} not found`)
  }
  
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

