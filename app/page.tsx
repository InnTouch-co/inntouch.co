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

export const dynamic = 'force-dynamic'

export default function Home() {
  const [stats, setStats] = useState({
    hotels: 0,
    users: 0,
    rooms: 0,
    bookings: 0,
    activeBookings: 0,
    availableRooms: 0,
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
      const [hotelsData, usersData] = await Promise.all([
        getHotels().catch(() => []),
        getUsers().catch(() => []),
      ])

      // Calculate total rooms from hotels
      const totalRooms = hotelsData.reduce((sum, hotel) => sum + ((hotel as any).room_count || 0), 0)

      setStats({
        hotels: hotelsData.length,
        users: usersData.length,
        rooms: totalRooms,
        bookings: 0, // TODO: Load from bookings table
        activeBookings: 0, // TODO: Load active bookings
        availableRooms: 0, // TODO: Load available rooms
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🏢</span>
                  </div>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <span>+12%</span>
                    <span className="ml-1">📈</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Hotels</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.hotels}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📍</span>
                  </div>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <span>+8%</span>
                    <span className="ml-1">📈</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Properties</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.hotels}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <span>+15%</span>
                    <span className="ml-1">📈</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.users}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <span>+23%</span>
                    <span className="ml-1">📈</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">$127K</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hotels List Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Hotels</h3>
                <p className="text-sm text-gray-500 mt-1">Showing first 10 properties</p>
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
