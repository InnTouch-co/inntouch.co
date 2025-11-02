'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { getHotels } from '@/lib/database/hotels'
import { getUsers } from '@/lib/database/users'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
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
  const [hotels, setHotels] = useState<any[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedHotel])

  const loadData = async () => {
    try {
      const [hotelsData, usersData] = await Promise.all([
        getHotels().catch(() => []),
        getUsers().catch(() => []),
      ])

      setHotels(hotelsData)
      setStats({
        hotels: hotelsData.length,
        users: usersData.length,
        rooms: 0, // TODO: Load from rooms table
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
          {/* Platform Overview Section */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Platform Overview</h2>
                <p className="text-sm text-gray-500">Manage hotels and global settings.</p>
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

          {/* Hotels Table Section */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Hotels</h3>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <span>⚙️</span>
                Manage
              </Button>
            </div>
            
            {hotels.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hotels found. Create one to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hotel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hotels.slice(0, 3).map((hotel) => (
                      <tr key={hotel.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center mr-3">
                              <span className="text-white text-lg">👑</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {extractTextFromJson(hotel.title)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {hotel.site || 'No site configured'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-900 text-white">
                            enterprise
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(hotel as any).user_count ?? 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            hotel.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {hotel.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/hotels`} className="text-blue-600 hover:text-blue-900">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        </div>
            )}
        </div>
        </>
      )}
    </div>
  )
}
