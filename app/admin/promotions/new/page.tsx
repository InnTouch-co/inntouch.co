'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Upload, X, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import { supabase } from '@/lib/supabase/client'
import { getServices } from '@/lib/database/services'
import type { Service } from '@/types/database'
import { useHotelTimezone, getHotelTime } from '@/lib/hooks/useHotelTimezone'

export default function NewPromotionPage() {
  const router = useRouter()
  const hotelId = useSelectedHotel()
  const hotelTimezone = useHotelTimezone(hotelId)
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
    menu_item_discounts: [] as Array<{ service_id: string; service_name: string; menu_item_name: string; discount_type: 'percentage' | 'fixed_amount'; discount_value: number; max_discount_amount?: number }>,
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
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set())

  // Fetch services for menu item selection
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', hotelId],
    queryFn: () => getServices(hotelId),
    enabled: !!hotelId,
  })

  // Filter services that have menus (restaurant, bar)
  const servicesWithMenus = services.filter((service: Service) => {
    const serviceType = service.service_type
    if (serviceType !== 'restaurant' && serviceType !== 'bar') return false
    if (!service.menu || typeof service.menu !== 'object') return false
    
    const menu = service.menu as any
    
    // Check if service has menu items or drinks
    if (serviceType === 'restaurant') {
      // Restaurant menu structure: { categories: [...], items: [...] }
      return menu.items && Array.isArray(menu.items) && menu.items.length > 0
    } else if (serviceType === 'bar') {
      // Bar menu structure: { drinks: [...] }
      return menu.drinks && Array.isArray(menu.drinks) && menu.drinks.length > 0
    }
    return false
  })

  // Get menu items from a service
  const getMenuItems = (service: Service): Array<{ name: string; price: number; category?: string }> => {
    if (!service.menu || typeof service.menu !== 'object') return []
    
    const items: Array<{ name: string; price: number; category?: string }> = []
    const menu = service.menu as any
    
    if (service.service_type === 'restaurant') {
      // Restaurant menu structure: { categories: [...], items: [...] }
      // Items have a 'category' field that references the category
      if (menu.items && Array.isArray(menu.items)) {
        // Create a map of category IDs to names for lookup
        const categoryMap = new Map<string, string>()
        if (menu.categories && Array.isArray(menu.categories)) {
          menu.categories.forEach((cat: any) => {
            categoryMap.set(cat.id || cat.name, cat.name || '')
          })
        }
        
        menu.items.forEach((item: any) => {
          const categoryName = categoryMap.get(item.category) || item.category || 'Uncategorized'
          items.push({ 
            name: item.name, 
            price: typeof item.price === 'number' ? item.price : 0, 
            category: categoryName 
          })
        })
      }
    } else if (service.service_type === 'bar') {
      // Bar menu structure: { drinks: [...] }
      if (menu.drinks && Array.isArray(menu.drinks)) {
        menu.drinks.forEach((drink: any) => {
          items.push({ 
            name: drink.name, 
            price: typeof drink.price === 'number' ? drink.price : 0, 
            category: drink.category || 'Uncategorized' 
          })
        })
      }
    }
    
    return items
  }

  const toggleServiceExpanded = (serviceId: string) => {
    setExpandedServices(prev => {
      const next = new Set(prev)
      if (next.has(serviceId)) {
        next.delete(serviceId)
      } else {
        next.add(serviceId)
      }
      return next
    })
  }

  const isMenuItemSelected = (serviceId: string, menuItemName: string) => {
    return formData.menu_item_discounts.some(
      item => item.service_id === serviceId && item.menu_item_name === menuItemName
    )
  }

  const toggleMenuItem = (service: Service, menuItemName: string) => {
    setFormData(prev => {
      const existing = prev.menu_item_discounts.find(
        item => item.service_id === service.id && item.menu_item_name === menuItemName
      )
      
      if (existing) {
        // Remove item
        return {
          ...prev,
          menu_item_discounts: prev.menu_item_discounts.filter(
            item => !(item.service_id === service.id && item.menu_item_name === menuItemName)
          ),
        }
      } else {
        // Add item with default discount values from form
        const serviceTitle = typeof service.title === 'string' ? service.title : (service.title as any)?.en || 'Service'
        return {
          ...prev,
          menu_item_discounts: [
            ...prev.menu_item_discounts,
            {
              service_id: service.id,
              service_name: serviceTitle,
              menu_item_name: menuItemName,
              discount_type: prev.discount_type,
              discount_value: prev.discount_value,
              max_discount_amount: undefined,
            },
          ],
        }
      }
    })
  }

  const updateMenuItemDiscount = (
    serviceId: string,
    menuItemName: string,
    field: 'discount_type' | 'discount_value' | 'max_discount_amount',
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      menu_item_discounts: prev.menu_item_discounts.map(item =>
        item.service_id === serviceId && item.menu_item_name === menuItemName
          ? { ...item, [field]: value }
          : item
      ),
    }))
  }

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
      // Convert empty strings to null for time fields
      const cleanedData = {
        ...data,
        start_time: data.start_time && data.start_time.trim() ? (data.start_time.includes(':00') ? data.start_time : data.start_time + ':00') : null,
        end_time: data.end_time && data.end_time.trim() ? (data.end_time.includes(':00') ? data.end_time : data.end_time + ':00') : null,
        // Include menu_item_discounts in the request
        menu_item_discounts: data.menu_item_discounts || [],
      }
      
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cleanedData, hotel_id: hotelId }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create promotion')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Promotion created successfully')
      router.push('/admin/promotions')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create promotion')
    },
  })

  if (!hotelId) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Please select a hotel first</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Create New Promotion</h1>
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
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value + ':00' })}
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
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value + ':00' })}
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
                    menu_item_discounts: e.target.checked ? [] : formData.menu_item_discounts,
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

        {/* Menu Item Specific Discounts */}
        {!formData.applies_to_all_products && servicesWithMenus.length > 0 && (
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specific Menu Items (Optional)
              <span className="text-xs text-gray-500 ml-2">Select specific items for item-only discounts</span>
            </label>
            <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {servicesLoading ? (
                <p className="text-sm text-gray-500">Loading services...</p>
              ) : servicesWithMenus.length === 0 ? (
                <p className="text-sm text-gray-500">No services with menus found</p>
              ) : (
                servicesWithMenus.map((service: Service) => {
                  const serviceTitle = typeof service.title === 'string' ? service.title : (service.title as any)?.en || 'Service'
                  const menuItems = getMenuItems(service)
                  const isExpanded = expandedServices.has(service.id)
                  
                  if (menuItems.length === 0) return null
                  
                  return (
                    <div key={service.id} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
                      <button
                        type="button"
                        onClick={() => toggleServiceExpanded(service.id)}
                        className="w-full flex items-center justify-between text-left py-2 hover:bg-gray-50 rounded px-2 -mx-2"
                      >
                        <span className="text-sm font-medium text-gray-700">{serviceTitle}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-2 space-y-1 pl-4">
                          {menuItems.map((item) => {
                            const isSelected = isMenuItemSelected(service.id, item.name)
                            const selectedItem = formData.menu_item_discounts.find(
                              mi => mi.service_id === service.id && mi.menu_item_name === item.name
                            )
                            
                            return (
                              <div key={`${service.id}-${item.name}`} className="flex items-center gap-2 py-1">
                                <button
                                  type="button"
                                  onClick={() => toggleMenuItem(service, item.name)}
                                  className={`flex items-center gap-2 flex-1 text-left p-2 rounded border ${
                                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                    <div className="text-xs text-gray-500">${item.price.toFixed(2)}</div>
                                  </div>
                                </button>
                                
                                {isSelected && selectedItem && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <select
                                      value={selectedItem.discount_type}
                                      onChange={(e) => updateMenuItemDiscount(service.id, item.name, 'discount_type', e.target.value)}
                                      className="px-2 py-1 border border-gray-300 rounded"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <option value="percentage">%</option>
                                      <option value="fixed_amount">$</option>
                                    </select>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={selectedItem.discount_value}
                                      onChange={(e) => updateMenuItemDiscount(service.id, item.name, 'discount_value', parseFloat(e.target.value) || 0)}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            {formData.menu_item_discounts.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>{formData.menu_item_discounts.length}</strong> menu item{formData.menu_item_discounts.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
        )}

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
            {mutation.isPending ? 'Creating...' : 'Create Promotion'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/admin/promotions')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

