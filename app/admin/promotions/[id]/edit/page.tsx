'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import { supabase } from '@/lib/supabase/client'
import { useHotelTimezone, getHotelTime } from '@/lib/hooks/useHotelTimezone'

export default function EditPromotionPage() {
  const router = useRouter()
  const params = useParams()
  const promotionId = params.id as string
  const hotelId = useSelectedHotel()
  const hotelTimezone = useHotelTimezone(hotelId)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Helper function to extract storage path from Supabase URL
  const extractStoragePath = (url: string): string | null => {
    try {
      // URL format: https://...supabase.co/storage/v1/object/public/services/{hotelId}/promotions/{fileName}
      const urlParts = url.split('/')
      
      // Find the index of 'services' in the URL
      const servicesIndex = urlParts.findIndex(part => part === 'services')
      if (servicesIndex === -1) {
        logger.warn('Could not find "services" in URL:', url)
        return null
      }
      
      // Get everything after 'services' - this is the storage path
      const pathParts = urlParts.slice(servicesIndex + 1)
      const storagePath = pathParts.join('/')
      
      logger.info('Extracted storage path:', { url, storagePath })
      return storagePath
    } catch (error) {
      logger.error('Error extracting storage path:', error)
      return null
    }
  }

  // Helper function to delete old image from Supabase storage
  const deleteOldImage = async (oldImageUrl: string | null) => {
    if (!oldImageUrl) {
      logger.info('No old image URL provided, skipping deletion')
      return
    }

    // Skip deletion for default/placeholder images (not in Supabase storage)
    if (oldImageUrl.includes('pexels.com') || oldImageUrl.includes('default') || !oldImageUrl.includes('supabase')) {
      logger.info('Skipping deletion - image is not in Supabase storage:', oldImageUrl)
      return
    }

    try {
      const storagePath = extractStoragePath(oldImageUrl)
      if (!storagePath) {
        logger.warn('Could not extract storage path from URL, skipping deletion:', oldImageUrl)
        return
      }

      // Only delete if it's in the hotelId/promotions folder (custom upload)
      if (storagePath.startsWith(`${hotelId}/promotions/`)) {
        logger.info('Deleting old image from storage:', storagePath)
        const { error } = await supabase.storage
          .from('services')
          .remove([storagePath])

        if (error) {
          logger.error('Error deleting old image:', error)
          toast.error('Could not delete old image: ' + error.message, { duration: 3000 })
        } else {
          logger.info('Successfully deleted old image:', storagePath)
        }
      }
    } catch (error: any) {
      logger.error('Error deleting old image:', error)
      toast.error('Could not delete old image: ' + (error.message || 'Unknown error'), { duration: 3000 })
    }
  }

  const { data: promotion, isLoading } = useQuery({
    queryKey: ['promotion', promotionId],
    queryFn: async () => {
      const response = await fetch(`/api/promotions/${promotionId}`)
      if (!response.ok) throw new Error('Failed to fetch promotion')
      const data = await response.json()
      return data.promotion
    },
  })

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed_amount',
    discount_value: 0,
    start_time: '',
    end_time: '',
    is_active: true,
    show_banner: true,
    show_always: false,
    image_url: '',
    applies_to_all_products: false,
    applies_to_service_types: [] as string[],
  })

  const serviceTypes = [
    { id: 'restaurant', label: 'Restaurant' },
    { id: 'bar', label: 'Bar' },
    { id: 'spa', label: 'Spa & Wellness' },
    { id: 'fitness', label: 'Fitness Center' },
    { id: 'pool', label: 'Pool' },
    { id: 'laundry', label: 'Laundry Service' },
    { id: 'concierge', label: 'Concierge' },
    { id: 'roomservice', label: 'Room Service' },
    { id: 'additional', label: 'Additional Services' },
    { id: 'other', label: 'Other' },
  ]

  const handleServiceTypeToggle = (serviceType: string) => {
    setFormData(prev => {
      const currentTypes = prev.applies_to_service_types || []
      const newTypes = currentTypes.includes(serviceType)
        ? currentTypes.filter(t => t !== serviceType)
        : [...currentTypes, serviceType]
      return {
        ...prev,
        applies_to_service_types: newTypes,
        applies_to_all_products: false, // Uncheck "all products" when selecting specific types
      }
    })
  }

  useEffect(() => {
    if (promotion) {
      // Extract time without seconds for HTML5 time input (HH:MM format)
      const startTime = promotion.start_time 
        ? (promotion.start_time.includes(':') ? promotion.start_time.slice(0, 5) : '')
        : ''
      const endTime = promotion.end_time 
        ? (promotion.end_time.includes(':') ? promotion.end_time.slice(0, 5) : '')
        : ''

      setFormData({
        title: promotion.title || '',
        description: promotion.description || '',
        short_description: promotion.short_description || '',
        discount_type: promotion.discount_type || 'percentage',
        discount_value: promotion.discount_value || 0,
        start_time: startTime,
        end_time: endTime,
        is_active: promotion.is_active ?? true,
        show_banner: promotion.show_banner ?? true,
        show_always: promotion.show_always ?? false,
        image_url: promotion.image_url || '',
        applies_to_all_products: promotion.applies_to_all_products ?? false,
        applies_to_service_types: promotion.applies_to_service_types || [],
      })
      setPreviewImage(promotion.image_url || null)
    }
  }, [promotion])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('Image must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `promotion-${Date.now()}.${fileExt}`
      const filePath = `${hotelId}/promotions/${fileName}`

      // Delete old image if exists (using helper function)
      if (promotion?.image_url) {
        await deleteOldImage(promotion.image_url)
      }

      const { error: uploadError } = await supabase.storage
        .from('services')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage
        .from('services')
        .getPublicUrl(filePath)

      setPreviewImage(data.publicUrl)
      setFormData({ ...formData, image_url: data.publicUrl })
      toast.success('Image uploaded successfully')
    } catch (error: any) {
      logger.error('Error uploading image:', error)
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    setPreviewImage(null)
    setFormData({ ...formData, image_url: '' })
  }

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Delete old image if image_url is being changed
      const oldImageUrl = promotion?.image_url
      const newImageUrl = data.image_url
      
      if (oldImageUrl && newImageUrl && oldImageUrl !== newImageUrl) {
        // New image uploaded, delete old one
        await deleteOldImage(oldImageUrl)
      }

      // Prepare data for API - convert empty strings to null, add :00 to time fields if they exist
      const apiData = {
        ...data,
        start_time: data.start_time && data.start_time.trim() ? (data.start_time.includes(':00') ? data.start_time : data.start_time + ':00') : null,
        end_time: data.end_time && data.end_time.trim() ? (data.end_time.includes(':00') ? data.end_time : data.end_time + ':00') : null,
      }

      const response = await fetch(`/api/promotions/${promotionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData), // Don't send hotel_id, it's not needed for updates
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update promotion')
      }
      
      return response.json()
    },
    onSuccess: () => {
      toast.success('Promotion updated successfully')
      router.push('/admin/promotions')
    },
    onError: (error: any) => {
      logger.error('Error updating promotion:', error)
      toast.error(error.message || 'Failed to update promotion')
    },
  })

  if (!hotelId) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Please select a hotel first</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (!promotion) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Promotion not found</p>
        <Button onClick={() => router.push('/admin/promotions')} className="mt-4">
          Back to Promotions
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/promotions')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Promotions
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Promotion</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image *</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {previewImage ? (
            <div className="relative">
              <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-300">
                <img
                  src={previewImage}
                  alt="Promotion banner"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                disabled={uploading}
                className="mt-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Replace Image'}
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-1">Click to upload banner image</p>
              <p className="text-xs text-gray-500">Recommended: Square (1:1) aspect ratio, max 5MB</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
          <input
            type="text"
            value={formData.short_description}
            onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
            <select
              value={formData.discount_type}
              onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
            <input
              type="number"
              step="0.01"
              value={formData.discount_value}
              onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time (HH:MM)
              <span className="text-xs text-gray-500 font-normal ml-1">
                (Hotel timezone: {hotelTimezone})
              </span>
            </label>
            <input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="mt-1 text-xs text-gray-500">
              Current time: {getHotelTime(hotelTimezone)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time (HH:MM)
              <span className="text-xs text-gray-500 font-normal ml-1">
                (Hotel timezone: {hotelTimezone})
              </span>
            </label>
            <input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="mt-1 text-xs text-gray-500">
              Current time: {getHotelTime(hotelTimezone)}
            </p>
          </div>
        </div>

        {/* Apply To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Apply To</label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.applies_to_all_products}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    applies_to_all_products: e.target.checked,
                    applies_to_service_types: e.target.checked ? [] : formData.applies_to_service_types,
                  })
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">All Products/Services</span>
            </label>
            {!formData.applies_to_all_products && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Or select specific service types:</p>
                <div className="grid grid-cols-2 gap-2">
                  {serviceTypes.map((type) => (
                    <label key={type.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.applies_to_service_types.includes(type.id)}
                        onChange={() => handleServiceTypeToggle(type.id)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.show_banner}
              onChange={(e) => setFormData({ ...formData, show_banner: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Show Banner</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.show_always}
              onChange={(e) => setFormData({ ...formData, show_always: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Show Always (ignore time/date restrictions)</span>
          </label>
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <Button
            onClick={() => {
              if (!formData.image_url) {
                toast.error('Please upload a banner image')
                return
              }
              mutation.mutate(formData)
            }}
            disabled={mutation.isPending || !formData.image_url}
          >
            {mutation.isPending ? 'Updating...' : 'Update Promotion'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/promotions')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

