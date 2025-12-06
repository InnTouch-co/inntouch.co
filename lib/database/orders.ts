import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export interface Order {
  id: string
  hotel_id: string
  service_request_id?: string | null
  room_id?: string | null
  booking_id?: string | null
  order_number: string
  order_type: string
  guest_name: string
  guest_email?: string | null
  guest_phone?: string | null
  room_number?: string | null
  subtotal: number
  tax_amount: number
  tip_amount: number
  delivery_fee: number
  discount_amount: number
  total_amount: number
  payment_status: string
  payment_method?: string | null
  payment_intent_id?: string | null
  payment_transaction_id?: string | null
  paid_at?: string | null
  status: string
  estimated_delivery_time?: string | null
  delivered_at?: string | null
  special_instructions?: string | null
  items: any // JSONB
  metadata?: any | null
  created_at: string
  updated_at?: string | null
  is_deleted: boolean
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  menu_item_name: string
  quantity: number
  unit_price: number
  total_price: number
  special_instructions?: string | null
  status?: string // 'pending', 'preparing', 'ready', 'delivered', 'cancelled'
  department?: string | null // 'kitchen' or 'bar' - determined from service type
  created_at: string
}

export interface OrderInsert {
  hotel_id: string
  service_request_id?: string | null
  room_id?: string | null
  booking_id?: string | null
  order_type: string
  guest_name: string
  guest_email?: string | null
  guest_phone?: string | null
  room_number?: string | null
  subtotal: number
  tax_amount?: number
  tip_amount?: number
  delivery_fee?: number
  discount_amount?: number
  total_amount: number
  payment_status?: string
  payment_method?: string | null
  status?: string
  special_instructions?: string | null
  items: any // JSONB - array of cart items
  metadata?: any | null
}

/**
 * Create a new order
 */
