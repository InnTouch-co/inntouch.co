'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
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
  Home,
  Wrench,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { RoomsIcon, ServiceRequestsIcon } from '@/components/ui/Icons'

interface FrontDeskStats {
  rooms: {
    total: number
    available: number
    occupied: number
    maintenance: number
  }
  serviceRequests: {
    pending: number
    inProgress: number
    completedToday: number
    avgResponseMinutes: number
  }
  folios: {
    pending: number
  }
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

export default function FrontDeskDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [hotels, setHotels] = useState<Hotel[]>([])
  const selectedHotel = useSelectedHotel()
  const [stats, setStats] = useState<FrontDeskStats | null>(null)
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

      if (error) {
        logger.error('Error loading hotel assignments:', error)
        return
      }

      if (hotelAssignments && hotelAssignments.length > 0) {
        const userHotels = hotelAssignments
          .map((assignment: any) => assignment.hotels)
          .filter((hotel: any) => hotel && !hotel.is_deleted) as Hotel[]
        setHotels(userHotels)
      }
    } catch (error) {
      logger.error('Failed to load user and hotels:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUserAndHotels()
  }, [loadUserAndHotels])

  const loadDashboardStats = useCallback(async () => {
    if (!selectedHotel) {
      setStatsLoading(false)
      return
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setStatsLoading(true)
    try {
      const response = await fetch(`/api/dashboard/stats?hotel_id=${selectedHotel}`)
      if (!response.ok) {
        throw new Error('Failed to load dashboard stats')
      }
      const data = await response.json()

      if (abortController.signal.aborted) return

      setStats({
        rooms: data.rooms,
        serviceRequests: data.serviceRequests,
        folios: data.folios,
        recentServiceRequests: data.recentServiceRequests || [],
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      logger.error('Failed to load dashboard stats:', error)
    } finally {
      if (!abortController.signal.aborted) {
        setStatsLoading(false)
      }
    }
  }, [selectedHotel])

  useEffect(() => {
    loadDashboardStats()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadDashboardStats])

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
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Front Desk Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Welcome back, {user ? extractTextFromJson(user.name) : 'User'}
          </p>
        </div>

        {!selectedHotel ? (
          <Card>
            <div className="p-8 text-center">
              <p className="text-sm md:text-base text-gray-500 mb-4">No hotels assigned to your account.</p>
              <p className="text-xs md:text-sm text-gray-400">Please contact the administrator to assign hotels to your account.</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Key Metrics - Top Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatWidget
                title="Total Rooms"
                value={statsLoading ? '...' : stats?.rooms.total || 0}
                icon={Home}
                iconColor="text-purple-600"
                iconBgColor="bg-purple-50"
                loading={statsLoading}
                onClick={() => router.push('/rooms')}
              />
              <StatWidget
                title="Available Rooms"
                value={statsLoading ? '...' : stats?.rooms.available || 0}
                icon={Home}
                iconColor="text-green-600"
                iconBgColor="bg-green-50"
                loading={statsLoading}
                onClick={() => router.push('/rooms')}
              />
              <StatWidget
                title="Pending Requests"
                value={statsLoading ? '...' : stats?.serviceRequests.pending || 0}
                icon={AlertCircle}
                iconColor="text-red-600"
                iconBgColor="bg-red-50"
                loading={statsLoading}
                onClick={() => router.push('/service-requests')}
              />
              <StatWidget
                title="Pending Folios"
                value={statsLoading ? '...' : stats?.folios.pending || 0}
                icon={FileText}
                iconColor="text-yellow-600"
                iconBgColor="bg-yellow-50"
                loading={statsLoading}
                onClick={() => router.push('/folio?filter=pending')}
              />
            </div>

            {/* Room Status Widget */}
            <div className="mb-6">
              <RoomStatusWidget
                total={stats?.rooms?.total || 0}
                available={stats?.rooms?.available || 0}
                occupied={stats?.rooms?.occupied || 0}
                maintenance={stats?.rooms?.maintenance || 0}
                loading={statsLoading}
              />
            </div>

            {/* Service Requests Widget */}
            <div className="mb-6">
              <ServiceRequestsWidget
                pending={stats?.serviceRequests?.pending || 0}
                inProgress={stats?.serviceRequests?.inProgress || 0}
                completedToday={stats?.serviceRequests?.completedToday || 0}
                avgResponseMinutes={stats?.serviceRequests?.avgResponseMinutes || 0}
                loading={statsLoading}
              />
            </div>

            {/* Recent Activity */}
            <div className="mb-6">
              <RecentActivityWidget
                orders={[]}
                serviceRequests={stats?.recentServiceRequests || []}
                loading={statsLoading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}


