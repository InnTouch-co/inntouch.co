import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface Promotion {
  id: string
  hotel_id: string
  title: string
  description: string | null
  short_description: string | null
  image_url: string | null
  banner_duration_seconds: number
  is_active: boolean
  show_banner: boolean
  show_always: boolean
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  days_of_week: number[]
  discount_type: 'percentage' | 'fixed_amount' | 'free_item'
  discount_value: number
  min_order_amount: number
  max_discount_amount: number | null
  applies_to_all_products: boolean
  applies_to_service_types: string[] | null
  created_by: string | null
  created_at: string
  updated_at: string | null
  is_deleted: boolean
}

export interface PromotionProductDiscount {
  id: string
  promotion_id: string
  product_id: string | null // Nullable for menu items
  service_id: string | null // For menu item discounts
  menu_item_name: string | null // Normalized menu item name (lowercase, trimmed)
  item_type: 'product' | 'menu_item' // Type of item
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  max_discount_amount: number | null
  created_at: string
  is_deleted: boolean
}

export interface PromotionInsert {
  hotel_id: string
  title: string
  description?: string | null
  short_description?: string | null
  image_url?: string | null
  banner_duration_seconds?: number
  is_active?: boolean
  show_banner?: boolean
  show_always?: boolean
  start_date?: string | null
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  days_of_week?: number[]
  discount_type?: 'percentage' | 'fixed_amount' | 'free_item'
  discount_value: number
  min_order_amount?: number
  max_discount_amount?: number | null
  applies_to_all_products?: boolean
  applies_to_service_types?: string[] | null
  created_by?: string | null
}

/**
 * Get all active promotions for banners (Instagram stories style - multiple banners)
 * Checks time-based rules and returns all valid promotions
 */
