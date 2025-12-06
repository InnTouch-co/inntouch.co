'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { extractTextFromJson, textToJson } from '@/lib/utils/json-text'
import { formatPhoneNumber } from '@/lib/utils/phone-mask'
import { formatEmail } from '@/lib/utils/email-validation'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import { getRoleDisplayName } from '@/lib/auth/roles'
import { logger } from '@/lib/utils/logger'

type TabType = 'general' | 'schedule'

// Non-admin staff roles only
const STAFF_ROLES = [
  { id: 'staff', name: 'Staff' },
  { id: 'front_desk', name: 'Front Desk' },
  { id: 'housekeeping', name: 'Housekeeping' },
  { id: 'maintenance', name: 'Maintenance' },
] as const

function AddStaffMemberForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preSelectedHotelId = searchParams.get('hotel_id')
  
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [user, setUser] = useState<any>(null)
  const [availableHotels, setAvailableHotels] = useState<any[]>([])
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>([])

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<string>('staff')
  const [department, setDepartment] = useState<'kitchen' | 'bar' | 'both' | null>(null)
  const [status, setStatus] = useState<number>(1)

  // Load user and hotels
  useEffect(() => {
    loadUserAndHotels()
  }, [])

  // Set pre-selected hotel if provided
  useEffect(() => {
    if (preSelectedHotelId && availableHotels.length > 0) {
      const hotel = availableHotels.find(h => h.id === preSelectedHotelId)
      if (hotel && !selectedHotelIds.includes(preSelectedHotelId)) {
        setSelectedHotelIds([preSelectedHotelId])
      }
    }
  }, [preSelectedHotelId, availableHotels, selectedHotelIds])

  const loadUserAndHotels = useCallback(async () => {
    try {
      setLoading(true)
      
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Get hotels assigned to current user
      const { data: hotelAssignments, error: hotelError } = await supabase
        .from('hotel_users')
        .select('hotel_id, hotels(*)')
        .eq('user_id', currentUser.id)
        .eq('is_deleted', false)

      if (hotelError) throw hotelError

      const userHotels = (hotelAssignments || [])
        .map((assignment: any) => assignment.hotels)
        .filter((hotel): hotel is any => Boolean(hotel) && typeof hotel === 'object' && 'id' in hotel)
      
      setAvailableHotels(userHotels)

      // Auto-select hotel if only one available
      if (userHotels.length === 1) {
        setSelectedHotelIds([userHotels[0].id])
      }
    } catch (err) {
      logger.error('Failed to load user/hotels:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [router])

  const handleSubmit = useCallback(async () => {
    setError('')
    setIsSubmitting(true)

    try {
      // Validation
      if (!name.trim()) {
        throw new Error('Full Name is required')
      }
      if (!email.trim()) {
        throw new Error('Email Address is required')
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        throw new Error('Please enter a valid email address')
      }

      if (selectedHotelIds.length === 0) {
        throw new Error('At least one hotel must be selected')
      }

      // Validate role is a staff role
      if (!STAFF_ROLES.some(r => r.id === role)) {
        throw new Error('Invalid role selected')
      }

      const response = await fetch('/api/staff/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: textToJson(name.trim()),
          email: email.trim(),
          phone: phone ? phone.replace(/\D/g, '') : null,
          active: status,
          role_id: role,
          department: department || null,
          hotelIds: selectedHotelIds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create staff member')
      }

      const result = await response.json()

      // Show success message
      if (result.warning || result.error) {
        // Staff created but email failed
        alert(`Staff member created successfully!\n\nHowever, the invitation email could not be sent.\n\nPassword: ${result.password || 'N/A'}\n\nPlease share the password with the staff member manually.`)
      } else {
        alert(`Staff member created successfully! Invitation email has been sent to ${email}.`)
      }

      router.push('/staff')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create staff member'
      setError(errorMessage)
      setIsSubmitting(false)
    }
  }, [name, email, phone, status, role, department, selectedHotelIds, router])

  const handleCancel = useCallback(() => {
    router.push('/staff')
  }, [router])

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value))
  }, [])

  const toggleHotelSelection = useCallback((hotelId: string) => {
    setSelectedHotelIds(prev => {
      if (prev.includes(hotelId)) {
        return prev.filter(id => id !== hotelId)
      } else {
        return [...prev, hotelId]
      }
    })
  }, [])

  // Memoize hotel selection helper
  const isHotelSelected = useCallback((hotelId: string) => {
    return selectedHotelIds.includes(hotelId)
  }, [selectedHotelIds])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'general', label: 'General Info' },
    { id: 'schedule', label: 'Schedule' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isSubmitting ? 'Creating...' : 'Create Staff Member'}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Add Staff Member</h1>
        <p className="text-sm md:text-base text-gray-600">Create a new staff member account</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
      <Card>
        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
              
              <Input
                label="Full Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Maria Garcia"
                required
                error={!name.trim() && error ? 'Full Name is required' : undefined}
              />

              <Input
                label="Email Address *"
                type="email"
                value={email}
                onChange={(e) => setEmail(formatEmail(e.target.value))}
                placeholder="maria@grandhotel.com"
                required
                error={!email.trim() && error ? 'Email Address is required' : undefined}
              />

              <Input
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+1 (555) 100-0001"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {STAFF_ROLES.map(roleOption => (
                    <option key={roleOption.id} value={roleOption.id}>
                      {roleOption.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select the role for this staff member. Only non-admin roles are available.
                </p>
              </div>

              {/* Department Selection (only for staff role) */}
              {role === 'staff' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    value={department || ''}
                    onChange={(e) => setDepartment(e.target.value === '' ? null : e.target.value as 'kitchen' | 'bar' | 'both')}
                  >
                    <option value="">Not Assigned</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="bar">Bar</option>
                    <option value="both">Both (Kitchen & Bar)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select department for kitchen/bar staff. Kitchen staff see food orders, bar staff see drink orders.
                  </p>
                </div>
              )}

              {/* Hotel Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Hotels <span className="text-red-500">*</span>
                </label>
                {availableHotels.length === 0 ? (
                  <p className="text-sm text-gray-500">No hotels available. Please contact an administrator.</p>
                ) : (
                  <div className="space-y-2">
                    {availableHotels.map((hotel) => {
                      const hotelName = extractTextFromJson(hotel.title)
                      const isSelected = isHotelSelected(hotel.id)
                      
                      return (
                        <label
                          key={hotel.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleHotelSelection(hotel.id)}
                            className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                          />
                          <span className="ml-3 text-sm font-medium text-gray-900">{hotelName}</span>
                          {hotel.site && (
                            <span className="ml-auto text-xs text-gray-500">{hotel.site}</span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                )}
                {selectedHotelIds.length === 0 && error && (
                  <p className="mt-1 text-sm text-red-600">At least one hotel must be selected</p>
                )}
              </div>

              {/* Status Toggle */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <p className="text-xs text-gray-500 mt-1">
                    {status === 1 ? 'Staff member will be active and can access the system' : 'Staff member will be inactive'}
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

              <p className="text-xs text-gray-500 mt-4">* Required fields</p>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule Information</h2>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-600 mb-2">Schedule functionality coming soon</p>
                <p className="text-sm text-gray-500">
                  Schedule management features will be available in a future update.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Bottom Action Buttons */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={handleCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Staff Member'}
        </button>
      </div>
    </div>
  )
}

export default function AddStaffMemberPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    }>
      <AddStaffMemberForm />
    </Suspense>
  )
}

