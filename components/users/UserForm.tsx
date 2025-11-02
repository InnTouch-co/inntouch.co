'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { getHotels } from '@/lib/database/hotels'
import { extractTextFromJson, textToJson } from '@/lib/utils/json-text'
import { SearchableHotelSelector } from './SearchableHotelSelector'
import type { User, UserInsert } from '@/types/database'

interface UserFormProps {
  user?: User
  onSubmit: (user: UserInsert | Partial<UserInsert>, hotelIds?: string[]) => Promise<void>
  onCancel: () => void
}

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const [hotels, setHotels] = useState<any[]>([])
  const [assignedHotels, setAssignedHotels] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: user?.name ? extractTextFromJson(user.name) : '',
    email: user?.email || '',
    active: user?.active ?? 1,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadingHotels, setLoadingHotels] = useState(true)

  useEffect(() => {
    loadHotels()
  }, [])

  const loadHotels = async () => {
    try {
      const data = await getHotels()
      setHotels(data)
      
      // Load assigned hotels for existing user
      if (user?.id) {
        await loadUserHotels(data)
      }
    } catch (err) {
      console.error('Failed to load hotels:', err)
    } finally {
      setLoadingHotels(false)
    }
  }

  const loadUserHotels = async (hotelsList?: any[]) => {
    if (!user?.id) return
    
    const hotelsToCheck = hotelsList || hotels
    if (hotelsToCheck.length === 0) return
    
    try {
      // Get all hotel assignments for this user in one query
      const { supabase } = await import('@/lib/supabase/client')
      const { data: userAssignments } = await supabase
        .from('hotel_users')
        .select('hotel_id')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
      
      if (userAssignments) {
        const assignedIds = userAssignments.map((a: any) => a.hotel_id)
        setAssignedHotels(assignedIds)
      }
    } catch (err) {
      console.error('Failed to load user hotels:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (!formData.name.trim()) {
        throw new Error('Name is required')
      }

      // Always set user type to 'admin' for Super User created users
      await onSubmit({
        name: textToJson(formData.name),
        email: formData.email || null,
        utype_id: 'admin', // Super Users only create admins
        active: formData.active,
      }, assignedHotels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      
      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Enter user name"
        required
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Enter user email"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formData.active}
          onChange={(e) => setFormData({ ...formData, active: Number(e.target.value) })}
        >
          <option value={1}>Active</option>
          <option value={0}>Inactive</option>
        </select>
      </div>

      {/* Hotel Assignment with Searchable Selector */}
      {!loadingHotels && (
        <SearchableHotelSelector
          hotels={hotels}
          selectedHotelIds={assignedHotels}
          onSelectionChange={setAssignedHotels}
        />
      )}

      {loadingHotels && (
        <div className="text-sm text-gray-500">Loading hotels...</div>
      )}

      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <strong>Note:</strong> Super Users can only create Admin users. Admins can then create other user types (staff, etc.) for their assigned hotels.
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : user ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
