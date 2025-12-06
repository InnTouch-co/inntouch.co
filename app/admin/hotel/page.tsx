'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { getRoleDisplayName } from '@/lib/auth/roles'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import { supabase } from '@/lib/supabase/client'
import type { User, Hotel } from '@/types/database'
import { logger } from '@/lib/utils/logger'
import { StatWidget } from '@/components/dashboard/StatWidget'
import { ServiceRequestsWidget } from '@/components/dashboard/ServiceRequestsWidget'
import { RoomStatusWidget } from '@/components/dashboard/RoomStatusWidget'
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget'
import {
  DollarSign,
  ShoppingCart,
  FileText,
  Users,
  Calendar,
  CalendarCheck,
  Home,
  TrendingUp,
} from 'lucide-react'
import { RoomsIcon, ServiceRequestsIcon, StaffIcon, ServicesIcon } from '@/components/ui/Icons'

interface DashboardStats {
  rooms: {
    total: number
    available: number
    occupied: number
    maintenance: number
  }
  staff: {
    total: number
  }
  serviceRequests: {
    pending: number
    inProgress: number
    completedToday: number
    avgResponseMinutes: number
  }
  revenue: {
    today: number
    todayOrders: number
  }
  folios: {
    pending: number
  }
  bookings: {
    checkInsToday: number
    checkOutsToday: number
    active: number
  }
  recentOrders: Array<{
    id: string
    order_number: string
    total_amount: number
    status: string
    created_at: string
    guest_name?: string
    room_number?: string
  }>
  recentServiceRequests: Array<{
    id: string
    request_type: string
    status: string
    room_number?: string
    guest_name?: string
    created_at: string
    priority?: string
  }>
}

