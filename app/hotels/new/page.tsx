'use client'

import { useRouter } from 'next/navigation'
import { HotelFormPage } from '@/components/hotels/HotelFormPage'
import { createHotel } from '@/lib/database/hotels'
import { addUserToHotel } from '@/lib/database/hotel-users'

export const dynamic = 'force-dynamic'

export default function NewHotelPage() {
  const router = useRouter()

  const handleSubmit = async (hotelData: any, userIds?: string[]) => {
    try {
      const newHotel = await createHotel(hotelData)
      
      // Add users to hotel if provided
      if (userIds && userIds.length > 0 && newHotel.id) {
        await Promise.all(
          userIds.map(userId => addUserToHotel(newHotel.id, userId))
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

  return (
    <HotelFormPage
      hotel={undefined}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}

