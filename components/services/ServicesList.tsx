'use client'

import { useState, useEffect } from 'react'
import { getServices, createService, updateService, deleteService } from '@/lib/database/services'
import { getHotels } from '@/lib/database/hotels'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ServiceForm } from './ServiceForm'
import { extractTextFromJson } from '@/lib/utils/json-text'
import type { Service } from '@/types/database'

export function ServicesList() {
  const [services, setServices] = useState<Service[]>([])
  const [hotels, setHotels] = useState<any[]>([])
  const [selectedHotelId, setSelectedHotelId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadHotels()
    loadServices()
  }, [])

  useEffect(() => {
    if (selectedHotelId || selectedHotelId === '') {
      loadServices(selectedHotelId || undefined)
    }
  }, [selectedHotelId])

  const loadHotels = async () => {
    try {
      const data = await getHotels()
      setHotels(data)
    } catch (err) {
      console.error('Failed to load hotels:', err)
    }
  }

  const loadServices = async (hotelId?: string) => {
    try {
      setLoading(true)
      const data = await getServices(hotelId || undefined)
      setServices(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (serviceData: any) => {
    try {
      await createService(serviceData)
      setIsModalOpen(false)
      loadServices(selectedHotelId || undefined)
    } catch (err) {
      throw err
    }
  }

  const handleUpdate = async (serviceData: any) => {
    if (!editingService) return
    try {
      await updateService(editingService.id, serviceData)
      setIsModalOpen(false)
      setEditingService(null)
      loadServices(selectedHotelId || undefined)
    } catch (err) {
      throw err
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    
    try {
      await deleteService(id)
      loadServices(selectedHotelId || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete service')
    }
  }

  const openEditModal = (service: Service) => {
    setEditingService(service)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingService(null)
  }

  const getHotelName = (hotelId: string) => {
    const hotel = hotels.find(h => h.id === hotelId)
    if (!hotel) return hotelId
    return extractTextFromJson(hotel.title)
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Services</h2>
          <p className="text-sm text-gray-500">Manage services and service configurations.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-gray-900 text-white hover:bg-gray-800">
          + Add Service
        </Button>
      </div>

      <div className="flex gap-4 items-center mb-6">
        <label className="text-sm font-medium text-gray-700">Filter by Hotel:</label>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedHotelId}
          onChange={(e) => setSelectedHotelId(e.target.value)}
        >
          <option value="">All Hotels</option>
          {hotels.map((hotel) => (
            <option key={hotel.id} value={hotel.id}>
              {extractTextFromJson(hotel.title)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-8">
          <p className="text-gray-500 text-center">No services found. Create one to get started.</p>
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
                  Hotel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sort
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
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {service.title ? extractTextFromJson(service.title) : 'Untitled Service'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {getHotelName(service.hotel_id)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {service.sub_id || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {service.sort}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      service.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {service.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(service.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(service)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(service.id)}
                      >
                        Delete
                      </Button>
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
        title={editingService ? 'Edit Service' : 'Create Service'}
      >
        <ServiceForm
          service={editingService || undefined}
          onSubmit={editingService ? handleUpdate : handleCreate}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  )
}

