import { supabase } from '@/lib/supabase/client'
import type { User, UserInsert } from '@/types/database'

export async function getUsers() {
  // Force fresh data by clearing any potential cache and adding timestamp
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as User[]
}

export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
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