export async function getActivePromotions(hotelId: string): Promise<Promotion[]> {
  const supabase = await createClient()
  
  // Get hotel timezone for accurate time comparison
  const { getHotelTimezone, getHotelCurrentDateTime } = await import('@/lib/utils/hotel-timezone')
  const hotelTimezone = await getHotelTimezone(hotelId)
  const { date: currentDate, time: currentTimeStr } = await getHotelCurrentDateTime(hotelId)
  const currentTime = currentTimeStr + ':00' // HH:MM:00 format
  
  // Get current day of week in hotel timezone
  const { getHotelCurrentDayOfWeek } = await import('@/lib/utils/hotel-timezone')
  const currentDay = await getHotelCurrentDayOfWeek(hotelId)

  try {
    // Get all promotions with image_url (required for banner display)
    const { data, error } = await supabase
      .from('promotions')
      .select('id, hotel_id, title, description, short_description, image_url, banner_duration_seconds, is_active, show_banner, show_always, start_date, end_date, start_time, end_time, days_of_week, discount_type, discount_value, min_order_amount, max_discount_amount, applies_to_all_products, applies_to_service_types, created_by, created_at, updated_at, is_deleted')
      .eq('hotel_id', hotelId)
      .eq('is_active', true)
      .eq('show_banner', true)
      .not('image_url', 'is', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching active promotions:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Filter promotions by time/date rules
    const validPromotions: Promotion[] = []

    for (const promotion of data) {
      // If show_always is true, skip all time/date checks
      if (!promotion.show_always) {
        // Check date range
        if (promotion.start_date && currentDate < promotion.start_date) {
          continue
        }
        if (promotion.end_date && currentDate > promotion.end_date) {
          continue
        }

        // Check day of week
        if (promotion.days_of_week && promotion.days_of_week.length > 0) {
          if (!promotion.days_of_week.includes(currentDay)) {
            continue
          }
        }

        // Check time range (if specified)
        if (promotion.start_time && promotion.end_time) {
          const startTime = promotion.start_time.slice(0, 5) + ':00'
          const endTime = promotion.end_time.slice(0, 5) + ':00'
          
          if (currentTime < startTime || currentTime > endTime) {
            continue
          }
        }
      }

      // This promotion is valid
      validPromotions.push(promotion as Promotion)
    }

    return validPromotions
  } catch (error) {
    logger.error('Error in getActivePromotions:', error)
    return []
  }
}

/**
 * Get active promotion for a hotel (optimized query with specific columns)
 * Checks time-based rules and returns only valid promotions
 * @deprecated Use getActivePromotions for multiple banners support
 */
export async function getActivePromotion(hotelId: string): Promise<Promotion | null> {
  const promotions = await getActivePromotions(hotelId)
  return promotions.length > 0 ? promotions[0] : null
}

/**
 * Get active promotion for discount purposes (not just banner)
 * This checks all active promotions, not just those with banners
 */
export async function getActivePromotionForDiscount(hotelId: string, serviceType?: string): Promise<Promotion | null> {
  const supabase = await createClient()
  
  // Get hotel timezone for accurate time comparison
  const { getHotelTimezone, getHotelCurrentDateTime } = await import('@/lib/utils/hotel-timezone')
  const hotelTimezone = await getHotelTimezone(hotelId)
  const { date: currentDate, time: currentTimeStr } = await getHotelCurrentDateTime(hotelId)
  const currentTime = currentTimeStr + ':00' // HH:MM:00 format
  
  // Get current day of week in hotel timezone
  const { getHotelCurrentDayOfWeek } = await import('@/lib/utils/hotel-timezone')
  const currentDay = await getHotelCurrentDayOfWeek(hotelId)

  // Normalize service type for consistent comparison
  const normalizedServiceType = serviceType ? serviceType.toLowerCase().trim() : null

  try {
    // Get all active promotions (not just banner ones)
    let query = supabase
      .from('promotions')
      .select('id, hotel_id, title, description, short_description, image_url, banner_duration_seconds, is_active, show_banner, show_always, start_date, end_date, start_time, end_time, days_of_week, discount_type, discount_value, min_order_amount, max_discount_amount, applies_to_all_products, applies_to_service_types, created_by, created_at, updated_at, is_deleted')
      .eq('hotel_id', hotelId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching active promotions for discount:', error)
      return null
    }

    if (!data || data.length === 0) {
      logger.info('No active promotions found in database', {
        hotelId,
        serviceType: normalizedServiceType
      })
      return null
    }

    logger.info('Found active promotions in database', {
      hotelId,
      serviceType: normalizedServiceType,
      count: data.length,
      promotionIds: data.map((p: any) => p.id)
    })

    // Check each promotion for time/date validity and service type applicability
    for (const promotion of data) {
      logger.info('Checking promotion for validity', {
        promotionId: promotion.id,
        show_always: promotion.show_always,
        start_date: promotion.start_date,
        end_date: promotion.end_date,
        start_time: promotion.start_time,
        end_time: promotion.end_time,
        days_of_week: promotion.days_of_week,
        currentDate,
        currentTime,
        currentDay
      })

      // If show_always is true, skip all time/date checks
      if (!promotion.show_always) {
        // Check date range
        if (promotion.start_date && currentDate < promotion.start_date) {
          logger.info('Promotion skipped: before start date', {
            promotionId: promotion.id,
            currentDate,
            start_date: promotion.start_date
          })
          continue
        }
        if (promotion.end_date && currentDate > promotion.end_date) {
          logger.info('Promotion skipped: after end date', {
            promotionId: promotion.id,
            currentDate,
            end_date: promotion.end_date
          })
          continue
        }

        // Check day of week
        if (promotion.days_of_week && promotion.days_of_week.length > 0) {
          if (!promotion.days_of_week.includes(currentDay)) {
            logger.info('Promotion skipped: not valid for current day', {
              promotionId: promotion.id,
              currentDay,
              days_of_week: promotion.days_of_week
            })
            continue
          }
        }

        // Check time range (if specified)
        if (promotion.start_time && promotion.end_time) {
          const startTime = promotion.start_time.slice(0, 5) + ':00'
          const endTime = promotion.end_time.slice(0, 5) + ':00'
          
          if (currentTime < startTime || currentTime > endTime) {
            logger.info('Promotion skipped: outside time range', {
              promotionId: promotion.id,
              currentTime,
              startTime,
              endTime
            })
            continue
          }
        }
      } else {
        logger.info('Promotion has show_always=true, skipping time/date checks', {
          promotionId: promotion.id
        })
      }

      // Check if promotion applies to the service type
      // If serviceType is provided, check if promotion applies to it
      // If applies_to_all_products = true, it applies to all service types
      // If applies_to_all_products = false, check applies_to_service_types
      if (normalizedServiceType) {
        // If promotion doesn't apply to all products, check service type match
        if (!promotion.applies_to_all_products) {
          // If applies_to_service_types is set, must include the service type
          if (promotion.applies_to_service_types && promotion.applies_to_service_types.length > 0) {
            // Normalize service types for comparison (handle case sensitivity and variations)
            const normalizedAppliesTo = promotion.applies_to_service_types
              .map((st: string) => st?.toLowerCase().trim())
              .filter(Boolean)
            
            if (!normalizedAppliesTo.includes(normalizedServiceType)) {
              logger.info('Promotion skipped: service type does not match', {
                promotionId: promotion.id,
                serviceType: normalizedServiceType,
                applies_to_service_types: promotion.applies_to_service_types,
                normalizedAppliesTo
              })
              continue
            }
            // Service type matches, continue to check time/date rules
          }
          // If applies_to_service_types is null/empty and applies_to_all_products = false, 
          // this promotion doesn't apply to any service (skip it)
          else {
            logger.info('Promotion skipped: no service types specified and does not apply to all products', {
              promotionId: promotion.id,
              applies_to_all_products: promotion.applies_to_all_products
            })
            continue
          }
        }
        // If applies_to_all_products = true, it applies to all service types, so continue
      }
      // If no serviceType provided, apply promotion if it applies to all products
      else {
        // If no service type provided, only apply if promotion applies to all products
        if (!promotion.applies_to_all_products) {
          logger.info('Promotion skipped: no service type provided and does not apply to all products', {
            promotionId: promotion.id,
            applies_to_all_products: promotion.applies_to_all_products
          })
          continue
        }
      }

      // This promotion is valid and applicable!
      logger.info('Promotion is valid and applicable', {
        promotionId: promotion.id,
        hotelId,
        serviceType: normalizedServiceType,
        applies_to_all_products: promotion.applies_to_all_products,
        applies_to_service_types: promotion.applies_to_service_types
      })
      return promotion as Promotion
    }

    return null
  } catch (error) {
    logger.error('Error in getActivePromotionForDiscount:', error)
    return null
  }
}

/**
 * Get all promotions for a hotel (admin view)
 */
export async function getPromotions(hotelId: string): Promise<Promotion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promotions')
    .select('id, hotel_id, title, description, short_description, image_url, banner_duration_seconds, is_active, show_banner, show_always, start_date, end_date, start_time, end_time, days_of_week, discount_type, discount_value, min_order_amount, max_discount_amount, applies_to_all_products, applies_to_service_types, created_by, created_at, updated_at, is_deleted')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching promotions:', error)
    throw error
  }

  return (data || []) as Promotion[]
}

