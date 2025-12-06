'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { extractTextFromJson, textToJson } from '@/lib/utils/json-text'
import { formatPhoneNumber } from '@/lib/utils/phone-mask'
import { formatEmail } from '@/lib/utils/email-validation'
import { getUsers } from '@/lib/database/users'
import { getHotelUsers, addUserToHotel, removeUserFromHotel } from '@/lib/database/hotel-users'
import type { Hotel, HotelInsert, User } from '@/types/database'
import { logger } from '@/lib/utils/logger'

interface HotelFormProps {
  hotel?: Hotel
  onSubmit: (hotel: HotelInsert | Partial<HotelInsert>, userIds?: string[]) => Promise<void>
  onCancel: () => void
}

export function HotelForm({ hotel, onSubmit, onCancel }: HotelFormProps) {
  const [formData, setFormData] = useState({
    title: hotel?.title ? extractTextFromJson(hotel.title) : '',
    site: hotel?.site || '',
    email: hotel?.email || '',
    logo_path: hotel?.logo_path || '',
    address: hotel?.address || '',
    phone: hotel?.phone || '',
    active: hotel?.active ?? true,
  })
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => {
    loadUsers()
    if (hotel?.id) {
      loadHotelUsers()
    }
  }, [hotel?.id])

  const loadUsers = async () => {
    try {
      const users = await getUsers()
      setAvailableUsers(users)
    } catch (err) {
      logger.error('Failed to load users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadHotelUsers = async () => {
    if (!hotel?.id) return
    try {
      const hotelUsers = await getHotelUsers(hotel.id)
      const userIds = hotelUsers.map((hu: any) => hu.user_id)
      setSelectedUserIds(userIds)
    } catch (err) {
      logger.error('Failed to load hotel users:', err)
    }
  }

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (!formData.title.trim()) {
        throw new Error('Title is required')
      }

      const hotelData = {
        title: textToJson(formData.title),
        site: formData.site,
        email: formData.email || null,
        logo_path: formData.logo_path || null,
        address: formData.address || null,
        phone: formData.phone || null,
        active: formData.active,
      }

      await onSubmit(hotelData, selectedUserIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
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
        label="Hotel Name"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Enter hotel name"
        required
      />

      <Input
        label="Site URL"
        type="url"
        value={formData.site}
        onChange={(e) => setFormData({ ...formData, site: e.target.value })}
        required
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: formatEmail(e.target.value) })}
        placeholder="info@hotel.com"
      />

      <Input
        label="Address"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        placeholder="Enter hotel address"
      />

      <Input
        label="Phone"
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
        placeholder="+1 (555) 123-4567"
      />

      <Input
        label="Logo Path"
        value={formData.logo_path}
        onChange={(e) => setFormData({ ...formData, logo_path: e.target.value })}
        placeholder="/images/logo.png"
      />

      {/* Active/Inactive Toggle */}
      <div className="flex items-center space-x-3">
        <label className="text-sm font-medium text-gray-700">Status:</label>
        <button
          type="button"
          onClick={() => setFormData({ ...formData, active: !formData.active })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            formData.active ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              formData.active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-gray-600">
          {formData.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* User Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Related Users
        </label>
        {loadingUsers ? (
          <div className="text-sm text-gray-500">Loading users...</div>
        ) : (
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
            {availableUsers.length === 0 ? (
              <div className="text-sm text-gray-500">No users available</div>
            ) : (
              availableUsers.map((user) => (
                <label key={user.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => handleUserToggle(user.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {extractTextFromJson(user.name)} {user.email && `(${user.email})`}
                  </span>
                </label>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : hotel ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
