'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { HotelFormPage } from '@/components/hotels/HotelFormPage'
import { getHotelById, updateHotel } from '@/lib/database/hotels'
import { getHotelUsers, addUserToHotel, removeUserFromHotel } from '@/lib/database/hotel-users'
import type { Hotel } from '@/types/database'

export const dynamic = 'force-dynamic'

export default function EditHotelPage() {
  const router = useRouter()
  const params = useParams()
  const hotelId = params.id as string
  const [hotel, setHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHotel()
  }, [hotelId])

  const loadHotel = async () => {
    try {
      const data = await getHotelById(hotelId)
      setHotel(data)
    } catch (err) {
      console.error('Failed to load hotel:', err)
      router.push('/hotels')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (hotelData: any, userIds?: string[]) => {
    if (!hotel) return
    try {
      await updateHotel(hotel.id, hotelData)
      
      // Update hotel users
      if (userIds !== undefined) {
        const currentHotelUsers = await getHotelUsers(hotel.id)
        const currentUserIds = currentHotelUsers.map((hu: any) => hu.user_id)
        
        // Remove users that are no longer selected
        const toRemove = currentUserIds.filter((id: string) => !userIds.includes(id))
        await Promise.all(
          toRemove.map((userId: string) => removeUserFromHotel(hotel.id, userId))
        )
        
        // Add newly selected users
        const toAdd = userIds.filter((id: string) => !currentUserIds.includes(id))
        await Promise.all(
          toAdd.map((userId: string) => addUserToHotel(hotel.id, userId))
        )
      }
      
      router.push('/hotels')
    } catch (err) {
      throw err
    }
  }

  const handleCancel = () => {
    router.push('/hotels')
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

  if (!hotel) {
    return null
  }

  return (
    <HotelFormPage
      hotel={hotel}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}

