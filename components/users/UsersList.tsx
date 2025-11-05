'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUsers } from '@/lib/database/users'
import { getHotels } from '@/lib/database/hotels'
import { supabase } from '@/lib/supabase/client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { getRoleDisplayName } from '@/lib/auth/roles'
import type { User } from '@/types/database'

type UserWithHotels = User & { 
  hotel_names?: string
  hotel_organization?: string
}

export function UsersList() {
  const router = useRouter()
  const [users, setUsers] = useState<UserWithHotels[]>([])
  const [hotels, setHotels] = useState<any[]>([])
  const [userHotels, setUserHotels] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const loadUsers = async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError('')
      
      const [usersData, hotelsData] = await Promise.all([
        getUsers(),
        getHotels(),
      ])
      setHotels(hotelsData || [])
      
      // Load hotel assignments for each user
      const assignments: Record<string, string[]> = {}
      
      // Get all hotel_users at once
      const { data: allHotelUsers, error: hotelUsersError } = await supabase
        .from('hotel_users')
        .select('hotel_id, user_id')
        .eq('is_deleted', false)
      
      if (!hotelUsersError && allHotelUsers) {
        for (const user of usersData) {
          const userHotelIds = allHotelUsers
            .filter((hu: any) => hu.user_id === user.id)
            .map((hu: any) => hu.hotel_id)
          assignments[user.id] = userHotelIds
        }
      }
      
      setUserHotels(assignments)
      
      // Enhance users with hotel/organization info
      const usersWithHotels = usersData.map(user => {
        const hotelIds = assignments[user.id] || []
        const userHotelNames = hotelIds.map(id => {
          const hotel = hotelsData.find(h => h.id === id)
          return hotel ? extractTextFromJson(hotel.title) : ''
        }).filter(Boolean)
        
        // Get organization from first hotel
        const firstHotel = hotelsData.find(h => hotelIds.includes(h.id))
        let organization = 'No organization'
        if (firstHotel) {
          const siteParts = firstHotel.site?.split('-') || []
          if (siteParts.length >= 2) {
            organization = siteParts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') + ' International'
          } else {
            organization = extractTextFromJson(firstHotel.title) + ' Group'
          }
        }
        
        return {
          ...user,
          hotel_names: userHotelNames.join(', ') || 'No properties',
          hotel_organization: organization,
        }
      })
      
      setUsers(usersWithHotels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [refreshKey])

  const handleDelete = async (user: User) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete them from authentication.')) return
    
    try {
      setDeletingUserId(user.id)
      setError('')
      
      // Call API route to delete from both users table and Auth
      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      // Immediately remove from UI and refresh
      setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id))
      setRefreshKey(Date.now())
      
      await new Promise(resolve => setTimeout(resolve, 300))
      await loadUsers(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user'
      setError(errorMessage)
      console.error('Error deleting user:', err)
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleEdit = (user: User) => {
    router.push(`/users/${user.id}/edit`)
  }

  const handleView = (user: User) => {
    router.push(`/users/${user.id}`)
  }

  const handleAdd = () => {
    router.push('/users/new')
  }

  // Calculate statistics
  const totalUsers = users.length
  const activeUsers = users.filter(user => user.active).length
  const admins = users.filter(user => {
    const role = user.role_id || ''
    return role === 'super_admin' || role === 'hotel_admin' || role === 'super_admin'
  }).length
  const staff = users.filter(user => {
    const role = user.role_id || ''
    return role === 'staff' || role === 'front_desk' || role === 'housekeeping' || role === 'maintenance'
  }).length

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const name = extractTextFromJson(user.name).toLowerCase()
    const email = (user.email || '').toLowerCase()
    const organization = (user.hotel_organization || '').toLowerCase()
    const hotels = (user.hotel_names || '').toLowerCase()
    
    return name.includes(query) || 
           email.includes(query) || 
           organization.includes(query) ||
           hotels.includes(query)
  })

  // Get user initials for avatar
  const getUserInitials = (user: User): string => {
    const name = extractTextFromJson(user.name)
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Get role tag info
  const getRoleTag = (user: User) => {
    const role = user.role_id || 'unknown'
    
    if (role === 'super_admin') {
      return { label: 'Admin', color: 'bg-red-100 text-red-800' }
    }
    if (role === 'hotel_admin') {
      return { label: 'Hotel Admin', color: 'bg-blue-100 text-blue-800' }
    }
    if (role === 'staff' || role === 'front_desk' || role === 'housekeeping' || role === 'maintenance') {
      return { label: 'Staff', color: 'bg-orange-100 text-orange-800' }
    }
    return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' }
  }

  // Check if user is staff
  const isStaff = (user: User): boolean => {
    const role = user.role_id || ''
    return ['staff', 'front_desk', 'housekeeping', 'maintenance'].includes(role)
  }

  // Format last active (using created_at as fallback since we don't have last_active)
  const getLastActive = (user: User): string => {
    // Since we don't have a last_active field, we'll use created_at
    // In a real app, you'd track this separately
    const date = new Date(user.created_at)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">Users</h2>
          <p className="text-xs md:text-sm text-gray-500">Manage users across all organizations and properties.</p>
        </div>
        <button 
          onClick={handleAdd}
          className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add User</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Total Users</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">{totalUsers}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Active Users</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">{activeUsers}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Admins</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">{admins}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Staff</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">{staff}</p>
            </div>
            <div className="w-8 h-8 md:w-12 md:h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex items-center gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name, email, phone, organization, or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium text-gray-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filters</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <p className="text-gray-500 text-center">
            {searchQuery ? 'No users found matching your search.' : 'No users found. Create one to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const roleTag = getRoleTag(user)
            const initials = getUserInitials(user)
            
            return (
              <div key={user.id} className="bg-white rounded-lg border border-gray-200 p-6 flex items-start justify-between hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">{initials}</span>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-sm md:text-base font-semibold text-gray-900">
                        {extractTextFromJson(user.name)}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleTag.color}`}>
                        {roleTag.label}
                      </span>
                      {user.active === 1 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Deactivated
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs md:text-sm text-gray-600">
                      {user.email && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{user.email}</span>
                        </div>
                      )}
                      
                      {/* Phone field - currently not in database schema, but ready if added */}
                      {(user as any).phone && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{(user as any).phone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Last active: {getLastActive(user)}</span>
                      </div>

                      {(user.hotel_organization || (isStaff(user) && user.role_id)) && (
                        <div className="flex items-center gap-2 mt-2">
                          {user.hotel_organization && (
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          )}
                          <span className="text-xs md:text-sm text-gray-600 flex items-center gap-1.5">
                            {user.hotel_organization && <span>{user.hotel_organization}</span>}
                            {isStaff(user) && user.role_id && (
                              <>
                                {user.hotel_organization && <span className="text-gray-300">|</span>}
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className={user.hotel_organization ? 'text-gray-500' : ''}>
                                  {getRoleDisplayName(user.role_id)}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleView(user)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2 font-medium transition-colors"
                    title="View Details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEdit(user)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2 font-medium transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    disabled={deletingUserId === user.id}
                    className={`p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ${
                      deletingUserId === user.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title={deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
