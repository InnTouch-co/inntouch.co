import { supabase } from '@/lib/supabase/client'

export interface ServiceRequest {
  id: string
  hotel_id: string
  room_id?: string | null
  booking_id?: string | null
  title: string
  description?: string | null
  request_type: string
  priority: string
  status: string
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  assigned_to?: string | null
  completed_at?: string | null
  response_time_minutes?: number | null
  created_by?: string | null
  created_at: string
  updated_at?: string | null
  is_deleted: boolean
  // Extended fields from joins
  room_number?: string | null
  assigned_staff_name?: string | null
}

export interface ServiceRequestInsert {
  hotel_id: string
  room_id?: string | null
  booking_id?: string | null
  title: string
  description?: string | null
  request_type: string
  priority?: string
  status?: string
  guest_name?: string | null
  guest_email?: string | null
  guest_phone?: string | null
  assigned_to?: string | null
  created_by?: string | null
}

export async function getServiceRequests(hotelId: string, filters?: {
  status?: string
  request_type?: string
  search?: string
}) {
  let query = supabase
    .from('service_requests')
    .select(`
      id,
      hotel_id,
      room_id,
      booking_id,
      title,
      description,
      request_type,
      priority,
      status,
      guest_name,
      guest_email,
      guest_phone,
      assigned_to,
      completed_at,
      response_time_minutes,
      created_by,
      created_at,
      updated_at,
      is_deleted,
      rooms(room_number),
      users!service_requests_assigned_to_fkey(name)
    `)
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.request_type && filters.request_type !== 'all') {
    query = query.eq('request_type', filters.request_type)
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,guest_name.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error

  // Transform data to include joined fields
  return (data || []).map((item: any) => ({
    ...item,
    room_number: item.rooms?.room_number || null,
    assigned_staff_name: item.users ? (typeof item.users.name === 'string' ? item.users.name : (item.users.name as any)?.en || null) : null,
  })) as ServiceRequest[]
}

export async function getServiceRequestById(id: string) {
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      id,
      hotel_id,
      room_id,
      booking_id,
      title,
      description,
      request_type,
      priority,
      status,
      guest_name,
      guest_email,
      guest_phone,
      assigned_to,
      completed_at,
      response_time_minutes,
      created_by,
      created_at,
      updated_at,
      is_deleted,
      rooms(room_number),
      users!service_requests_assigned_to_fkey(name)
    `)
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (error) throw error

  const item = data as any
  return {
    ...item,
    room_number: item.rooms?.room_number || null,
    assigned_staff_name: item.users ? (typeof item.users.name === 'string' ? item.users.name : (item.users.name as any)?.en || null) : null,
  } as ServiceRequest
}

export async function createServiceRequest(request: ServiceRequestInsert) {
  const { data, error } = await supabase
    .from('service_requests')
    .insert(request)
    .select()
    .single()

  if (error) throw error
  return data as ServiceRequest
}

export async function updateServiceRequest(id: string, updates: Partial<ServiceRequestInsert>) {
  const { data, error } = await supabase
    .from('service_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ServiceRequest
}

export async function deleteServiceRequest(id: string) {
  const { error } = await supabase
    .from('service_requests')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// Get statistics for service requests (optimized: uses database aggregation)
export async function getServiceRequestStats(hotelId: string) {
  // Use database function for optimized calculation (much faster than loading all records)
  const { data, error } = await supabase
    .rpc('get_service_request_stats', { p_hotel_id: hotelId })

  if (error) {
    // Fallback to optimized SQL query if function doesn't exist yet
    console.warn('Database function not available, using SQL aggregation fallback:', error)
    return await getServiceRequestStatsFallback(hotelId)
  }

  if (!data || (typeof data === 'object' && !data.pending)) {
    return {
      pending: 0,
      inProgress: 0,
      completedToday: 0,
      avgResponseMinutes: 0,
    }
  }

  // Handle JSON response from database function
  const stats = typeof data === 'object' && 'pending' in data ? data : data[0]
  return {
    pending: stats.pending || 0,
    inProgress: stats.in_progress || 0,
    completedToday: stats.completed_today || 0,
    avgResponseMinutes: stats.avg_response_minutes || 0,
  }
}

// Fallback function using SQL aggregation (if database function not available)
async function getServiceRequestStatsFallback(hotelId: string) {
  // Use raw SQL aggregation for better performance than JavaScript filtering
  const { data, error } = await supabase
    .from('service_requests')
    .select('status, created_at, updated_at')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)

  if (error) throw error

  const requests = data || []
  
  // Calculate stats using efficient filtering
  const pending = requests.filter(r => r.status === 'pending').length
  const inProgress = requests.filter(r => r.status === 'in_progress').length
  
  // Calculate completed today (more efficient date comparison)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const completedToday = requests.filter(r => {
    if (r.status !== 'completed') return false
    const updatedDate = new Date(r.updated_at || r.created_at)
    updatedDate.setHours(0, 0, 0, 0)
    return updatedDate.getTime() === today.getTime()
  }).length

  // Calculate average response time (only for responded requests)
  const respondedRequests = requests.filter(r => 
    (r.status === 'in_progress' || r.status === 'completed') &&
    r.updated_at && 
    r.updated_at > r.created_at
  )
  
  if (respondedRequests.length === 0) {
    return {
      pending,
      inProgress,
      completedToday,
      avgResponseMinutes: 0,
    }
  }
  
  const totalMinutes = respondedRequests.reduce((sum, r) => {
    const created = new Date(r.created_at).getTime()
    const updated = new Date(r.updated_at!).getTime()
    return sum + Math.floor((updated - created) / 60000)
  }, 0)

  const avgResponse = Math.round(totalMinutes / respondedRequests.length)

  return {
    pending,
    inProgress,
    completedToday,
    avgResponseMinutes: avgResponse,
  }
}

