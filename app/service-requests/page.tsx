'use client'

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { getStaffByHotel } from '@/lib/database/users'
import { getRoleDisplayName } from '@/lib/auth/roles'
import { useServiceRequests, useServiceRequestStats, useUpdateServiceRequest, type ServiceRequestStats } from '@/lib/react-query/hooks/useServiceRequests'
import type { ServiceRequest } from '@/lib/database/service-requests'
import type { User } from '@/types/database'

type FilterStatus = 'pending' | 'active' | 'completed' | 'all'

const REQUEST_TYPES = [
  { id: 'all', name: 'All Types' },
  { id: 'food', name: 'Food & Beverage' },
  { id: 'housekeeping', name: 'Housekeeping' },
  { id: 'maintenance', name: 'Maintenance' },
  { id: 'concierge', name: 'Concierge' },
  { id: 'other', name: 'Other' },
]

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const TYPE_ICONS: Record<string, React.ReactElement> = {
  food: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  housekeeping: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  maintenance: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  concierge: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  other: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
}

export default function ServiceRequestsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [hotels, setHotels] = useState<any[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  
  // Use React Query hooks for data fetching
  const { data: allRequests = [], isLoading: isLoadingRequests, error: requestsError, refetch: refetchRequests } = useServiceRequests(selectedHotel || null)
  const { data: stats = { pending: 0, inProgress: 0, completedToday: 0, avgResponseMinutes: 0 }, isLoading: isLoadingStats } = useServiceRequestStats(selectedHotel || null)
  const updateRequestMutation = useUpdateServiceRequest()
  
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('pending')
  const [error, setError] = useState('')
  
  // Set error from React Query errors
  useEffect(() => {
    if (requestsError) {
      setError(requestsError instanceof Error ? requestsError.message : 'Failed to load service requests')
    } else {
      setError('') // Clear error when data loads successfully
    }
  }, [requestsError])
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [staffMembers, setStaffMembers] = useState<User[]>([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [staffSearchQuery, setStaffSearchQuery] = useState('')
  const staffDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadUserAndHotels()
  }, [])

  // React Query automatically handles fetching when selectedHotel changes
  // No need for manual useEffect for data loading

  const loadUserAndHotels = useCallback(async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Get hotels assigned to this user
      const { data: hotelAssignments, error } = await supabase
        .from('hotel_users')
        .select('hotel_id, hotels(*)')
        .eq('user_id', currentUser.id)
        .eq('is_deleted', false)

      if (error) {
        console.error('Error loading hotel assignments:', error)
        throw error
      }

      console.log('Hotel assignments:', hotelAssignments)
      console.log('User ID:', currentUser.id)

      const userHotels = (hotelAssignments || [])
        .map((assignment: any) => assignment.hotels)
        .filter((hotel): hotel is any => Boolean(hotel) && typeof hotel === 'object' && 'id' in hotel)
      
      console.log('Filtered hotels:', userHotels)
      setHotels(userHotels)

      // Only set selectedHotel if no hotel is currently selected
      setSelectedHotel((prev) => {
        if (!prev && userHotels.length > 0) {
          return userHotels[0].id
        }
        return prev
      })
    } catch (error) {
      console.error('Failed to load user/hotels:', error)
      setError(error instanceof Error ? error.message : 'Failed to load hotels')
    } finally {
      setLoading(false)
    }
  }, [router])

  // React Query handles data fetching automatically
  // No need for manual loadRequests/loadStats functions

  const handleOpenAssignModal = useCallback(async (request: ServiceRequest) => {
    setSelectedRequest(request)
    setIsAssignModalOpen(true)
    setSelectedStaffId('')

    // Load staff members for the request's hotel
    if (request.hotel_id) {
      try {
        setLoadingStaff(true)
        const staff = await getStaffByHotel(request.hotel_id)
        setStaffMembers(staff)
      } catch (error) {
        console.error('Failed to load staff:', error)
        setError('Failed to load staff members')
      } finally {
        setLoadingStaff(false)
      }
    }
  }, [])

  const handleCloseAssignModal = useCallback(() => {
    setIsAssignModalOpen(false)
    setSelectedRequest(null)
    setSelectedStaffId('')
    setStaffMembers([])
    setStaffSearchQuery('')
  }, [])


  const handleAssignToStaff = useCallback(async () => {
    if (!selectedRequest || !selectedStaffId) {
      alert('Please select a staff member')
      return
    }

    try {
      await updateRequestMutation.mutateAsync({
        id: selectedRequest.id,
        updates: {
          assigned_to: selectedStaffId,
          status: 'in_progress',
        },
      })

      handleCloseAssignModal()
      // React Query will automatically refetch and update the UI
    } catch (error) {
      console.error('Failed to assign request:', error)
      alert(error instanceof Error ? error.message : 'Failed to assign request. Please try again.')
    }
  }, [selectedRequest, selectedStaffId, updateRequestMutation, handleCloseAssignModal])

  const handleEdit = useCallback((request: ServiceRequest) => {
    router.push(`/service-requests/${request.id}/edit`)
  }, [router])

  const handleOpenDetailsModal = useCallback((request: ServiceRequest) => {
    setSelectedRequest(request)
    setIsDetailsModalOpen(true)
  }, [])

  const handleCloseDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false)
    setSelectedRequest(null)
  }, [])

  const handleStatusChange = useCallback(async (requestId: string, newStatus: string) => {
    try {
      await updateRequestMutation.mutateAsync({
        id: requestId,
        updates: {
          status: newStatus,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        },
      })
      // React Query will automatically refetch and update the UI
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status. Please try again.')
    }
  }, [updateRequestMutation])


  // Filter requests client-side based on activeFilter, selectedType, and searchQuery
  const requests = useMemo(() => {
    let filtered = [...allRequests]

    // Filter by status
    if (activeFilter !== 'all') {
      const statusMap: Record<FilterStatus, string> = {
        pending: 'pending',
        active: 'in_progress',
        completed: 'completed',
        all: '',
      }
      filtered = filtered.filter(r => r.status === statusMap[activeFilter])
    }

    // Filter by request type
    if (selectedType !== 'all') {
      filtered = filtered.filter(r => r.request_type === selectedType)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => {
        const title = r.title?.toLowerCase() || ''
        const description = r.description?.toLowerCase() || ''
        const guestName = r.guest_name?.toLowerCase() || ''
        const roomNumber = r.room_number?.toLowerCase() || ''
        return title.includes(query) || 
               description.includes(query) || 
               guestName.includes(query) ||
               roomNumber.includes(query)
      })
    }

    return filtered
  }, [allRequests, activeFilter, selectedType, searchQuery])

  // Memoize filtered requests count (using allRequests for accurate counts)
  const filteredCounts = useMemo(() => {
    const pendingCount = allRequests.filter(r => r.status === 'pending').length
    const activeCount = allRequests.filter(r => r.status === 'in_progress').length
    const completedCount = allRequests.filter(r => r.status === 'completed').length
    return { pendingCount, activeCount, completedCount }
  }, [allRequests])

  // Format time helper
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }, [])

  // Combine loading states
  const isLoading = loading || isLoadingRequests || isLoadingStats

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading service requests...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">Service Requests</h1>
          <p className="text-xs md:text-sm text-gray-600">Manage and track all guest service requests</p>
        </div>
        <Button
          onClick={() => {
            const hotelParam = selectedHotel ? `?hotel_id=${selectedHotel}` : ''
            router.push(`/service-requests/new${hotelParam}`)
          }}
          className="bg-gray-900 text-white hover:bg-gray-800 text-xs md:text-sm"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Service Request
        </Button>
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

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {!selectedHotel ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-sm md:text-base text-gray-500 mb-4">
              {hotels.length === 0 
                ? 'No hotels assigned to your account. Please contact an administrator to assign hotels to your account.' 
                : 'Please select a hotel to manage service requests.'}
            </p>
            {hotels.length === 0 && user && (
              <div className="text-xs text-gray-400 space-y-1">
                <p>User ID: {user.id}</p>
                <p>User Email: {user.email}</p>
                <p>User Role: {user.role_id}</p>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Search and Filter */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 mb-6 flex items-center gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by guest, room, or request..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
            >
              {REQUEST_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
            <Card>
              <div className="p-3 md:p-6">
                <p className="text-[10px] md:text-sm text-gray-500 mb-1">Pending</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <p className="text-[10px] md:text-sm text-gray-500 mb-1">In Progress</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <p className="text-[10px] md:text-sm text-gray-500 mb-1">Completed Today</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.completedToday}</p>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <p className="text-[10px] md:text-sm text-gray-500 mb-1">Avg Response</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">
                  {stats.avgResponseMinutes > 0 
                    ? `${stats.avgResponseMinutes}m` 
                    : '—'}
                </p>
              </div>
            </Card>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-colors ${
                activeFilter === 'pending'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Pending ({filteredCounts.pendingCount || stats.pending})
            </button>
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-colors ${
                activeFilter === 'active'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Active ({filteredCounts.activeCount || stats.inProgress})
            </button>
            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-colors ${
                activeFilter === 'completed'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Completed ({filteredCounts.completedCount || stats.completedToday})
            </button>
          </div>

          {/* Service Requests List */}
          {requests.length === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-sm md:text-base text-gray-500">
                  {searchQuery || selectedType !== 'all' 
                    ? 'No service requests match your filters.' 
                    : 'No service requests found.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => {
                const typeIcon = TYPE_ICONS[request.request_type] || TYPE_ICONS.other
                const priorityClass = PRIORITY_COLORS[request.priority] || PRIORITY_COLORS.medium
                
                const statusColors: Record<string, string> = {
                  pending: 'bg-gray-100 text-gray-700',
                  in_progress: 'bg-blue-100 text-blue-700',
                  completed: 'bg-green-100 text-green-700',
                  cancelled: 'bg-red-100 text-red-700',
                }
                const statusLabel: Record<string, string> = {
                  pending: 'PENDING',
                  in_progress: 'IN PROGRESS',
                  completed: 'COMPLETED',
                  cancelled: 'CANCELLED',
                }
                const requestTypeLabel: Record<string, string> = {
                  food: 'ROOM SERVICE',
                  housekeeping: 'HOUSEKEEPING',
                  maintenance: 'MAINTENANCE',
                  concierge: 'CONCIERGE',
                  other: 'OTHER',
                }
                
                return (
                  <Card 
                    key={request.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleOpenDetailsModal(request)}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Compact Icon */}
                        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-700">
                          {typeIcon}
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {request.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityClass} flex-shrink-0`}>
                              {request.priority}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 flex-shrink-0`}>
                              {requestTypeLabel[request.request_type] || request.request_type.toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[request.status] || statusColors.pending} flex-shrink-0`}>
                              {statusLabel[request.status] || request.status.toUpperCase()}
                            </span>
                          </div>
                          
                          {/* Description */}
                          {request.description && (
                            <p className="text-xs text-gray-600 mb-1.5 line-clamp-2">
                              {request.description}
                            </p>
                          )}
                          
                          {/* Compact metadata row */}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {request.room_number && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                {request.room_number}
                              </span>
                            )}
                            {request.guest_name && (
                              <span className="truncate">Guest: {request.guest_name}</span>
                            )}
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatTime(request.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Compact Action Buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {(request.status === 'pending' || request.status === 'in_progress') && (
                            <>
                              <button
                                onClick={() => handleOpenAssignModal(request)}
                                disabled={updateRequestMutation.isPending}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                title="Assign"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEdit(request)}
                                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </>
                          )}

                          {request.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusChange(request.id, 'completed')}
                              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                              title="Mark as Complete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
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

      {/* Assign Staff Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={handleCloseAssignModal}
        title=""
        size="md"
      >
        {selectedRequest && (
          <div className="relative">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Assign Staff Member</h2>
              <p className="text-sm text-gray-600">{selectedRequest.title} • Room {selectedRequest.room_number || 'N/A'}</p>
            </div>

            <div className="relative mb-6" ref={staffDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Staff Member</label>
              
              {loadingStaff ? (
                <div className="py-8 text-center text-sm text-gray-500">Loading staff members...</div>
              ) : staffMembers.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">No staff members available for this hotel</div>
              ) : (
                <>
                  {/* Search Input */}
                  <div className="mb-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        placeholder="Search by name or role..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Staff List */}
                  <div className="border border-gray-300 rounded-lg bg-white max-h-80 overflow-y-auto">
                    {(() => {
                      const filteredStaff = staffMembers.filter(staff => {
                        const staffName = extractTextFromJson(staff.name).toLowerCase()
                        const roleName = getRoleDisplayName(staff.role_id || '').toLowerCase()
                        const query = staffSearchQuery.toLowerCase()
                        return staffName.includes(query) || roleName.includes(query)
                      })

                      if (filteredStaff.length === 0) {
                        return (
                          <div className="px-4 py-8 text-sm text-gray-500 text-center">
                            No staff members match your search
                          </div>
                        )
                      }

                      return filteredStaff.map((staff) => {
                        const staffName = extractTextFromJson(staff.name)
                        const isSelected = selectedStaffId === staff.id
                        
                        return (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => {
                              setSelectedStaffId(staff.id)
                              setStaffSearchQuery('')
                            }}
                            className={`w-full px-4 py-3 text-left border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                              isSelected ? 'bg-gray-50 border-l-4 border-l-gray-900' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm ${isSelected ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}>
                                  {staffName}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {getRoleDisplayName(staff.role_id || '')}
                                </div>
                              </div>
                              {isSelected && (
                                <svg className="w-5 h-5 text-gray-900 flex-shrink-0 ml-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
                      })
                    })()}
                  </div>

                  {/* Selected Staff Display */}
                  {selectedStaffId && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Selected Staff</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {(() => {
                              const selectedStaff = staffMembers.find(s => s.id === selectedStaffId)
                              return selectedStaff ? extractTextFromJson(selectedStaff.name) : ''
                            })()}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {(() => {
                              const selectedStaff = staffMembers.find(s => s.id === selectedStaffId)
                              return selectedStaff ? getRoleDisplayName(selectedStaff.role_id || '') : ''
                            })()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedStaffId('')}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCloseAssignModal}
                disabled={updateRequestMutation.isPending}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignToStaff}
                disabled={!selectedStaffId || updateRequestMutation.isPending}
                className="px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateRequestMutation.isPending ? 'Assigning...' : 'Assign Staff'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Request Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetailsModal}
        title=""
        size="md"
      >
        {selectedRequest && (
          <div>
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-start gap-4 mb-4">
                {selectedRequest.request_type && TYPE_ICONS[selectedRequest.request_type] && (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700 flex-shrink-0">
                    {TYPE_ICONS[selectedRequest.request_type]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{selectedRequest.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[selectedRequest.priority] || PRIORITY_COLORS.medium}`}>
                      {selectedRequest.priority?.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {(REQUEST_TYPES.find(t => t.id === selectedRequest.request_type && t.id !== 'all')?.name || selectedRequest.request_type).toUpperCase().replace(' & ', ' ')}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedRequest.status === 'pending' ? 'bg-gray-900 text-white' :
                      selectedRequest.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      selectedRequest.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedRequest.status === 'pending' ? 'PENDING' :
                       selectedRequest.status === 'in_progress' ? 'IN PROGRESS' :
                       selectedRequest.status === 'completed' ? 'COMPLETED' :
                       selectedRequest.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Guest</label>
                <p className="text-sm text-gray-900 font-medium">{selectedRequest.guest_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Room</label>
                <p className="text-sm text-gray-900 font-medium">{selectedRequest.room_number || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Requested</label>
                <p className="text-sm text-gray-900 font-medium">
                  {new Date(selectedRequest.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Assigned To</label>
                <p className={`text-sm font-medium ${selectedRequest.assigned_staff_name ? 'text-gray-900' : 'text-gray-400'}`}>
                  {selectedRequest.assigned_staff_name || 'Unassigned'}
                </p>
              </div>
            </div>

            {selectedRequest.description && (
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Description</label>
                <p className="text-sm text-gray-900 leading-relaxed">{selectedRequest.description}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              {selectedRequest.status === 'in_progress' ? (
                <>
                  <button
                    type="button"
                    onClick={handleCloseDetailsModal}
                    className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleStatusChange(selectedRequest.id, 'completed')
                      handleCloseDetailsModal()
                    }}
                    className="px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark Complete
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCloseDetailsModal}
                    className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseDetailsModal()
                      handleOpenAssignModal(selectedRequest)
                    }}
                    className="px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
                  >
                    Assign Staff
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

