'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase/client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { formatPhoneNumber } from '@/lib/utils/phone-mask'
import { formatEmail } from '@/lib/utils/email-validation'
import { ServiceFormTabs } from './ServiceFormTabs'
import { MenuItemCard } from './MenuItemCard'
import type { Service } from '@/types/database'
import { logger } from '@/lib/utils/logger'
import { useHotelTimezone, getHotelTime } from '@/lib/hooks/useHotelTimezone'

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
  calories?: number
  spice_level?: string
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

interface SpaService {
  id: string
  name: string
  description: string
  price: number
  duration: number
  photo?: string
}

interface LaundryService {
  id: string
  name: string
  price: number
}

interface RoomService {
  id: string
  name: string
  description: string
  price?: number
}


interface OperatingHours {
  monday?: { open: string; close: string; closed?: boolean }
  tuesday?: { open: string; close: string; closed?: boolean }
  wednesday?: { open: string; close: string; closed?: boolean }
  thursday?: { open: string; close: string; closed?: boolean }
  friday?: { open: string; close: string; closed?: boolean }
  saturday?: { open: string; close: string; closed?: boolean }
  sunday?: { open: string; close: string; closed?: boolean }
}

interface ServiceFormProps {
  service?: Service
  serviceType?: string
  hotelId: string
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function ServiceForm({ service, serviceType, hotelId, onSubmit, onCancel }: ServiceFormProps) {
  const hotelTimezone = useHotelTimezone(hotelId)
  const [formData, setFormData] = useState({
    title: service?.title ? extractTextFromJson(service.title) : '',
    description: service?.description ? extractTextFromJson(service.description) : '',
    service_type: service?.service_type || serviceType || 'other',
  })

  // Restaurant/Bar/Room Service Menu
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    if (service?.menu && typeof service.menu === 'object' && 'items' in service.menu) {
      const items = (service.menu as any).items || []
      // Ensure all items have required fields with defaults and unique IDs
      const loadedItems = items.map((item: any, index: number) => ({
        ...item,
        id: item.id || `item-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        calories: item.calories || 0,
        spice_level: item.spice_level || 'None',
        category: item.category || '',
        photo: item.photo || undefined, // Preserve photo URL if exists
      }))
      logger.info('ServiceForm - Loaded menu items:', loadedItems.map((i: MenuItem) => ({ id: i.id, name: i.name, photo: i.photo })))
      return loadedItems
    }
    return []
  })

  // Bar Drink Menu
  const [drinkItems, setDrinkItems] = useState<DrinkItem[]>(() => {
    if (service?.menu && typeof service.menu === 'object' && 'drinks' in service.menu) {
      const drinks = (service.menu as any).drinks || []
      // Ensure all drinks have unique IDs and default category
      const loadedDrinks = drinks.map((drink: any, index: number) => ({
        ...drink,
        id: drink.id || `drink-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        category: drink.category || 'No Category',
        photo: drink.photo || undefined, // Preserve photo URL if exists
      }))
      logger.info('ServiceForm - Loaded drink items:', loadedDrinks.map((i: DrinkItem) => ({ id: i.id, name: i.name, photo: i.photo })))
      return loadedDrinks
    }
    return []
  })

  // Spa Services
  const [spaServices, setSpaServices] = useState<SpaService[]>(() => {
    if (service?.menu && typeof service.menu === 'object' && 'services' in service.menu) {
      return (service.menu as any).services || []
    }
    return []
  })

  // Laundry Services
  const [laundryServices, setLaundryServices] = useState<LaundryService[]>(() => {
    if (service?.settings && typeof service.settings === 'object' && 'services' in service.settings) {
      const services = (service.settings as any).services || []
      // Ensure all services have IDs
      return services.map((s: any, index: number) => ({
        ...s,
        id: s.id || `laundry-${index}-${Math.random().toString(36).substr(2, 9)}`,
      }))
    }
    return []
  })

  // Room Services
  const [roomServices, setRoomServices] = useState<RoomService[]>(() => {
    if (service?.menu && typeof service.menu === 'object' && 'services' in service.menu) {
      return (service.menu as any).services || []
    }
    return []
  })


  // Operating Hours
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(() => {
    if (service?.operating_hours && typeof service.operating_hours === 'object') {
      return service.operating_hours as OperatingHours
    }
    return {}
  })

  // Contact Info - Array of contacts with names
  interface Contact {
    id: string
    name: string
    phone: string
    email: string
    extension: string
  }

  const [contacts, setContacts] = useState<Contact[]>(() => {
    if (service?.contact_info && typeof service.contact_info === 'object') {
      const contactInfo = service.contact_info as any
      // If it's an array, use it directly
      if (Array.isArray(contactInfo)) {
        return contactInfo.map((c: any, idx: number) => ({
          id: c.id || `contact-${idx}`,
          name: c.name || '',
          phone: c.phone || '',
          email: c.email || '',
          extension: c.extension || '',
        }))
      }
      // If it's a single object (legacy format), convert to array
      if (contactInfo.phone || contactInfo.email || contactInfo.extension) {
        return [{
          id: 'contact-0',
          name: contactInfo.name || '',
          phone: contactInfo.phone || '',
          email: contactInfo.email || '',
          extension: contactInfo.extension || '',
        }]
      }
    }
    return [{ id: 'contact-0', name: '', phone: '', email: '', extension: '' }]
  })

  const addContact = () => {
    setContacts([...contacts, {
      id: `contact-${Date.now()}`,
      name: '',
      phone: '',
      email: '',
      extension: '',
    }])
  }

  const removeContact = (id: string) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter(c => c.id !== id))
    }
  }

  const updateContact = (id: string, field: keyof Contact, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  // Service-specific settings
  const [settings, setSettings] = useState(() => {
    if (service?.settings && typeof service.settings === 'object') {
      return service.settings as any
    }
    return {}
  })

  const [photos, setPhotos] = useState<string[]>(service?.photos || [])
  const [uploading, setUploading] = useState(false)
  const [uploadingMenuPhoto, setUploadingMenuPhoto] = useState<string | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(() => {
    if (service?.settings && typeof service.settings === 'object' && !Array.isArray(service.settings)) {
      const settings = service.settings as any
      return settings.background_image || null
    }
    return null
  })
  const [uploadingBackground, setUploadingBackground] = useState(false)

  // Upload photo to Supabase Storage
  const uploadPhoto = async (file: File, folder: 'service-photos' | 'menu-photos'): Promise<string> => {
    try {
      // Generate unique filename with timestamp and random string
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substr(2, 9)
      const fileName = `${timestamp}-${randomStr}.${fileExt}`
      const filePath = `${hotelId}/${folder}/${fileName}`
      
      logger.info('Uploading photo:', { 
        fileName, 
        filePath, 
        size: file.size, 
        type: file.type,
        bucket: 'services',
        folder 
      })

      // Upload directly to the services bucket
      // If bucket doesn't exist, Supabase will return an error
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('services')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        logger.error('Upload error details:', {
          message: uploadError.message,
          error: uploadError
        })
        
        // Provide helpful error messages
        if (uploadError.message.includes('Bucket') || uploadError.message.includes('not found')) {
          throw new Error('Storage bucket "services" not found or not accessible. Please check Supabase Dashboard > Storage.')
        }
        if (uploadError.message.includes('new row violates row-level security')) {
          throw new Error('Permission denied. Please check storage bucket policies in Supabase Dashboard.')
        }
        if (uploadError.message.includes('duplicate')) {
          // If file exists, try with a new name
          const newFileName = `${timestamp}-${randomStr}-${Math.random().toString(36).substr(2, 5)}.${fileExt}`
          const newFilePath = `${hotelId}/${folder}/${newFileName}`
          const { error: retryError } = await supabase.storage
            .from('services')
            .upload(newFilePath, file, {
              cacheControl: '3600',
              upsert: false
            })
          if (retryError) {
            throw retryError
          }
          const { data } = supabase.storage
            .from('services')
            .getPublicUrl(newFilePath)
          logger.info('Photo uploaded successfully (retry), public URL:', data.publicUrl)
          return data.publicUrl
        }
        throw uploadError
      }

      // Get public URL for the uploaded file
      const { data } = supabase.storage
        .from('services')
        .getPublicUrl(filePath)

      logger.info('Photo uploaded successfully, public URL:', data.publicUrl)
      return data.publicUrl
    } catch (error) {
      logger.error('Error uploading photo:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload photo. Please try again.'
      throw new Error(errorMessage)
    }
  }

  const handleServicePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const photoUrl = await uploadPhoto(file, 'service-photos')
      setPhotos([...photos, photoUrl])
    } catch (error) {
      alert('Failed to upload photo. Please try again.')
      logger.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  // Helper function to extract storage path from public URL
  const extractStoragePath = (url: string): string | null => {
    try {
      // Supabase public URL format: https://{supabase-url}/storage/v1/object/public/services/{path}
      const match = url.match(/\/storage\/v1\/object\/public\/services\/(.+)$/)
      if (match && match[1]) {
        return match[1]
      }
      return null
    } catch {
      return null
    }
  }

  // Helper function to delete old background image if it's in hotelId folder
  const deleteOldBackgroundImage = async (oldImageUrl: string | null) => {
    if (!oldImageUrl) return

    try {
      const storagePath = extractStoragePath(oldImageUrl)
      if (!storagePath) {
        logger.info('Could not extract storage path from URL, skipping deletion')
        return
      }

      // Only delete if it's in the hotelId folder (custom upload), not backgrounds folder (default)
      if (storagePath.startsWith(`${hotelId}/service-photos/`)) {
        logger.info('Deleting old background image:', storagePath)
        const { error } = await supabase.storage
          .from('services')
          .remove([storagePath])
        
        if (error) {
          logger.error('Error deleting old background image:', error)
          // Don't throw - continue with upload even if deletion fails
        } else {
          logger.info('Old background image deleted successfully')
        }
      } else {
        logger.info('Old image is in backgrounds folder or different location, skipping deletion')
      }
    } catch (error) {
      logger.error('Error in deleteOldBackgroundImage:', error)
      // Don't throw - continue with upload even if deletion fails
    }
  }

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingBackground(true)
      
      // Delete old background image if it exists and is in hotelId folder
      if (backgroundImage) {
        await deleteOldBackgroundImage(backgroundImage)
      }
      
      // Upload to service-photos folder (same as menu items)
      const photoUrl = await uploadPhoto(file, 'service-photos')
      setBackgroundImage(photoUrl)
    } catch (error) {
      alert('Failed to upload background image. Please try again.')
      logger.error('Upload error:', error)
    } finally {
      setUploadingBackground(false)
    }
  }

  const handleMenuPhotoUpload = async (file: File, itemId: string, type: 'menu' | 'drink' | 'spa'): Promise<string> => {
    try {
      setUploadingMenuPhoto(itemId)
      logger.info('Uploading photo for', type, 'item:', itemId)
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file')
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('Image size must be less than 5MB')
      }
      
      const photoUrl = await uploadPhoto(file, 'menu-photos')
      logger.info('Photo uploaded successfully:', photoUrl)
      
      // Update the item in the list if it exists (for inline editing)
      if (type === 'menu') {
        const existingItem = menuItems.find(item => item.id === itemId)
        if (existingItem) {
          setMenuItems(menuItems.map(item => 
            item.id === itemId ? { ...item, photo: photoUrl } : item
          ))
        }
      } else if (type === 'drink') {
        const existingItem = drinkItems.find(item => item.id === itemId)
        if (existingItem) {
          setDrinkItems(drinkItems.map(item => 
            item.id === itemId ? { ...item, photo: photoUrl } : item
          ))
        }
      } else if (type === 'spa') {
        const existingItem = spaServices.find(item => item.id === itemId)
        if (existingItem) {
          setSpaServices(spaServices.map(item => 
            item.id === itemId ? { ...item, photo: photoUrl } : item
          ))
        }
      }

      return photoUrl
    } catch (error) {
      logger.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload photo. Please try again.'
      alert(errorMessage)
      throw error
    } finally {
      setUploadingMenuPhoto(null)
    }
  }


  // Menu Item Management (Restaurant/Room Service)
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)
  const [menuFormData, setMenuFormData] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    cooking_instructions: '',
    ingredients: '',
    dietary_info: [],
    allergens: [],
    preparation_time: 0,
    calories: 0,
    spice_level: 'None',
  })

  // Drink Categories (Bar)
  interface DrinkCategory {
    id: string
    name: string
    order: number
  }

  const [drinkCategories, setDrinkCategories] = useState<DrinkCategory[]>(() => {
    const defaultCategories = [
      { id: 'no-category', name: 'No Category', order: 0 },
      { id: '1', name: 'Cocktails', order: 1 },
      { id: '2', name: 'Wine', order: 2 },
      { id: '3', name: 'Beer', order: 3 },
      { id: '4', name: 'Spirits', order: 4 },
      { id: '5', name: 'Non-Alcoholic', order: 5 },
      { id: '6', name: 'Hot Drinks', order: 6 },
    ]
    // Load from service menu if exists
    if (service?.menu && typeof service.menu === 'object' && 'drinkCategories' in service.menu) {
      const savedCategories = (service.menu as any).drinkCategories
      if (Array.isArray(savedCategories) && savedCategories.length > 0) {
        const hasNoCategory = savedCategories.some((c: DrinkCategory) => c.name === 'No Category')
        if (!hasNoCategory) {
          return [{ id: 'no-category', name: 'No Category', order: 0 }, ...savedCategories]
        }
        return savedCategories
      }
    }
    return defaultCategories
  })

  const [isDrinkCategoryModalOpen, setIsDrinkCategoryModalOpen] = useState(false)
  const [editingDrinkCategory, setEditingDrinkCategory] = useState<DrinkCategory | null>(null)
  const [drinkCategoryFormData, setDrinkCategoryFormData] = useState({ name: '' })
  const [isDeleteDrinkCategoryModalOpen, setIsDeleteDrinkCategoryModalOpen] = useState(false)
  const [drinkCategoryToDelete, setDrinkCategoryToDelete] = useState<DrinkCategory | null>(null)
  const [collapsedDrinkCategories, setCollapsedDrinkCategories] = useState<Set<string>>(() => {
    if (service?.menu && typeof service.menu === 'object' && 'drinkCategories' in service.menu) {
      const savedCategories = (service.menu as any).drinkCategories
      if (Array.isArray(savedCategories) && savedCategories.length > 0) {
        return new Set(savedCategories.map((c: DrinkCategory) => c.id))
      }
    }
    return new Set(drinkCategories.map(c => c.id))
  })

  const sortedDrinkCategories = [...drinkCategories].sort((a, b) => a.order - b.order)
  const drinkCategoryNames = sortedDrinkCategories.map(c => c.name)

  // Drink Category Management Functions
  const openDrinkCategoryModal = (category?: DrinkCategory) => {
    if (category) {
      setEditingDrinkCategory(category)
      setDrinkCategoryFormData({ name: category.name })
    } else {
      setEditingDrinkCategory(null)
      setDrinkCategoryFormData({ name: '' })
    }
    setIsDrinkCategoryModalOpen(true)
  }

  const saveDrinkCategory = () => {
    if (!drinkCategoryFormData.name.trim()) return

    if (editingDrinkCategory) {
      setDrinkCategories(drinkCategories.map(cat =>
        cat.id === editingDrinkCategory.id ? { ...cat, name: drinkCategoryFormData.name.trim() } : cat
      ))
      setDrinkItems(drinkItems.map(item =>
        item.category === editingDrinkCategory.name ? { ...item, category: drinkCategoryFormData.name.trim() } : item
      ))
    } else {
      const newCategory: DrinkCategory = {
        id: Date.now().toString(),
        name: drinkCategoryFormData.name.trim(),
        order: drinkCategories.length + 1,
      }
      setDrinkCategories([...drinkCategories, newCategory])
    }
    setIsDrinkCategoryModalOpen(false)
  }

  const openDeleteDrinkCategoryModal = (categoryId: string) => {
    const category = drinkCategories.find(c => c.id === categoryId)
    if (!category) return
    setDrinkCategoryToDelete(category)
    setIsDeleteDrinkCategoryModalOpen(true)
  }

  const confirmDeleteDrinkCategory = () => {
    if (!drinkCategoryToDelete) return
    
    setDrinkItems(drinkItems.map(item =>
      item.category === drinkCategoryToDelete.name ? { ...item, category: 'No Category' } : item
    ))
    setDrinkCategories(drinkCategories.filter(c => c.id !== drinkCategoryToDelete.id))
    setIsDeleteDrinkCategoryModalOpen(false)
    setDrinkCategoryToDelete(null)
  }

  const moveDrinkCategory = (categoryId: string, direction: 'up' | 'down') => {
    const index = drinkCategories.findIndex(c => c.id === categoryId)
    if (index === -1) return

    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === drinkCategories.length - 1) return

    const newCategories = [...drinkCategories]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]]
    
    newCategories[index].order = index
    newCategories[targetIndex].order = targetIndex
    
    setDrinkCategories(newCategories)
  }

  const toggleDrinkCategory = (categoryId: string) => {
    const newCollapsed = new Set(collapsedDrinkCategories)
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId)
    } else {
      newCollapsed.add(categoryId)
    }
    setCollapsedDrinkCategories(newCollapsed)
  }

  // Drink Item Management (Bar) - Modal
  const [isDrinkModalOpen, setIsDrinkModalOpen] = useState(false)
  const [editingDrinkItem, setEditingDrinkItem] = useState<DrinkItem | null>(null)
  const [drinkFormData, setDrinkFormData] = useState<Partial<DrinkItem>>({
    name: '',
    description: '',
    price: 0,
    category: 'No Category',
    alcohol_content: '',
  })

  // Spa Service Management - Modal
  const [isSpaModalOpen, setIsSpaModalOpen] = useState(false)
  const [editingSpaService, setEditingSpaService] = useState<SpaService | null>(null)
  const [spaFormData, setSpaFormData] = useState<Partial<SpaService>>({
    name: '',
    description: '',
    price: 0,
    duration: 60,
  })

  // Room Service Modal
  const [isRoomServiceModalOpen, setIsRoomServiceModalOpen] = useState(false)
  const [editingRoomService, setEditingRoomService] = useState<RoomService | null>(null)
  const [roomServiceFormData, setRoomServiceFormData] = useState<Partial<RoomService>>({
    name: '',
    description: '',
    price: undefined,
  })


  // Category Management
  interface MenuCategory {
    id: string
    name: string
    order: number
  }

  const [categories, setCategories] = useState<MenuCategory[]>(() => {
    const defaultCategories = [
      { id: 'no-category', name: 'No Category', order: 0 },
      { id: '1', name: 'Appetizers', order: 1 },
      { id: '2', name: 'Main Courses', order: 2 },
      { id: '3', name: 'Desserts', order: 3 },
      { id: '4', name: 'Beverages', order: 4 },
      { id: '5', name: 'Side Dishes', order: 5 },
    ]
    // Load from service menu if exists
    if (service?.menu && typeof service.menu === 'object' && 'categories' in service.menu) {
      const savedCategories = (service.menu as any).categories
      if (Array.isArray(savedCategories) && savedCategories.length > 0) {
        // Ensure "No Category" exists
        const hasNoCategory = savedCategories.some((c: MenuCategory) => c.name === 'No Category')
        if (!hasNoCategory) {
          return [{ id: 'no-category', name: 'No Category', order: 0 }, ...savedCategories]
        }
        return savedCategories
      }
    }
    return defaultCategories
  })

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [categoryFormData, setCategoryFormData] = useState({ name: '' })
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null)

  const dietaryOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Pescatarian', 'Keto', 'Nut-Free', 'Halal', 'Kosher']
  const spiceLevels = ['None', 'Mild', 'Medium', 'Hot', 'Extra Hot']

  // Category Management Functions
  const openCategoryModal = (category?: MenuCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryFormData({ name: category.name })
    } else {
      setEditingCategory(null)
      setCategoryFormData({ name: '' })
    }
    setIsCategoryModalOpen(true)
  }

  const saveCategory = () => {
    if (!categoryFormData.name.trim()) return

    if (editingCategory) {
      setCategories(categories.map(cat =>
        cat.id === editingCategory.id ? { ...cat, name: categoryFormData.name.trim() } : cat
      ))
      // Update menu items with new category name
      setMenuItems(menuItems.map(item =>
        item.category === editingCategory.name ? { ...item, category: categoryFormData.name.trim() } : item
      ))
    } else {
      const newCategory: MenuCategory = {
        id: Date.now().toString(),
        name: categoryFormData.name.trim(),
        order: categories.length + 1,
      }
      setCategories([...categories, newCategory])
    }
    setIsCategoryModalOpen(false)
  }

  const openDeleteCategoryModal = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return
    setCategoryToDelete(category)
    setIsDeleteCategoryModalOpen(true)
  }

  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return
    
    // Move items to "No Category"
    setMenuItems(menuItems.map(item =>
      item.category === categoryToDelete.name ? { ...item, category: 'No Category' } : item
    ))
    setCategories(categories.filter(c => c.id !== categoryToDelete.id))
    setIsDeleteCategoryModalOpen(false)
    setCategoryToDelete(null)
  }

  const moveCategory = (categoryId: string, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === categoryId)
    if (index === -1) return

    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === categories.length - 1) return

    const newCategories = [...categories]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]]
    
    // Update order
    newCategories.forEach((cat, idx) => {
      cat.order = idx + 1
    })
    setCategories(newCategories)
  }

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order)
  const categoryNames = sortedCategories.map(c => c.name)
  // All categories collapsed by default
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
    if (service?.menu && typeof service.menu === 'object' && 'categories' in service.menu) {
      const savedCategories = (service.menu as any).categories
      if (Array.isArray(savedCategories) && savedCategories.length > 0) {
        return new Set(savedCategories.map((c: MenuCategory) => c.id))
      }
    }
    // Default categories - all collapsed
    return new Set(['no-category', '1', '2', '3', '4', '5'])
  })

  const toggleCategory = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories)
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId)
    } else {
      newCollapsed.add(categoryId)
    }
    setCollapsedCategories(newCollapsed)
  }

  const openMenuModal = (item?: MenuItem) => {
    logger.info('ServiceForm - Opening menu modal', { item, isEdit: !!item })
    if (item) {
      setEditingMenuItem(item)
      setMenuFormData(item)
    } else {
      setEditingMenuItem(null)
      setMenuFormData({
        name: '',
        description: '',
        price: 0,
        category: 'No Category',
        cooking_instructions: '',
        ingredients: '',
        dietary_info: [],
        allergens: [],
        preparation_time: 0,
        calories: 0,
        spice_level: 'None',
      })
    }
    setIsMenuModalOpen(true)
    logger.info('ServiceForm - Menu modal state set to open')
  }

  const saveMenuItem = () => {
    logger.info('ServiceForm - Save menu item clicked', { menuFormData, editingMenuItem })
    logger.info('ServiceForm - Photo in form data:', menuFormData.photo)
    
    if (!menuFormData.name || !menuFormData.price) {
      logger.info('ServiceForm - Validation failed: missing name or price', { name: menuFormData.name, price: menuFormData.price })
      return
    }

    if (editingMenuItem) {
      // Update all fields at once, including photo
      const updatedItem: MenuItem = {
        ...editingMenuItem,
        ...menuFormData,
        id: editingMenuItem.id,
        photo: menuFormData.photo || editingMenuItem.photo || undefined, // Preserve photo
      } as MenuItem
      logger.info('ServiceForm - Updating menu item with photo:', updatedItem.photo)
      logger.info('ServiceForm - Updated item:', updatedItem)
      setMenuItems(menuItems.map(item => item.id === editingMenuItem.id ? updatedItem : item))
    } else {
      const newItem: MenuItem = {
        ...menuFormData,
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        photo: menuFormData.photo || undefined, // Ensure photo is included
      } as MenuItem
      logger.info('ServiceForm - Adding new menu item with photo:', newItem.photo)
      logger.info('ServiceForm - New item:', newItem)
      setMenuItems([...menuItems, newItem])
    }
    logger.info('ServiceForm - Menu items after save:', menuItems.length + (editingMenuItem ? 0 : 1))
    setIsMenuModalOpen(false)
  }

  const toggleDietary = (option: string) => {
    const current = menuFormData.dietary_info || []
    if (current.includes(option)) {
      setMenuFormData({ ...menuFormData, dietary_info: current.filter(d => d !== option) })
    } else {
      setMenuFormData({ ...menuFormData, dietary_info: [...current, option] })
    }
  }

  const addMenuItem = (categoryName?: string) => {
    logger.info('ServiceForm - Add Menu Item clicked', { categoryName })
    setMenuFormData({
      ...menuFormData,
      category: categoryName || 'No Category'
    })
    openMenuModal()
  }

  const removeMenuItem = (id: string) => {
    logger.info('ServiceForm - Remove menu item clicked', { id })
    setMenuItems(menuItems.filter(item => item.id !== id))
    logger.info('ServiceForm - Menu items after remove:', menuItems.length - 1)
  }

  const updateMenuItem = (id: string, field: keyof MenuItem, value: any) => {
    setMenuItems(menuItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Drink Item Management (Bar) - Modal-based
  const openDrinkModal = (item?: DrinkItem) => {
    logger.info('ServiceForm - Opening drink modal', { item, isEdit: !!item })
    if (item) {
      setEditingDrinkItem(item)
      setDrinkFormData(item)
    } else {
      setEditingDrinkItem(null)
      setDrinkFormData({
        name: '',
        description: '',
        price: 0,
        category: '',
        alcohol_content: '',
      })
    }
    setIsDrinkModalOpen(true)
  }

  const addDrinkItem = () => {
    logger.info('ServiceForm - Add Drink Item clicked')
    openDrinkModal()
  }

  const saveDrinkItem = () => {
    logger.info('ServiceForm - Save drink item clicked', { drinkFormData, editingDrinkItem })
    logger.info('ServiceForm - Photo in form data:', drinkFormData.photo)
    
    if (!drinkFormData.name || !drinkFormData.price) {
      logger.info('ServiceForm - Validation failed: missing name or price')
      return
    }

    if (editingDrinkItem) {
      const updatedItem: DrinkItem = {
        ...editingDrinkItem,
        ...drinkFormData,
        id: editingDrinkItem.id,
        photo: drinkFormData.photo || editingDrinkItem.photo || undefined, // Preserve photo
      } as DrinkItem
      logger.info('ServiceForm - Updating drink item with photo:', updatedItem.photo)
      logger.info('ServiceForm - Updated item:', updatedItem)
      setDrinkItems(drinkItems.map(item => item.id === editingDrinkItem.id ? updatedItem : item))
    } else {
      const newItem: DrinkItem = {
        ...drinkFormData,
        id: `drink-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        photo: drinkFormData.photo || undefined, // Ensure photo is included
      } as DrinkItem
      logger.info('ServiceForm - Adding new drink item with photo:', newItem.photo)
      logger.info('ServiceForm - New item:', newItem)
      setDrinkItems([...drinkItems, newItem])
    }
    setIsDrinkModalOpen(false)
  }

  const removeDrinkItem = (id: string) => {
    logger.info('ServiceForm - Remove drink item clicked', { id })
    setDrinkItems(drinkItems.filter(item => item.id !== id))
    logger.info('ServiceForm - Drink items after remove:', drinkItems.length - 1)
  }

  const updateDrinkItem = (id: string, field: keyof DrinkItem, value: any) => {
    setDrinkItems(drinkItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Spa Service Management - Modal-based
  const openSpaModal = (service?: SpaService) => {
    logger.info('ServiceForm - Opening spa modal', { service, isEdit: !!service })
    if (service) {
      setEditingSpaService(service)
      setSpaFormData(service)
    } else {
      setEditingSpaService(null)
      setSpaFormData({
        name: '',
        description: '',
        price: 0,
        duration: 60,
      })
    }
    setIsSpaModalOpen(true)
  }

  const addSpaService = () => {
    logger.info('ServiceForm - Add Spa Service clicked')
    openSpaModal()
  }

  const saveSpaService = () => {
    logger.info('ServiceForm - Save spa service clicked', { spaFormData, editingSpaService })
    
    if (!spaFormData.name || !spaFormData.price) {
      logger.info('ServiceForm - Validation failed: missing name or price')
      return
    }

    if (editingSpaService) {
      const updatedService: SpaService = {
        ...editingSpaService,
        ...spaFormData,
        id: editingSpaService.id,
      } as SpaService
      logger.info('ServiceForm - Updating spa service', updatedService)
      setSpaServices(spaServices.map(item => item.id === editingSpaService.id ? updatedService : item))
    } else {
      const newService: SpaService = {
        ...spaFormData,
        id: `spa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      } as SpaService
      logger.info('ServiceForm - Adding new spa service', newService)
      setSpaServices([...spaServices, newService])
    }
    setIsSpaModalOpen(false)
  }

  const removeSpaService = (id: string) => {
    logger.info('ServiceForm - Remove spa service clicked', { id })
    setSpaServices(spaServices.filter(item => item.id !== id))
    logger.info('ServiceForm - Spa services after remove:', spaServices.length - 1)
  }

  const updateSpaService = (id: string, field: keyof SpaService, value: any) => {
    setSpaServices(spaServices.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Room Service Management - Modal-based
  const openRoomServiceModal = (service?: RoomService) => {
    logger.info('ServiceForm - Opening room service modal', { service, isEdit: !!service })
    if (service) {
      setEditingRoomService(service)
      setRoomServiceFormData(service)
    } else {
      setEditingRoomService(null)
      setRoomServiceFormData({
        name: '',
        description: '',
        price: undefined,
      })
    }
    setIsRoomServiceModalOpen(true)
    logger.info('ServiceForm - Room service modal state set to true')
  }

  const addRoomService = () => {
    logger.info('ServiceForm - Add Room Service clicked')
    openRoomServiceModal()
  }

  const saveRoomService = () => {
    if (!roomServiceFormData.name) {
      return
    }

    if (editingRoomService) {
      const updatedService: RoomService = {
        ...editingRoomService,
        ...roomServiceFormData,
        id: editingRoomService.id,
      } as RoomService
      setRoomServices(roomServices.map(item => item.id === editingRoomService.id ? updatedService : item))
    } else {
      const newService: RoomService = {
        ...roomServiceFormData,
        id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      } as RoomService
      setRoomServices([...roomServices, newService])
    }
    setIsRoomServiceModalOpen(false)
  }

  const removeRoomService = (id: string) => {
    setRoomServices(roomServices.filter(item => item.id !== id))
  }

  // Laundry Service Management - Modal-based
  const [isLaundryModalOpen, setIsLaundryModalOpen] = useState(false)
  const [editingLaundryService, setEditingLaundryService] = useState<LaundryService | null>(null)
  const [laundryFormData, setLaundryFormData] = useState<Partial<LaundryService>>({
    name: '',
    price: 0,
  })

  const openLaundryModal = (service?: LaundryService) => {
    if (service) {
      setEditingLaundryService(service)
      setLaundryFormData(service)
    } else {
      setEditingLaundryService(null)
      setLaundryFormData({
        name: '',
        price: 0,
      })
    }
    setIsLaundryModalOpen(true)
  }

  const addLaundryService = () => {
    openLaundryModal()
  }

  const saveLaundryService = () => {
    if (!laundryFormData.name || !laundryFormData.price) {
      return
    }

    if (editingLaundryService) {
      const updatedService: LaundryService = {
        ...editingLaundryService,
        ...laundryFormData,
        id: editingLaundryService.id,
      } as LaundryService
      setLaundryServices(laundryServices.map(item => item.id === editingLaundryService.id ? updatedService : item))
    } else {
      const newService: LaundryService = {
        ...laundryFormData,
        id: `laundry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      } as LaundryService
      setLaundryServices([...laundryServices, newService])
    }
    setIsLaundryModalOpen(false)
  }

  const removeLaundryService = (id: string) => {
    setLaundryServices(laundryServices.filter(item => item.id !== id))
  }


  const updateOperatingHours = (day: keyof OperatingHours, field: 'open' | 'close' | 'closed', value: any) => {
    setOperatingHours({
      ...operatingHours,
      [day]: {
        ...operatingHours[day],
        [field]: value,
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    logger.info('ServiceForm - Submitting with menuItems:', menuItems.length, 'items')
    logger.info('ServiceForm - Menu items:', JSON.stringify(menuItems, null, 2))
    
    const submitData: any = {
      title: { en: formData.title },
      description: formData.description ? { en: formData.description } : null,
      service_type: formData.service_type,
      photos: [], // No service photos - using glass gradients instead
      operating_hours: Object.keys(operatingHours).length > 0 ? operatingHours : null,
      contact_info: contacts.some(c => c.phone || c.email || c.extension) ? contacts.map(c => ({
        name: c.name || null,
        phone: c.phone || null,
        email: c.email || null,
        extension: c.extension || null,
      })) : null,
      settings: {
        ...settings,
        background_image: backgroundImage || null,
      },
    }

    // Service-specific menu/data - ALWAYS save menu structure, even if empty
    if (formData.service_type === 'restaurant') {
      // Always save menu structure, even if items array is empty (for deletions to persist)
      const menuItemsData = menuItems.map(item => {
        logger.info('ServiceForm - Mapping menu item:', { id: item.id, name: item.name, photo: item.photo })
        return {
          id: item.id, // Preserve ID for tracking and deletion
          name: item.name,
          description: item.description,
          price: item.price,
          photo: item.photo || null, // Explicitly include photo, even if null
          category: item.category || null,
          cooking_instructions: item.cooking_instructions || null,
          ingredients: item.ingredients || null,
          dietary_info: item.dietary_info || [],
          allergens: item.allergens || [],
          preparation_time: item.preparation_time || null,
          calories: item.calories || null,
          spice_level: item.spice_level || null,
        }
      })
      
      submitData.menu = {
        categories: sortedCategories,
        items: menuItemsData
      }
      
      logger.info('ServiceForm - Prepared menu data:', JSON.stringify(submitData.menu, null, 2))
      logger.info('ServiceForm - Menu items with photos:', menuItemsData.map((i: any) => ({ name: i.name, photo: i.photo })))
    } else if (formData.service_type === 'bar') {
      // Always save menu structure, even if drinks array is empty (for deletions to persist)
      const drinkItemsData = drinkItems.map(item => {
        logger.info('ServiceForm - Mapping drink item:', { id: item.id, name: item.name, photo: item.photo })
        return {
          id: item.id, // Preserve ID for tracking and deletion
          name: item.name,
          description: item.description,
          price: item.price,
          photo: item.photo || null, // Explicitly include photo, even if null
          category: item.category || null,
          alcohol_content: item.alcohol_content || null,
        }
      })
      
      submitData.menu = {
        drinkCategories: sortedDrinkCategories,
        drinks: drinkItemsData
      }
      
      logger.info('ServiceForm - Prepared menu data:', JSON.stringify(submitData.menu, null, 2))
      logger.info('ServiceForm - Drink items with photos:', drinkItemsData.map((i: any) => ({ name: i.name, photo: i.photo })))
      if (settings.happy_hour_start || settings.happy_hour_end) {
        submitData.settings = { 
          ...submitData.settings, 
          ...settings,
          background_image: backgroundImage || submitData.settings.background_image || null
        }
      }
    } else if (formData.service_type === 'spa') {
      if (spaServices.length > 0) {
        submitData.menu = {
          services: spaServices.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            duration: item.duration,
          }))
        }
      }
      // Ensure background_image is saved even if no other settings
      if (!submitData.settings || Object.keys(submitData.settings).length === 0 || !submitData.settings.background_image) {
        submitData.settings = {
          ...submitData.settings,
          background_image: backgroundImage || null
        }
      }
    } else if (formData.service_type === 'room_service') {
      if (roomServices.length > 0) {
        submitData.menu = {
          services: roomServices.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price || 0,
          }))
        }
      }
      // Ensure background_image is saved even if no other settings
      if (!submitData.settings || Object.keys(submitData.settings).length === 0 || !submitData.settings.background_image) {
        submitData.settings = {
          ...submitData.settings,
          background_image: backgroundImage || null
        }
      }
    } else if (formData.service_type === 'gym') {
      if (settings.equipment || settings.rules) {
        submitData.settings = {
          ...submitData.settings,
          equipment: settings.equipment || null,
          rules: settings.rules || null,
          background_image: backgroundImage || submitData.settings.background_image || null
        }
      }
      // Ensure background_image is saved even if no other settings
      if (!submitData.settings || Object.keys(submitData.settings).length === 0 || !submitData.settings.background_image) {
        submitData.settings = {
          ...submitData.settings,
          background_image: backgroundImage || null
        }
      }
    } else if (formData.service_type === 'pool') {
      if (settings.rules || settings.amenities || settings.age_restriction || settings.temperature) {
        submitData.settings = {
          ...submitData.settings,
          rules: settings.rules || null,
          amenities: settings.amenities || null,
          age_restriction: settings.age_restriction || null,
          temperature: settings.temperature || null,
          background_image: backgroundImage || submitData.settings.background_image || null
        }
      }
    } else if (formData.service_type === 'laundry') {
      if (laundryServices.length > 0) {
        submitData.settings = {
          ...submitData.settings,
          services: laundryServices.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
          })),
          turnaround_time: settings.turnaround_time || null,
          pickup_delivery: settings.pickup_delivery || false,
          background_image: backgroundImage || submitData.settings.background_image || null
        }
      } else if (settings.turnaround_time || settings.pickup_delivery) {
        submitData.settings = {
          ...submitData.settings,
          turnaround_time: settings.turnaround_time || null,
          pickup_delivery: settings.pickup_delivery || false,
          background_image: backgroundImage || submitData.settings.background_image || null
        }
      }
      // Ensure background_image is saved even if no other settings
      if (!submitData.settings || Object.keys(submitData.settings).length === 0 || !submitData.settings.background_image) {
        submitData.settings = {
          ...submitData.settings,
          background_image: backgroundImage || null
        }
      }
    } else if (formData.service_type === 'concierge') {
      if (settings.services_offered) {
        submitData.settings = {
          ...submitData.settings,
          services_offered: settings.services_offered || null,
          background_image: backgroundImage || submitData.settings.background_image || null
        }
      }
    } else if (formData.service_type === 'room_service') {
      if (menuItems.length > 0) {
        submitData.menu = {
          items: menuItems.map(item => ({
            name: item.name,
            description: item.description,
            price: item.price,
            photo: item.photo || null,
            category: item.category || null,
            cooking_instructions: item.cooking_instructions || null,
            preparation_time: item.preparation_time || null,
          }))
        }
      }
      if (settings.minimum_order || settings.delivery_fee || settings.delivery_time) {
        submitData.settings = {
          ...submitData.settings,
          minimum_order: settings.minimum_order || null,
          delivery_fee: settings.delivery_fee || null,
          delivery_time: settings.delivery_time || null,
          background_image: backgroundImage || submitData.settings.background_image || null
        }
      }
    }

    // Final check: Log the complete submitData before sending
    logger.info('ServiceForm - Final submitData keys:', Object.keys(submitData))
    logger.info('ServiceForm - Final submitData.menu exists:', submitData.menu !== undefined)
    logger.info('ServiceForm - Final submitData.menu:', JSON.stringify(submitData.menu, null, 2))
    logger.info('ServiceForm - Complete submitData:', JSON.stringify(submitData, null, 2))

    onSubmit(submitData)
  }

  const isRestaurant = formData.service_type === 'restaurant'
  const isBar = formData.service_type === 'bar'
  const isSpa = formData.service_type === 'spa'
  const isGym = formData.service_type === 'gym'
  const isPool = formData.service_type === 'pool'
  const isLaundry = formData.service_type === 'laundry'
  const isConcierge = formData.service_type === 'concierge'
  const isRoomService = formData.service_type === 'room_service'
  const needsOperatingHours = isRestaurant || isBar || isSpa || isGym || isPool || isRoomService
  const needsContactInfo = isRestaurant || isBar || isSpa || isConcierge || isRoomService

  // Tab management
  const [activeTab, setActiveTab] = useState('basic')
  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    ...(needsOperatingHours ? [{ id: 'hours', label: 'Hours' }] : []),
    ...(needsContactInfo ? [{ id: 'contact', label: 'Contact' }] : []),
    ...(isRestaurant ? [{ id: 'menu', label: 'Menu' }] : []),
    ...(isBar ? [{ id: 'menu', label: 'Bar Menu' }] : []),
    ...(isSpa ? [{ id: 'services', label: 'Services' }] : []),
    ...(isGym ? [{ id: 'settings', label: 'Settings' }] : []),
    ...(isPool ? [{ id: 'settings', label: 'Settings' }] : []),
    ...(isLaundry ? [{ id: 'settings', label: 'Settings' }] : []),
    ...(isConcierge ? [{ id: 'settings', label: 'Settings' }] : []),
    ...(isRoomService ? [{ id: 'services', label: 'Services' }, { id: 'settings', label: 'Settings' }] : []),
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tab Navigation */}
      <ServiceFormTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {/* Basic Information */}
      {activeTab === 'basic' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Main Restaurant"
              required
            />
        </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Service description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Background Image</label>
            <p className="text-xs text-gray-500 mb-2">
              Upload a custom background image for this service. If not provided, a default image will be used based on service type.
            </p>
            <div className="space-y-3">
              {backgroundImage && (
                <div className="relative max-w-xs h-48 border border-gray-300 rounded-lg overflow-hidden">
                  <img 
                    src={backgroundImage} 
                    alt="Background preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      // Delete old image from storage if it's in hotelId folder
                      if (backgroundImage) {
                        await deleteOldBackgroundImage(backgroundImage)
                      }
                      setBackgroundImage(null)
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full text-lg hover:bg-red-600 flex items-center justify-center shadow-md"
                    title="Remove background image"
                  >
                    ×
                  </button>
                </div>
              )}
              {uploadingBackground && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Uploading...</span>
                </div>
              )}
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageUpload}
                  disabled={uploadingBackground}
                  className="hidden"
                />
                <span className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors ${
                  uploadingBackground ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {backgroundImage ? 'Change Background Image' : 'Upload Background Image'}
                </span>
              </label>
            </div>
          </div>
        </div>
        </div>
      )}
      
      {/* Operating Hours */}
      {needsOperatingHours && activeTab === 'hours' && (
      <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Operating Hours</h3>
            <p className="text-sm text-gray-500 mb-1">Set the opening and closing times for each day of the week</p>
            <p className="text-xs text-gray-500">
              Times are in hotel timezone ({hotelTimezone}). Current time: {getHotelTime(hotelTimezone)}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
                const newHours: OperatingHours = {}
                allDays.forEach(day => {
                  newHours[day] = { open: '09:00', close: '17:00', closed: false }
                })
                setOperatingHours(newHours)
              }}
              className="text-xs"
            >
              Set All 9 AM - 5 PM
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
                const newHours: OperatingHours = {}
                allDays.forEach(day => {
                  newHours[day] = { open: '08:00', close: '22:00', closed: false }
                })
                setOperatingHours(newHours)
              }}
              className="text-xs"
            >
              Set All 8 AM - 10 PM
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
                const newHours: OperatingHours = {}
                allDays.forEach(day => {
                  newHours[day] = { open: '', close: '', closed: true }
                })
                setOperatingHours(newHours)
              }}
              className="text-xs text-red-600 border-red-300 hover:bg-red-50"
            >
              Close All Days
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 w-24">Day</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 w-32">Open</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700 w-32">Close</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                  const dayHours = operatingHours[day] || { open: '', close: '', closed: false }
                  const dayNames: Record<string, { short: string; full: string }> = {
                    monday: { short: 'Mon', full: 'Monday' },
                    tuesday: { short: 'Tue', full: 'Tuesday' },
                    wednesday: { short: 'Wed', full: 'Wednesday' },
                    thursday: { short: 'Thu', full: 'Thursday' },
                    friday: { short: 'Fri', full: 'Friday' },
                    saturday: { short: 'Sat', full: 'Saturday' },
                    sunday: { short: 'Sun', full: 'Sunday' }
                  }
                  
                  return (
                    <tr key={day} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <span className={`text-xs font-medium ${
                          dayHours.closed ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          {dayNames[day].full}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {!dayHours.closed ? (
                          <Input
                            type="time"
                            value={dayHours.open || ''}
                            onChange={(e) => updateOperatingHours(day, 'open', e.target.value)}
                            className="w-28 text-xs py-1.5 h-8 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {!dayHours.closed ? (
                          <Input
                            type="time"
                            value={dayHours.close || ''}
                            onChange={(e) => updateOperatingHours(day, 'close', e.target.value)}
                            className="w-28 text-xs py-1.5 h-8 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {dayHours.closed ? (
                          <button
                            type="button"
                            onClick={() => updateOperatingHours(day, 'closed', false)}
                            className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          >
                            Open
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateOperatingHours(day, 'closed', true)}
                            className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contact Information */}
      {needsContactInfo && activeTab === 'contact' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
            <Button
              type="button"
              onClick={addContact}
              size="sm"
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 whitespace-nowrap"
            >
              <span>Add Contact</span>
            </Button>
          </div>
          
          <div className="space-y-4">
            {contacts.map((contact, index) => (
              <div key={contact.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Contact {index + 1}
                  </h4>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(contact.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <Input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <Input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(contact.id, 'phone', formatPhoneNumber(e.target.value))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(contact.id, 'email', formatEmail(e.target.value))}
                      placeholder="service@hotel.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Extension</label>
                    <Input
                      type="text"
                      value={contact.extension}
                      onChange={(e) => updateContact(contact.id, 'extension', e.target.value)}
                      placeholder="123"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restaurant Menu */}
      {isRestaurant && activeTab === 'menu' && (
        <div>
          {/* Header with Actions */}
          <div className="flex items-center justify-between mb-4">
            <Button
              type="button"
              onClick={() => openCategoryModal()}
              variant="outline"
              size="sm"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 whitespace-nowrap"
            >
              <span>Add Category</span>
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                logger.info('ServiceForm - Add Menu Item button clicked directly')
                addMenuItem()
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            >
              <span>Add Menu Item</span>
            </Button>
          </div>

          {/* Menu Items by Category */}
          {sortedCategories.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-500 text-sm">Create your first category to organize menu items</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedCategories.map((category) => {
                const categoryItems = menuItems.filter(item => item.category === category.name)
                const uncategorizedItems = category.name === 'No Category' 
                  ? menuItems.filter(item => !item.category || !categoryNames.includes(item.category))
                  : []
                const isCollapsed = collapsedCategories.has(category.id)
                const itemCount = categoryItems.length + uncategorizedItems.length

                return (
                  <div key={category.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    {/* Compact Category Header */}
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category.id)}
                          className="p-0.5 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                          title={isCollapsed ? 'Expand' : 'Collapse'}
                        >
                          <svg 
                            className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <h3 className="text-sm font-semibold text-gray-900 truncate ml-1">{category.name}</h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-1">
                          ({itemCount})
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveCategory(category.id, 'up')}
                            disabled={category.order === 0 || category.order === 1}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCategory(category.id, 'down')}
                            disabled={category.order === sortedCategories.length - 1}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        {category.name !== 'No Category' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openCategoryModal(category)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit category"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteCategoryModal(category.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete category"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Category Items - Collapsible */}
                    {!isCollapsed && (
                      <div className="p-2">
                        {itemCount === 0 ? (
                          <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded bg-gray-50">
                            <p className="text-gray-500 text-xs">No items in this category</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {[...categoryItems, ...uncategorizedItems].map((item) => (
                              <MenuItemCard
                                key={item.id}
                                item={item}
                                onEdit={openMenuModal}
                                onRemove={removeMenuItem}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Category Modal */}
          <Modal
            isOpen={isCategoryModalOpen}
            onClose={() => setIsCategoryModalOpen(false)}
            title={editingCategory ? 'Edit Category' : 'Add Category'}
            size="md"
          >
            <div className="space-y-4">
              <div>
                <label className="menu-label-compact">Category Name *</label>
                <Input
                  placeholder="e.g., Appetizers, Main Courses..."
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ name: e.target.value })}
                  className="bg-gray-50 border-gray-300 h-9 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={saveCategory}
                  disabled={!categoryFormData.name.trim()}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingCategory ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete Category Modal */}
          <Modal
            isOpen={isDeleteCategoryModalOpen}
            onClose={() => {
              setIsDeleteCategoryModalOpen(false)
              setCategoryToDelete(null)
            }}
            title="Delete Category"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete the category <strong>"{categoryToDelete?.name}"</strong>?
              </p>
              <p className="text-xs text-gray-500">
                All items in this category will be moved to "No Category".
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsDeleteCategoryModalOpen(false)
                    setCategoryToDelete(null)
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmDeleteCategory}
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </Modal>

          {/* Compact Menu Item Modal */}
          <Modal
            isOpen={isMenuModalOpen}
            onClose={() => setIsMenuModalOpen(false)}
            title={editingMenuItem ? 'Edit Item' : 'Add Item'}
            size="lg"
          >
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="menu-label-compact">Dish Name *</label>
                  <Input
                    placeholder="e.g., Grilled Salmon"
                    value={menuFormData.name || ''}
                    onChange={(e) => setMenuFormData({ ...menuFormData, name: e.target.value })}
                    className="bg-gray-50 border-gray-300 h-9 text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="menu-label-compact">Description *</label>
                  <textarea
                    placeholder="Brief description..."
                    value={menuFormData.description || ''}
                    onChange={(e) => setMenuFormData({ ...menuFormData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] text-sm"
                  />
                </div>

                <div>
                  <label className="menu-label-compact">Price ($) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={menuFormData.price || ''}
                    onChange={(e) => setMenuFormData({ ...menuFormData, price: parseFloat(e.target.value) || 0 })}
                    className="bg-gray-50 border-gray-300 h-9 text-sm"
                  />
                </div>

                  <div>
                    <label className="menu-label-compact">Category *</label>
        <select
                      value={menuFormData.category || 'No Category'}
                      onChange={(e) => setMenuFormData({ ...menuFormData, category: e.target.value })}
          required
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-9 text-sm"
                    >
                      {sortedCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

                <div className="col-span-2">
                  <label className="menu-label-compact">Image</label>
                  <div className="space-y-2">
                    {menuFormData.photo && (
                      <div className="relative w-24 h-24 border border-gray-300 rounded overflow-hidden">
                        <img src={menuFormData.photo} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setMenuFormData({ ...menuFormData, photo: undefined })}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center shadow-md"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {uploadingMenuPhoto && uploadingMenuPhoto === (editingMenuItem?.id || 'new') && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Uploading...</span>
                      </div>
                    )}
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            try {
                              const tempId = editingMenuItem?.id || 'new'
                              setUploadingMenuPhoto(tempId)
                              const photoUrl = await handleMenuPhotoUpload(file, tempId, 'menu')
                              setMenuFormData({ ...menuFormData, photo: photoUrl })
                              logger.info('Menu item photo set in form data:', photoUrl)
                            } catch (error) {
                              logger.error('Upload failed:', error)
                              // Error is already shown in handleMenuPhotoUpload
                            }
                          }
                        }}
                        disabled={uploadingMenuPhoto === (editingMenuItem?.id || 'new')}
                        className="hidden"
                      />
                      <span className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors ${
                        uploadingMenuPhoto === (editingMenuItem?.id || 'new') ? 'opacity-50 cursor-not-allowed' : ''
                      }`}>
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {menuFormData.photo ? 'Change Image' : 'Upload Image'}
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="menu-label-compact">Prep Time (min)</label>
      <Input
        type="number"
                    placeholder="15"
                    value={menuFormData.preparation_time || ''}
                    onChange={(e) => setMenuFormData({ ...menuFormData, preparation_time: parseInt(e.target.value) || 0 })}
                    className="bg-gray-50 border-gray-300 h-9 text-sm"
                  />
                </div>

                <div>
                  <label className="menu-label-compact">Calories</label>
      <Input
        type="number"
                    placeholder="450"
                    value={menuFormData.calories || ''}
                    onChange={(e) => setMenuFormData({ ...menuFormData, calories: parseInt(e.target.value) || 0 })}
                    className="bg-gray-50 border-gray-300 h-9 text-sm"
                  />
                </div>

                <div>
                  <label className="menu-label-compact">Spice Level</label>
                  <select
                    value={menuFormData.spice_level || 'None'}
                    onChange={(e) => setMenuFormData({ ...menuFormData, spice_level: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-9 text-sm"
                  >
                    {spiceLevels.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="menu-label-compact">Ingredients</label>
                  <textarea
                    placeholder="Main ingredients..."
                    value={menuFormData.ingredients || ''}
                    onChange={(e) => setMenuFormData({ ...menuFormData, ingredients: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[50px] text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="menu-label-compact mb-2 block">Dietary</label>
                  <div className="flex flex-wrap gap-1.5">
                    {dietaryOptions.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleDietary(option)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          menuFormData.dietary_info?.includes(option)
                            ? 'bg-green-100 text-green-700 border border-green-400'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compact Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    logger.info('ServiceForm - Save button in modal clicked')
                    saveMenuItem()
                  }}
                  disabled={!menuFormData.name || !menuFormData.price}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingMenuItem ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* Bar Menu */}
      {isBar && activeTab === 'menu' && (
        <div>
          {/* Header with Actions */}
          <div className="flex items-center justify-between mb-4">
            <Button
              type="button"
              onClick={() => openDrinkCategoryModal()}
              variant="outline"
              size="sm"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 whitespace-nowrap"
            >
              <span>Add Category</span>
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                logger.info('ServiceForm - Add Drink button clicked directly')
                addDrinkItem()
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            >
              <span>Add Drink</span>
            </Button>
          </div>

          {/* Drinks by Category */}
          {sortedDrinkCategories.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-500 text-sm">Create your first category to organize drinks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedDrinkCategories.map((category) => {
                const categoryDrinks = drinkItems.filter(item => item.category === category.name)
                const uncategorizedDrinks = category.name === 'No Category' 
                  ? drinkItems.filter(item => !item.category || !drinkCategoryNames.includes(item.category))
                  : []
                const isCollapsed = collapsedDrinkCategories.has(category.id)
                const drinkCount = categoryDrinks.length + uncategorizedDrinks.length

                return (
                  <div key={category.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                    {/* Compact Category Header */}
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleDrinkCategory(category.id)}
                          className="p-0.5 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                          title={isCollapsed ? 'Expand' : 'Collapse'}
                        >
                          <svg 
                            className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <h3 className="text-sm font-semibold text-gray-900 truncate ml-1">{category.name}</h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-1">
                          ({drinkCount})
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveDrinkCategory(category.id, 'up')}
                            disabled={category.order === 0 || category.order === 1}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDrinkCategory(category.id, 'down')}
                            disabled={category.order === sortedDrinkCategories.length - 1}
                            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        {category.name !== 'No Category' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openDrinkCategoryModal(category)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit category"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteDrinkCategoryModal(category.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete category"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Category Drinks - Collapsible */}
                    {!isCollapsed && (
                      <div className="p-2">
                        {drinkCount === 0 ? (
                          <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded bg-gray-50">
                            <p className="text-gray-500 text-xs">No drinks in this category</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {[...categoryDrinks, ...uncategorizedDrinks].map((item) => (
                              <Card key={item.id} className="overflow-hidden bg-white border-gray-200 hover:shadow-lg transition-shadow group">
                                <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                                  {item.photo ? (
                                    <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                      </svg>
                                    </div>
                                  )}
                                  <div className="absolute top-2 right-2 flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => openDrinkModal(item)}
                                      className="w-7 h-7 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                                      title="Edit"
                                    >
                                      <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeDrinkItem(item.id)}
                                      className="w-7 h-7 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                                      title="Delete"
                                    >
                                      <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                <div className="p-3">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">{item.name}</h3>
                                    <span className="text-blue-600 flex items-center gap-0.5 text-sm font-semibold shrink-0">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      {item.price.toFixed(2)}
                                    </span>
                                  </div>
                                  <p className="text-gray-600 text-xs mb-2 line-clamp-2">{item.description}</p>
                                  {item.alcohol_content && (
                                    <div className="text-xs text-gray-500">
                                      <span className="font-medium">ABV:</span> {item.alcohol_content}
                                    </div>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Happy Hour Settings */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-md font-semibold text-gray-900 mb-2">Happy Hour</h4>
            <p className="text-xs text-gray-500 mb-4">
              Times are in hotel timezone ({hotelTimezone}). Current time: {getHotelTime(hotelTimezone)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <Input
                  type="time"
                  value={settings.happy_hour_start || ''}
                  onChange={(e) => setSettings({ ...settings, happy_hour_start: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <Input
                  type="time"
                  value={settings.happy_hour_end || ''}
                  onChange={(e) => setSettings({ ...settings, happy_hour_end: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Drink Modal */}
          <Modal
            isOpen={isDrinkModalOpen}
            onClose={() => setIsDrinkModalOpen(false)}
            title={editingDrinkItem ? 'Edit Drink' : 'Add Drink'}
            size="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="menu-label-compact">Drink Name *</label>
                  <Input
                    placeholder="e.g., Mojito"
                    value={drinkFormData.name || ''}
                    onChange={(e) => setDrinkFormData({ ...drinkFormData, name: e.target.value })}
                    className="bg-gray-50 border-gray-300 h-9 text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="menu-label-compact">Description *</label>
                  <textarea
                    placeholder="Brief description..."
                    value={drinkFormData.description || ''}
                    onChange={(e) => setDrinkFormData({ ...drinkFormData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] text-sm"
                  />
                </div>

                <div>
                  <label className="menu-label-compact">Price ($) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={drinkFormData.price || ''}
                    onChange={(e) => setDrinkFormData({ ...drinkFormData, price: parseFloat(e.target.value) || 0 })}
                    className="bg-gray-50 border-gray-300 h-9 text-sm"
                  />
                </div>

                <div>
                  <label className="menu-label-compact">Category *</label>
                  <select
                    value={drinkFormData.category || 'No Category'}
                    onChange={(e) => setDrinkFormData({ ...drinkFormData, category: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-9 text-sm"
                  >
                    {sortedDrinkCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="menu-label-compact">Alcohol Content</label>
                  <Input
                    placeholder="e.g., 40% ABV"
                    value={drinkFormData.alcohol_content || ''}
                    onChange={(e) => setDrinkFormData({ ...drinkFormData, alcohol_content: e.target.value })}
                    className="bg-gray-50 border-gray-300 h-9 text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="menu-label-compact">Image</label>
                  <div className="space-y-2">
                    {drinkFormData.photo && (
                      <div className="relative w-24 h-24 border border-gray-300 rounded overflow-hidden">
                        <img src={drinkFormData.photo} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setDrinkFormData({ ...drinkFormData, photo: undefined })}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center shadow-md"
                          title="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {uploadingMenuPhoto && uploadingMenuPhoto === (editingDrinkItem?.id || 'new-drink') && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Uploading...</span>
                      </div>
                    )}
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            try {
                              const tempId = editingDrinkItem?.id || 'new-drink'
                              setUploadingMenuPhoto(tempId)
                              const photoUrl = await handleMenuPhotoUpload(file, tempId, 'drink')
                              setDrinkFormData({ ...drinkFormData, photo: photoUrl })
                              logger.info('Drink item photo set in form data:', photoUrl)
                            } catch (error) {
                              logger.error('Upload failed:', error)
                              // Error is already shown in handleMenuPhotoUpload
                            }
                          }
                        }}
                        disabled={uploadingMenuPhoto === (editingDrinkItem?.id || 'new-drink')}
                        className="hidden"
                      />
                      <span className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors ${
                        uploadingMenuPhoto === (editingDrinkItem?.id || 'new-drink') ? 'opacity-50 cursor-not-allowed' : ''
                      }`}>
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {drinkFormData.photo ? 'Change Image' : 'Upload Image'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsDrinkModalOpen(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    logger.info('ServiceForm - Save drink button clicked')
                    saveDrinkItem()
                  }}
                  disabled={!drinkFormData.name || !drinkFormData.price}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingDrinkItem ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Drink Category Modal */}
          <Modal
            isOpen={isDrinkCategoryModalOpen}
            onClose={() => setIsDrinkCategoryModalOpen(false)}
            title={editingDrinkCategory ? 'Edit Category' : 'Add Category'}
            size="md"
          >
            <div className="space-y-4">
              <div>
                <label className="menu-label-compact">Category Name *</label>
                <Input
                  placeholder="e.g., Cocktails"
                  value={drinkCategoryFormData.name}
                  onChange={(e) => setDrinkCategoryFormData({ name: e.target.value })}
                  className="bg-gray-50 border-gray-300 h-9 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsDrinkCategoryModalOpen(false)}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={saveDrinkCategory}
                  disabled={!drinkCategoryFormData.name.trim()}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingDrinkCategory ? 'Update' : 'Add'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Delete Drink Category Modal */}
          <Modal
            isOpen={isDeleteDrinkCategoryModalOpen}
            onClose={() => {
              setIsDeleteDrinkCategoryModalOpen(false)
              setDrinkCategoryToDelete(null)
            }}
            title="Delete Category"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete the category <strong>"{drinkCategoryToDelete?.name}"</strong>?
              </p>
              <p className="text-xs text-gray-500">
                All drinks in this category will be moved to "No Category".
              </p>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsDeleteDrinkCategoryModalOpen(false)
                    setDrinkCategoryToDelete(null)
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmDeleteDrinkCategory}
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* Spa Services */}
      {isSpa && activeTab === 'services' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-900">Spa Services</h3>
            <Button 
              type="button" 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                logger.info('ServiceForm - Add Spa Service button clicked directly')
                addSpaService()
              }} 
              variant="outline" 
              size="sm"
            >
              Add Service
            </Button>
          </div>

          {spaServices.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <p className="text-gray-500 text-sm mb-3">No services yet</p>
              <Button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  logger.info('ServiceForm - Add First Spa Service button clicked')
                  addSpaService()
                }} 
                variant="outline" 
                size="sm"
              >
                Add First Service
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {spaServices.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Service Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900 truncate">{item.name || 'Unnamed Service'}</h4>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm font-semibold text-gray-900">${item.price?.toFixed(2) || '0.00'}</span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-600">{item.duration || 0} min</span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <Button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        openSpaModal(item)
                      }} 
                      variant="outline" 
                      size="sm"
                      className="h-8 px-3 text-xs"
                    >
                      Edit
                    </Button>
                    <Button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeSpaService(item.id)
                      }} 
                      variant="danger" 
                      size="sm"
                      className="h-8 px-3 text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Gym Settings */}
      {isGym && activeTab === 'settings' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Fitness Center Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Equipment List</label>
              <textarea
                value={settings.equipment || ''}
                onChange={(e) => setSettings({ ...settings, equipment: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="List equipment available (one per line)..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rules & Regulations</label>
              <textarea
                value={settings.rules || ''}
                onChange={(e) => setSettings({ ...settings, rules: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Gym rules and regulations..."
              />
            </div>

          </div>
        </Card>
      )}

      {/* Pool Settings */}
      {isPool && activeTab === 'settings' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Pool Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rules & Regulations</label>
              <textarea
                value={settings.rules || ''}
                onChange={(e) => setSettings({ ...settings, rules: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Pool rules and regulations..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
              <textarea
                value={settings.amenities || ''}
                onChange={(e) => setSettings({ ...settings, amenities: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Available amenities (towels, loungers, etc.)..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age Restriction</label>
                <Input
                  value={settings.age_restriction || ''}
                  onChange={(e) => setSettings({ ...settings, age_restriction: e.target.value })}
                  placeholder="e.g., 18+, Children must be supervised"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pool Temperature</label>
                <Input
                  type="text"
                  value={settings.temperature || ''}
                  onChange={(e) => setSettings({ ...settings, temperature: e.target.value })}
                  placeholder="e.g., 78°F / 26°C"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Laundry Settings */}
      {isLaundry && activeTab === 'settings' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-900">Laundry Services</h3>
            <Button 
              type="button" 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                addLaundryService()
              }} 
              variant="outline" 
              size="sm"
            >
              Add Service
            </Button>
          </div>

          {laundryServices.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <p className="text-gray-500 text-sm mb-3">No services yet</p>
              <Button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  addLaundryService()
                }} 
                variant="outline" 
                size="sm"
              >
                Add First Service
              </Button>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {laundryServices.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900 truncate">{item.name || 'Unnamed Service'}</h4>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm font-semibold text-gray-900">${item.price?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <Button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        openLaundryModal(item)
                      }} 
                      variant="outline" 
                      size="sm"
                      className="h-8 px-3 text-xs"
                    >
                      Edit
                    </Button>
                    <Button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeLaundryService(item.id)
                      }} 
                      variant="danger" 
                      size="sm"
                      className="h-8 px-3 text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Turnaround Time</label>
                <Input
                  value={settings.turnaround_time || ''}
                  onChange={(e) => setSettings({ ...settings, turnaround_time: e.target.value })}
                  placeholder="e.g., Same day, 24 hours, 48 hours"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.pickup_delivery || false}
                    onChange={(e) => setSettings({ ...settings, pickup_delivery: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Pickup & Delivery Available</span>
                </label>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Concierge Settings */}
      {isConcierge && activeTab === 'settings' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Concierge Services</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Services Offered</label>
            <textarea
              value={settings.services_offered || ''}
              onChange={(e) => setSettings({ ...settings, services_offered: e.target.value })}
              rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="List services offered (Tours, Tickets, Transportation, Restaurant Reservations, etc.)..."
            />
          </div>
        </Card>
      )}

      {/* Room Services */}
      {isRoomService && activeTab === 'services' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-900">Room Services</h3>
            <Button 
              type="button" 
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                logger.info('ServiceForm - Add Service button clicked directly')
                addRoomService()
              }} 
              variant="outline" 
              size="sm"
            >
              Add Service
            </Button>
          </div>

          {roomServices.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <p className="text-gray-500 text-sm mb-3">No services yet</p>
              <Button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  logger.info('ServiceForm - Add First Room Service button clicked')
                  addRoomService()
                }} 
                variant="outline" 
                size="sm"
              >
                Add First Service
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {roomServices.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Service Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900 truncate">{item.name || 'Unnamed Service'}</h4>
                        {item.price !== undefined && item.price !== null && (
                          <>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm font-semibold text-gray-900">${item.price.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <Button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        openRoomServiceModal(item)
                      }} 
                      variant="outline" 
                      size="sm"
                      className="h-8 px-3 text-xs"
                    >
                      Edit
                    </Button>
                    <Button 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeRoomService(item.id)
                      }} 
                      variant="danger" 
                      size="sm"
                      className="h-8 px-3 text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}


      {/* Room Service Settings */}
      {isRoomService && activeTab === 'settings' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Room Service Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={settings.minimum_order || ''}
                onChange={(e) => setSettings({ ...settings, minimum_order: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Fee</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={settings.delivery_fee || ''}
                onChange={(e) => setSettings({ ...settings, delivery_fee: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
      </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time (minutes)</label>
              <Input
                type="number"
                min="0"
                value={settings.delivery_time || ''}
                onChange={(e) => setSettings({ ...settings, delivery_time: parseInt(e.target.value) || 0 })}
                placeholder="30"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Spa Service Modal */}
      <Modal
        isOpen={isSpaModalOpen}
        onClose={() => {
          setIsSpaModalOpen(false)
          setEditingSpaService(null)
          setSpaFormData({
            name: '',
            description: '',
            price: 0,
            duration: 60,
          })
        }}
        title={editingSpaService ? 'Edit Spa Service' : 'Add Spa Service'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Swedish Massage"
              value={spaFormData.name || ''}
              onChange={(e) => setSpaFormData({ ...spaFormData, name: e.target.value })}
              className="bg-gray-50 border-gray-300"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={spaFormData.price || 0}
              onChange={(e) => setSpaFormData({ ...spaFormData, price: parseFloat(e.target.value) || 0 })}
              className="bg-gray-50 border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0"
              placeholder="60"
              value={spaFormData.duration || 60}
              onChange={(e) => setSpaFormData({ ...spaFormData, duration: parseInt(e.target.value) || 60 })}
              className="bg-gray-50 border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={spaFormData.description || ''}
              onChange={(e) => setSpaFormData({ ...spaFormData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              placeholder="Service description..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={() => {
                setIsSpaModalOpen(false)
                setEditingSpaService(null)
                setSpaFormData({
                  name: '',
                  description: '',
                  price: 0,
                  duration: 60,
                })
              }}
              variant="outline"
              size="sm"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveSpaService}
              disabled={!spaFormData.name || !spaFormData.price}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingSpaService ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Room Service Modal */}
      <Modal
        isOpen={isRoomServiceModalOpen}
        onClose={() => {
          setIsRoomServiceModalOpen(false)
          setEditingRoomService(null)
          setRoomServiceFormData({
            name: '',
            description: '',
            price: 0,
          })
        }}
        title={editingRoomService ? 'Edit Room Service' : 'Add Room Service'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Caesar Salad, Grilled Chicken"
              value={roomServiceFormData.name || ''}
              onChange={(e) => setRoomServiceFormData({ ...roomServiceFormData, name: e.target.value })}
              className="bg-gray-50 border-gray-300"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={roomServiceFormData.price || ''}
              onChange={(e) => setRoomServiceFormData({ ...roomServiceFormData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="bg-gray-50 border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={roomServiceFormData.description || ''}
              onChange={(e) => setRoomServiceFormData({ ...roomServiceFormData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              placeholder="Service description..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={() => {
                setIsRoomServiceModalOpen(false)
                setEditingRoomService(null)
                setRoomServiceFormData({
                  name: '',
                  description: '',
                  price: 0,
                })
              }}
              variant="outline"
              size="sm"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveRoomService}
              disabled={!roomServiceFormData.name}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingRoomService ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Laundry Service Modal */}
      <Modal
        isOpen={isLaundryModalOpen}
        onClose={() => {
          setIsLaundryModalOpen(false)
          setEditingLaundryService(null)
          setLaundryFormData({
            name: '',
            price: 0,
          })
        }}
        title={editingLaundryService ? 'Edit Laundry Service' : 'Add Laundry Service'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Wash & Fold, Dry Cleaning, Pressing"
              value={laundryFormData.name || ''}
              onChange={(e) => setLaundryFormData({ ...laundryFormData, name: e.target.value })}
              className="bg-gray-50 border-gray-300"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={laundryFormData.price || 0}
              onChange={(e) => setLaundryFormData({ ...laundryFormData, price: parseFloat(e.target.value) || 0 })}
              className="bg-gray-50 border-gray-300"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={() => {
                setIsLaundryModalOpen(false)
                setEditingLaundryService(null)
                setLaundryFormData({
                  name: '',
                  price: 0,
                })
              }}
              variant="outline"
              size="sm"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveLaundryService}
              disabled={!laundryFormData.name || !laundryFormData.price}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingLaundryService ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} size="sm">
          Cancel
        </Button>
        <Button type="submit" size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
          {service ? 'Update Service' : 'Create Service'}
        </Button>
      </div>
    </form>
  )
}