export async function createOrder(orderData: OrderInsert): Promise<Order> {
  const supabase = await createClient()

  // Generate order number with retry logic to handle race conditions
  let orderNumber: string
  let attempts = 0
  const maxAttempts = 5
  
  while (attempts < maxAttempts) {
    try {
      // Try to use the database function
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_order_number')

      if (orderNumberError) {
        throw orderNumberError
      }

      if (!orderNumberData) {
        throw new Error('No order number returned from database function')
      }

      orderNumber = orderNumberData
      
      // Verify the order number doesn't already exist (double-check)
      const { data: existingOrder, error: checkError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .eq('is_deleted', false)
        .maybeSingle()

      if (checkError) {
        throw checkError
      }

      // If order number doesn't exist, we're good to use it
      if (!existingOrder) {
        break
      }

      // If it exists, wait a bit and retry
      attempts++
      if (attempts >= maxAttempts) {
        // Last resort: use timestamp with random component
        const year = new Date().getFullYear()
        const timestamp = Date.now()
        const random = Math.floor(Math.random() * 1000)
        orderNumber = `ORD-${year}-${timestamp.toString().slice(-8)}${random.toString().padStart(3, '0')}`
        break
      }

      // Wait a small random amount before retrying (to avoid thundering herd)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))
      
    } catch (error) {
      attempts++
      if (attempts >= maxAttempts) {
        // Fallback to application-level generation with timestamp + random
        const year = new Date().getFullYear()
        const timestamp = Date.now()
        const random = Math.floor(Math.random() * 10000)
        orderNumber = `ORD-${year}-${timestamp.toString().slice(-8)}${random.toString().padStart(4, '0')}`
        break
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))
    }
  }

  // Prepare order data
  const orderToInsert = {
    hotel_id: orderData.hotel_id,
    service_request_id: orderData.service_request_id || null,
    room_id: orderData.room_id || null,
    booking_id: orderData.booking_id || null,
    order_number: orderNumber,
    order_type: orderData.order_type,
    guest_name: orderData.guest_name,
    guest_email: orderData.guest_email || null,
    guest_phone: orderData.guest_phone || null,
    room_number: orderData.room_number || null,
    subtotal: orderData.subtotal,
    tax_amount: orderData.tax_amount || 0,
    tip_amount: orderData.tip_amount || 0,
    delivery_fee: orderData.delivery_fee || 0,
    discount_amount: orderData.discount_amount || 0,
    total_amount: orderData.total_amount,
    payment_status: orderData.payment_status || 'pending',
    payment_method: orderData.payment_method || 'room_charge',
    status: orderData.status || 'pending',
    special_instructions: orderData.special_instructions || null,
    items: orderData.items,
    metadata: orderData.metadata || null,
  }

  // Insert order with retry logic for duplicate key errors
  let insertAttempts = 0
  const maxInsertAttempts = 3
  let order: Order | null = null
  let lastError: any = null

  while (insertAttempts < maxInsertAttempts) {
    try {
      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert(orderToInsert)
        .select()
        .single()

      if (insertError) {
        // Check if it's a duplicate key error
        if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
          // Regenerate order number and retry
          insertAttempts++
          if (insertAttempts >= maxInsertAttempts) {
            throw new Error(`Failed to create order after ${maxInsertAttempts} attempts: ${insertError.message}`)
          }

          // Generate a new order number with timestamp + random
          const year = new Date().getFullYear()
          const timestamp = Date.now()
          const random = Math.floor(Math.random() * 100000)
          orderNumber = `ORD-${year}-${timestamp.toString().slice(-8)}${random.toString().padStart(5, '0')}`
          orderToInsert.order_number = orderNumber

          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100))
          continue
        } else {
          // Other error, throw immediately
          throw new Error(`Failed to create order: ${insertError.message}`)
        }
      }

      order = insertedOrder as Order
      break
    } catch (error: any) {
      lastError = error
      insertAttempts++
      if (insertAttempts >= maxInsertAttempts) {
        throw error
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  if (!order) {
    throw new Error(`Failed to create order: ${lastError?.message || 'Unknown error'}`)
  }

  // Create order items if provided
  if (orderData.items && Array.isArray(orderData.items)) {
    // Get service types for items that have serviceId
    const serviceIds = new Set<string>()
    orderData.items.forEach((item: any) => {
      const serviceId = item.serviceId || item.service_id || item.menuItem?.serviceId
      if (serviceId) {
        serviceIds.add(serviceId)
      }
    })

    // Fetch service types for all service IDs
    const serviceTypeMap = new Map<string, string>()
    if (serviceIds.size > 0) {
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, service_type')
        .in('id', Array.from(serviceIds))
        .eq('is_deleted', false)

      if (!servicesError && services) {
        services.forEach(service => {
          serviceTypeMap.set(service.id, service.service_type || 'other')
        })
      }
    }

    // Helper function to determine department from service type
    const getDepartmentFromServiceType = (serviceType: string | null | undefined): string | null => {
      if (!serviceType) return null
      const normalized = serviceType.toLowerCase().trim()
      if (normalized === 'bar') {
        return 'bar'
      }
      if (normalized === 'restaurant' || normalized === 'room_service' || normalized === 'roomservice') {
        return 'kitchen'
      }
      // Default to kitchen for other service types
      return 'kitchen'
    }

    const orderItems = orderData.items.map((item: any) => {
      // Determine department from serviceType or serviceId
      let department: string | null = null
      
      // First, try serviceType from item
      const serviceType = item.serviceType || item.service_type || item.menuItem?.serviceType
      if (serviceType) {
        department = getDepartmentFromServiceType(serviceType)
      }
      
      // If not found, try serviceId lookup
      if (!department) {
        const serviceId = item.serviceId || item.service_id || item.menuItem?.serviceId
        if (serviceId && serviceTypeMap.has(serviceId)) {
          const itemServiceType = serviceTypeMap.get(serviceId)
          department = getDepartmentFromServiceType(itemServiceType)
        }
      }
      
      // Default to kitchen if still not determined
      if (!department) {
        department = 'kitchen'
      }

      return {
        order_id: order.id,
        menu_item_id: item.menuItem?.id || item.id || '',
        menu_item_name: item.menuItem?.name || item.name || '',
        quantity: item.quantity || 1,
        unit_price: item.menuItem?.price || item.price || 0,
        total_price: (item.menuItem?.price || item.price || 0) * (item.quantity || 1),
        special_instructions: item.specialInstructions || null,
        department: department,
      }
    })

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        logger.error('Error creating order items:', itemsError)
        // Don't fail the order creation if items fail
      }
    }
  }

  return order
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('is_deleted', false)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data as Order
}

/**
 * Get order items for an order
 */
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []) as OrderItem[]
}

/**
 * Get order items for multiple orders (batch loading)
 * This reduces N+1 query problem
 * IMPORTANT: Only returns items from non-deleted orders (filters orderIds first)
 */