/**
 * Get promotion by ID
 */
export async function getPromotionById(id: string): Promise<Promotion | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promotions')
    .select('id, hotel_id, title, description, short_description, image_url, banner_duration_seconds, is_active, show_banner, show_always, start_date, end_date, start_time, end_time, days_of_week, discount_type, discount_value, min_order_amount, max_discount_amount, applies_to_all_products, applies_to_service_types, created_by, created_at, updated_at, is_deleted')
      .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    logger.error('Error fetching promotion:', error)
    throw error
  }

  return data as Promotion
}

/**
 * Get product-specific discounts for a promotion
 * Now also includes menu item discounts
 */
export async function getPromotionProductDiscounts(promotionId: string): Promise<PromotionProductDiscount[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promotion_product_discounts')
    .select('id, promotion_id, product_id, service_id, menu_item_name, item_type, discount_type, discount_value, max_discount_amount, created_at, is_deleted')
    .eq('promotion_id', promotionId)
    .eq('is_deleted', false)

  if (error) {
    logger.error('Error fetching promotion product discounts:', error)
    throw error
  }

  return (data || []) as PromotionProductDiscount[]
}

/**
 * Get menu item discount for a specific service and menu item name
 * Used for fast lookup during discount calculation
 */
export async function getMenuItemDiscount(
  promotionId: string,
  serviceId: string,
  menuItemName: string
): Promise<PromotionProductDiscount | null> {
  // Validate inputs
  if (!promotionId || !serviceId || !menuItemName) {
    return null
  }

  const supabase = await createClient()
  
  // Normalize menu item name for consistent matching
  const normalizedName = menuItemName.toLowerCase().trim()

  const { data, error } = await supabase
    .from('promotion_product_discounts')
    .select('id, promotion_id, product_id, service_id, menu_item_name, item_type, discount_type, discount_value, max_discount_amount, created_at, is_deleted')
    .eq('promotion_id', promotionId)
    .eq('service_id', serviceId)
    .eq('menu_item_name', normalizedName)
    .eq('item_type', 'menu_item')
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) {
    logger.error('Error fetching menu item discount:', error)
    return null
  }

  // Debug logging to help identify matching issues
  if (!data) {
    // Check if there are any menu item discounts for this promotion/service to help debug
    const { data: allMenuDiscounts } = await supabase
      .from('promotion_product_discounts')
      .select('menu_item_name, service_id')
      .eq('promotion_id', promotionId)
      .eq('item_type', 'menu_item')
      .eq('is_deleted', false)
    
    logger.info('Menu item discount lookup', {
      promotionId,
      serviceId,
      menuItemName,
      normalizedName,
      found: !!data,
      availableMenuItems: allMenuDiscounts?.map(d => ({ name: d.menu_item_name, service_id: d.service_id }))
    })
  }

  return data as PromotionProductDiscount | null
}

