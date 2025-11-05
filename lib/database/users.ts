import { supabase } from '@/lib/supabase/client'
import type { User, UserInsert } from '@/types/database'

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, email_verified_at, utype_id, role_id, active, is_deleted, must_change_password, created_at, updated_at')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as User[]
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, phone, email_verified_at, utype_id, role_id, active, is_deleted, must_change_password, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as User
}

export async function createUser(user: UserInsert) {
  const { data, error } = await supabase
    .from('users')
    .insert(user)
    .select()
    .single()

  if (error) throw error
  return data as User
}

export async function updateUser(id: string, user: Partial<UserInsert>) {
  const { data, error } = await supabase
    .from('users')
    .update({ ...user, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as User
}

export async function deleteUser(id: string) {
  const { error } = await supabase
    .from('users')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// Optimized: Get staff members for a specific hotel (non-admin roles only)
export async function getStaffByHotel(hotelId: string) {
  // Staff roles (excluding admins)
  const staffRoles = ['staff', 'front_desk', 'housekeeping', 'maintenance']
  
  // First get hotel_user assignments
  const { data: hotelUsers, error: hotelUsersError } = await supabase
    .from('hotel_users')
    .select('user_id')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)

  if (hotelUsersError) throw hotelUsersError

  if (!hotelUsers || hotelUsers.length === 0) {
    return []
  }

  const userIds = hotelUsers.map((hu: any) => hu.user_id)

  // Then get users with staff roles in one query
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, email, phone, email_verified_at, utype_id, role_id, active, is_deleted, must_change_password, created_at, updated_at')
    .in('id', userIds)
    .in('role_id', staffRoles)
    .eq('is_deleted', false)

  if (usersError) throw usersError

  return (users || []) as User[]
}

