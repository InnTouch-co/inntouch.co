import { supabase } from '@/lib/supabase/client'
import type { Room } from '@/types/database-extended'

export async function getRooms(hotelId: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, hotel_id, room_number, room_type, floor, capacity, status, amenities, price_per_night, images, bed_type, is_deleted, created_at, updated_at')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)
    .order('room_number', { ascending: true })

  if (error) throw error
  return data as Room[]
}

export async function getRoomById(id: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('id, hotel_id, room_number, room_type, floor, capacity, status, amenities, price_per_night, images, bed_type, is_deleted, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Room
}

export async function createRoom(room: {
  hotel_id: string
  room_number: string
  room_type: any
  floor?: number | null
  capacity: number
  status: string
  amenities?: any
  price_per_night?: number | null
  bed_type?: string | null
}) {
  const { data, error } = await supabase
    .from('rooms')
    .insert(room)
    .select()
    .single()

  if (error) throw error
  return data as Room
}

// Batch create rooms for better performance
export async function createRoomsBatch(rooms: Array<{
  hotel_id: string
  room_number: string
  room_type: any
  floor?: number | null
  capacity: number
  status: string
  amenities?: any
  price_per_night?: number | null
  bed_type?: string | null
}>) {
  // Supabase supports batch insert up to 1000 rows
  const batchSize = 100
  const results: Room[] = []

  for (let i = 0; i < rooms.length; i += batchSize) {
    const batch = rooms.slice(i, i + batchSize)
    const { data, error } = await supabase
      .from('rooms')
      .insert(batch)
      .select()

    if (error) throw error
    if (data) results.push(...(data as Room[]))
  }

  return results
}

export async function updateRoom(id: string, room: Partial<{
  room_number: string
  room_type: any
  floor?: number | null
  capacity: number
  status: string
  amenities?: any
  price_per_night?: number | null
  bed_type?: string | null
}>) {
  const { data, error } = await supabase
    .from('rooms')
    .update({ ...room, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Room
}

export async function deleteRoom(id: string) {
  const { error } = await supabase
    .from('rooms')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function getRoomCountByStatus(hotelId: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('status')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)

  if (error) throw error

  const counts = {
    total: data.length,
    available: data.filter(r => r.status === 'available').length,
    occupied: data.filter(r => r.status === 'occupied').length,
    cleaning: data.filter(r => r.status === 'cleaning').length,
    maintenance: data.filter(r => r.status === 'maintenance').length,
  }

  return counts
}

// Optimized: Calculate stats from room data (avoids extra query)
export function calculateRoomStats(rooms: Room[]) {
  return {
    total: rooms.length,
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  }
}