/**
 * Calculate discount for a cart item based on active promotions
 * Returns discount amount and details
 * 
 * Priority order for discount matching:
 * 1. Menu item-specific discount (service_id + menu_item_name) - checks ALL active promotions
 * 2. Product-specific discount (product_id)
 * 3. Service type match (if applies_to_service_types includes service_type)
 * 4. All products (if applies_to_all_products = true)
 */
export async function calculateItemDiscount(
  hotelId: string,
  productId: string,
  originalPrice: number,
  serviceType?: string,
  serviceId?: string,
  menuItemName?: string
): Promise<{ discountAmount: number; promotionId: string | null; discountType: string | null }> {
  // Priority 1: Check for menu item-specific discount FIRST (highest priority)
  // This checks ALL active promotions, not just those matching service type
  // because menu item discounts can override service type restrictions
  if (serviceId && menuItemName) {
    const supabase = await createClient()
    
    // Get hotel timezone for accurate time comparison
    const { getHotelTimezone, getHotelCurrentDateTime } = await import('@/lib/utils/hotel-timezone')
    const hotelTimezone = await getHotelTimezone(hotelId)
    const { date: currentDate, time: currentTimeStr } = await getHotelCurrentDateTime(hotelId)
    const currentTime = currentTimeStr + ':00'
    
    // Get current day of week in hotel timezone
    const now = new Date()
    const dayName = now.toLocaleDateString('en-US', { 
      timeZone: hotelTimezone, 
      weekday: 'long' 
    }).toLowerCase()
    const dayMap: Record<string, number> = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    }
    const currentDay = dayMap[dayName] ?? 0

    // Get all active promotions to check for menu item discounts
    const { data: allPromotions, error: promoError } = await supabase
      .from('promotions')
      .select('id, hotel_id, is_active, show_always, start_date, end_date, start_time, end_time, days_of_week, is_deleted')
      .eq('hotel_id', hotelId)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (!promoError && allPromotions) {
      // Check each promotion for time/date validity
      for (const promo of allPromotions) {
        // Check time/date validity
        if (!promo.show_always) {
          if (promo.start_date && currentDate < promo.start_date) continue
          if (promo.end_date && currentDate > promo.end_date) continue
          if (promo.days_of_week && promo.days_of_week.length > 0 && !promo.days_of_week.includes(currentDay)) continue
          if (promo.start_time && promo.end_time) {
            const startTime = promo.start_time.slice(0, 5) + ':00'
            const endTime = promo.end_time.slice(0, 5) + ':00'
            if (currentTime < startTime || currentTime > endTime) continue
          }
        }

        // Check if this promotion has a menu item discount for this item
        const menuItemDiscount = await getMenuItemDiscount(promo.id, serviceId, menuItemName)
        if (menuItemDiscount) {
          // Found menu item-specific discount! Use the discount values from menuItemDiscount
          let discountAmount = 0
          const discountValue = menuItemDiscount.discount_value
          const discountType = menuItemDiscount.discount_type
          const maxDiscount = menuItemDiscount.max_discount_amount

          if (discountType === 'percentage') {
            discountAmount = (originalPrice * discountValue) / 100
            if (maxDiscount && discountAmount > maxDiscount) {
              discountAmount = maxDiscount
            }
          } else if (discountType === 'fixed_amount') {
            discountAmount = discountValue
            if (discountAmount > originalPrice) {
              discountAmount = originalPrice
            }
          }

          const finalDiscountAmount = Math.round(discountAmount * 100) / 100
          logger.info('Menu item discount applied', {
            promotionId: promo.id,
            serviceId,
            menuItemName,
            originalPrice,
            discountAmount: finalDiscountAmount,
            discountType
          })
          return {
            discountAmount: finalDiscountAmount,
            promotionId: promo.id,
            discountType: discountType
          }
        }
      }
    }
  }

  // If no menu item discount found, check regular promotion matching
  const promotion = await getActivePromotionForDiscount(hotelId, serviceType)
  
  if (!promotion) {
    logger.info('No active promotion found for item', {
      hotelId,
      serviceType,
      serviceId,
      menuItemName,
      productId
    })
    return { discountAmount: 0, promotionId: null, discountType: null }
  }
  
  logger.info('Found active promotion for item', {
    promotionId: promotion.id,
    hotelId,
    serviceType,
    serviceId,
    menuItemName,
    applies_to_all_products: promotion.applies_to_all_products,
    applies_to_service_types: promotion.applies_to_service_types
  })

  let discountValue = promotion.discount_value
  let discountType = promotion.discount_type
  let maxDiscount = promotion.max_discount_amount
  let foundSpecificDiscount = false

  // Priority 2: Check for product-specific discount (if menu item discount not found)
  if (!foundSpecificDiscount) {
    const productDiscounts = await getPromotionProductDiscounts(promotion.id)
    const productDiscount = productDiscounts.find(pd => pd.product_id === productId && pd.item_type === 'product')
    
    if (productDiscount) {
      discountValue = productDiscount.discount_value
      discountType = productDiscount.discount_type
      maxDiscount = productDiscount.max_discount_amount
      foundSpecificDiscount = true
    }
  }

  // Priority 3 & 4: Check if promotion applies to this item
  // If no specific discount found, check service type or all products
  if (!foundSpecificDiscount && !promotion.applies_to_all_products) {
    // Promotion doesn't apply to all products and no specific discount found
    // Check if service type matches
    const normalizedServiceType = serviceType ? serviceType.toLowerCase().trim() : null
    const normalizedAppliesTo = promotion.applies_to_service_types 
      ? promotion.applies_to_service_types.map((st: string) => st?.toLowerCase().trim()).filter(Boolean)
      : []
    
    const serviceTypeMatches = normalizedServiceType && 
      normalizedAppliesTo.length > 0 &&
      normalizedAppliesTo.includes(normalizedServiceType)
    
    if (!serviceTypeMatches) {
      // Service type doesn't match or not specified, no discount
      logger.info('Service type does not match promotion', {
        promotionId: promotion.id,
        serviceType,
        normalizedServiceType,
        applies_to_service_types: promotion.applies_to_service_types,
        normalizedAppliesTo
      })
      return { discountAmount: 0, promotionId: null, discountType: null }
    }
    // Service type matches, apply general promotion discount
    logger.info('Service type matches, applying general discount', {
      promotionId: promotion.id,
      serviceType,
      discountValue,
      discountType
    })
  }
  // If applies_to_all_products = true or service type matches, apply general discount

  let discountAmount = 0

  if (discountType === 'percentage') {
    discountAmount = (originalPrice * discountValue) / 100
    if (maxDiscount && discountAmount > maxDiscount) {
      discountAmount = maxDiscount
    }
  } else if (discountType === 'fixed_amount') {
    discountAmount = discountValue
    if (discountAmount > originalPrice) {
      discountAmount = originalPrice
    }
  } else {
    logger.warn('Unknown discount type', { discountType, promotionId: promotion.id })
  }

  const finalDiscountAmount = Math.round(discountAmount * 100) / 100 // Round to 2 decimals

  return {
    discountAmount: finalDiscountAmount,
    promotionId: promotion.id,
    discountType: discountType
  }
}

