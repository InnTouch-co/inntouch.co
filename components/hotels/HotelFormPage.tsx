'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { extractTextFromJson, textToJson } from '@/lib/utils/json-text'
import { formatPhoneNumber } from '@/lib/utils/phone-mask'
import { formatEmail } from '@/lib/utils/email-validation'
import { getUsers } from '@/lib/database/users'
import { getHotelUsers } from '@/lib/database/hotel-users'
import type { Hotel, HotelInsert, User } from '@/types/database'
import { logger } from '@/lib/utils/logger'
import { COMMON_TIMEZONES } from '@/lib/utils/hotel-timezone'

interface HotelFormPageProps {
  hotel?: Hotel
  onSubmit: (hotel: HotelInsert | Partial<HotelInsert>, userIds?: string[]) => Promise<void>
  onCancel: () => void
}

type TabType = 'basic' | 'contact' | 'amenities' | 'images'

export function HotelFormPage({ hotel, onSubmit, onCancel }: HotelFormPageProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Basic Info fields
  const [organization, setOrganization] = useState('')
  const [propertyName, setPropertyName] = useState(hotel?.title ? extractTextFromJson(hotel.title) : '')
  const [description, setDescription] = useState('')
  const [starRating, setStarRating] = useState(3)
  const [numRooms, setNumRooms] = useState(hotel?.room_count?.toString() || '')
  const [numFloors, setNumFloors] = useState('')
  
  // Contact & Hours fields
  const [email, setEmail] = useState(hotel?.email || 'info@hotel.com')
  const [phone, setPhone] = useState(hotel?.phone || '+1 (555) 123-4567')
  const [website, setWebsite] = useState('https://www.hotel.com')
  const [checkInTime, setCheckInTime] = useState('15:00') // 3:00 PM in 24h format
  const [checkOutTime, setCheckOutTime] = useState('11:00') // 11:00 AM in 24h format
  
  // Additional fields
  const [address, setAddress] = useState(hotel?.address || '')
  const [site, setSite] = useState(hotel?.site || '')
  const [status, setStatus] = useState(hotel?.active ?? true)
  const [timezone, setTimezone] = useState((hotel as any)?.timezone || 'America/Chicago')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
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

  const handleSubmit = async () => {
    setError('')
    setIsSubmitting(true)

    try {
      if (!propertyName.trim()) {
        throw new Error('Property Name is required')
      }
      if (!numRooms || parseInt(numRooms) <= 0) {
        throw new Error('Number of Rooms is required')
      }
      if (!site.trim()) {
        throw new Error('Site URL is required')
      }

      const hotelData: any = {
        title: textToJson(propertyName),
        site: site,
        email: email || null,
        address: address || null,
        phone: phone || null,
        active: status,
        room_count: numRooms ? parseInt(numRooms) || 0 : 0,
        timezone: timezone || 'America/Chicago',
      }

      await onSubmit(hotelData, selectedUserIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  const tabs = [
    { id: 'basic' as TabType, label: 'Basic Info' },
    { id: 'contact' as TabType, label: 'Contact & Hours' },
    { id: 'amenities' as TabType, label: 'Amenities' },
    { id: 'images' as TabType, label: 'Images' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {hotel ? 'Edit Property' : 'Add New Property'}
            </h1>
            <p className="text-sm text-gray-500">Add a new hotel property</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Cancel</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{isSubmitting ? 'Creating...' : hotel ? 'Update Property' : 'Create Property'}</span>
          </button>
        </div>
      </div>

      {/* Status Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">Status</label>
          <p className="text-xs text-gray-500 mt-1">
            {status ? 'Property is active and available' : 'Property is deactivated'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStatus(!status)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            status ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              status ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Form Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Property Information</h2>

            {/* Property Name */}
            <Input
              label="Property Name *"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="e.g., Grand Hotel Downtown"
              required
            />

            {/* Number of Rooms */}
            <Input
              label="Number of Rooms *"
              type="number"
              value={numRooms}
              onChange={(e) => setNumRooms(e.target.value)}
              placeholder="150"
              min="1"
              required
            />

            {/* Site URL */}
            {hotel ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site URL
                </label>
                <input
                  type="text"
                  value={site}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
            ) : (
              <Input
                label="Site URL *"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="grand-hotel-downtown"
                required
              />
            )}

            {/* Address */}
            <Input
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, New York, NY 10001"
            />
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Contact Information</h2>
            
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(formatEmail(e.target.value))}
              placeholder="info@hotel.com"
            />

            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="+1 (555) 123-4567"
            />

            <Input
              label="Website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.hotel.com"
            />

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Check-in/Check-out</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-in Time
                  </label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-out Time
                  </label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Timezone</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hotel Timezone *
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  All dates and times will be based on this timezone
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'amenities' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Amenities</h2>
            <p className="text-sm text-gray-500">Amenities management coming soon...</p>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Images</h2>
            <p className="text-sm text-gray-500">Image upload functionality coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}

