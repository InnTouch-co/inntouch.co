import { CartItem } from '../types'

export interface DiscountResult {
  originalTotal: number
  discountAmount: number
  finalTotal: number
  itemDiscounts: Array<{
    itemId: string
    originalPrice: number
    discountAmount: number
    finalPrice: number
    quantity: number
  }>
}

/**
 * Calculate discounts for cart items
 * This is a client-side helper - actual discount calculation happens on server
 */
export async function calculateCartDiscounts(
  hotelId: string,
  cart: CartItem[],
  serviceType?: string
): Promise<DiscountResult> {
  if (!hotelId || cart.length === 0) {
    const originalTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0)
    return {
      originalTotal,
      discountAmount: 0,
      finalTotal: originalTotal,
      itemDiscounts: [],
    }
  }

  try {
    // Use serviceType and serviceId from cart item if available, otherwise fall back to provided values
    // This allows items from different services to have different discounts
    const items = cart.map(item => {
      const mappedItem = {
        product_id: item.menuItem.id, // Using menu item ID as product identifier
        price: item.menuItem.price,
        quantity: item.quantity,
        service_type: item.serviceType || serviceType, // Use item's service type if available
        service_id: item.serviceId, // Service ID for menu item-specific discounts
        menu_item_name: item.menuItem.name, // Menu item name for menu item-specific discounts
      }
      
      // Debug logging
      if (!item.serviceId || !item.menuItem.name) {
        console.warn('Cart item missing serviceId or menuItem.name:', {
          menuItemId: item.menuItem.id,
          menuItemName: item.menuItem.name,
          serviceId: item.serviceId,
          serviceType: item.serviceType
        })
      }
      
      return mappedItem
    })

    const response = await fetch('/api/guest/promotions/calculate-discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotel_id: hotelId, items }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Discount calculation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      throw new Error(errorData.error || 'Failed to calculate discounts')
    }

    const data = await response.json()
    
    if (!data || !data.discounts || !data.summary) {
      console.error('Invalid discount calculation response:', data)
      throw new Error('Invalid response from discount calculation API')
    }
    
    const { discounts, summary } = data

    const itemDiscounts = discounts.map((disc: any) => ({
      itemId: disc.product_id,
      originalPrice: disc.original_price,
      discountAmount: disc.discount_amount,
      finalPrice: disc.discounted_price,
      quantity: disc.quantity,
    }))

    return {
      originalTotal: summary.total_original,
      discountAmount: summary.total_discount,
      finalTotal: summary.total_after_discount,
      itemDiscounts,
    }
  } catch (error) {
    // Log error for debugging
    console.error('Error calculating discounts:', error)
    // Fallback to no discount if calculation fails
    const originalTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0)
    return {
      originalTotal,
      discountAmount: 0,
      finalTotal: originalTotal,
      itemDiscounts: [],
    }
  }
}