export async function getOrderItemsBatch(orderIds: string[]): Promise<Record<string, OrderItem[]>> {
  if (orderIds.length === 0) {
    return {}
  }

  const supabase = await createClient()

  // First, filter orderIds to only include non-deleted orders
  // This provides defense-in-depth against showing items from deleted orders
  // Even if a deleted order ID somehow gets into the array, we filter it out here
  const { data: validOrders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .in('id', orderIds)
    .eq('is_deleted', false)

  if (ordersError) {
    throw new Error(`Failed to verify orders: ${ordersError.message}`)
  }

  // Extract valid order IDs
  const validOrderIds = (validOrders || []).map(order => order.id)

  if (validOrderIds.length === 0) {
    // No valid orders, return empty result
    return {}
  }

  // Now fetch items only for valid (non-deleted) orders
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', validOrderIds)
    .order('order_id', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  // Group items by order_id
  const itemsByOrder: Record<string, OrderItem[]> = {}
  for (const item of (data || [])) {
    const orderId = item.order_id
    if (!itemsByOrder[orderId]) {
      itemsByOrder[orderId] = []
    }
    itemsByOrder[orderId].push(item as OrderItem)
  }

  return itemsByOrder
}

/**
 * Get order by order number
 */
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .eq('is_deleted', false)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data as Order
}

/**
 * Update order status
 * CRITICAL SAFEGUARD: Never allow updating to "preparing" or "pending" from item status updates
 * These statuses should only be set manually or through other workflows
 * This prevents interference between kitchen and bar departments
 */
export async function updateOrderStatus(orderId: string, status: string): Promise<Order> {
  const supabase = await createClient()

  // CRITICAL SAFEGUARD: Never allow updating to "preparing" or "pending" from item status updates
  // These statuses should only be set manually or through other workflows
  // This prevents interference between kitchen and bar departments
  const allowedStatuses = ['ready', 'delivered', 'cancelled', 'confirmed', 'out_for_delivery']
  if (!allowedStatuses.includes(status)) {
    logger.warn(`Attempted to update order ${orderId} to disallowed status: ${status}. Allowed: ${allowedStatuses.join(', ')}`)
    throw new Error(`Cannot update order status to "${status}". Allowed statuses: ${allowedStatuses.join(', ')}`)
  }

  // Prepare update data
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  }

  // Set delivered_at timestamp when status changes to delivered
  if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  logger.info(`Updating order ${orderId} status to: ${status}`)
  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    logger.error(`Failed to update order ${orderId} status:`, error)
    throw new Error(`Failed to update order status: ${error.message}`)
  }

  logger.info(`Order ${orderId} status successfully updated to: ${data?.status}`)
  return data as Order
}

/**
 * Update order item status
 * Used for item-level status tracking (kitchen/bar independence)
 */
export async function updateOrderItemStatus(itemId: string, status: string): Promise<OrderItem> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('order_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update order item status: ${error.message}`)
  }

  return data as OrderItem
}

/**
 * Update multiple order items status (batch update)
 * Used when updating all items in an order at once
 */
export async function updateOrderItemsStatus(itemIds: string[], status: string): Promise<OrderItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('order_items')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', itemIds)
    .select()

  if (error) {
    throw new Error(`Failed to update order items status: ${error.message}`)
  }

  return (data || []) as OrderItem[]
}

/**
 * Calculate order status from item statuses
 * Rules:
 * - If all items are 'delivered' -> 'delivered'
 * - If all items are 'ready' or 'delivered' -> 'ready'
 * - If any item is 'preparing' -> 'preparing'
 * - Otherwise -> 'pending'
 */
