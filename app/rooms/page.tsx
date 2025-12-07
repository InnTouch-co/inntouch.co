'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import { getRooms, deleteRoom, calculateRoomStats } from '@/lib/database/rooms'
import { getHotelById } from '@/lib/database/hotels'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import { QRCodeGenerator } from '@/components/rooms/QRCodeGenerator'
import { QRCodePrintView } from '@/components/rooms/QRCodePrintView'
import { Modal } from '@/components/ui/Modal'
import type { Room } from '@/types/database-extended'
import { formatPhoneNumber, stripPhoneFormat } from '@/lib/utils/phone-mask'
import { formatEmail } from '@/lib/utils/email-validation'
import { detectOrderTypesFromItems, getOrderTypeLabels, getOrderTypeColors } from '@/lib/utils/order-type-detection'
import { isCheckoutOverdue, getDaysOverdue } from '@/lib/utils/date-utils'
import { logger } from '@/lib/utils/logger'
import { useHotelTimezone } from '@/lib/hooks/useHotelTimezone'
import { formatTimestamp } from '@/lib/utils/formatTimestamp'

export const dynamic = 'force-dynamic'

type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance'

interface RoomDetails {
  booking_id: string | null
  guest_info: {
    id: string
    name: string
    email: string | null
    phone: string | null
    check_in_date: string
    check_out_date: string
  } | null
  pending_orders_count: number
  pending_orders_total: number
}

