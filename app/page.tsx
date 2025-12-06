'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { getRoleDisplayName } from '@/lib/auth/roles'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { logger } from '@/lib/utils/logger'
import { StatWidget } from '@/components/dashboard/StatWidget'
import { SuperAdminRecentHotels } from '@/components/dashboard/SuperAdminWidgets'
import { SuperAdminRecentUsers } from '@/components/dashboard/SuperAdminWidgets'
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget'
import {
  Building2,
  Home as HomeIcon,
  Users,
  UserCheck,
  ShoppingCart,
  Wrench,
  DollarSign,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { useHotelTimezone } from '@/lib/hooks/useHotelTimezone'

export const dynamic = 'force-dynamic'

interface SuperAdminStats {
  hotels: {
    total: number
    active: number
  }
  rooms: {
    total: number
  }
  users: {
    total: number
    staff: number
  }
  serviceRequests: {
    total: number
    pending: number
  }
  orders: {
    total: number
  }
  revenue: {
    total: number
  }
  bookings: {
    total: number
    active: number
  }
  recentHotels: Array<{
    id: string
    title: any
    active: boolean
    created_at: string
  }>
  recentUsers: Array<{
    id: string
    name: any
    email: string | null
    role_id: string
    created_at: string
  }>
  recentServiceRequests: Array<{
    id: string
    request_type: string
    status: string
    room_number?: string
    guest_name?: string
    created_at: string
    priority?: string
    hotel_id: string
  }>
  recentOrders: Array<{
    id: string
    order_number: string
    total_amount: number
    status: string
    guest_name?: string
    room_number?: string
    created_at: string
    hotel_id: string
  }>
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const hotelTimezone = useHotelTimezone(undefined) // Default timezone for super-admin

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      // Check if user is super-admin
      if (user.role_id !== 'super_admin') {
        // Redirect hotel admins to their dashboard
        router.push('/admin/hotel')
        return
      }
      loadDashboardStats()
    }
  }, [user])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)
    } catch (error) {
      logger.error('Failed to load user:', error)
      router.push('/login')
    }
  }

  const loadDashboardStats = async () => {
    setStatsLoading(true)
    try {
      const response = await fetch('/api/dashboard/super-admin-stats')
      if (!response.ok) {
        if (response.status === 403) {
          // Not super-admin, redirect
          router.push('/admin/hotel')
          return
        }
        throw new Error('Failed to load dashboard stats')
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      logger.error('Failed to load dashboard stats:', error)
    } finally {
      setStatsLoading(false)
      setLoading(false)
    }
  }

  // Redirect non-super-admins
  if (user && user.role_id !== 'super_admin') {
    return null // Will redirect in useEffect
  }

  return (
    <div>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading dashboard...</div>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Super Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                  Welcome back, {user ? extractTextFromJson(user.name) : 'Admin'}
                </p>
              </div>
              <Link href="/hotels">
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                  Manage Hotels
                </Button>
              </Link>
            </div>

            {/* Key Metrics - Top Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
              <StatWidget
                title="Total Hotels"
                value={statsLoading ? '...' : stats?.hotels.total || 0}
                icon={Building2}
                iconColor="text-blue-600"
                iconBgColor="bg-blue-50"
                loading={statsLoading}
                onClick={() => router.push('/hotels')}
              />
              <StatWidget
                title="Active Hotels"
                value={statsLoading ? '...' : stats?.hotels.active || 0}
                icon={Building2}
                iconColor="text-green-600"
                iconBgColor="bg-green-50"
                loading={statsLoading}
                onClick={() => router.push('/hotels')}
              />
              <StatWidget
                title="Total Rooms"
                value={statsLoading ? '...' : stats?.rooms.total || 0}
                icon={HomeIcon}
                iconColor="text-purple-600"
                iconBgColor="bg-purple-50"
                loading={statsLoading}
              />
              <StatWidget
                title="Total Users"
                value={statsLoading ? '...' : stats?.users.total || 0}
                icon={Users}
                iconColor="text-indigo-600"
                iconBgColor="bg-indigo-50"
                loading={statsLoading}
                onClick={() => router.push('/users')}
              />
              <StatWidget
                title="Staff Members"
                value={statsLoading ? '...' : stats?.users.staff || 0}
                icon={UserCheck}
                iconColor="text-teal-600"
                iconBgColor="bg-teal-50"
                loading={statsLoading}
                onClick={() => router.push('/users')}
              />
              <StatWidget
                title="All-Time Revenue"
                value={statsLoading ? '...' : `$${(stats?.revenue.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
                iconColor="text-green-600"
                iconBgColor="bg-green-50"
                loading={statsLoading}
              />
              </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatWidget
                title="Total Orders"
                value={statsLoading ? '...' : stats?.orders.total || 0}
                icon={ShoppingCart}
                iconColor="text-orange-600"
                iconBgColor="bg-orange-50"
                loading={statsLoading}
              />
              <StatWidget
                title="Service Requests"
                value={statsLoading ? '...' : stats?.serviceRequests.total || 0}
                icon={Wrench}
                iconColor="text-yellow-600"
                iconBgColor="bg-yellow-50"
                loading={statsLoading}
              />
              <StatWidget
                title="Pending Requests"
                value={statsLoading ? '...' : stats?.serviceRequests.pending || 0}
                icon={AlertCircle}
                iconColor="text-red-600"
                iconBgColor="bg-red-50"
                loading={statsLoading}
                onClick={() => router.push('/admin/data-requests')}
              />
              <StatWidget
                title="Active Bookings"
                value={statsLoading ? '...' : stats?.bookings.active || 0}
                icon={Calendar}
                iconColor="text-pink-600"
                iconBgColor="bg-pink-50"
                loading={statsLoading}
              />
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SuperAdminRecentHotels
              hotels={stats?.recentHotels || []}
              loading={statsLoading}
              hotelTimezone={hotelTimezone}
            />
            <SuperAdminRecentUsers
              users={stats?.recentUsers || []}
              loading={statsLoading}
              hotelTimezone={hotelTimezone}
            />
              </div>

          {/* Recent Orders and Service Requests */}
          <div className="mb-6">
            <RecentActivityWidget
              orders={stats?.recentOrders || []}
              serviceRequests={stats?.recentServiceRequests || []}
              loading={statsLoading}
            />
          </div>
        </>
      )}
    </div>
  )
}
