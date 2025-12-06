'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import type { Service } from '@/types/database'
import { logger } from '@/lib/utils/logger'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  photo?: string
  category?: string
  cooking_instructions?: string
  ingredients?: string
  dietary_info?: string[]
  allergens?: string[]
  preparation_time?: number
}

interface DrinkItem {
  id: string
  name: string
  description: string
  price: number
  photo?: string
  category?: string
  alcohol_content?: string
}

interface MenuManagementPageProps {
  menuType: 'restaurant' | 'bar'
}

export function MenuManagementPage({ menuType }: MenuManagementPageProps) {
  const router = useRouter()
  const params = useParams()
  const serviceId = params?.id as string

  const [user, setUser] = useState<any>(null)
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Restaurant menu items
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  
  // Bar drink items
  const [drinkItems, setDrinkItems] = useState<DrinkItem[]>([])

  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)

  useEffect(() => {
    loadService()
  }, [serviceId])

  const loadService = async () => {
    if (!serviceId) return

    try {
      setLoading(true)
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      // Load service and menu data
      const serviceResponse = await fetch(`/api/services/${serviceId}`)
      if (!serviceResponse.ok) {
        throw new Error('Failed to load service')
      }
      const serviceData = await serviceResponse.json()
      setService(serviceData)

      // Load menu data
      const menuResponse = await fetch(`/api/services/${serviceId}/menu`)
      if (!menuResponse.ok) {
        throw new Error('Failed to load menu')
      }
      const menuData = await menuResponse.json()

      // Load menu items based on type
      if (menuType === 'restaurant') {
        const items = menuData.items || []
        setMenuItems(items.map((item: any, index: number) => ({
          id: item.id || `item-${Date.now()}-${index}`, // Generate unique ID if missing
          name: item.name || '',
          description: item.description || '',
          price: item.price || 0,
          photo: item.photo || undefined,
          category: item.category || '',
          cooking_instructions: item.cooking_instructions || '',
          ingredients: item.ingredients || '',
          dietary_info: item.dietary_info || [],
          allergens: item.allergens || [],
          preparation_time: item.preparation_time || 0,
        })))
      } else if (menuType === 'bar') {
        const drinks = menuData.drinks || menuData.menu?.drinks || []
        setDrinkItems(drinks.map((drink: any, index: number) => ({
          id: drink.id || `drink-${Date.now()}-${index}`, // Generate unique ID if missing
          name: drink.name || '',
          description: drink.description || '',
          price: drink.price || 0,
          photo: drink.photo || undefined,
          category: drink.category || '',
          alcohol_content: drink.alcohol_content || '',
        })))
      }
    } catch (error) {
      logger.error('Failed to load service:', error)
      alert('Failed to load service')
    } finally {
      setLoading(false)
    }
  }

  const uploadPhoto = async (file: File, folder: 'service-photos' | 'menu-photos'): Promise<string> => {
    if (!service) throw new Error('Service not loaded')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${service.hotel_id}/${folder}/${fileName}`

      const { data: buckets } = await supabase.storage.listBuckets()
      const servicesBucket = buckets?.find(b => b.name === 'services')
      if (!servicesBucket) {
        throw new Error('Storage bucket "services" not found. Please create it in Supabase Dashboard > Storage.')
      }

      const { error: uploadError } = await supabase.storage
        .from('services')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        if (uploadError.message.includes('Bucket') || uploadError.message.includes('not found')) {
          throw new Error('Storage bucket "services" not found. Please create it in Supabase Dashboard > Storage.')
        }
        throw uploadError
      }

      const { data } = supabase.storage
        .from('services')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      logger.error('Error uploading photo:', error)
      throw error
    }
  }

  const handleMenuPhotoUpload = async (file: File, itemId: string) => {
    try {
      setUploadingPhoto(itemId)
      const photoUrl = await uploadPhoto(file, 'menu-photos')
      
      if (menuType === 'restaurant') {
        setMenuItems(menuItems.map(item => 
          item.id === itemId ? { ...item, photo: photoUrl } : item
        ))
      } else {
        setDrinkItems(drinkItems.map(item => 
          item.id === itemId ? { ...item, photo: photoUrl } : item
        ))
      }
    } catch (error) {
      alert('Failed to upload photo. Please try again.')
      logger.error('Upload error:', error)
    } finally {
      setUploadingPhoto(null)
    }
  }

  const handleSave = async () => {
    if (!service) return

    try {
      setSaving(true)

      // Always save menu structure, even if empty (allows deletions to persist)
      let menuData: any = {}

      if (menuType === 'restaurant') {
        menuData = {
          items: menuItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            photo: item.photo || null,
            category: item.category || null,
            cooking_instructions: item.cooking_instructions || null,
            ingredients: item.ingredients || null,
            dietary_info: item.dietary_info || [],
            allergens: item.allergens || [],
            preparation_time: item.preparation_time || null,
          }))
        }
        // Preserve categories if they exist in the service
        if (service.menu && typeof service.menu === 'object' && 'categories' in service.menu) {
          menuData.categories = (service.menu as any).categories
        }
      } else if (menuType === 'bar') {
        menuData = {
          drinks: drinkItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            photo: item.photo || null,
            category: item.category || null,
            alcohol_content: item.alcohol_content || null,
          }))
        }
      }

      const response = await fetch(`/api/services/${serviceId}/menu`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ menu: menuData }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save menu')
      }

      alert('Menu saved successfully!')
      router.push(`/services/${serviceId}/edit`)
    } catch (error) {
      logger.error('Failed to save menu:', error)
      alert(error instanceof Error ? error.message : 'Failed to save menu. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Restaurant Menu Item Management
  const addMenuItem = () => {
    setMenuItems([...menuItems, {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: 0,
      category: '',
      cooking_instructions: '',
      ingredients: '',
      dietary_info: [],
      allergens: [],
      preparation_time: 0,
    }])
  }

  const removeMenuItem = async (id: string) => {
    const updatedItems = menuItems.filter(item => item.id !== id)
    setMenuItems(updatedItems)
    
    // Auto-save deletion immediately
    if (service) {
      try {
        const menuData: any = {
          items: updatedItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            photo: item.photo || null,
            category: item.category || null,
            cooking_instructions: item.cooking_instructions || null,
            ingredients: item.ingredients || null,
            dietary_info: item.dietary_info || [],
            allergens: item.allergens || [],
            preparation_time: item.preparation_time || null,
          }))
        }
        
        // Preserve categories if they exist
        if (service.menu && typeof service.menu === 'object' && 'categories' in service.menu) {
          menuData.categories = (service.menu as any).categories
        }
        
        await fetch(`/api/services/${serviceId}/menu`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ menu: menuData }),
        })
      } catch (error) {
        logger.error('Failed to save deletion:', error)
        // Revert on error
        setMenuItems(menuItems)
        alert('Failed to delete item. Please try again.')
      }
    }
  }

  const updateMenuItem = (id: string, field: keyof MenuItem, value: any) => {
    setMenuItems(menuItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Bar Drink Item Management
  const addDrinkItem = () => {
    setDrinkItems([...drinkItems, {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: 0,
      category: '',
      alcohol_content: '',
    }])
  }

  const removeDrinkItem = async (id: string) => {
    const updatedItems = drinkItems.filter(item => item.id !== id)
    setDrinkItems(updatedItems)
    
    // Auto-save deletion immediately
    if (service) {
      try {
        const menuData: any = {
          drinks: updatedItems.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            photo: item.photo || null,
            category: item.category || null,
            alcohol_content: item.alcohol_content || null,
          }))
        }
        
        await fetch(`/api/services/${serviceId}/menu`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ menu: menuData }),
        })
      } catch (error) {
        logger.error('Failed to save deletion:', error)
        // Revert on error
        setDrinkItems(drinkItems)
        alert('Failed to delete item. Please try again.')
      }
    }
  }

  const updateDrinkItem = (id: string, field: keyof DrinkItem, value: any) => {
    setDrinkItems(drinkItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-600">Loading menu...</div>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-12 text-center">
            <p className="text-gray-500">Service not found.</p>
            <Button onClick={() => router.push('/services')} className="mt-4">
              Back to Services
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push(`/services/${serviceId}/edit`)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {menuType === 'restaurant' ? 'Restaurant Menu' : 'Bar Menu'}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {extractTextFromJson(service.title)}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {saving ? 'Saving...' : 'Save Menu'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {menuType === 'restaurant' ? (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <h2 className="text-xl font-semibold text-gray-900">Menu Items</h2>
              <Button onClick={addMenuItem} variant="outline" size="sm">
                Add Menu Item
              </Button>
            </div>

            {menuItems.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <p className="text-gray-500 text-sm mb-4">No menu items yet</p>
                <Button onClick={addMenuItem} variant="outline" size="sm">
                  Add First Menu Item
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {menuItems.map((item) => (
                  <div key={item.id} className="p-6 border-2 border-gray-200 rounded-xl bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Menu Item</h3>
                      <Button onClick={() => removeMenuItem(item.id)} variant="danger" size="sm">
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Item Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateMenuItem(item.id, 'name', e.target.value)}
                          placeholder="e.g., Grilled Salmon"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Price <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => updateMenuItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateMenuItem(item.id, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Item description..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <Input
                          value={item.category || ''}
                          onChange={(e) => updateMenuItem(item.id, 'category', e.target.value)}
                          placeholder="e.g., Main Course, Appetizer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preparation Time (minutes)</label>
                        <Input
                          type="number"
                          min="0"
                          value={item.preparation_time || ''}
                          onChange={(e) => updateMenuItem(item.id, 'preparation_time', parseInt(e.target.value) || 0)}
                          placeholder="30"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cooking Instructions</label>
                        <textarea
                          value={item.cooking_instructions || ''}
                          onChange={(e) => updateMenuItem(item.id, 'cooking_instructions', e.target.value)}
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          placeholder="Detailed cooking instructions for kitchen staff..."
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ingredients</label>
                        <textarea
                          value={item.ingredients || ''}
                          onChange={(e) => updateMenuItem(item.id, 'ingredients', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="List of ingredients (comma-separated or one per line)..."
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Information</label>
                        <div className="flex flex-wrap gap-3">
                          {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher'].map((diet) => (
                            <label key={diet} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.dietary_info?.includes(diet) || false}
                                onChange={(e) => {
                                  const current = item.dietary_info || []
                                  const updated = e.target.checked
                                    ? [...current, diet]
                                    : current.filter(d => d !== diet)
                                  updateMenuItem(item.id, 'dietary_info', updated)
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{diet}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Allergens</label>
                        <div className="flex flex-wrap gap-3">
                          {['Milk', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 'Peanuts', 'Wheat', 'Soybeans'].map((allergen) => (
                            <label key={allergen} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.allergens?.includes(allergen) || false}
                                onChange={(e) => {
                                  const current = item.allergens || []
                                  const updated = e.target.checked
                                    ? [...current, allergen]
                                    : current.filter(a => a !== allergen)
                                  updateMenuItem(item.id, 'allergens', updated)
                                }}
                                className="w-4 h-4 text-red-600 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">{allergen}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                        <div className="space-y-2">
                          {item.photo ? (
                            <div className="relative">
                              <img
                                src={item.photo}
                                alt={item.name}
                                className="w-full h-32 object-cover rounded-lg border border-gray-300"
                              />
                              <button
                                type="button"
                                onClick={() => updateMenuItem(item.id, 'photo', undefined)}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleMenuPhotoUpload(file, item.id)
                              }}
                              disabled={uploadingPhoto === item.id}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                          )}
                          {uploadingPhoto === item.id && (
                            <p className="text-xs text-gray-500">Uploading...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <h2 className="text-xl font-semibold text-gray-900">Drink Menu</h2>
              <Button onClick={addDrinkItem} variant="outline" size="sm">
                Add Drink
              </Button>
            </div>

            {drinkItems.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <p className="text-gray-500 text-sm mb-4">No drinks yet</p>
                <Button onClick={addDrinkItem} variant="outline" size="sm">
                  Add First Drink
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {drinkItems.map((item) => (
                  <div key={item.id} className="p-6 border-2 border-gray-200 rounded-xl bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Drink Item</h3>
                      <Button onClick={() => removeDrinkItem(item.id)} variant="danger" size="sm">
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Drink Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateDrinkItem(item.id, 'name', e.target.value)}
                          placeholder="e.g., Mojito"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Price <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => updateDrinkItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                          value={item.category || ''}
                          onChange={(e) => updateDrinkItem(item.id, 'category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Category</option>
                          <option value="cocktails">Cocktails</option>
                          <option value="wine">Wine</option>
                          <option value="beer">Beer</option>
                          <option value="spirits">Spirits</option>
                          <option value="non-alcoholic">Non-Alcoholic</option>
                          <option value="hot-drinks">Hot Drinks</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alcohol Content</label>
                        <Input
                          value={item.alcohol_content || ''}
                          onChange={(e) => updateDrinkItem(item.id, 'alcohol_content', e.target.value)}
                          placeholder="e.g., 40% ABV"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateDrinkItem(item.id, 'description', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Drink description..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                        <div className="space-y-2">
                          {item.photo ? (
                            <div className="relative">
                              <img
                                src={item.photo}
                                alt={item.name}
                                className="w-full h-32 object-cover rounded-lg border border-gray-300"
                              />
                              <button
                                type="button"
                                onClick={() => updateDrinkItem(item.id, 'photo', undefined)}
                                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleMenuPhotoUpload(file, item.id)
                              }}
                              disabled={uploadingPhoto === item.id}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                          )}
                          {uploadingPhoto === item.id && (
                            <p className="text-xs text-gray-500">Uploading...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

