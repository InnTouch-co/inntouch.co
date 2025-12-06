import { supabase } from '@/lib/supabase/client'
import type { Service, ServiceInsert } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

// Helper to get supabase client (client-side or server-side)
function getSupabaseClient(client?: SupabaseClient<any, 'public', any>) {
  return client || supabase
}

export async function getServices(hotelId?: string, client?: SupabaseClient<any, 'public', any>) {
  const db = getSupabaseClient(client)
  let query = db
    .from('services')
    .select('id, hotel_id, sub_id, title, sort, initiator_id, active, is_deleted, created_at, updated_at, service_type, description, menu, photos, operating_hours, contact_info, settings, display_order')
    .eq('is_deleted', false)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('sort', { ascending: true })

  if (hotelId) {
    query = query.eq('hotel_id', hotelId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Service[]
}

export async function getServiceById(id: string, client?: SupabaseClient<any, 'public', any>) {
  const db = getSupabaseClient(client)
  const { data, error } = await db
    .from('services')
    .select('id, hotel_id, sub_id, title, sort, initiator_id, active, is_deleted, created_at, updated_at, service_type, description, menu, photos, operating_hours, contact_info, settings, display_order')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Service
}

export async function createService(service: ServiceInsert, client?: SupabaseClient<any, 'public', any>) {
  const db = getSupabaseClient(client)
  
  // Log what we're creating
  if (service.menu !== undefined) {
    logger.debug('createService - Menu data:', JSON.stringify(service.menu, null, 2))
    logger.debug('createService - Menu type:', typeof service.menu)
  }
  
  logger.debug('createService - Service data keys:', Object.keys(service))
  logger.debug('createService - Menu in service:', service.menu !== undefined ? 'YES' : 'NO')
  
  const { data, error } = await db
    .from('services')
    .insert(service)
    .select('id, hotel_id, sub_id, title, sort, initiator_id, active, is_deleted, created_at, updated_at, service_type, description, menu, photos, operating_hours, contact_info, settings, display_order')
    .single()

  if (error) {
    logger.error('createService - Database error:', error)
    logger.error('createService - Error code:', error.code)
    logger.error('createService - Error message:', error.message)
    logger.error('createService - Error details:', error.details)
    throw error
  }
  
  if (data) {
    logger.info('createService - Created service ID:', data.id)
    logger.debug('createService - Response data keys:', Object.keys(data))
    if (data.menu !== undefined && data.menu !== null) {
      logger.debug('createService - Saved menu:', JSON.stringify(data.menu, null, 2))
    } else {
      logger.warn('createService - Menu is null/undefined in response')
      logger.warn('createService - This means the menu was NOT saved!')
    }
  } else {
    logger.warn('createService - No data in response')
  }
  
  return data as Service
}

export async function updateService(id: string, service: Partial<ServiceInsert>, client?: SupabaseClient<any, 'public', any>) {
  const db = getSupabaseClient(client)
  
  // Log what we're updating
  if (service.menu !== undefined) {
    logger.debug('updateService - Menu data:', JSON.stringify(service.menu, null, 2))
    logger.debug('updateService - Menu type:', typeof service.menu)
    logger.debug('updateService - Menu is object:', typeof service.menu === 'object')
  }
  
  // Build update payload - ensure menu is properly formatted as JSONB
  const updatePayload: any = { 
    ...service, 
    updated_at: new Date().toISOString() 
  }
  
  // Explicitly ensure menu is a proper JSON object (not string)
  if (service.menu !== undefined) {
    if (typeof service.menu === 'string') {
      // If it's a string, parse it
      try {
        updatePayload.menu = JSON.parse(service.menu)
      } catch (e) {
        logger.error('updateService - Failed to parse menu string:', e)
        updatePayload.menu = service.menu
      }
    } else {
      // Already an object, use as-is
      updatePayload.menu = service.menu
    }
  }
  
  logger.debug('updateService - Update payload keys:', Object.keys(updatePayload))
  logger.debug('updateService - Menu in payload:', updatePayload.menu ? 'YES' : 'NO')
  
  // Log the exact update query payload
  logger.debug('updateService - About to update with payload:', JSON.stringify(updatePayload, null, 2))
  logger.debug('updateService - Menu in payload:', updatePayload.menu !== undefined ? 'YES' : 'NO')
  logger.debug('updateService - Menu value:', updatePayload.menu)
  
  const { data, error } = await db
    .from('services')
    .update(updatePayload)
    .eq('id', id)
    .select('id, hotel_id, sub_id, title, sort, initiator_id, active, is_deleted, created_at, updated_at, service_type, description, menu, photos, operating_hours, contact_info, settings, display_order')
    .single()

  if (error) {
    logger.error('updateService - Database error:', error)
    logger.error('updateService - Error code:', error.code)
    logger.error('updateService - Error message:', error.message)
    logger.error('updateService - Error details:', error.details)
    logger.error('updateService - Error hint:', error.hint)
    throw error
  }
  
  if (data) {
    logger.debug('updateService - Response data keys:', Object.keys(data))
    logger.debug('updateService - Response data has menu field:', 'menu' in data)
    if (data.menu !== undefined && data.menu !== null) {
      logger.debug('updateService - Saved menu:', JSON.stringify(data.menu, null, 2))
      logger.debug('updateService - Saved menu type:', typeof data.menu)
    } else {
      logger.warn('updateService - Menu is null/undefined in response')
      logger.warn('updateService - This means the update did NOT save the menu!')
    }
  } else {
    logger.warn('updateService - No data in response - update may have failed silently')
  }
  
  return data as Service
}

export async function deleteService(id: string, client?: SupabaseClient<any, 'public', any>) {
  const db = getSupabaseClient(client)
  const { error } = await db
    .from('services')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

