'use client'

import { Card } from '@/components/ui/Card'
import { Building2, Users, ShoppingCart, Wrench, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { formatTimestamp } from '@/lib/utils/formatTimestamp'

interface SuperAdminRecentHotelsProps {
  hotels: Array<{
    id: string
    title: any
    active: boolean
    created_at: string
  }>
  loading?: boolean
  hotelTimezone?: string
}

export function SuperAdminRecentHotels({ hotels, loading = false, hotelTimezone = 'America/Chicago' }: SuperAdminRecentHotelsProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Hotels</h3>
        </div>
        <Link
          href="/hotels"
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
      ) : hotels.length > 0 ? (
        <div className="space-y-3">
          {hotels.map((hotel) => (
            <Link
              key={hotel.id}
              href={`/hotels/${hotel.id}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {extractTextFromJson(hotel.title)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    hotel.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {hotel.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Created: {formatTimestamp(hotel.created_at, hotelTimezone, { format: 'short' })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">No hotels found</div>
      )}
    </Card>
  )
}

interface SuperAdminRecentUsersProps {
  users: Array<{
    id: string
    name: any
    email: string | null
    role_id: string
    created_at: string
  }>
  loading?: boolean
  hotelTimezone?: string
}

export function SuperAdminRecentUsers({ users, loading = false, hotelTimezone = 'America/Chicago' }: SuperAdminRecentUsersProps) {
  const getRoleBadgeColor = (roleId: string) => {
    switch (roleId) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800'
      case 'hotel_admin':
        return 'bg-blue-100 text-blue-800'
      case 'staff':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
        </div>
        <Link
          href="/users"
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
      ) : users.length > 0 ? (
        <div className="space-y-3">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/users/${user.id}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {extractTextFromJson(user.name)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(user.role_id)}`}>
                    {user.role_id.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {user.email} • Created: {formatTimestamp(user.created_at, hotelTimezone, { format: 'short' })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 text-sm">No users found</div>
      )}
    </Card>
  )
}


