'use client'

import { Card } from '@/components/ui/Card'
import { ShoppingCart, Wrench, Clock } from 'lucide-react'
import Link from 'next/link'
import { useHotelTimezone } from '@/lib/hooks/useHotelTimezone'
import { formatTimestamp } from '@/lib/utils/formatTimestamp'

interface RecentOrder {
  id: string
  order_number: string
  total_amount: number
  status: string
  created_at: string
  guest_name?: string
  room_number?: string
  hotel_id?: string
  hotel_name?: string
}

interface RecentServiceRequest {
  id: string
  request_type: string
  status: string
  room_number?: string
  guest_name?: string
  created_at: string
  priority?: string
  hotel_id?: string
  hotel_name?: string
}

interface RecentActivityWidgetProps {
  orders: RecentOrder[]
  serviceRequests: RecentServiceRequest[]
  loading?: boolean
}

export function RecentActivityWidget({
  orders,
  serviceRequests,
  loading = false,
}: RecentActivityWidgetProps) {
  const hotelTimezone = useHotelTimezone(undefined) // Default timezone
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return formatTimestamp(dateString, hotelTimezone, { format: 'short' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Orders */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
          </div>
          <Link
            href="/service-requests"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      #{order.order_number}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {order.hotel_name && <span className="font-medium">{order.hotel_name}</span>}
                    {order.room_number && <span>• Room {order.room_number}</span>}
                    {order.guest_name && <span>• {order.guest_name}</span>}
                    <span>• {formatTime(order.created_at)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">${order.total_amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">No recent orders</div>
        )}
      </Card>

      {/* Recent Service Requests */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Recent Requests</h3>
          </div>
          <Link
            href="/service-requests"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        ) : serviceRequests.length > 0 ? (
          <div className="space-y-3">
            {serviceRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900 capitalize">
                      {request.request_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                    {request.priority === 'urgent' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {request.hotel_name && <span className="font-medium">{request.hotel_name}</span>}
                    {request.room_number && <span>• Room {request.room_number}</span>}
                    {request.guest_name && <span>• {request.guest_name}</span>}
                    <span>• {formatTime(request.created_at)}</span>
                  </div>
                </div>
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">No recent service requests</div>
        )}
      </Card>
    </div>
  )
}