export async function calculateOrderStatusFromItems(orderId: string): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('order_items')
    .select('status')
    .eq('order_id', orderId)

  if (error) {
    throw new Error(`Failed to fetch order items: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return 'pending'
  }

  const statuses = data.map(item => item.status || 'pending')
  const uniqueStatuses = [...new Set(statuses)]

  // All delivered
  if (uniqueStatuses.length === 1 && uniqueStatuses[0] === 'delivered') {
    return 'delivered'
  }

  // All ready or delivered (mix)
  if (uniqueStatuses.every(s => s === 'ready' || s === 'delivered')) {
    return 'ready'
  }

  // Any preparing
  if (uniqueStatuses.includes('preparing')) {
    return 'preparing'
  }

  // Default to pending
  return 'pending'
}

/**
 * Calculate department-specific order status from item statuses
 * This calculates status based only on items for a specific department (kitchen or bar)
 * Rules:
 * - If all department items are 'delivered' -> 'delivered'
 * - If all department items are 'ready' or 'delivered' -> 'ready'
 * - If any department item is 'preparing' -> 'preparing'
 * - Otherwise -> 'pending'
 * 
 * @param orderId - Order ID
 * @param department - 'kitchen' or 'bar'
 * @param items - Optional array of items (if already fetched, to avoid extra query)
 */
export async function calculateDepartmentStatusFromItems(
  orderId: string, 
  department: 'kitchen' | 'bar',
  items?: OrderItem[]
): Promise<string> {
  let departmentItems: OrderItem[]

  if (items && items.length > 0) {
    // Use provided items (they should already be filtered by department)
    // But filter again to ensure we only use items for this department
    // This handles cases where items might not have department set (JSONB items)
    departmentItems = items.filter(item => {
      // If department is set, use it
      if (item.department) {
        return item.department === department
      }
      // If no department set, assume items are already filtered (for backward compatibility)
      return true
    })
  } else {
    // Fetch items from database
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('order_items')
      .select('status, department')
      .eq('order_id', orderId)
      .eq('department', department)

    if (error) {
      throw new Error(`Failed to fetch order items: ${error.message}`)
    }

    departmentItems = (data || []) as OrderItem[]
  }

  if (departmentItems.length === 0) {
    return 'pending'
  }

  const statuses = departmentItems.map(item => item.status || 'pending')
  const uniqueStatuses = [...new Set(statuses)]

  // All delivered
  if (uniqueStatuses.length === 1 && uniqueStatuses[0] === 'delivered') {
    return 'delivered'
  }

  // All ready or delivered (mix)
  if (uniqueStatuses.every(s => s === 'ready' || s === 'delivered')) {
    return 'ready'
  }

  // Any preparing
  if (uniqueStatuses.includes('preparing')) {
    return 'preparing'
  }

  // Default to pending
  return 'pending'
}

/**
 * Update order status based on item statuses (auto-sync)
 * Call this after updating item statuses to keep order status in sync
 */
export async function syncOrderStatusFromItems(orderId: string): Promise<Order> {
  const calculatedStatus = await calculateOrderStatusFromItems(orderId)
  return updateOrderStatus(orderId, calculatedStatus)
}

/**
 * Get orders for a hotel
 * Optimized with selective column fetching and limit
 */
export async function getOrders(hotelId: string, filters?: {
  status?: string
  room_number?: string
  date_from?: string
  date_to?: string
  limit?: number
}): Promise<Order[]> {
  const supabase = await createClient()

  // Select only needed columns for list view (exclude large JSONB fields if not needed)
  // We still include items for backward compatibility, but could optimize further
  let query = supabase
    .from('orders')
    .select('id, hotel_id, service_request_id, room_id, booking_id, order_number, order_type, guest_name, guest_email, guest_phone, room_number, subtotal, tax_amount, tip_amount, delivery_fee, discount_amount, total_amount, payment_status, payment_method, status, estimated_delivery_time, delivered_at, special_instructions, items, metadata, created_at, updated_at, is_deleted')
    .eq('hotel_id', hotelId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.room_number) {
    query = query.eq('room_number', filters.room_number)
  }

  if (filters?.date_from) {
    query = query.gte('created_at', filters.date_from)
  }

  if (filters?.date_to) {
    query = query.lte('created_at', filters.date_to)
  }

  // Add limit for pagination (default to 100 if not specified)
  const limit = filters?.limit || 100
  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []) as Order[]
}

/**
 * Get pending orders for a room (for checkout warning)
 */
export async function getPendingOrdersForRoom(roomId: string, bookingId?: string | null): Promise<Order[]> {
  const supabase = await createClient()

  let query = supabase
    .from('orders')
    .select('*')
    .eq('room_id', roomId)
    .eq('payment_status', 'pending')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (bookingId) {
    query = query.eq('booking_id', bookingId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []) as Order[]
}

/**
 * Get pending orders for a booking
 */
export async function getPendingOrdersForBooking(bookingId: string): Promise<Order[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('payment_status', 'pending')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data || []) as Order[]
}

/**
 * Get all orders for a booking (regardless of payment status)
 */
export async function getAllOrdersForBooking(bookingId: string): Promise<Order[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data || []) as Order[]
}

/**
 * Batch get all orders for multiple bookings (performance optimization)
 */
export async function getAllOrdersForBookings(bookingIds: string[]): Promise<Map<string, Order[]>> {
  if (bookingIds.length === 0) {
    return new Map()
  }

  const supabase = await createClient()

  // Select only needed columns for better performance
  const { data, error } = await supabase
    .from('orders')
    .select('id, hotel_id, service_request_id, room_id, booking_id, order_number, order_type, guest_name, guest_email, guest_phone, room_number, subtotal, tax_amount, tip_amount, delivery_fee, discount_amount, total_amount, payment_status, payment_method, status, estimated_delivery_time, delivered_at, special_instructions, items, metadata, created_at, updated_at, is_deleted')
    .in('booking_id', bookingIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  // Group orders by booking_id
  const ordersByBooking = new Map<string, Order[]>()
  for (const bookingId of bookingIds) {
    ordersByBooking.set(bookingId, [])
  }

  for (const order of (data || []) as Order[]) {
    if (order.booking_id) {
      const existing = ordersByBooking.get(order.booking_id) || []
      existing.push(order)
      ordersByBooking.set(order.booking_id, existing)
    }
  }

  return ordersByBooking
}

/**
 * Mark orders as paid (for folio payment)
 */
export async function markOrdersAsPaid(orderIds: string[]): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', orderIds)

  if (error) {
    throw new Error(`Failed to mark orders as paid: ${error.message}`)
  }
}

