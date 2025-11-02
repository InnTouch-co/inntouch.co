'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'

export default function HotelAdminDashboard() {
  const [user, setUser] = useState<any>(null)
  const [hotels, setHotels] = useState<any[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  const [stats, setStats] = useState({
    rooms: 0,
    bookings: 0,
    activeBookings: 0,
    availableRooms: 0,
    staff: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserAndHotels()
  }, [])

  useEffect(() => {
    if (selectedHotel) {
      loadHotelStats()
    }
  }, [selectedHotel])

  const loadUserAndHotels = async () => {
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

      const userHotels = (hotelAssignments || []).map((assignment: any) => assignment.hotels).filter(Boolean)
      setHotels(userHotels)

      if (userHotels.length > 0 && !selectedHotel) {
        setSelectedHotel(userHotels[0].id)
      }
    } catch (error) {
      console.error('Failed to load user/hotels:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHotelStats = async () => {
    if (!selectedHotel) return

    try {
      // Load rooms count
      const { count: roomsCount } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', selectedHotel)
        .eq('is_deleted', false)

      // Load bookings count
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', selectedHotel)
        .eq('is_deleted', false)

      // Load active bookings
      const { count: activeBookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', selectedHotel)
        .in('status', ['confirmed', 'checked_in'])
        .eq('is_deleted', false)

      // Load available rooms
      const { count: availableRoomsCount } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', selectedHotel)
        .eq('status', 'available')
        .eq('is_deleted', false)

      // Load staff count
      const { count: staffCount } = await supabase
        .from('hotel_users')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', selectedHotel)
        .eq('is_deleted', false)

      setStats({
        rooms: roomsCount || 0,
        bookings: bookingsCount || 0,
        activeBookings: activeBookingsCount || 0,
        availableRooms: availableRoomsCount || 0,
        staff: staffCount || 0,
      })
    } catch (error) {
      console.error('Failed to load hotel stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  const currentHotel = hotels.find((h) => h.id === selectedHotel)

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hotel Dashboard</h1>
          <p className="text-gray-600">Manage your hotel operations and staff</p>
        </div>

        {hotels.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Hotel
            </label>
            <select
              value={selectedHotel}
              onChange={(e) => setSelectedHotel(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {(hotel.title as any)?.en || hotel.title || 'Untitled Hotel'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedHotel ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No hotels assigned to your account.</p>
            <p className="text-sm text-gray-400">Please contact the super administrator to assign hotels to your account.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🏨</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Rooms</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.rooms}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">✓</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Available Rooms</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.availableRooms}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Bookings</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.bookings}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🔔</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active Bookings</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeBookings}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Staff Members</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.staff}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link href="/rooms">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-4">🛏️</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Manage Rooms</h3>
                  <p className="text-sm text-gray-600">View and manage hotel rooms</p>
                </div>
              </Card>
            </Link>

            <Link href="/bookings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Manage Bookings</h3>
                  <p className="text-sm text-gray-600">View and manage reservations</p>
                </div>
              </Card>
            </Link>

            <Link href="/users">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-4">👥</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Manage Staff</h3>
                  <p className="text-sm text-gray-600">View and manage staff members</p>
                </div>
              </Card>
            </Link>

            <Link href="/services">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-4">⚙️</div>
                  <h3 className="font-semibold text-gray-900 mb-1">Services</h3>
                  <p className="text-sm text-gray-600">Manage hotel services</p>
                </div>
              </Card>
            </Link>
          </div>

          {/* Hotel Info */}
          {currentHotel && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hotel Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Hotel Name</p>
                    <p className="font-medium text-gray-900">
                      {(currentHotel.title as any)?.en || currentHotel.title || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Site</p>
                    <p className="font-medium text-gray-900">{currentHotel.site || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <p className="font-medium text-gray-900">{currentHotel.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

