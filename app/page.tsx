'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { getHotels } from '@/lib/database/hotels'
import { getUsers } from '@/lib/database/users'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { getRoleDisplayName } from '@/lib/auth/roles'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { DashboardHotelsList } from '@/components/hotels/DashboardHotelsList'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { supabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function Home() {
  const [stats, setStats] = useState({
    hotels: 0,
    rooms: 0,
    serviceRequests: 0,
    pendingRequests: 0,
    staff: 0,
  })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
    loadData()
  }, [])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      setUser(currentUser)
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  const loadData = async () => {
    try {
      const [hotelsData] = await Promise.all([
        getHotels().catch(() => []),
      ])

      const hotelIds = hotelsData.map((h: any) => h.id)
      
      // Calculate total rooms from hotels
      const totalRooms = hotelsData.reduce((sum, hotel) => sum + ((hotel as any).room_count || 0), 0)

      // Get total service requests across all hotels
      let serviceRequestsCount = 0
      if (hotelIds.length > 0) {
        try {
          const { count } = await supabase
            .from('service_requests')
            .select('*', { count: 'exact', head: true })
            .in('hotel_id', hotelIds)
            .eq('is_deleted', false)
          serviceRequestsCount = count || 0
        } catch (err) {
          console.error('Failed to load service requests count:', err)
        }
      }

      // Get pending service requests
      let pendingRequestsCount = 0
      if (hotelIds.length > 0) {
        try {
          const { count } = await supabase
            .from('service_requests')
            .select('*', { count: 'exact', head: true })
            .in('hotel_id', hotelIds)
            .eq('status', 'pending')
            .eq('is_deleted', false)
          pendingRequestsCount = count || 0
        } catch (err) {
          console.error('Failed to load pending requests count:', err)
        }
      }

      // Get total staff (non-admin roles)
      let staffCount = 0
      try {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .in('role_id', ['staff', 'front_desk', 'housekeeping', 'maintenance'])
          .eq('is_deleted', false)
          .eq('active', 1)
        staffCount = count || 0
      } catch (err) {
        console.error('Failed to load staff count:', err)
      }

      setStats({
        hotels: hotelsData.length,
        rooms: totalRooms,
        serviceRequests: serviceRequestsCount,
        pendingRequests: pendingRequestsCount,
        staff: staffCount,
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading statistics...</div>
      ) : (
        <>
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                    Welcome {user ? extractTextFromJson(user.name) : 'User'}
                  </h2>
                  {user?.role_id && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getRoleDisplayName(user.role_id)}
                    </span>
                  )}
                </div>
              </div>
              <Link href="/hotels">
                <Button className="bg-gray-900 text-white hover:bg-gray-800">
                  + Add Hotel
                </Button>
              </Link>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Total Hotels</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.hotels}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Total Rooms</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.rooms}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Pending Requests</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Total Staff</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.staff}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hotels List Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Recent Hotels</h3>
                <p className="text-xs md:text-sm text-gray-500 mt-1">Showing first 10 properties</p>
              </div>
              <Link href="/hotels">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <span>⚙️</span>
                  View All
                </Button>
              </Link>
            </div>
            <div className="p-6">
              <DashboardHotelsList />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
