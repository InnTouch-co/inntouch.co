/**
 * Utility functions to detect order types from order items
 */

export type OrderType = 'restaurant_order' | 'bar_order' | 'room_service_order'

export interface OrderTypeDetection {
  types: OrderType[]
  isMixed: boolean
}

/**
 * Detect order types from order items
 * This function analyzes the items to determine which services they belong to
 */
export function detectOrderTypesFromItems(items: any[]): OrderTypeDetection {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { types: ['room_service_order'], isMixed: false }
  }

  const detectedTypes = new Set<OrderType>()
  
  // Common drink-related keywords
  const drinkKeywords = [
    'drink', 'cocktail', 'beer', 'wine', 'mojito', 'margarita', 
    'martini', 'whiskey', 'vodka', 'rum', 'gin', 'tequila',
    'lemonade', 'juice', 'soda', 'coffee', 'tea', 'espresso',
    'cappuccino', 'latte', 'smoothie', 'shake', 'mocktail'
  ]

  // Common food-related keywords
  const foodKeywords = [
    'steak', 'chicken', 'pasta', 'pizza', 'burger', 'sandwich',
    'salad', 'soup', 'appetizer', 'entree', 'dessert', 'cake',
    'potatoes', 'rice', 'bread', 'breakfast', 'lunch', 'dinner',
    'grilled', 'fried', 'baked', 'roasted'
  ]

  items.forEach((item: any) => {
    // Get item name from various possible structures
    const itemName = (
      item.menuItem?.name || 
      item.name || 
      item.menu_item_name || 
      ''
    ).toLowerCase()

    // Get category from various possible structures
    const category = (
      item.menuItem?.category ||
      item.category ||
      ''
    ).toLowerCase()

    // Check if item has service type stored (directly or in menuItem)
    const serviceType = item.serviceType || item.menuItem?.serviceType || item.service_type
    if (serviceType) {
      if (serviceType === 'restaurant' || serviceType === 'restaurant_order') {
        detectedTypes.add('restaurant_order')
      } else if (serviceType === 'bar' || serviceType === 'bar_order') {
        detectedTypes.add('bar_order')
      } else if (serviceType === 'room_service' || serviceType === 'room_service_order') {
        detectedTypes.add('room_service_order')
      }
    }
    // Check if item has category that indicates service type
    else if (category) {
      if (category.includes('drink') || category.includes('beverage') || category.includes('bar') || 
          category.includes('cocktail') || category.includes('wine') || category.includes('beer')) {
        detectedTypes.add('bar_order')
      } else if (category.includes('food') || category.includes('restaurant') || category.includes('meal') ||
                 category.includes('appetizer') || category.includes('entree') || category.includes('dessert') ||
                 category.includes('main') || category.includes('side')) {
        detectedTypes.add('restaurant_order')
      }
    }
    // Infer from item name
    else {
      const isDrink = drinkKeywords.some(keyword => itemName.includes(keyword))
      const isFood = foodKeywords.some(keyword => itemName.includes(keyword))

      if (isDrink && !isFood) {
        detectedTypes.add('bar_order')
      } else if (isFood) {
        detectedTypes.add('restaurant_order')
      }
    }
  })

  // If no types detected, default to room_service_order
  if (detectedTypes.size === 0) {
    detectedTypes.add('room_service_order')
  }

  const typesArray = Array.from(detectedTypes)
  return {
    types: typesArray,
    isMixed: typesArray.length > 1
  }
}

/**
 * Get order type labels for display
 */
export function getOrderTypeLabels(types: OrderType[]): string[] {
  return types.map(type => {
    switch (type) {
      case 'restaurant_order':
        return 'Restaurant'
      case 'bar_order':
        return 'Bar'
      case 'room_service_order':
        return 'Room Service'
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  })
}

/**
 * Get order type colors for badges
 */
export function getOrderTypeColors(types: OrderType[]): string[] {
  const colorMap: Record<OrderType, string> = {
    restaurant_order: 'bg-red-100 text-red-800',
    bar_order: 'bg-amber-100 text-amber-800',
    room_service_order: 'bg-blue-100 text-blue-800',
  }

  return types.map(type => colorMap[type] || 'bg-gray-100 text-gray-700')
}