export default function HotelAdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [hotels, setHotels] = useState<Hotel[]>([])
  const selectedHotel = useSelectedHotel()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadUserAndHotels = useCallback(async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        window.location.href = '/login'
        return
      }

      setUser(currentUser)

      // Get hotels assigned to this user
      const { data: hotelAssignments, error } = await supabase
        .from('hotel_users')
        .select('hotel_id, hotels(*)')
        .eq('user_id', currentUser.id)
        .eq('is_deleted', false)

      if (error) throw error

      const userHotels = (hotelAssignments || [])
        .map((assignment: any) => assignment.hotels)
        .filter((hotel): hotel is Hotel => Boolean(hotel) && typeof hotel === 'object' && 'id' in hotel)
      
      setHotels(userHotels)
    } catch (error) {
      logger.error('Failed to load user/hotels:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDashboardStats = useCallback(async () => {
    if (!selectedHotel) {
      setStats(null)
      return
    }

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setStatsLoading(true)

    try {
      const response = await fetch(`/api/dashboard/stats?hotel_id=${selectedHotel}`, {
        signal: abortController.signal,
      })

      if (abortController.signal.aborted) return

      if (!response.ok) {
        throw new Error('Failed to load dashboard stats')
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Request was cancelled, ignore error
      }
      logger.error('Failed to load dashboard stats:', error)
    } finally {
      if (!abortController.signal.aborted) {
        setStatsLoading(false)
      }
    }
  }, [selectedHotel])

  useEffect(() => {
    loadUserAndHotels()
  }, [loadUserAndHotels])

  useEffect(() => {
    if (selectedHotel) {
      loadDashboardStats()
      // Refresh stats every 30 seconds
      const interval = setInterval(loadDashboardStats, 30000)
      return () => {
        clearInterval(interval)
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [selectedHotel, loadDashboardStats])

  const currentHotel = useMemo(() => {
    return hotels.find((h) => h.id === selectedHotel)
  }, [hotels, selectedHotel])

  const userName = useMemo(() => {
    return user ? extractTextFromJson(user.name) : 'User'
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            Welcome back, {userName}
          </h1>
          {user?.role_id && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {getRoleDisplayName(user.role_id)}
            </span>
          )}
          {currentHotel && (
            <p className="text-sm text-gray-600 mt-2">
              {extractTextFromJson(currentHotel.title) || 'Hotel Dashboard'}
            </p>
          )}
        </div>
      </div>

      {!selectedHotel ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-sm md:text-base text-gray-500 mb-4">No hotels assigned to your account.</p>
            <p className="text-xs md:text-sm text-gray-400">Please contact the super administrator to assign hotels to your account.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Key Metrics - Top Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <StatWidget
              title="Today's Revenue"
              value={statsLoading ? '...' : `$${stats?.revenue.today.toFixed(2) || '0.00'}`}
              icon={DollarSign}
              iconColor="text-green-600"
              iconBgColor="bg-green-50"
              loading={statsLoading}
            />
            <StatWidget
              title="Today's Orders"
              value={statsLoading ? '...' : stats?.revenue.todayOrders || 0}
              icon={ShoppingCart}
              iconColor="text-blue-600"
              iconBgColor="bg-blue-50"
              loading={statsLoading}
            />
            <StatWidget
              title="Pending Folios"
              value={statsLoading ? '...' : stats?.folios.pending || 0}
              icon={FileText}
              iconColor="text-yellow-600"
              iconBgColor="bg-yellow-50"
              loading={statsLoading}
              onClick={() => window.location.href = '/folio?filter=pending'}
            />
            <StatWidget
              title="Active Bookings"
              value={statsLoading ? '...' : stats?.bookings.active || 0}
              icon={Home}
              iconColor="text-purple-600"
              iconBgColor="bg-purple-50"
              loading={statsLoading}
            />
            <StatWidget
              title="Check-ins Today"
              value={statsLoading ? '...' : stats?.bookings.checkInsToday || 0}
              icon={Calendar}
              iconColor="text-indigo-600"
              iconBgColor="bg-indigo-50"
              loading={statsLoading}
            />
            <StatWidget
              title="Check-outs Today"
              value={statsLoading ? '...' : stats?.bookings.checkOutsToday || 0}
              icon={CalendarCheck}
              iconColor="text-orange-600"
              iconBgColor="bg-orange-50"
              loading={statsLoading}
            />
          </div>

          {/* Main Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Requests Widget */}
            <ServiceRequestsWidget
              pending={stats?.serviceRequests.pending || 0}
              inProgress={stats?.serviceRequests.inProgress || 0}
              completedToday={stats?.serviceRequests.completedToday || 0}
              avgResponseMinutes={stats?.serviceRequests.avgResponseMinutes || 0}
              loading={statsLoading}
            />

            {/* Room Status Widget */}
            <RoomStatusWidget
              total={stats?.rooms.total || 0}
              available={stats?.rooms.available || 0}
              occupied={stats?.rooms.occupied || 0}
              maintenance={stats?.rooms.maintenance || 0}
              loading={statsLoading}
            />
          </div>

          {/* Recent Activity */}
          <RecentActivityWidget
            orders={stats?.recentOrders || []}
            serviceRequests={stats?.recentServiceRequests || []}
            loading={statsLoading}
          />

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/rooms">
                <div className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <RoomsIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Manage Rooms</p>
                </div>
              </Link>

              <Link href="/service-requests">
                <div className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <ServiceRequestsIcon className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Service Requests</p>
                </div>
              </Link>

              <Link href="/folio">
                <div className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Folios</p>
                </div>
              </Link>

              <Link href="/services">
                <div className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <ServicesIcon className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Services</p>
                </div>
              </Link>

              <Link href="/staff">
                <div className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <StaffIcon className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Staff</p>
                </div>
              </Link>

              <Link href="/promotions">
                <div className="p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors cursor-pointer text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-pink-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Promotions</p>
                </div>
              </Link>

              <Link href="/guest-site">
                <div className="p-4 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors cursor-pointer text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-cyan-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Guest Site</p>
                </div>
              </Link>

              <Link href="/rooms?view=bookings">
                <div className="p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer text-center">
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Bookings</p>
                </div>
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