/**
 * Check if cart total meets minimum order amount for promotion
 * This should be called at the cart level, not per item
 */
export async function checkPromotionMinimumOrder(
  hotelId: string,
  cartTotal: number,
  serviceType?: string
): Promise<{ meetsMinimum: boolean; promotionId: string | null; minOrderAmount: number | null }> {
  const promotion = await getActivePromotionForDiscount(hotelId, serviceType)
  
  if (!promotion) {
    return { meetsMinimum: false, promotionId: null, minOrderAmount: null }
  }

  const minOrderAmount = promotion.min_order_amount || 0
  
  logger.debug('Checking minimum order amount', {
    promotionId: promotion.id,
    cartTotal,
    minOrderAmount,
    meetsMinimum: cartTotal >= minOrderAmount
  })

  return {
    meetsMinimum: cartTotal >= minOrderAmount,
    promotionId: promotion.id,
    minOrderAmount
  }
}

/**
 * Create a new promotion
 */
export async function createPromotion(promotion: PromotionInsert): Promise<Promotion> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promotions')
    .insert({
      ...promotion,
      banner_duration_seconds: promotion.banner_duration_seconds ?? 5,
      is_active: promotion.is_active ?? true,
      show_banner: promotion.show_banner ?? true,
      show_always: promotion.show_always ?? false,
      days_of_week: promotion.days_of_week ?? [0, 1, 2, 3, 4, 5, 6],
      applies_to_all_products: promotion.applies_to_all_products ?? false,
      min_order_amount: promotion.min_order_amount ?? 0,
    })
    .select('id, hotel_id, title, description, short_description, image_url, banner_duration_seconds, is_active, show_banner, show_always, start_date, end_date, start_time, end_time, days_of_week, discount_type, discount_value, min_order_amount, max_discount_amount, applies_to_all_products, applies_to_service_types, created_by, created_at, updated_at, is_deleted')
    .single()

  if (error) {
    logger.error('Error creating promotion:', error)
    throw error
  }

  return data as Promotion
}