export default function RoomsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const selectedHotel = useSelectedHotel()
  const hotelTimezone = useHotelTimezone(selectedHotel || undefined)
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
  const [smartFilter, setSmartFilter] = useState<'none' | 'checked_in_today' | 'checking_out_today' | 'occupied' | 'pending_orders' | 'overdue_checkout'>('none')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  const [showQRCode, setShowQRCode] = useState<{ roomNumber: string } | null>(null)
  const [showAllQRCodes, setShowAllQRCodes] = useState(false)
  const [roomDetails, setRoomDetails] = useState<Record<string, RoomDetails>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})
  const [showCheckInModal, setShowCheckInModal] = useState<Room | null>(null)
  const [showCheckOutModal, setShowCheckOutModal] = useState<Room | null>(null)
  const [showStatusModal, setShowStatusModal] = useState<{ room: Room; newStatus: RoomStatus } | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [editingGuest, setEditingGuest] = useState<{ roomId: string; field: 'name' | 'phone' } | null>(null)
  const [editingValues, setEditingValues] = useState<{ name: string; phone: string }>({ name: '', phone: '' })
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkInFormData, setCheckInFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in_date: '',
    check_out_date: '',
    special_requests: '',
  })
  
  // Initialize dates with hotel timezone
  useEffect(() => {
    if (selectedHotel) {
      const initializeDates = async () => {
        try {
          const response = await fetch(`/api/hotels/${selectedHotel}/timezone`)
          const data = await response.json()
          const timezone = data.timezone || 'America/Chicago'
          
          // Get current date in hotel timezone
          const now = new Date()
          const currentDate = now.toLocaleDateString('en-CA', { timeZone: timezone })
          
          // Get tomorrow's date in hotel timezone
          const tomorrow = new Date(now)
          tomorrow.setDate(tomorrow.getDate() + 1)
          const tomorrowDate = tomorrow.toLocaleDateString('en-CA', { timeZone: timezone })
          
          setCheckInFormData(prev => ({
            ...prev,
            check_in_date: prev.check_in_date || currentDate,
            check_out_date: prev.check_out_date || tomorrowDate,
          }))
        } catch (error) {
          // Fallback to local timezone
          const today = new Date().toISOString().split('T')[0]
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          const tomorrowStr = tomorrow.toISOString().split('T')[0]
          
          setCheckInFormData(prev => ({
            ...prev,
            check_in_date: prev.check_in_date || today,
            check_out_date: prev.check_out_date || tomorrowStr,
          }))
        }
      }
      
      initializeDates()
    }
  }, [selectedHotel])
  const [showOrdersModal, setShowOrdersModal] = useState<{ roomId: string; roomNumber: string } | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (selectedHotel) {
      loadHotelData()
      loadRooms()
    }
  }, [selectedHotel])

  useEffect(() => {
    // Load room details for all rooms
    if (rooms.length > 0 && selectedHotel) {
      loadRoomDetails()
    }
  }, [rooms, selectedHotel])

  const loadRoomDetails = async () => {
    if (rooms.length === 0) return

    // Set loading state for all rooms
    const loading: Record<string, boolean> = {}
    rooms.forEach(room => {
      loading[room.id] = true
    })
    setLoadingDetails(loading)

    try {
      // Use batch API to fetch all room details at once
      const response = await fetch('/api/rooms/details-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_ids: rooms.map(room => room.id),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to load room details')
      }

      const data = await response.json()
      setRoomDetails(data.details || {})
    } catch (error) {
      logger.error('Failed to load room details:', error)
      // Set empty details on error
      const emptyDetails: Record<string, RoomDetails> = {}
      rooms.forEach(room => {
        emptyDetails[room.id] = {
          booking_id: null,
          guest_info: null,
          pending_orders_count: 0,
          pending_orders_total: 0,
        }
      })
      setRoomDetails(emptyDetails)
    } finally {
      // Clear loading state
      setLoadingDetails({})
    }
  }

  useEffect(() => {
    if (selectedHotel) {
      loadRooms()
    }
  }, [statusFilter])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, smartFilter])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        window.location.href = '/login'
        return
      }

      setUser(currentUser)
    } catch (error) {
      logger.error('Failed to load user:', error)
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
      logger.error('Failed to load hotel:', error)
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
      logger.error('Failed to load rooms:', error)
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
      logger.error('Failed to delete room:', error)
      alert('Failed to delete room')
    }
  }

  const handleQuickCheckIn = (room: Room) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setCheckInFormData({
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      check_in_date: new Date().toISOString().split('T')[0],
      check_out_date: tomorrow.toISOString().split('T')[0],
      special_requests: '',
    })
    setShowCheckInModal(room)
  }

  const handleConfirmCheckIn = async (room: Room) => {
    if (!selectedHotel) return

    if (!checkInFormData.guest_name.trim() || !checkInFormData.check_in_date || !checkInFormData.check_out_date) {
      alert('Please fill in all required fields (Guest Name, Check-In Date, Check-Out Date)')
      return
    }

    setCheckingIn(true)
    try {
      const response = await fetch('/api/bookings/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_id: selectedHotel,
          room_number: room.room_number,
          guest_name: checkInFormData.guest_name.trim(),
          guest_email: checkInFormData.guest_email.trim() || null,
          guest_phone: checkInFormData.guest_phone ? stripPhoneFormat(checkInFormData.guest_phone) : null,
          check_in_date: checkInFormData.check_in_date,
          check_out_date: checkInFormData.check_out_date,
          special_requests: checkInFormData.special_requests.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check in guest')
      }

      // Success - reload rooms and close modal
      await loadRooms()
      setShowCheckInModal(null)
      alert(`Guest ${checkInFormData.guest_name} checked in successfully!`)
    } catch (error: any) {
      logger.error('Failed to check in guest:', error)
      alert(error.message || 'Failed to check in guest')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleQuickCheckOut = async (room: Room) => {
    // Always show confirmation modal
    setShowCheckOutModal(room)
  }

  const handleConfirmCheckOut = async (room: Room) => {
    if (!selectedHotel) return
    
    setCheckingOut(room.id)
    try {
      const response = await fetch('/api/bookings/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotel_id: selectedHotel,
          room_number: room.room_number,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check out guest')
      }

      // Success - reload rooms and close modal
      await loadRooms()
      setShowCheckOutModal(null)
      alert(`Guest ${data.booking.guest_name} checked out successfully!${data.pending_orders.count > 0 ? ` Folio generated with ${data.pending_orders.count} pending order(s).` : ''}`)
    } catch (error: any) {
      logger.error('Failed to check out guest:', error)
      alert(error.message || 'Failed to check out guest')
    } finally {
      setCheckingOut(null)
    }
  }

  const handleStartEditGuest = (roomId: string, field: 'name' | 'phone') => {
    const details = roomDetails[roomId]
    if (details?.guest_info) {
      setEditingGuest({ roomId, field })
      setEditingValues({
        name: details.guest_info.name || '',
        phone: details.guest_info.phone || '',
      })
    }
  }

  const handleSaveGuestInfo = async (roomId: string) => {
    const details = roomDetails[roomId]
    if (!details?.booking_id) return

    try {
      const response = await fetch(`/api/bookings/${details.booking_id}/guest-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: editingValues.name,
          guest_phone: editingValues.phone || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update guest info')
      }

      // Reload room details
      await loadRoomDetails()
      setEditingGuest(null)
    } catch (error: any) {
      logger.error('Failed to update guest info:', error)
      alert(error.message || 'Failed to update guest information')
    }
  }

  const handleCancelEditGuest = () => {
    setEditingGuest(null)
    setEditingValues({ name: '', phone: '' })
  }

  const handleShowOrders = async (roomId: string, roomNumber: string) => {
    setShowOrdersModal({ roomId, roomNumber })
    setLoadingOrders(true)
    setOrders([])
    try {
      const response = await fetch(`/api/rooms/${roomId}/orders`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders')
      }
      
      setOrders(data.orders || [])
    } catch (error: any) {
      logger.error('Failed to load orders:', error)
      setOrders([])
      // Show error to user
      alert(`Failed to load orders: ${error.message || 'Unknown error'}`)
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleQuickStatusChange = async (roomId: string, newStatus: RoomStatus) => {
    setUpdatingStatus(roomId)
    try {
      const response = await fetch('/api/rooms/quick-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: roomId, status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }

      await loadRooms()
      setShowStatusModal(null)
    } catch (error: any) {
      logger.error('Failed to update room status:', error)
      alert(error.message || 'Failed to update room status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const filteredRooms = rooms.filter(room => {
    const matchesRoomNumber = !searchQuery || 
      room.room_number.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Also search by guest name if room is occupied
    const matchesGuestName = !searchQuery || 
      (room.status === 'occupied' && roomDetails[room.id]?.guest_info?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesSearch = matchesRoomNumber || matchesGuestName
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter
    
    // Apply smart filters
    let matchesSmartFilter = true
    if (smartFilter !== 'none') {
      const details = roomDetails[room.id]
      const guestInfo = details?.guest_info
      
      switch (smartFilter) {
        case 'checked_in_today':
          if (guestInfo) {
            const checkInDate = new Date(guestInfo.check_in_date)
            const today = new Date()
            // Compare year, month, and day only
            matchesSmartFilter = 
              checkInDate.getFullYear() === today.getFullYear() &&
              checkInDate.getMonth() === today.getMonth() &&
              checkInDate.getDate() === today.getDate()
          } else {
            matchesSmartFilter = false
          }
          break
        case 'checking_out_today':
          if (guestInfo) {
            const checkOutDate = new Date(guestInfo.check_out_date)
            const today = new Date()
            // Compare year, month, and day only
            matchesSmartFilter = 
              checkOutDate.getFullYear() === today.getFullYear() &&
              checkOutDate.getMonth() === today.getMonth() &&
              checkOutDate.getDate() === today.getDate()
          } else {
            matchesSmartFilter = false
          }
          break
        case 'occupied':
          matchesSmartFilter = room.status === 'occupied'
          break
        case 'pending_orders':
          matchesSmartFilter = (details?.pending_orders_count || 0) > 0
          break
        case 'overdue_checkout':
          if (guestInfo && guestInfo.check_out_date) {
            matchesSmartFilter = isCheckoutOverdue(guestInfo.check_out_date)
          } else {
            matchesSmartFilter = false
          }
          break
        default:
          matchesSmartFilter = true
      }
    }
    
    return matchesSearch && matchesStatus && matchesSmartFilter
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

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Rooms Management</h1>
          <p className="text-xs md:text-sm text-gray-600">Manage your property's rooms and inventory</p>
        </div>
        <div className="flex gap-2">
          {rooms.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllQRCodes(true)}
              className="text-xs md:text-sm"
            >
              <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QR Codes
            </Button>
          )}
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
            Add Room
          </Button>
        </div>
      </div>

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

          {/* Combined Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by room number or guest name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowFilters(!showFilters)
                    }}
                    className={`px-4 py-2.5 border rounded-lg transition-colors text-sm flex items-center gap-2 ${
                      statusFilter !== 'all' || smartFilter !== 'none' || searchQuery
                        ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters
                    {(statusFilter !== 'all' || smartFilter !== 'none') && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                        {[statusFilter !== 'all' ? 1 : 0, smartFilter !== 'none' ? 1 : 0].reduce((a, b) => a + b, 0)}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Status</label>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'available', 'occupied', 'cleaning', 'maintenance'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status === 'all' ? 'all' : status)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            statusFilter === status
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Smart Filters */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quick Filters</label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={smartFilter === 'checked_in_today' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setSmartFilter(smartFilter === 'checked_in_today' ? 'none' : 'checked_in_today')}
                        className={`text-xs ${smartFilter === 'checked_in_today' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                      >
                        Today's Check-Ins
                      </Button>
                      <Button
                        variant={smartFilter === 'checking_out_today' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setSmartFilter(smartFilter === 'checking_out_today' ? 'none' : 'checking_out_today')}
                        className={`text-xs ${smartFilter === 'checking_out_today' ? 'bg-orange-600 text-white hover:bg-orange-700' : ''}`}
                      >
                        Today's Check-Outs
                      </Button>
                      <Button
                        variant={smartFilter === 'occupied' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setSmartFilter(smartFilter === 'occupied' ? 'none' : 'occupied')}
                        className={`text-xs ${smartFilter === 'occupied' ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}`}
                      >
                        Occupied Rooms
                      </Button>
                      <Button
                        variant={smartFilter === 'pending_orders' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setSmartFilter(smartFilter === 'pending_orders' ? 'none' : 'pending_orders')}
                        className={`text-xs ${smartFilter === 'pending_orders' ? 'bg-yellow-600 text-white hover:bg-yellow-700' : ''}`}
                      >
                        Pending Orders
                      </Button>
                      <Button
                        variant={smartFilter === 'overdue_checkout' ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setSmartFilter(smartFilter === 'overdue_checkout' ? 'none' : 'overdue_checkout')}
                        className={`text-xs ${smartFilter === 'overdue_checkout' ? 'bg-red-600 text-white hover:bg-red-700' : ''}`}
                      >
                        Overdue Checkouts
                      </Button>
                      {(statusFilter !== 'all' || smartFilter !== 'none' || searchQuery) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setStatusFilter('all')
                            setSmartFilter('none')
                            setSearchQuery('')
                          }}
                          className="text-xs text-gray-600"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rooms Table */}
          {filteredRooms.length === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-sm md:text-base text-gray-500 mb-4">
                  {searchQuery || statusFilter !== 'all' || smartFilter !== 'none' ? 'No rooms match your filters.' : 'No rooms found. Add your first room to get started.'}
                </p>
                {!searchQuery && statusFilter === 'all' && smartFilter === 'none' && (
                  <Button onClick={handleAddRoom} size="sm">
                    Add Room
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Room</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Guest Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Check-In</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Check-Out</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                {paginatedRooms.map((room) => {
                        const details = roomDetails[room.id]
                        const isLoading = loadingDetails[room.id]
                        const isUpdating = updatingStatus === room.id
                        const isCheckingOut = checkingOut === room.id
                        const isEditing = editingGuest?.roomId === room.id

                return (
                          <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                            {/* Room Number */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">{room.room_number}</span>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(room.status)}`}>
                                <span className="mr-1.5">{getStatusIcon(room.status)}</span>
                        {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                      </div>
                            </td>

                            {/* Guest Name */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {room.status === 'occupied' ? (
                                isLoading ? (
                                  <span className="text-sm text-gray-400">Loading...</span>
                                ) : details?.guest_info ? (
                                  isEditing && editingGuest?.field === 'name' ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={editingValues.name}
                                        onChange={(e) => setEditingValues(prev => ({ ...prev, name: e.target.value }))}
                                        className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleSaveGuestInfo(room.id)}
                                        className="text-green-600 hover:text-green-700"
                                        title="Save"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={handleCancelEditGuest}
                                        className="text-red-600 hover:text-red-700"
                                        title="Cancel"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                        </div>
                                  ) : (
                                    <div className="flex items-center gap-1 group">
                                      <span className="text-sm text-gray-900">{details.guest_info.name}</span>
                                      <button
                                        onClick={() => handleStartEditGuest(room.id, 'name')}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                                        title="Edit name"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                        </div>
                                  )
                                ) : (
                                  <span className="text-sm text-gray-400">—</span>
                                )
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>

                            {/* Phone */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {room.status === 'occupied' && details?.guest_info ? (
                                isEditing && editingGuest?.field === 'phone' ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="tel"
                                      value={editingValues.phone}
                                      onChange={(e) => setEditingValues(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                                      className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveGuestInfo(room.id)}
                                      className="text-green-600 hover:text-green-700"
                                      title="Save"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={handleCancelEditGuest}
                                      className="text-red-600 hover:text-red-700"
                                      title="Cancel"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                          </div>
                                ) : (
                                  <div className="flex items-center gap-1 group">
                                    <span className="text-sm text-gray-600">{details.guest_info.phone || '—'}</span>
                                    {details.guest_info.phone && (
                                      <button
                                        onClick={() => handleStartEditGuest(room.id, 'phone')}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                                        title="Edit phone"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    )}
                        </div>
                                )
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>

                            {/* Check-In Date */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {room.status === 'occupied' && details?.guest_info ? (
                                <span className="text-sm text-gray-600">
                                  {new Date(details.guest_info.check_in_date).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>

                            {/* Check-Out Date */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {room.status === 'occupied' && details?.guest_info ? (
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${
                                    isCheckoutOverdue(details.guest_info.check_out_date)
                                      ? 'text-red-600 font-semibold'
                                      : 'text-gray-600'
                                  }`}>
                                    {new Date(details.guest_info.check_out_date).toLocaleDateString()}
                                  </span>
                                  {isCheckoutOverdue(details.guest_info.check_out_date) && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                                      ⚠️ {getDaysOverdue(details.guest_info.check_out_date)}d overdue
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>

                      {/* Actions */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                {room.status === 'available' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleQuickCheckIn(room)}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1"
                                  >
                                    Check In
                                  </Button>
                                )}
                                
                                {room.status === 'occupied' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleQuickCheckOut(room)}
                                      disabled={isCheckingOut}
                                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1"
                                    >
                                      {isCheckingOut ? 'Checking Out...' : 'Check Out'}
                                    </Button>
                        <Button
                          variant="outline"
                          size="sm"
                                      onClick={() => handleShowOrders(room.id, room.room_number)}
                                      className="text-xs px-2 py-1"
                                      title="View Orders"
                                    >
                                      Orders
                        </Button>
                                  </>
                                )}

                                {room.status !== 'occupied' && (
                                  <div className="flex gap-1">
                                    {room.status !== 'cleaning' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowStatusModal({ room, newStatus: 'cleaning' })}
                                        disabled={isUpdating}
                                        className="text-xs px-2 py-1"
                                        title="Mark as Cleaning"
                                      >
                                        ✨
                                      </Button>
                                    )}
                                    {room.status !== 'maintenance' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowStatusModal({ room, newStatus: 'maintenance' })}
                                        disabled={isUpdating}
                                        className="text-xs px-2 py-1"
                                        title="Mark as Maintenance"
                                      >
                                        🔧
                                      </Button>
                                    )}
                                    {room.status !== 'available' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowStatusModal({ room, newStatus: 'available' })}
                                        disabled={isUpdating}
                                        className="text-xs px-2 py-1"
                                        title="Mark as Available"
                                      >
                                        ✓
                                      </Button>
                                    )}
                                  </div>
                                )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRoom(room)}
                                  className="text-xs px-2 py-1"
                                  title="Edit Guest Info"
                        >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRoom(room.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 text-xs px-2 py-1"
                                  title="Delete Room"
                        >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowQRCode({ roomNumber: room.room_number })}
                                  className="text-xs px-2 py-1"
                                  title="Generate QR Code"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                  </svg>
                                </Button>
                      </div>
                            </td>
                          </tr>
                )
              })}
                    </tbody>
                  </table>
              </div>
              </Card>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2"
                    title="Previous page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2"
                    title="Next page"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* QR Code Modal for Single Room */}
      {showQRCode && selectedHotel && (
        <Modal
          isOpen={!!showQRCode}
          onClose={() => setShowQRCode(null)}
          title={`QR Code - ${showQRCode.roomNumber}`}
          size="md"
        >
          <QRCodeGenerator
            hotelId={selectedHotel}
            roomNumber={showQRCode.roomNumber}
            onClose={() => setShowQRCode(null)}
          />
        </Modal>
      )}

      {/* QR Code Print View for All Rooms */}
      {showAllQRCodes && selectedHotel && (
        <Modal
          isOpen={showAllQRCodes}
          onClose={() => setShowAllQRCodes(false)}
          title="QR Codes for All Rooms"
          size="lg"
        >
          <QRCodePrintView
            hotelId={selectedHotel}
            rooms={rooms}
          />
        </Modal>
      )}

      {/* Check-In Modal */}
      {showCheckInModal && (
        <Modal
          isOpen={!!showCheckInModal}
          onClose={() => setShowCheckInModal(null)}
          title={`Check-In Guest - Room ${showCheckInModal.room_number}`}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guest Name *
              </label>
              <input
                type="text"
                value={checkInFormData.guest_name}
                onChange={(e) => setCheckInFormData(prev => ({ ...prev, guest_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guest Email
              </label>
              <input
                type="email"
                value={checkInFormData.guest_email}
                onChange={(e) => setCheckInFormData(prev => ({ ...prev, guest_email: formatEmail(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="guest@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Guest Phone
              </label>
              <input
                type="tel"
                value={checkInFormData.guest_phone}
                onChange={(e) => setCheckInFormData(prev => ({ ...prev, guest_phone: formatPhoneNumber(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-In Date *
                </label>
                <input
                  type="date"
                  value={checkInFormData.check_in_date}
                  onChange={(e) => setCheckInFormData(prev => ({ ...prev, check_in_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-Out Date *
                </label>
                <input
                  type="date"
                  value={checkInFormData.check_out_date}
                  onChange={(e) => setCheckInFormData(prev => ({ ...prev, check_out_date: e.target.value }))}
                  min={checkInFormData.check_in_date || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Requests
              </label>
              <textarea
                value={checkInFormData.special_requests}
                onChange={(e) => setCheckInFormData(prev => ({ ...prev, special_requests: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Any special requests or notes..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCheckInModal(null)}
                className="flex-1"
                disabled={checkingIn}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleConfirmCheckIn(showCheckInModal)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={checkingIn}
              >
                {checkingIn ? 'Checking In...' : 'Check In Guest'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Check-Out Confirmation Modal */}
      {showCheckOutModal && (
        <Modal
          isOpen={!!showCheckOutModal}
          onClose={() => setShowCheckOutModal(null)}
          title={roomDetails[showCheckOutModal.id]?.pending_orders_count > 0 ? "⚠️ Confirm Check-Out: Pending Orders" : "Confirm Check-Out"}
          size="md"
        >
          <div className="space-y-4">
            {roomDetails[showCheckOutModal.id]?.pending_orders_count > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                  This room has pending service orders that need to be paid.
                </p>
                {roomDetails[showCheckOutModal.id] && (
                  <div className="text-sm text-yellow-700">
                    <p><strong>Pending Orders:</strong> {roomDetails[showCheckOutModal.id].pending_orders_count}</p>
                    <p><strong>Total Amount:</strong> ${roomDetails[showCheckOutModal.id].pending_orders_total.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Guest:</strong> {roomDetails[showCheckOutModal.id]?.guest_info?.name || 'N/A'}</p>
                <p><strong>Room:</strong> {showCheckOutModal.room_number}</p>
                {(() => {
                  const guestInfo = roomDetails[showCheckOutModal.id]?.guest_info
                  return guestInfo ? (
                  <>
                      <p><strong>Check-In:</strong> {new Date(guestInfo.check_in_date).toLocaleDateString()}</p>
                      <p><strong>Check-Out:</strong> {new Date(guestInfo.check_out_date).toLocaleDateString()}</p>
                  </>
                  ) : null
                })()}
              </div>
            </div>

            {roomDetails[showCheckOutModal.id]?.pending_orders_count > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  The guest will be checked out, and a folio will be generated. Orders will remain pending until paid in the Folios page.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCheckOutModal(null)}
                className="flex-1"
                disabled={checkingOut === showCheckOutModal.id}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleConfirmCheckOut(showCheckOutModal)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={checkingOut === showCheckOutModal.id}
              >
                {checkingOut === showCheckOutModal.id ? 'Checking Out...' : 'Confirm Check-Out'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Change Confirmation Modal */}
      {showStatusModal && (
        <Modal
          isOpen={!!showStatusModal}
          onClose={() => setShowStatusModal(null)}
          title="Change Room Status"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Are you sure you want to change room {showStatusModal.room.room_number} status to{' '}
              <strong>{showStatusModal.newStatus}</strong>?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowStatusModal(null)}
                className="flex-1"
                disabled={updatingStatus === showStatusModal.room.id}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleQuickStatusChange(showStatusModal.room.id, showStatusModal.newStatus)}
                className="flex-1"
                disabled={updatingStatus === showStatusModal.room.id}
              >
                {updatingStatus === showStatusModal.room.id ? 'Updating...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Orders Modal */}
      {showOrdersModal && (
        <Modal
          isOpen={!!showOrdersModal}
          onClose={() => {
            setShowOrdersModal(null)
            setOrders([])
          }}
          title={`Pending Orders - Room ${showOrdersModal.roomNumber}`}
          size="lg"
        >
          <div className="space-y-4">
            {loadingOrders ? (
              <div className="text-center py-8">
                <div className="text-sm text-gray-500">Loading orders...</div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm text-gray-500">No pending orders found for this room.</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {orders.map((order) => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-yellow-100 text-yellow-800',
                    confirmed: 'bg-blue-100 text-blue-800',
                    preparing: 'bg-purple-100 text-purple-800',
                    ready: 'bg-green-100 text-green-800',
                    out_for_delivery: 'bg-indigo-100 text-indigo-800',
                    delivered: 'bg-gray-100 text-gray-800',
                    cancelled: 'bg-red-100 text-red-800',
                  }

                  const paymentColors: Record<string, string> = {
                    pending: 'bg-orange-100 text-orange-800',
                    paid: 'bg-green-100 text-green-800',
                    refunded: 'bg-red-100 text-red-800',
                  }

                  // Detect order types from items
                  const orderItems = order.items && Array.isArray(order.items) ? order.items : []
                  const { types: detectedTypes } = detectOrderTypesFromItems(orderItems)
                  const typeLabels = getOrderTypeLabels(detectedTypes)
                  const typeColors = getOrderTypeColors(detectedTypes)

                  return (
                    <Card key={order.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">
                              Order #{order.order_number}
                            </span>
                            {typeLabels.map((label, idx) => (
                              <span key={idx} className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[idx] || 'bg-gray-100 text-gray-700'}`}>
                                {label}
                              </span>
                            ))}
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                              {order.status.toUpperCase().replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-0.5">
                            {order.subtotal && order.subtotal !== order.total_amount && (
                              <p><strong>Subtotal:</strong> ${order.subtotal.toFixed(2)}</p>
                            )}
                            {order.discount_amount && order.discount_amount > 0 && (
                              <p className="text-green-600"><strong>Discount:</strong> -${order.discount_amount.toFixed(2)}</p>
                            )}
                            <p><strong>Total:</strong> ${order.total_amount.toFixed(2)}</p>
                            <p><strong>Created:</strong> {formatTimestamp(order.created_at, hotelTimezone, { format: 'datetime' })}</p>
                            {order.delivered_at && (
                              <p><strong>Delivered:</strong> {formatTimestamp(order.delivered_at, hotelTimezone, { format: 'datetime' })}</p>
                            )}
                            {order.special_instructions && (
                              <p className="mt-1"><strong>Instructions:</strong> {order.special_instructions}</p>
                            )}
                          </div>
                          {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-700 mb-1">Items:</p>
                              <div className="space-y-0.5">
                                {order.items.map((item: any, idx: number) => {
                                  // Handle different item structures
                                  const itemName = item.menuItem?.name || item.name || item.menu_item_name || 'Item'
                                  const itemPrice = item.menuItem?.price || item.price || item.unit_price || 0
                                  const itemQuantity = item.quantity || 1
                                  const totalPrice = parseFloat(itemPrice.toString()) * itemQuantity
                                  
                                  return (
                                    <div key={idx} className="text-xs text-gray-600">
                                      • {itemName} x{itemQuantity} - ${totalPrice.toFixed(2)}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
