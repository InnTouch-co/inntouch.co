'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import { getRooms, deleteRoom, calculateRoomStats } from '@/lib/database/rooms'
import { getHotelById } from '@/lib/database/hotels'
import { extractTextFromJson } from '@/lib/utils/json-text'
import type { Room } from '@/types/database-extended'

export const dynamic = 'force-dynamic'

type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance'

const AMENITIES_OPTIONS = [
  { id: 'wifi', label: 'WiFi', icon: '📶' },
  { id: 'tv', label: 'TV', icon: '📺' },
  { id: 'ac', label: 'AC', icon: '❄️' },
  { id: 'coffee', label: 'Coffee Maker', icon: '☕' },
  { id: 'minibar', label: 'Minibar', icon: '🍷' },
  { id: 'safe', label: 'Safe', icon: '🔒' },
  { id: 'balcony', label: 'Balcony', icon: '🌅' },
  { id: 'bathtub', label: 'Bathtub', icon: '🛁' },
]

export default function RoomsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [hotels, setHotels] = useState<any[]>([])
  const [selectedHotel, setSelectedHotel] = useState<string>('')
  const [currentHotel, setCurrentHotel] = useState<any>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    cleaning: 0,
    maintenance: 0,
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  useEffect(() => {
    loadUserAndHotels()
  }, [])

  useEffect(() => {
    if (selectedHotel) {
      loadHotelData()
      loadRooms()
    }
  }, [selectedHotel])

  useEffect(() => {
    if (selectedHotel) {
      loadRooms()
    }
  }, [statusFilter])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

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

  const loadHotelData = async () => {
    if (!selectedHotel) return
    try {
      const hotel = await getHotelById(selectedHotel)
      setCurrentHotel(hotel)
    } catch (error) {
      console.error('Failed to load hotel:', error)
    }
  }

  const loadRooms = async () => {
    if (!selectedHotel) return
    try {
      const roomsData = await getRooms(selectedHotel)
      setRooms(roomsData)
      // Calculate stats from loaded data instead of separate query
      const counts = calculateRoomStats(roomsData)
      setStats(counts)
    } catch (error) {
      console.error('Failed to load rooms:', error)
    }
  }

  const handleAddRoom = () => {
    if (currentHotel && currentHotel.room_count) {
      const currentRoomCount = rooms.length
      if (currentRoomCount >= currentHotel.room_count) {
        alert(`Cannot add more rooms. Maximum room limit is ${currentHotel.room_count}`)
        return
      }
    }
    const hotelParam = selectedHotel ? `?hotel_id=${selectedHotel}` : ''
    router.push(`/rooms/new${hotelParam}`)
  }

  const handleBulkAddRooms = () => {
    if (currentHotel && currentHotel.room_count) {
      const currentRoomCount = rooms.length
      if (currentRoomCount >= currentHotel.room_count) {
        alert(`Cannot add more rooms. Maximum room limit is ${currentHotel.room_count}`)
        return
      }
    }
    const hotelParam = selectedHotel ? `?hotel_id=${selectedHotel}` : ''
    router.push(`/rooms/bulk-add${hotelParam}`)
  }

  const handleEditRoom = (room: Room) => {
    router.push(`/rooms/${room.id}/edit`)
  }

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return
    try {
      await deleteRoom(id)
      loadRooms()
    } catch (error) {
      console.error('Failed to delete room:', error)
      alert('Failed to delete room')
    }
  }

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = !searchQuery || 
      room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      extractTextFromJson(room.room_type).toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRooms = filteredRooms.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'occupied':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'cleaning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'maintenance':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return '✓'
      case 'occupied':
        return '👥'
      case 'cleaning':
        return '✨'
      case 'maintenance':
        return '🔧'
      default:
        return '•'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  if (hotels.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No hotels assigned to your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Rooms Management</h1>
          <p className="text-xs md:text-sm text-gray-600">Manage your property's rooms and inventory</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkAddRooms}
            className="text-xs md:text-sm"
            disabled={currentHotel && currentHotel.room_count && rooms.length >= currentHotel.room_count}
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Bulk Add Rooms
          </Button>
          <Button
            size="sm"
            onClick={handleAddRoom}
            className="bg-black text-white hover:bg-gray-800 text-xs md:text-sm"
            disabled={currentHotel && currentHotel.room_count && rooms.length >= currentHotel.room_count}
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + Add Room
          </Button>
        </div>
      </div>
      
      {/* Hotel Selector */}
      {hotels.length > 1 && (
        <div className="mb-6">
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            Select Hotel
          </label>
          <select
            value={selectedHotel}
            onChange={(e) => setSelectedHotel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
          >
            {hotels.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {extractTextFromJson(hotel.title)}
              </option>
            ))}
          </select>
        </div>
      )}

      {!selectedHotel ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-sm md:text-base text-gray-500">Please select a hotel to manage rooms.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4 mb-6 md:mb-8">
            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Total Rooms</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.total}</p>
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
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Available</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.available}</p>
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
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Occupied</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.occupied}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Cleaning</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.cleaning}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="col-span-2 md:col-span-1">
              <div className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] md:text-sm text-gray-500 mb-0.5 md:mb-1">Maintenance</p>
                    <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.maintenance}</p>
                  </div>
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-6 md:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 mb-6 flex flex-col md:flex-row items-center gap-3 md:gap-4">
            <div className="flex-1 relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
              />
            </div>
            <button
              onClick={() => setStatusFilter(statusFilter === 'all' ? 'available' : 'all')}
              className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs md:text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-sm md:text-base text-gray-500 mb-4">
                  {searchQuery || statusFilter !== 'all' ? 'No rooms match your filters.' : 'No rooms found. Add your first room to get started.'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button onClick={handleAddRoom} size="sm">
                    + Add Room
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
                {paginatedRooms.map((room) => {
                const roomTypeText = extractTextFromJson(room.room_type)
                const amenities = Array.isArray(room.amenities) ? room.amenities : []

                return (
                  <Card key={room.id}>
                    <div className="p-2 md:p-3">
                      {/* Status Badge */}
                      <div className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium mb-2 border ${getStatusColor(room.status)}`}>
                        <span className="mr-1">{getStatusIcon(room.status)}</span>
                        {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                      </div>

                      {/* Room Number and Type */}
                      <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-0.5">
                        Room {room.room_number}
                      </h3>
                      <p className="text-[10px] md:text-xs text-gray-600 mb-2">
                        Floor {room.floor || 'N/A'} • {roomTypeText}
                      </p>

                      {/* Room Details */}
                      <div className="space-y-1 mb-2 text-[10px] md:text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Bed:</span>
                          <span className="text-gray-900 font-medium">{room.bed_type || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Occupancy:</span>
                          <span className="text-gray-900 font-medium">{room.capacity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Rate:</span>
                          <span className="text-gray-900 font-medium">
                            ${room.price_per_night ? room.price_per_night.toFixed(0) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Amenities - Scrollable Badges */}
                      {amenities.length > 0 && (
                        <div className="mb-2">
                          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
                            {amenities.map((amenity: any, idx: number) => {
                              const amenityId = typeof amenity === 'string' ? amenity : amenity.id || amenity
                              const amenityOption = AMENITIES_OPTIONS.find(a => a.id === amenityId)
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[9px] md:text-[10px] font-medium whitespace-nowrap flex-shrink-0"
                                >
                                  <span className="mr-0.5">{amenityOption?.icon || '•'}</span>
                                  {amenityOption ? amenityOption.label : amenityId}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1.5 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRoom(room)}
                          className="flex-1 text-[10px] md:text-xs px-1.5 py-1"
                        >
                          <svg className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="hidden md:inline">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="px-1.5 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                        >
                          <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Items per page selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs md:text-sm text-gray-700">Show:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-xs md:text-sm text-gray-600">
                      of {filteredRooms.length} rooms
                    </span>
                  </div>

                  {/* Page navigation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="text-xs md:text-sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm rounded-lg transition-colors ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="text-xs md:text-sm"
                    >
                      Next
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>

                  {/* Page info */}
                  <div className="text-xs md:text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              )}

              {/* Show pagination info even when only one page */}
              {totalPages === 1 && filteredRooms.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs md:text-sm text-gray-700">Show:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <span className="text-xs md:text-sm text-gray-600">
                    Showing all {filteredRooms.length} rooms
                  </span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