/**
 * Update a promotion
 */
export async function updatePromotion(id: string, updates: Partial<PromotionInsert>): Promise<Promotion> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promotions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, hotel_id, title, description, short_description, image_url, banner_duration_seconds, is_active, show_banner, show_always, start_date, end_date, start_time, end_time, days_of_week, discount_type, discount_value, min_order_amount, max_discount_amount, applies_to_all_products, applies_to_service_types, created_by, created_at, updated_at, is_deleted')
    .single()

  if (error) {
    logger.error('Error updating promotion:', error)
    throw error
  }

  return data as Promotion
}

/**
 * Delete a promotion (soft delete)
 */
export async function deletePromotion(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('promotions')
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    logger.error('Error deleting promotion:', error)
    throw error
  }
}

/**
 * Add product discount to promotion
 */
export async function addProductDiscount(
  promotionId: string,
  productId: string,
  discountType: 'percentage' | 'fixed_amount',
  discountValue: number,
  maxDiscountAmount?: number | null
): Promise<PromotionProductDiscount> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('promotion_product_discounts')
    .insert({
      promotion_id: promotionId,
      product_id: productId,
      discount_type: discountType,
      discount_value: discountValue,
      max_discount_amount: maxDiscountAmount,
    })
    .select('id, promotion_id, product_id, discount_type, discount_value, max_discount_amount, created_at, is_deleted')
    .single()

  if (error) {
    logger.error('Error adding product discount:', error)
    throw error
  }

  return data as PromotionProductDiscount
}

/**
 * Remove product discount from promotion
 */
export async function removeProductDiscount(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('promotion_product_discounts')
    .update({
      is_deleted: true,
    })
    .eq('id', id)

  if (error) {
    logger.error('Error removing product discount:', error)
    throw error
  }
}

