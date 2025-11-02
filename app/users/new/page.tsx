'use client'

import { useRouter } from 'next/navigation'
import { UserFormPage } from '@/components/users/UserFormPage'
import { supabase } from '@/lib/supabase/client'
import { addUserToHotel } from '@/lib/database/hotel-users'

export const dynamic = 'force-dynamic'

export default function NewUserPage() {
  const router = useRouter()

  const handleSubmit = async (userData: any, hotelIds?: string[]) => {
    try {
      // Use API route to create user with email invitation
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          hotelIds,
          role_id: userData.role_id || 'hotel_admin',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }

      const result = await response.json()
      
      // Show success message
      if (result.emailContent) {
        console.log('User created! Email invitation:', {
          to: result.emailContent.to,
          subject: result.emailContent.subject,
        })
        alert(`User created successfully! An invitation email has been sent to ${result.user.email}`)
      }
      
      router.push('/users')
    } catch (err) {
      throw err
    }
  }

  const handleCancel = () => {
    router.push('/users')
  }

  return (
    <UserFormPage
      user={undefined}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}

