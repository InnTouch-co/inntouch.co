import { supabase } from '@/lib/supabase/client'
import type { Service, ServiceInsert } from '@/types/database'

export async function getServices(hotelId?: string) {
  let query = supabase
    .from('services')
    .select('*')
    .eq('is_deleted', false)
    .order('sort', { ascending: true })

  if (hotelId) {
    query = query.eq('hotel_id', hotelId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Service[]
}

export async function getServiceById(id: string) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Service
}

export async function createService(service: ServiceInsert) {
  const { data, error } = await supabase
    .from('services')
    .insert(service)
    .select()
    .single()

  if (error) throw error
  return data as Service
}

export async function updateService(id: string, service: Partial<ServiceInsert>) {
  const { data, error } = await supabase
    .from('services')
    .update({ ...service, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Service
}

export async function deleteService(id: string) {
  const { error } = await supabase
    .from('services')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

