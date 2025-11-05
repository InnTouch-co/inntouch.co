'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getStaffByHotel } from '@/lib/database/users'
import { getHotels } from '@/lib/database/hotels'
import { supabase } from '@/lib/supabase/client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { getRoleDisplayName } from '@/lib/auth/roles'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import type { User } from '@/types/database'

type StaffUser = User & {
  hotel_name?: string
  department?: string
  status?: 'active' | 'on break' | 'off duty'
  rating?: number
  tasks_completed?: number
  shift?: string
}

// Non-admin roles
const STAFF_ROLES = ['staff', 'front_desk', 'housekeeping', 'maintenance']

export function StaffManagement() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [hotels, setHotels] = useState<any[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    onDuty: 0,
    avgRating: 0,
    tasksToday: 0,
  })

  useEffect(() => {
    loadUserAndHotels()
  }, [])

  useEffect(() => {
    if (selectedHotel) {
      loadStaff()
    }
  }, [selectedHotel])

  const loadUserAndHotels = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        window.location.href = '/login'
        return
      }

      setUser(currentUser)

      // Get hotels assigned to this user
      const { data: hotelAssignments, error } = await supabase
        .from('hotel_users')
        .select('hotel_id, hotels(*)')
        .eq('user_id', currentUser.id)
        .eq('is_deleted', false)

      if (error) throw error

      const userHotels = (hotelAssignments || []).map((assignment: any) => assignment.hotels).filter(Boolean)
      setHotels(userHotels)

      if (userHotels.length > 0 && !selectedHotel) {
        setSelectedHotel(userHotels[0].id)
      }
    } catch (error) {
      console.error('Failed to load user/hotels:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStaff = useCallback(async () => {
    if (!selectedHotel) return

    try {
      // Optimized: Get staff directly from database with a single query
      const staffUsers = await getStaffByHotel(selectedHotel)
      
      // Get hotel name once
      const hotel = hotels.find(h => h.id === selectedHotel)
      const hotelName = hotel ? extractTextFromJson(hotel.title) : ''

      // Map to StaffUser with enhanced data
      const hotelStaff = staffUsers.map(s => {
        // Default values (would come from actual data in real implementation)
        const staffData: StaffUser = {
          ...s,
          hotel_name: hotelName,
          department: getDepartmentFromRole(s.role_id),
          status: 'active', // Would come from actual status field
          rating: 4.7 + Math.random() * 0.3, // Mock rating, would come from actual data
          tasks_completed: Math.floor(Math.random() * 300), // Mock tasks, would come from actual data
          shift: getShiftFromRole(s.role_id),
        }
        
        return staffData
      })

      setStaff(hotelStaff)

      // Calculate stats efficiently
      const onDuty = hotelStaff.length // All are active for now
      const avgRating = hotelStaff.length > 0
        ? hotelStaff.reduce((sum, s) => sum + (s.rating || 0), 0) / hotelStaff.length
        : 0
      const tasksToday = hotelStaff.reduce((sum, s) => sum + (s.tasks_completed || 0), 0)

      setStats({
        total: hotelStaff.length,
        onDuty,
        avgRating: parseFloat(avgRating.toFixed(1)),
        tasksToday,
      })
    } catch (error) {
      console.error('Failed to load staff:', error)
    }
  }, [selectedHotel, hotels])

  const getDepartmentFromRole = (roleId: string | null | undefined): string => {
    if (!roleId) return 'General'
    switch (roleId) {
      case 'front_desk':
        return 'Front Desk'
      case 'housekeeping':
        return 'Housekeeping'
      case 'maintenance':
        return 'Maintenance'
      case 'staff':
        return 'General'
      default:
        return 'General'
    }
  }

  const getShiftFromRole = (roleId: string | null | undefined): string => {
    // Mock shift data - would come from actual shift assignments
    const shifts = [
      'Morning (6am-2pm)',
      'Evening (2pm-10pm)',
      'Night (10pm-6am)',
      'Split (7am-3pm, 5pm-11pm)',
    ]
    return shifts[Math.floor(Math.random() * shifts.length)]
  }

  const getUserInitials = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getRoleTagColor = (roleId: string | null | undefined): string => {
    switch (roleId) {
      case 'front_desk':
        return 'bg-gray-100 text-gray-700'
      case 'housekeeping':
        return 'bg-purple-100 text-purple-700'
      case 'maintenance':
        return 'bg-blue-100 text-blue-700'
      case 'staff':
        return 'bg-indigo-100 text-indigo-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusColor = (status: string | undefined): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'on break':
        return 'bg-yellow-100 text-yellow-700'
      case 'off duty':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredStaff = staff.filter(s => {
    const name = extractTextFromJson(s.name)
    const email = s.email || ''
    return !searchQuery || 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getRoleDisplayName(s.role_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleAddStaff = useCallback(() => {
    const hotelParam = selectedHotel ? `?hotel_id=${selectedHotel}` : ''
    router.push(`/staff/new${hotelParam}`)
  }, [router, selectedHotel])

  const handleBulkAddStaff = () => {
    const hotelParam = selectedHotel ? `?hotel_id=${selectedHotel}` : ''
    router.push(`/users/bulk-add${hotelParam}&role=staff`)
  }

  const handleEdit = useCallback((staffMember: StaffUser) => {
    router.push(`/staff/${staffMember.id}/edit`)
  }, [router])

  const handleView = useCallback((staffMember: StaffUser) => {
    router.push(`/staff/${staffMember.id}`)
  }, [router])

  const handleDelete = async (staffMember: StaffUser) => {
    if (!confirm(`Are you sure you want to remove ${extractTextFromJson(staffMember.name)} from staff?`)) return
    
    try {
      // Soft delete user or remove from hotel
      const { error } = await supabase
        .from('hotel_users')
        .update({ is_deleted: true })
        .eq('user_id', staffMember.id)
        .eq('hotel_id', selectedHotel)

      if (error) throw error
      loadStaff()
    } catch (error) {
      console.error('Failed to remove staff:', error)
      alert('Failed to remove staff member')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading staff...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Staff Management</h1>
          <p className="text-xs md:text-sm text-gray-600">Manage your property's staff members</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleAddStaff}
            className="bg-black text-white hover:bg-gray-800 text-xs md:text-sm"
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Hotel Selector */}
      {hotels.length > 1 && (
        <div className="mb-6">
          <select
            value={selectedHotel}
            onChange={(e) => setSelectedHotel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
          >
            {hotels.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {extractTextFromJson(hotel.title)}
              </option>
            ))}
          </select>
        </div>
      )}

      {!selectedHotel ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-sm md:text-base text-gray-500">Please select a hotel to manage staff.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-6">
            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Total Staff</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">On Duty</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.onDuty}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Avg. Rating</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.avgRating}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Tasks Today</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.tasksToday}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 mb-6 flex items-center gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
              />
            </div>
            <button
              className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs md:text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
          </div>

          {/* Staff List */}
          {filteredStaff.length === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-sm md:text-base text-gray-500 mb-4">
                  {searchQuery ? 'No staff members match your search.' : 'No staff members found. Add your first staff member to get started.'}
                </p>
                {!searchQuery && (
                  <Button onClick={handleAddStaff} size="sm">
                    Add Staff Member
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((staffMember) => {
                const staffName = extractTextFromJson(staffMember.name)
                const initials = getUserInitials(staffName)
                
                return (
                  <Card key={staffMember.id}>
                    <div className="p-2 md:p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Avatar */}
                          <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-sm md:text-base">{initials}</span>
                          </div>

                          {/* Staff Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-sm md:text-base font-semibold text-gray-900">{staffName}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${getRoleTagColor(staffMember.role_id)}`}>
                                {getRoleDisplayName(staffMember.role_id || '')}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${getStatusColor(staffMember.status)}`}>
                                {staffMember.status || 'active'}
                              </span>
                              {staffMember.rating && (
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <span className="text-xs md:text-sm font-medium text-gray-900">{staffMember.rating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-1 mb-3 text-xs md:text-sm text-gray-600">
                              {staffMember.shift && (
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Shift: {staffMember.shift}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(staffMember)}
                            className="text-[10px] md:text-xs px-2 md:px-3 py-1.5"
                          >
                            <svg className="w-3 h-3 md:w-4 md:h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(staffMember)}
                            className="text-[10px] md:text-xs px-2 md:px-3 py-1.5"
                          >
                            <svg className="w-3 h-3 md:w-4 md:h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(staffMember)}
                            className="px-2 md:px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                          >
                            <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

