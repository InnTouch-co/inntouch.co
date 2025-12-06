'use client'

import { useState, useEffect } from 'react'
import { Clock, CheckCircle, Package, Truck, XCircle, RefreshCw } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { GuestNavbar } from './GuestNavbar'

interface Order {
  id: string
  order_number: string
  order_type: string
  status: string
  total_amount: number
  payment_status: string
  created_at: string
  delivered_at: string | null
  special_instructions: string | null
  items: any[]
}

interface OrderStatusPageProps {
  hotelId: string
  roomNumber: string | null
  onBack: () => void
  onCartClick?: () => void
  cartItemCount?: number
}

export function OrderStatusPage({ hotelId, roomNumber, onBack, onCartClick, cartItemCount = 0 }: OrderStatusPageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (hotelId && roomNumber) {
      loadOrders()
      // Refresh orders every 10 seconds
      const interval = setInterval(loadOrders, 10000)
      return () => clearInterval(interval)
    }
  }, [hotelId, roomNumber])

  const loadOrders = async () => {
    if (!hotelId || !roomNumber) return
    
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(
        `/api/guest/orders?hotel_id=${encodeURIComponent(hotelId)}&room_number=${encodeURIComponent(roomNumber)}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to load orders')
      }
      
      const data = await response.json()
      setOrders(data)
    } catch (err: any) {
      logger.error('Error loading orders:', err)
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-yellow-500" size={20} />
      case 'confirmed':
        return <CheckCircle className="text-blue-500" size={20} />
      case 'preparing':
        return <Package className="text-orange-500" size={20} />
      case 'ready':
        return <Package className="text-green-500" size={20} />
      case 'out_for_delivery':
        return <Truck className="text-blue-500" size={20} />
      case 'delivered':
        return <CheckCircle className="text-green-500" size={20} />
      case 'cancelled':
        return <XCircle className="text-red-500" size={20} />
      default:
        return <Clock className="text-gray-500" size={20} />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'confirmed':
        return 'Confirmed'
      case 'preparing':
        return 'Preparing'
      case 'ready':
        return 'Ready'
      case 'out_for_delivery':
        return 'Out for Delivery'
      case 'delivered':
        return 'Delivered'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'preparing':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'out_for_delivery':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <GuestNavbar
        onBack={onBack}
        onCartClick={onCartClick}
        cartItemCount={cartItemCount}
        title="My Orders"
        rightAction={
          <button
            onClick={loadOrders}
            disabled={loading}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh orders"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Orders Yet</h2>
            <p className="text-gray-400">Your orders will appear here once you place them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {order.order_number}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                {order.items && order.items.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Items:</h4>
                    <ul className="space-y-1">
                      {order.items.map((item: any, index: number) => (
                        <li key={index} className="text-sm text-gray-400 flex justify-between">
                          <span>
                            {item.quantity}x {item.menuItem?.name || item.name || 'Item'}
                          </span>
                          <span className="text-white">
                            ${((item.menuItem?.price || item.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Special Instructions */}
                {order.special_instructions && (
                  <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                    <p className="text-xs font-medium text-gray-300 mb-1">Special Instructions:</p>
                    <p className="text-sm text-gray-400">{order.special_instructions}</p>
                  </div>
                )}

                {/* Order Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    {order.delivered_at && (
                      <span>Delivered: {formatDate(order.delivered_at)}</span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-white">
                    ${order.total_amount.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

