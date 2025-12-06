'use client'

import { useRouter, useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { getUserById } from '@/lib/database/users'
import { getHotels } from '@/lib/database/hotels'
import { supabase } from '@/lib/supabase/client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { formatPhoneNumber } from '@/lib/utils/phone-mask'
import { getRoleDisplayName } from '@/lib/auth/roles'
import type { User } from '@/types/database'
import { logger } from '@/lib/utils/logger'

export default function ViewStaffMemberPage() {
  const router = useRouter()
  const params = useParams()
  const staffId = params.id as string
  
  const [user, setUser] = useState<User | null>(null)
  const [assignedHotels, setAssignedHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadStaffData = useCallback(async () => {
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
      
      // Load user data
      const userData = await getUserById(staffId)
      
      if (abortController.signal.aborted) return
      
      setUser(userData)
      
      // Load assigned hotels in parallel
      const [hotelsData, assignmentsData] = await Promise.all([
        getHotels(),
        supabase
          .from('hotel_users')
          .select('hotel_id')
          .eq('user_id', staffId)
          .eq('is_deleted', false)
      ])

      if (abortController.signal.aborted) return

      if (assignmentsData.data && assignmentsData.data.length > 0) {
        const hotelIds = assignmentsData.data.map((a: any) => a.hotel_id)
        const userHotels = hotelsData.filter((h: any) => hotelIds.includes(h.id))
        setAssignedHotels(userHotels)
      } else {
        setAssignedHotels([])
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to load staff member'
      setError(errorMessage)
      logger.error('Error loading staff member:', err)
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false)
      }
    }
  }, [staffId])

  useEffect(() => {
    loadStaffData()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadStaffData])

  const handleEdit = useCallback(() => {
    router.push(`/staff/${staffId}/edit`)
  }, [router, staffId])

  const handleBack = useCallback(() => {
    router.push('/staff')
  }, [router])

  // Memoize computed values
  const staffName = useMemo(() => {
    return user ? extractTextFromJson(user.name) : ''
  }, [user])

  const initials = useMemo(() => {
    if (!staffName) return ''
    const parts = staffName.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return staffName.substring(0, 2).toUpperCase()
  }, [staffName])

  const roleDisplayName = useMemo(() => {
    return user ? getRoleDisplayName(user.role_id || '') : ''
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading staff member...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <div className="p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleBack}
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">Staff member not found</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg font-medium"
            >
              Back to Staff
            </button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Staff
        </button>
        <button
          onClick={handleEdit}
          className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg flex items-center gap-2 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Staff Member
        </button>
      </div>

      <Card>
        <div className="p-8 space-y-6">
          {/* Header Section */}
          <div className="flex items-start justify-between pb-6 border-b">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-xl">{initials}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{staffName}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    user.role_id === 'super_admin' ? 'bg-red-100 text-red-800' :
                    user.role_id === 'hotel_admin' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {roleDisplayName}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    user.active === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.active === 1 ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                <p className="text-base text-gray-900">{staffName}</p>
              </div>
              
              {user.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                  <p className="text-base text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {user.email}
                  </p>
                </div>
              )}
              
              {user.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                  <p className="text-base text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {formatPhoneNumber(user.phone)}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                <p className="text-base text-gray-900">{roleDisplayName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <p className="text-base text-gray-900">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                    user.active === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.active === 1 ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Assigned Properties */}
          {assignedHotels.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-xl font-semibold text-gray-900">Assigned Properties</h2>
              <div className="space-y-2">
                {assignedHotels.map((hotel: any) => (
                  <div key={hotel.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">
                          {extractTextFromJson(hotel.title)}
                        </h5>
                        {hotel.site && (
                          <p className="text-sm text-gray-600">Site: {hotel.site}</p>
                        )}
                        {hotel.email && (
                          <p className="text-sm text-gray-600">Email: {hotel.email}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        hotel.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {hotel.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignedHotels.length === 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-xl font-semibold text-gray-900">Assigned Properties</h2>
              <p className="text-gray-500">No properties assigned to this staff member.</p>
            </div>
          )}

          {/* Account Information */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Account Created</label>
                <p className="text-base text-gray-900">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              {user.updated_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                  <p className="text-base text-gray-900">
                    {new Date(user.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

