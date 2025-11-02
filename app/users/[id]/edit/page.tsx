'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { UserFormPage } from '@/components/users/UserFormPage'
import { getUserById, updateUser } from '@/lib/database/users'
import { supabase } from '@/lib/supabase/client'
import { addUserToHotel, removeUserFromHotel } from '@/lib/database/hotel-users'
import type { User } from '@/types/database'

export const dynamic = 'force-dynamic'

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [userId])

  const loadUser = async () => {
    try {
      const data = await getUserById(userId)
      setUser(data)
    } catch (err) {
      console.error('Failed to load user:', err)
      router.push('/users')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (userData: any, hotelIds?: string[]) => {
    if (!user) return
    try {
      await updateUser(user.id, userData)
      
      // Update hotel assignments
      if (hotelIds !== undefined) {
        // Get current hotel assignments
        const { data: currentAssignments } = await supabase
          .from('hotel_users')
          .select('hotel_id')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
        
        const currentHotelIds = currentAssignments?.map((a: any) => a.hotel_id) || []
        
        // Remove users from hotels that are no longer selected
        const toRemove = currentHotelIds.filter((id: string) => !hotelIds.includes(id))
        await Promise.all(
          toRemove.map((hotelId: string) => removeUserFromHotel(hotelId, user.id))
        )
        
        // Add user to newly selected hotels
        const toAdd = hotelIds.filter((id: string) => !currentHotelIds.includes(id))
        await Promise.all(
          toAdd.map((hotelId: string) => addUserToHotel(hotelId, user.id))
        )
      }
      
      router.push('/users')
    } catch (err) {
      throw err
    }
  }

  const handleCancel = () => {
    router.push('/users')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <UserFormPage
      user={user}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}

