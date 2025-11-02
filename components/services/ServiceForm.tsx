'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { getHotels } from '@/lib/database/hotels'
import { extractTextFromJson, textToJson } from '@/lib/utils/json-text'
import type { Service, ServiceInsert } from '@/types/database'

interface ServiceFormProps {
  service?: Service
  onSubmit: (service: ServiceInsert | Partial<ServiceInsert>) => Promise<void>
  onCancel: () => void
}

export function ServiceForm({ service, onSubmit, onCancel }: ServiceFormProps) {
  const [hotels, setHotels] = useState<any[]>([])
  const [formData, setFormData] = useState({
    hotel_id: service?.hotel_id || '',
    title: service?.title ? extractTextFromJson(service.title) : '',
    sort: service?.sort?.toString() || '100',
    active: service?.active ?? 1,
    sub_id: service?.sub_id?.toString() || '',
    initiator_id: service?.initiator_id?.toString() || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadHotels()
  }, [])

  const loadHotels = async () => {
    try {
      const data = await getHotels()
      setHotels(data)
    } catch (err) {
      console.error('Failed to load hotels:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await onSubmit({
        hotel_id: formData.hotel_id,
        title: formData.title ? textToJson(formData.title) : null,
        sort: parseInt(formData.sort),
        active: formData.active,
        sub_id: formData.sub_id ? parseInt(formData.sub_id) : null,
        initiator_id: formData.initiator_id ? parseInt(formData.initiator_id) : null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hotel *
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formData.hotel_id}
          onChange={(e) => setFormData({ ...formData, hotel_id: e.target.value })}
          required
        >
          <option value="">Select a hotel</option>
          {hotels.map((hotel) => (
            <option key={hotel.id} value={hotel.id}>
              {extractTextFromJson(hotel.title)}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Service Name"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Enter service name"
      />

      <Input
        label="Sort Order"
        type="number"
        value={formData.sort}
        onChange={(e) => setFormData({ ...formData, sort: e.target.value })}
      />

      <Input
        label="Sub ID (Section ID)"
        type="number"
        value={formData.sub_id}
        onChange={(e) => setFormData({ ...formData, sub_id: e.target.value })}
      />

      <Input
        label="Initiator ID"
        type="number"
        value={formData.initiator_id}
        onChange={(e) => setFormData({ ...formData, initiator_id: e.target.value })}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Active
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formData.active}
          onChange={(e) => setFormData({ ...formData, active: Number(e.target.value) })}
        >
          <option value={1}>Active</option>
          <option value={0}>Inactive</option>
        </select>
      </div>

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : service ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

