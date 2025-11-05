'use client'

import { useRouter, useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { getUserById, updateUser } from '@/lib/database/users'
import { extractTextFromJson, textToJson } from '@/lib/utils/json-text'
import { formatPhoneNumber } from '@/lib/utils/phone-mask'
import type { User } from '@/types/database'

type TabType = 'general' | 'schedule'

export default function EditStaffMemberPage() {
  const router = useRouter()
  const params = useParams()
  const staffId = params.id as string
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const abortControllerRef = useRef<AbortController | null>(null)

  // Form fields - memoized defaults
  const defaultName = useMemo(() => user?.name ? extractTextFromJson(user.name) : '', [user?.name])
  const defaultEmail = useMemo(() => user?.email || '', [user?.email])
  const defaultPhone = useMemo(() => user?.phone ? formatPhoneNumber(user.phone) : '', [user?.phone])
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Load user data
  useEffect(() => {
    loadStaffMember()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [staffId])

  // Update form fields when user data loads
  useEffect(() => {
    if (user) {
      setName(defaultName)
      setEmail(defaultEmail)
      setPhone(defaultPhone)
    }
  }, [user, defaultName, defaultEmail, defaultPhone])

  const loadStaffMember = useCallback(async () => {
    if (!staffId) return

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      setLoading(true)
      setError('')
      
      const userData = await getUserById(staffId)
      
      if (abortController.signal.aborted) return
      
      setUser(userData)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      console.error('Failed to load staff member:', err)
      setError(err instanceof Error ? err.message : 'Failed to load staff member')
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false)
      }
    }
  }, [staffId])

  const handleSubmit = useCallback(async () => {
    if (!user) return

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

      const userData = {
        name: textToJson(name.trim()),
        email: email.trim(),
        phone: phone ? phone.replace(/\D/g, '') : null,
        updated_at: new Date().toISOString(),
      }

      await updateUser(user.id, userData)
      
      // Navigate back to staff list
      router.push('/staff')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update staff member'
      setError(errorMessage)
      setIsSubmitting(false)
    }
  }, [user, name, email, phone, router])

  const handleCancel = useCallback(() => {
    router.push('/staff')
  }, [router])

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value))
  }, [])

  // Memoize staff name for display
  const staffName = useMemo(() => {
    return user ? extractTextFromJson(user.name) : ''
  }, [user])

  // Check if form has changes
  const hasChanges = useMemo(() => {
    if (!user) return false
    return (
      name !== defaultName ||
      email !== defaultEmail ||
      phone !== defaultPhone
    )
  }, [user, name, email, phone, defaultName, defaultEmail, defaultPhone])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading staff member...</div>
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <div className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg font-medium"
            >
              Back to Staff
            </button>
          </div>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
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
            disabled={isSubmitting || !hasChanges}
            className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Edit Staff Member</h1>
        <p className="text-sm md:text-base text-gray-600">Update staff member details</p>
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
                onChange={(e) => setEmail(e.target.value)}
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
          disabled={isSubmitting || !hasChanges}
          className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

