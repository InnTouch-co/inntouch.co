import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  updateOrderItemStatus, 
  updateOrderItemsStatus,
  getOrderById,
  getOrderItemsBatch,
  updateOrderStatus
} from '@/lib/database/orders'
import { sendOrderReadyNotification, sendOrderDeliveredNotification } from '@/lib/messaging/notifications'
import { logger, messagingLogger } from '@/lib/utils/logger'

/**
 * PATCH /api/orders/[id]/items/status
 * Update status for specific order items (item-level status tracking)
 * This allows kitchen and bar to update status independently
 * 
 * Body: {
 *   itemIds: string[] | string,  // Single item ID or array of item IDs
 *   status: string,               // 'pending', 'preparing', 'ready', 'delivered', 'cancelled'
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from users table
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('id, role_id, department')
      .eq('email', authUser.email)
      .eq('is_deleted', false)
      .maybeSingle()

    if (userError || !currentUserData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { itemIds, status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    if (!itemIds || (Array.isArray(itemIds) && itemIds.length === 0)) {
      return NextResponse.json(
        { error: 'itemIds is required (string or array of strings)' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Get order to verify it exists and user has access
    const order = await getOrderById(orderId)
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify user has access to this hotel
    const { data: hotelUser, error: hotelUserError } = await supabase
      .from('hotel_users')
      .select('id')
      .eq('hotel_id', order.hotel_id)
      .eq('user_id', currentUserData.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (hotelUserError) {
      return NextResponse.json({ error: 'Error verifying hotel access' }, { status: 500 })
    }

    if (!hotelUser) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this hotel' },
        { status: 403 }
      )
    }

    // Normalize itemIds to array
    const itemIdsArray = Array.isArray(itemIds) ? itemIds : [itemIds]

    // Verify items exist and belong to this order
    // Note: Items might be JSONB-only (not in order_items table), so we allow partial matches
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('id, order_id')
      .in('id', itemIdsArray)

    if (itemsError) {
      return NextResponse.json({ error: 'Error verifying items' }, { status: 500 })
    }

    // Verify items that exist belong to this order
    const foundItems = items || []
    const invalidItems = foundItems.filter(item => item.order_id !== orderId)
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: 'Some items do not belong to this order' },
        { status: 403 }
      )
    }

    // If some items weren't found, they might be JSONB-only (we'll handle this below)
    if (foundItems.length < itemIdsArray.length) {
      const foundItemIds = new Set(foundItems.map(item => item.id))
      const missingItemIds = itemIdsArray.filter(id => !foundItemIds.has(id))
      logger.info(`Some items not found in order_items table (might be JSONB-only):`, missingItemIds)
    }

    // Update item status(es)
    logger.info(`[ORDER_STATUS_UPDATE] Starting update for order ${order.order_number}:`, {
      orderId,
      orderNumber: order.order_number,
      requestedStatus: status,
      itemIdsCount: itemIdsArray.length,
      itemIds: itemIdsArray,
      currentOrderStatus: order.status
    })
    
    // Check if items exist in order_items table before updating
    // If items don't exist in order_items, they might be legacy JSONB-only items
    const { data: existingItems, error: checkError } = await supabase
      .from('order_items')
      .select('id')
      .in('id', itemIdsArray)
    
    if (checkError) {
      logger.error(`Error checking items existence:`, checkError)
    }
    
    const existingItemIds = (existingItems || []).map(item => item.id)
    const missingItemIds = itemIdsArray.filter(id => !existingItemIds.includes(id))
    
    if (missingItemIds.length > 0) {
      logger.warn(`Some items not found in order_items table (might be JSONB-only):`, missingItemIds)
    }
    
    // Only update items that exist in order_items table
    const itemsToUpdate = itemIdsArray.filter(id => existingItemIds.includes(id))
    let updatedItems: any[] = []
    
    if (itemsToUpdate.length > 0) {
      updatedItems = await updateOrderItemsStatus(itemsToUpdate, status)
      logger.info(`Updated ${updatedItems.length} items in order_items table`)
    } else {
      logger.warn(`No items found in order_items table to update. Items might be JSONB-only.`)
    }
    
    // Store missing item IDs for JSONB handling
    const jsonbOnlyItemIds = missingItemIds
    
    // If we have missing items (JSONB-only), we'll handle them in the merge logic below

    // IMPORTANT: Use updatedItems as the source of truth for items we just updated
    // Then fetch all other items from database to get complete picture
    // This prevents race conditions where database might return stale data
    
    // Get all items for this order from order_items table
    const allItems = await getOrderItemsBatch([orderId])
    const orderItems = allItems[orderId] || []
    
    // CRITICAL: Also check JSONB items field for legacy items that might not be in order_items table
    // Some orders might have items only in the JSONB field (older orders or migration issues)
    const jsonbItems = Array.isArray(order.items) ? order.items : []
    
    // Create a map of updated items for quick lookup (these are the source of truth)
    const updatedItemsMap = new Map(updatedItems.map(item => [item.id, item]))
    
    // Build merged items list: use updated items first (source of truth), then other items from DB
    const mergedItems: typeof updatedItems = []
    
    // First, add all updated items (these have the correct status)
    for (const updatedItem of updatedItems) {
      mergedItems.push(updatedItem)
    }
    
    // Then, add any other items from the order_items table that weren't updated
    for (const item of orderItems) {
      if (!updatedItemsMap.has(item.id)) {
        mergedItems.push(item)
      }
    }
    
    // Finally, add any items from JSONB that don't have a corresponding order_item row
    // These are legacy items that weren't migrated to the order_items table
    // For these, we assume they have the same status as the order (or 'pending' if order status is unclear)
    for (const jsonbItem of jsonbItems) {
      // Check if this JSONB item has a corresponding order_item by matching menu_item_name
      const hasOrderItem = mergedItems.some(item => 
        item.menu_item_name === (jsonbItem.menuItem?.name || jsonbItem.name || jsonbItem.menu_item_name)
      )
      
      if (!hasOrderItem) {
        // This is a legacy item only in JSONB
        // CRITICAL: If this item was just updated (JSONB-only), use the requested status
        // Otherwise, use 'pending' as safe default (NOT 'preparing' to avoid interference)
        const jsonbItemId = jsonbItem.id || jsonbItem.menuItem?.id || jsonbItem.menu_item_id
        const jsonbItemName = jsonbItem.menuItem?.name || jsonbItem.name || jsonbItem.menu_item_name
        
        // Check if this JSONB item was one we tried to update
        const wasUpdated = jsonbOnlyItemIds.some(missingId => {
          // Try to match by various ID formats
          return missingId === jsonbItemId || 
                 missingId === jsonbItem.id ||
                 missingId === jsonbItem.menuItem?.id ||
                 missingId === jsonbItem.menu_item_id
        })
        
        let legacyStatus: string
        if (wasUpdated) {
          // This item was updated but doesn't exist in order_items - use requested status
          legacyStatus = status
          logger.info(`JSONB-only item was updated to status: ${status}`, {
            itemName: jsonbItemName,
            itemId: jsonbItemId
          })
        } else {
          // This is a different JSONB item - use 'pending' as safe default
          // Using 'preparing' would cause the order status to stay 'preparing' incorrectly
          legacyStatus = 'pending'
          
          logger.warn(`Order ${order.order_number} has legacy JSONB item not in order_items table:`, {
            itemName: jsonbItemName,
            usingStatus: legacyStatus,
            orderStatus: order.status
          })
        }
        
        // Create a synthetic order item for status calculation
        mergedItems.push({
          id: jsonbItemId || `jsonb-${jsonbItem.menuItem?.id || jsonbItem.id || 'unknown'}`,
          order_id: orderId,
          menu_item_id: jsonbItem.menuItem?.id || jsonbItem.id || '',
          menu_item_name: jsonbItemName || 'Unknown Item',
          quantity: jsonbItem.quantity || 1,
          unit_price: jsonbItem.menuItem?.price || jsonbItem.price || 0,
          total_price: jsonbItem.total_price || (jsonbItem.menuItem?.price || jsonbItem.price || 0) * (jsonbItem.quantity || 1),
          special_instructions: jsonbItem.specialInstructions || null,
          status: legacyStatus,
          department: null, // Unknown for legacy items
          created_at: order.created_at
        } as typeof updatedItems[0])
      }
    }
    
    // Log the merge result for debugging
    logger.info(`Merged items for order ${order.order_number}:`, {
      updatedItemsCount: updatedItems.length,
      orderItemsCount: orderItems.length,
      jsonbItemsCount: jsonbItems.length,
      totalItemsCount: mergedItems.length,
      updatedItemStatuses: updatedItems.map(item => ({ id: item.id, status: item.status, department: item.department })),
      allItemStatuses: mergedItems.map(item => ({ id: item.id, status: item.status, department: item.department }))
    })
    
    // CRITICAL: If we have no items at all, something is wrong - log and don't update
    if (mergedItems.length === 0) {
      logger.error(`Order ${order.order_number} has no items! Updated items: ${updatedItems.length}, Order items: ${orderItems.length}, JSONB items: ${jsonbItems.length}`)
      return NextResponse.json({
        order: order, // Return original order unchanged
        items: updatedItems,
      })
    }
    
    let updatedOrder = order // Default to original order
    
    // Ensure all items have a status (default to 'pending' if missing)
    const itemsWithStatus = mergedItems.map(item => ({
      ...item,
      status: item.status || 'pending'
    }))
    
    const allDelivered = itemsWithStatus.every(item => item.status === 'delivered')
    const allReady = itemsWithStatus.every(item => 
      item.status === 'ready' || item.status === 'delivered'
    )
    
    // Log item statuses for debugging
    logger.info(`[ORDER_STATUS_UPDATE] Status check for order ${order.order_number}:`, {
      totalItems: itemsWithStatus.length,
      itemStatuses: itemsWithStatus.map(item => ({ 
        id: item.id, 
        status: item.status, 
        department: item.department,
        menu_item_name: item.menu_item_name 
      })),
      allDelivered,
      allReady,
      currentOrderStatus: order.status,
      requestedStatus: status,
      willUpdateToDelivered: allDelivered && order.status !== 'delivered',
      willUpdateToReady: allReady && !allDelivered && order.status !== 'ready' && order.status !== 'delivered',
      willKeepStatus: !allDelivered && !allReady
    })
    
    // CRITICAL: We NEVER update order status to "preparing" or "pending"
    // Only update to "delivered" or "ready" when ALL items meet those conditions
    // This prevents interference between departments
    
    // Update overall order status to "delivered" ONLY when ALL items are delivered
    // This ensures guests see "delivered" when both kitchen and bar items are done
    // Kitchen/Bar dashboards are not affected because they calculate status on-the-fly
    if (allDelivered) {
      if (order.status !== 'delivered') {
        logger.info(`All items delivered for order ${order.order_number}, updating overall status from ${order.status} to delivered`)
        updatedOrder = await updateOrderStatus(orderId, 'delivered')
        logger.info(`Order ${order.order_number} status updated successfully to: ${updatedOrder.status}`)
      } else {
        logger.info(`Order ${order.order_number} already marked as delivered, skipping update`)
      }
    } else if (allReady) {
      // Update to "ready" when all items are ready (but not all delivered yet)
      // This helps guest see progress and ensures status moves forward
      // We update even if current status is "preparing" to move it forward
      if (order.status !== 'ready' && order.status !== 'delivered') {
        logger.info(`All items ready for order ${order.order_number}, updating overall status from ${order.status} to ready`)
        updatedOrder = await updateOrderStatus(orderId, 'ready')
        logger.info(`Order ${order.order_number} status updated successfully to: ${updatedOrder.status}`)
      } else {
        logger.info(`Order ${order.order_number} status is already ${order.status}, skipping ready update`)
      }
    } else {
      // Do NOT update status if not all items are ready/delivered
      // This prevents status from changing to "preparing" or "pending"
      // CRITICAL: We explicitly do NOT update the status here
      const statusBreakdown = mergedItems.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      logger.info(`Order ${order.order_number} not all items ready/delivered. Status breakdown:`, statusBreakdown)
      logger.info(`CRITICAL: Keeping current status ${order.status} - NOT updating to preparing or pending`)
      // Explicitly ensure we don't change the order
      updatedOrder = order
    }
    // NOTE: We do NOT update status to "preparing" or "pending" here because:
    // 1. Kitchen and bar operate independently - one department might be preparing while other is pending
    // 2. Overall status should reflect the "most advanced" state, not the "least advanced"
    // 3. Kitchen/Bar dashboards calculate department-specific status on-the-fly, so they're not affected

    // Send WhatsApp notifications for status changes (non-blocking)
    if (status === 'ready' || status === 'delivered') {
      if (allReady && status === 'ready' && order.guest_phone && order.room_number) {
        messagingLogger.debug('OrderStatusAPI', `Triggering order ready notification for ${order.order_number}`)
        sendOrderReadyNotification(order.order_number, order.room_number, order.guest_phone)
          .catch(error => {
            messagingLogger.error('OrderStatusAPI', error, `Failed to send order ready notification for ${order.order_number}`)
          })
      }

      if (allDelivered && status === 'delivered' && order.guest_phone && order.room_number) {
        messagingLogger.debug('OrderStatusAPI', `Triggering order delivered notification for ${order.order_number}`)
        sendOrderDeliveredNotification(order.order_number, order.room_number, order.guest_phone)
          .catch(error => {
            messagingLogger.error('OrderStatusAPI', error, `Failed to send order delivered notification for ${order.order_number}`)
          })
      }
    }

    // Return updated items and order info
    // Note: updatedOrder.status is only set to "delivered" when ALL items are delivered
    // Kitchen/Bar dashboards calculate department-specific status on-the-fly, so they're not affected
    return NextResponse.json({
      order: updatedOrder,
      items: updatedItems,
    })

  } catch (error: any) {
    logger.error('Error updating order item status:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to update order item status',
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}

