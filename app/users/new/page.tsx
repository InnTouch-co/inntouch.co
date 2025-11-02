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
      
      // Show appropriate message based on email sending result
      if (result.warning || result.error) {
        // Email sending failed, but user was created
        console.warn('User created but email failed:', result.error || result.warning)
        alert(`User created successfully, but email sending failed.\n\n${result.error || result.warning}\n\nPassword: ${result.password || 'N/A'}\n\nPlease share the password with the user manually.`)
      } else if (result.message) {
        // Success with email sent
        alert(`User created successfully! Invitation email has been sent to ${result.user.email}`)
      } else {
        // Generic success
        alert('User created successfully!')
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

