'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { getRoleDisplayName } from '@/lib/auth/roles'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { supabase } from '@/lib/supabase/client'
import type { User, Hotel } from '@/types/database'

interface HotelStats {
  rooms: number
  bookings: number
  activeBookings: number
  availableRooms: number
  staff: number
}

interface HotelAssignment {
  hotel_id: string
  hotels: Hotel | null
}

export default function HotelAdminDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  const [stats, setStats] = useState<HotelStats>({
    rooms: 0,
    bookings: 0,
    activeBookings: 0,
    availableRooms: 0,
    staff: 0,
  })
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

      // Only set selectedHotel if no hotel is currently selected
      setSelectedHotel((prev) => {
        if (!prev && userHotels.length > 0) {
          return userHotels[0].id
        }
        return prev
      })
    } catch (error) {
      console.error('Failed to load user/hotels:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHotelStats = useCallback(async () => {
    if (!selectedHotel) return

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setStatsLoading(true)

    try {
      // Optimized: Use count queries instead of fetching all data
      // This reduces network transfer and memory usage significantly
      const [roomsResult, bookingsResult, activeBookingsResult, availableRoomsResult, staffResult] = await Promise.all([
        supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true })
          .eq('hotel_id', selectedHotel)
          .eq('is_deleted', false),
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('hotel_id', selectedHotel)
          .eq('is_deleted', false),
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('hotel_id', selectedHotel)
          .eq('is_deleted', false)
          .in('status', ['confirmed', 'checked_in']),
        supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true })
          .eq('hotel_id', selectedHotel)
          .eq('status', 'available')
          .eq('is_deleted', false),
        supabase
          .from('hotel_users')
          .select('*', { count: 'exact', head: true })
          .eq('hotel_id', selectedHotel)
          .eq('is_deleted', false),
      ])

      // Check if request was aborted
      if (abortController.signal.aborted) return

      setStats({
        rooms: roomsResult.count || 0,
        bookings: bookingsResult.count || 0,
        activeBookings: activeBookingsResult.count || 0,
        availableRooms: availableRoomsResult.count || 0,
        staff: staffResult.count || 0,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Request was cancelled, ignore error
      }
      console.error('Failed to load hotel stats:', error)
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
      loadHotelStats()
    }

    // Cleanup: abort request on unmount or hotel change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [selectedHotel, loadHotelStats])

  // Memoize computed values to prevent unnecessary recalculations
  const currentHotel = useMemo(() => {
    return hotels.find((h) => h.id === selectedHotel)
  }, [hotels, selectedHotel])

  const userName = useMemo(() => {
    return user ? extractTextFromJson(user.name) : 'User'
  }, [user])

  const handleHotelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedHotel(e.target.value)
  }, [])

  const hotelOptions = useMemo(() => {
    return hotels.map((hotel) => ({
      id: hotel.id,
      title: extractTextFromJson(hotel.title),
    }))
  }, [hotels])

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
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
            Welcome {userName}
          </h2>
          {user?.role_id && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {getRoleDisplayName(user.role_id)}
            </span>
          )}
        </div>

        {hotels.length > 1 && (
          <div>
            <select
              value={selectedHotel}
              onChange={handleHotelChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Select hotel"
            >
              {hotelOptions.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.title || 'Untitled Hotel'}
                </option>
              ))}
            </select>
          </div>
        )}
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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4 mb-8">
            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Total Rooms</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">
                      {statsLoading ? '...' : stats.rooms}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Available Rooms</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">
                      {statsLoading ? '...' : stats.availableRooms}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Total Bookings</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">
                      {statsLoading ? '...' : stats.bookings}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Active Bookings</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">
                      {statsLoading ? '...' : stats.activeBookings}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="col-span-2 md:col-span-1">
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Staff Members</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">
                      {statsLoading ? '...' : stats.staff}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
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
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">Manage Rooms</h3>
                  <p className="text-xs md:text-sm text-gray-600">View and manage hotel rooms</p>
                </div>
              </Card>
            </Link>

            <Link href="/bookings">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">Manage Bookings</h3>
                  <p className="text-xs md:text-sm text-gray-600">View and manage reservations</p>
                </div>
              </Card>
            </Link>

            <Link href="/users">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-4">👥</div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">Manage Staff</h3>
                  <p className="text-xs md:text-sm text-gray-600">View and manage staff members</p>
                </div>
              </Card>
            </Link>

            <Link href="/services">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <div className="p-6 text-center">
                  <div className="text-4xl mb-4">⚙️</div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1">Services</h3>
                  <p className="text-xs md:text-sm text-gray-600">Manage hotel services</p>
                </div>
              </Card>
            </Link>
          </div>

          {/* Hotel Info */}
          {currentHotel && (
            <Card>
              <div className="p-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Hotel Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Hotel Name</p>
                    <p className="font-medium text-gray-900">
                      {extractTextFromJson(currentHotel.title) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Site</p>
                    <p className="font-medium text-gray-900">{currentHotel.site || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Email</p>
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

