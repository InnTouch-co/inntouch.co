'use client'

import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/database/users'
import { getHotels } from '@/lib/database/hotels'
import { supabase } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { UserForm } from './UserForm'
import { extractTextFromJson } from '@/lib/utils/json-text'
import type { User } from '@/types/database'

export function UsersList() {
  const [users, setUsers] = useState<User[]>([])
  const [hotels, setHotels] = useState<any[]>([])
  const [userHotels, setUserHotels] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const loadUsers = async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError('')
      
      const [usersData, hotelsData] = await Promise.all([
        getUsers(),
        getHotels(),
      ])
      setUsers(usersData || [])
      setHotels(hotelsData || [])
      
      // Load hotel assignments for each user (more efficient batch query)
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

  const getUserHotelsNames = (userId: string): string => {
    const hotelIds = userHotels[userId] || []
    if (hotelIds.length === 0) return '-'
    const names = hotelIds.map(id => {
      const hotel = hotels.find(h => h.id === id)
      return hotel ? extractTextFromJson(hotel.title) : ''
    }).filter(Boolean)
    return names.join(', ') || '-'
  }

  const handleCreate = async (userData: any, hotelIds?: string[]) => {
    try {
      // Use API route to create user with email invitation
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          hotelIds,
          role_id: 'hotel_admin', // Default role for created users
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }

      const result = await response.json()
      
      // Show success message with email info (for development)
      if (result.emailContent) {
        console.log('User created! Email invitation:', {
          to: result.emailContent.to,
          subject: result.emailContent.subject,
          // Password would be in emailContent, but we log it for dev
          password: 'Check server logs for generated password',
        })
        alert(`User created successfully! An invitation email has been sent to ${result.user.email}`)
      }
      
      setIsModalOpen(false)
      // Force refresh after create
      setRefreshKey(Date.now())
      await loadUsers(true)
    } catch (err) {
      throw err
    }
  }

  const handleUpdate = async (userData: any, hotelIds?: string[]) => {
    if (!editingUser) return
    try {
      await updateUser(editingUser.id, userData)
      
        // Update hotel assignments
        if (hotelIds !== undefined) {
          const { addUserToHotel, removeUserFromHotel } = await import('@/lib/database/hotel-users')
        
        // Get current hotel assignments
        const { data: currentAssignments } = await supabase
          .from('hotel_users')
          .select('hotel_id')
          .eq('user_id', editingUser.id)
          .eq('is_deleted', false)
        
        const currentHotelIds = currentAssignments?.map((a: any) => a.hotel_id) || []
        
        // Remove users from hotels that are no longer selected
        const toRemove = currentHotelIds.filter((id: string) => !hotelIds.includes(id))
        await Promise.all(
          toRemove.map((hotelId: string) => removeUserFromHotel(hotelId, editingUser.id))
        )
        
        // Add user to newly selected hotels
        const toAdd = hotelIds.filter((id: string) => !currentHotelIds.includes(id))
        await Promise.all(
          toAdd.map((hotelId: string) => addUserToHotel(hotelId, editingUser.id))
        )
      }
      
      setIsModalOpen(false)
      setEditingUser(null)
      // Force refresh after update
      setRefreshKey(Date.now())
      await loadUsers(true)
    } catch (err) {
      throw err
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      setDeletingUserId(id)
      setError('')
      
      // Delete the user
      await deleteUser(id)
      
      // Wait a moment to ensure database update completes
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force refresh by updating refresh key
      setRefreshKey(Date.now())
      
      // Also call loadUsers directly to ensure immediate update
      await loadUsers(true)
      
      // Remove from local state immediately for better UX
      setUsers(prevUsers => prevUsers.filter(user => user.id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user'
      setError(errorMessage)
      console.error('Error deleting user:', err)
    } finally {
      setDeletingUserId(null)
    }
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Users</h2>
          <p className="text-sm text-gray-500">Manage user accounts, roles, and permissions.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setRefreshKey(Date.now())
              loadUsers(true)
            }}
            className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg flex items-center justify-center transition-colors"
            title="Refresh"
            disabled={loading}
          >
            <span className="text-xl">🔄</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center justify-center"
            title="Add User"
          >
            <span className="text-xl">➕</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <p className="text-gray-500 text-center">No users found. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hotels
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {extractTextFromJson(user.name)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {user.email || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs">
                      {getUserHotelsNames(user.id)}
                    </div>
                    {userHotels[user.id]?.length > 0 && (
                      <div className="text-xs text-gray-400 mt-1">
                        {userHotels[user.id].length} hotel{userHotels[user.id].length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <span className="text-lg">✏️</span>
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={deletingUserId === user.id}
                        className={`p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors ${
                          deletingUserId === user.id ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                      >
                        <span className="text-lg">
                          {deletingUserId === user.id ? '⏳' : '🗑️'}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingUser ? 'Edit User' : 'Create User'}
      >
        <UserForm
          user={editingUser || undefined}
          onSubmit={editingUser ? handleUpdate : handleCreate}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  )
}

