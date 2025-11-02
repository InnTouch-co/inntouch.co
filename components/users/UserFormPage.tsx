'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { extractTextFromJson, textToJson } from '@/lib/utils/json-text'
import { getHotels } from '@/lib/database/hotels'
import { SearchableHotelSelector } from './SearchableHotelSelector'
import { supabase } from '@/lib/supabase/client'
import type { User, UserInsert } from '@/types/database'

interface UserFormPageProps {
  user?: User
  onSubmit: (user: UserInsert | Partial<UserInsert>, hotelIds?: string[]) => Promise<void>
  onCancel: () => void
}

type TabType = 'basic' | 'permissions' | 'properties'

export function UserFormPage({ user, onSubmit, onCancel }: UserFormPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hotels, setHotels] = useState<any[]>([])
  const [assignedHotels, setAssignedHotels] = useState<string[]>([])
  const [loadingHotels, setLoadingHotels] = useState(true)
  
  // Basic Info fields
  const [name, setName] = useState(user?.name ? extractTextFromJson(user.name) : '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState(user?.active ?? 1)
  
  // Permissions fields
  const [role, setRole] = useState(user?.role_id || 'hotel_admin')

  useEffect(() => {
    loadHotels()
    if (user?.id) {
      loadUserHotels()
    }
  }, [user?.id])

  const loadHotels = async () => {
    try {
      const data = await getHotels()
      setHotels(data)
    } catch (err) {
      console.error('Failed to load hotels:', err)
    } finally {
      setLoadingHotels(false)
    }
  }

  const loadUserHotels = async () => {
    if (!user?.id) return
    
    try {
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

  const handleSubmit = async () => {
    setError('')
    setIsSubmitting(true)

    try {
      if (!name.trim()) {
        throw new Error('Name is required')
      }

      const userData: any = {
        name: textToJson(name),
        email: email || null,
        utype_id: 'admin',
        active: status,
        role_id: role || 'hotel_admin',
      }

      await onSubmit(userData, assignedHotels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  const tabs = [
    { id: 'basic' as TabType, label: 'Basic Info' },
    { id: 'permissions' as TabType, label: 'Permissions & Access' },
    { id: 'properties' as TabType, label: 'Properties' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {user ? 'Edit User' : 'Add New User'}
          </h1>
          <p className="text-sm text-gray-500">Add a new user to the system</p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>{isSubmitting ? 'Creating...' : user ? 'Update User' : 'Create User'}</span>
          </button>
        </div>
      </div>

      {/* Status Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">Status</label>
          <p className="text-xs text-gray-500 mt-1">
            {status === 1 ? 'User is active and can access the system' : 'User is deactivated and cannot access the system'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStatus(status === 1 ? 0 : 1)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            status === 1 ? 'bg-green-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              status === 1 ? 'translate-x-6' : 'translate-x-1'
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
            <h2 className="text-lg font-semibold text-gray-900 mb-6">User Information</h2>
            
            <Input
              label="Full Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Doe"
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
            />

            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Permissions & Access</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="super_admin">Super Admin</option>
                <option value="hotel_admin">Hotel Admin</option>
                <option value="front_desk">Front Desk</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="maintenance">Maintenance</option>
                <option value="staff">Staff</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the role that determines what this user can access and manage.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Super Users can create Admin users. Admins can then create other user types (staff, etc.) for their assigned hotels.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Property Assignments</h2>
            
            {loadingHotels ? (
              <div className="text-sm text-gray-500">Loading hotels...</div>
            ) : (
              <SearchableHotelSelector
                hotels={hotels}
                selectedHotelIds={assignedHotels}
                onSelectionChange={setAssignedHotels}
              />
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Assign this user to one or more properties. Users can only access and manage data for their assigned properties.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

