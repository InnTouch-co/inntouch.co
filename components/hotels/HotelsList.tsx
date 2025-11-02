'use client'

import { useState, useEffect } from 'react'
import { getHotels, createHotel, updateHotel, deleteHotel } from '@/lib/database/hotels'
import { Modal } from '@/components/ui/Modal'
import { HotelForm } from './HotelForm'
import { extractTextFromJson } from '@/lib/utils/json-text'
import type { Hotel } from '@/types/database'

export function HotelsList() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null)
  const [error, setError] = useState('')

  const loadHotels = async () => {
    try {
      setLoading(true)
      const data = await getHotels()
      setHotels(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hotels')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHotels()
  }, [])

  const handleCreate = async (hotelData: any, userIds?: string[]) => {
    try {
      const newHotel = await createHotel(hotelData)
      
      // Add users to hotel if provided
      if (userIds && userIds.length > 0 && newHotel.id) {
        const { addUserToHotel } = await import('@/lib/database/hotel-users')
        await Promise.all(
          userIds.map(userId => addUserToHotel(newHotel.id, userId))
        )
      }
      
      setIsModalOpen(false)
      loadHotels()
    } catch (err) {
      throw err
    }
  }

  const handleUpdate = async (hotelData: any, userIds?: string[]) => {
    if (!editingHotel) return
    try {
      await updateHotel(editingHotel.id, hotelData)
      
      // Update hotel users
      if (userIds !== undefined) {
        const { getHotelUsers, addUserToHotel, removeUserFromHotel } = await import('@/lib/database/hotel-users')
        const currentHotelUsers = await getHotelUsers(editingHotel.id)
        const currentUserIds = currentHotelUsers.map((hu: any) => hu.user_id)
        
        // Remove users that are no longer selected
        const toRemove = currentUserIds.filter((id: string) => !userIds.includes(id))
        await Promise.all(
          toRemove.map((userId: string) => removeUserFromHotel(editingHotel.id, userId))
        )
        
        // Add newly selected users
        const toAdd = userIds.filter((id: string) => !currentUserIds.includes(id))
        await Promise.all(
          toAdd.map((userId: string) => addUserToHotel(editingHotel.id, userId))
        )
      }
      
      setIsModalOpen(false)
      setEditingHotel(null)
      loadHotels()
    } catch (err) {
      throw err
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hotel?')) return
    
    try {
      await deleteHotel(id)
      loadHotels()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete hotel')
    }
  }

  const openEditModal = (hotel: Hotel) => {
    setEditingHotel(hotel)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingHotel(null)
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Hotels</h2>
          <p className="text-sm text-gray-500">Manage all hotels and their settings.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-lg flex items-center justify-center"
          title="Add Hotel"
        >
          <span className="text-xl">➕</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : hotels.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-8">
          <p className="text-gray-500 text-center">No hotels found. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hotel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
              {hotels.map((hotel, index) => {
                const icons = ['👑', '🌴', '🏢']
                const plans = ['enterprise', 'professional', 'starter']
                const hotelWithCount = hotel as typeof hotel & { user_count?: number }
                return (
                  <tr key={hotel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                          index === 1 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                          'bg-gradient-to-br from-purple-400 to-purple-600'
                        }`}>
                          <span className="text-white text-lg">{icons[index] || '🏢'}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {extractTextFromJson(hotel.title)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {hotel.site || 'No site configured'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        index === 0 ? 'bg-gray-900 text-white' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {plans[index] || 'starter'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{hotelWithCount.user_count ?? 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        hotel.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {hotel.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(hotel)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <span className="text-lg">✏️</span>
                        </button>
                        <button
                          onClick={() => handleDelete(hotel.id)}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <span className="text-lg">🗑️</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingHotel ? 'Edit Hotel' : 'Create Hotel'}
      >
        <HotelForm
          hotel={editingHotel || undefined}
          onSubmit={editingHotel ? handleUpdate : handleCreate}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  )
}

