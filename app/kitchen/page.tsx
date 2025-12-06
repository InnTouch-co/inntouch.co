'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { getHotelById } from '@/lib/database/hotels'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { Clock, CheckCircle2, Play, RefreshCw, LogOut } from 'lucide-react'

interface KitchenOrder {
  id: string
  order_number: string
  order_type: string
  status: string
  guest_name: string
  room_number: string | null
  special_instructions: string | null
  items: any[]
  item_count: number
  total_amount: number
  created_at: string
  created_at_formatted: string
  minutes_waiting: number
  is_urgent: boolean
}

interface KitchenStats {
  pending: number
  preparing: number
  ready: number
  delivered: number
  total_today: number
}

export default function KitchenPage() {
  const router = useRouter()
  const selectedHotelId = useSelectedHotel()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<any>(null)
  const [hotel, setHotel] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'delivered'>('pending')

  // Load user and hotel
  useEffect(() => {
    const loadData = async () => {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        router.push('/login')
        return
      }
      
      if (currentUser.role_id !== 'staff') {
        router.push('/')
        return
      }
      
      if (currentUser.department !== 'kitchen' && currentUser.department !== 'both') {
        router.push('/')
        return
      }
      
      setUser(currentUser)

      // Load hotel if selected
      if (selectedHotelId) {
        try {
          const hotelData = await getHotelById(selectedHotelId)
          setHotel(hotelData)
        } catch (error) {
          console.error('Failed to load hotel:', error)
        }
      }
    }
    loadData()
  }, [router, selectedHotelId])

  // Fetch orders with polling (every 1 minute)
  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: KitchenOrder[], stats: KitchenStats }>({
    queryKey: ['kitchen-orders', selectedHotelId],
    queryFn: async () => {
      if (!selectedHotelId) throw new Error('No hotel selected')
      const response = await fetch(`/api/kitchen/orders?hotel_id=${selectedHotelId}`)
      if (!response.ok) throw new Error('Failed to fetch orders')
      return response.json()
    },
    enabled: !!selectedHotelId && !!user,
    refetchInterval: 60000, // 1 minute
  })

  // Fetch stats
  const { data: statsData } = useQuery<{ stats: KitchenStats }>({
    queryKey: ['kitchen-stats', selectedHotelId],
    queryFn: async () => {
      if (!selectedHotelId) throw new Error('No hotel selected')
      const response = await fetch(`/api/kitchen/stats?hotel_id=${selectedHotelId}`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json()
    },
    enabled: !!selectedHotelId && !!user,
    refetchInterval: 60000, // 1 minute
  })

  // Update order item status mutation (item-level tracking)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, itemIds, status }: { orderId: string; itemIds: string[]; status: string }) => {
      const response = await fetch(`/api/orders/${orderId}/items/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds, status }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update order item status')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders', selectedHotelId] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-stats', selectedHotelId] })
    },
  })

  const allOrders = ordersData?.orders || []

  const handleStatusChange = useCallback((orderId: string, newStatus: string, itemIds?: string[]) => {
    // Get item IDs from the order if not provided
    const order = allOrders.find(o => o.id === orderId)
    const idsToUpdate = itemIds || (order?.items || [])
      .map((item: any) => item.id)
      .filter((id: string) => id) // Filter out empty/undefined IDs
    
    if (idsToUpdate.length === 0) {
      console.error('No valid item IDs found for order', orderId)
      return
    }
    
    updateStatusMutation.mutate({ orderId, itemIds: idsToUpdate, status: newStatus })
  }, [updateStatusMutation, allOrders])

  const handleLogout = useCallback(async () => {
    const { signOut } = await import('@/lib/auth/auth-client')
    await signOut()
    router.push('/login')
  }, [router])

  const stats = statsData?.stats || ordersData?.stats || { pending: 0, preparing: 0, ready: 0, delivered: 0, total_today: 0 }
  
  // Filter orders by status
  const orders = statusFilter === 'all' 
    ? allOrders 
    : allOrders.filter(order => order.status === statusFilter)
  
  const hotelName = hotel ? extractTextFromJson(hotel.title) : 'Kitchen'

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <div>Loading...</div>
        </div>
      </div>
    )
  }

  if (!selectedHotelId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="text-center text-white">
          <p className="text-lg">Please select a hotel first</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white">
      {/* Top Header - Title & Logout */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-12">
            <div>
              <div className="text-sm font-semibold">{hotelName}</div>
              <div className="text-xs text-gray-400">Kitchen</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards & Filters */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2">
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="bg-orange-600/20 border border-orange-500/30 rounded p-2 text-center">
              <div className="text-xl font-bold text-orange-400">{stats.pending}</div>
              <div className="text-xs text-gray-300">Pending</div>
            </div>
            <div className="bg-blue-600/20 border border-blue-500/30 rounded p-2 text-center">
              <div className="text-xl font-bold text-blue-400">{stats.preparing}</div>
              <div className="text-xs text-gray-300">Preparing</div>
            </div>
            <div className="bg-green-600/20 border border-green-500/30 rounded p-2 text-center">
              <div className="text-xl font-bold text-green-400">{stats.ready}</div>
              <div className="text-xs text-gray-300">Ready</div>
            </div>
            <div className="bg-gray-600/20 border border-gray-500/30 rounded p-2 text-center">
              <div className="text-xl font-bold text-gray-400">{stats.delivered}</div>
              <div className="text-xs text-gray-300">Delivered</div>
            </div>
          </div>
          {/* Status Filters */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'pending', 'preparing', 'ready', 'delivered'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === filter
                    ? filter === 'all' 
                      ? 'bg-gray-600 text-white' 
                      : filter === 'pending'
                      ? 'bg-orange-600 text-white'
                      : filter === 'preparing'
                      ? 'bg-blue-600 text-white'
                      : filter === 'ready'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Orders ({orders.length})</h2>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['kitchen-orders', selectedHotelId] })}
            className="p-1.5 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-800"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${ordersLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Orders List */}
        {ordersLoading && orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <div>Loading orders...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">🍽️</div>
            <div className="text-lg">No orders</div>
            <div className="text-sm mt-1">New orders will appear here</div>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              // Calculate item totals - ensure we have all items
              const itemDetails = (order.items || []).map((item: any) => {
                const price = item.menuItem?.price || item.price || item.unit_price || item.total_price || 0
                const quantity = item.quantity || 1
                const total = item.total_price || parseFloat(price.toString()) * quantity
                return {
                  id: item.id, // Ensure ID is included
                  name: item.menuItem?.name || item.name || item.menu_item_name || 'Item',
                  quantity,
                  unitPrice: parseFloat(price.toString()),
                  total: parseFloat(total.toString()),
                  specialInstructions: item.specialInstructions || item.special_instructions,
                  status: item.status || 'pending' // Include item status
                }
              })
              
              // Check if all kitchen items are ready (for button state)
              const allKitchenItemsReady = itemDetails.length > 0 && itemDetails.every((item: any) => 
                item.status === 'ready' || item.status === 'delivered'
              )
              const anyKitchenItemsPreparing = itemDetails.some((item: any) => item.status === 'preparing')
              const allKitchenItemsDelivered = itemDetails.length > 0 && itemDetails.every((item: any) => 
                item.status === 'delivered'
              )
              const itemsSubtotal = itemDetails.length > 0 
                ? itemDetails.reduce((sum: number, item: any) => sum + item.total, 0)
                : (order.subtotal || 0)
              
              const isDelivered = order.status === 'delivered'
              
              return (
                <div
                  key={order.id}
                  className={`bg-gray-800 rounded-lg border-2 p-2.5 transition-all ${
                    order.is_urgent && !isDelivered
                      ? 'border-red-500 shadow-lg shadow-red-500/20 animate-pulse' 
                      : order.status === 'pending' 
                      ? 'border-orange-500' 
                      : order.status === 'preparing' 
                      ? 'border-blue-500' 
                      : order.status === 'ready' 
                      ? 'border-green-500'
                      : order.status === 'delivered'
                      ? 'border-gray-600'
                      : 'border-gray-700'
                  }`}
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-white">#{order.order_number}</span>
                        {order.is_urgent && !isDelivered && (
                          <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs font-bold rounded animate-pulse">
                            URGENT
                          </span>
                        )}
                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                          order.status === 'pending' ? 'bg-orange-600 text-white' :
                          order.status === 'preparing' ? 'bg-blue-600 text-white' :
                          order.status === 'ready' ? 'bg-green-600 text-white' :
                          order.status === 'delivered' ? 'bg-gray-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {order.status.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-300">
                        Room <span className="font-semibold text-white">{order.room_number || 'N/A'}</span> • {order.guest_name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {order.minutes_waiting === 0 
                            ? 'Just now' 
                            : `${order.minutes_waiting}m ago`} • {order.created_at_formatted}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items with Full Details */}
                  <div className="bg-gray-900/50 rounded p-2 mb-2">
                    <div className="space-y-1">
                      {itemDetails.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between text-xs">
                          <div className="flex-1">
                            <div className="text-gray-200">
                              <span className="font-semibold text-white">{item.quantity}x</span> {item.name}
                            </div>
                            {item.specialInstructions && (
                              <div className="text-yellow-400 text-xs mt-0.5 italic">Note: {item.specialInstructions}</div>
                            )}
                          </div>
                          <div className="text-right text-gray-300 ml-2">
                            <div>${item.unitPrice.toFixed(2)}</div>
                            <div className="font-semibold text-white">${item.total.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-700 mt-1.5 pt-1.5 flex justify-between text-xs">
                      <span className="text-gray-400">Subtotal:</span>
                      <span className="font-semibold text-white">${itemsSubtotal.toFixed(2)}</span>
                    </div>
                    {order.total_amount && order.total_amount !== itemsSubtotal && (
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-400">Total:</span>
                        <span className="font-bold text-white">${parseFloat(order.total_amount.toString()).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Special Instructions */}
                  {order.special_instructions && (
                    <div className="bg-yellow-900/30 border border-yellow-600/50 rounded p-1.5 mb-2">
                      <div className="text-xs font-semibold text-yellow-400 mb-0.5">Special Instructions</div>
                      <div className="text-xs text-yellow-200">{order.special_instructions}</div>
                    </div>
                  )}

                  {/* Action Button - Only show for non-delivered orders */}
                  {!allKitchenItemsDelivered && (
                    <button
                      onClick={() => {
                        // Get item IDs for this order's kitchen items
                        const itemIds = itemDetails
                          .map((item: any) => item.id)
                          .filter((id: string) => id && id !== '')
                        
                        console.log('[KITCHEN] Button clicked:', {
                          orderId: order.id,
                          orderNumber: order.order_number,
                          itemDetailsCount: itemDetails.length,
                          itemIdsCount: itemIds.length,
                          itemIds: itemIds,
                          itemStatuses: itemDetails.map((item: any) => ({ id: item.id, status: item.status, name: item.name })),
                          allKitchenItemsReady,
                          allKitchenItemsDelivered,
                          anyKitchenItemsPreparing
                        })
                        
                        if (itemIds.length === 0) {
                          console.error('[KITCHEN] No valid item IDs found for order', order.id, 'Item details:', itemDetails)
                          return
                        }
                        
                        // Determine next status based on current item statuses (not order.status)
                        // IMPORTANT: Check most specific conditions first (ready → delivered) before general ones
                        
                        if (allKitchenItemsReady && !allKitchenItemsDelivered) {
                          // Mark as delivered if all items are ready but not yet delivered
                          // This is the highest priority check
                          console.log('[KITCHEN] Updating to delivered')
                          handleStatusChange(order.id, 'delivered', itemIds)
                        } else if (anyKitchenItemsPreparing && !allKitchenItemsReady) {
                          // Mark ready if currently preparing but not all ready
                          console.log('[KITCHEN] Updating to ready')
                          handleStatusChange(order.id, 'ready', itemIds)
                        } else {
                          // Start preparing if all items are pending or none are preparing
                          // This is the default action for new orders
                          const allItemsPending = itemDetails.every((item: any) => item.status === 'pending')
                          console.log('[KITCHEN] Updating to preparing (all pending or not preparing)')
                          handleStatusChange(order.id, 'preparing', itemIds)
                        }
                      }}
                      disabled={
                        updateStatusMutation.isPending || 
                        allKitchenItemsDelivered ||
                        itemDetails.length === 0 ||
                        !itemDetails.some((item: any) => item.id && item.id !== '')
                      }
                      className={`w-full py-2 rounded font-semibold text-sm transition-all mt-2 ${
                        allKitchenItemsDelivered
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : allKitchenItemsReady && !allKitchenItemsDelivered
                            ? 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
                            : !anyKitchenItemsPreparing && !allKitchenItemsReady
                              ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                              : 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
                      } ${updateStatusMutation.isPending ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {allKitchenItemsReady && !allKitchenItemsDelivered && (
                        <span className="flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Mark as Delivered
                        </span>
                      )}
                      {!allKitchenItemsReady && anyKitchenItemsPreparing && (
                        <span className="flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Mark Ready
                        </span>
                      )}
                      {!allKitchenItemsReady && !anyKitchenItemsPreparing && (
                        <span className="flex items-center justify-center gap-1.5">
                          <Play className="w-4 h-4" />
                          Start Preparing
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
