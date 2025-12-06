'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { DashboardIcon, HotelsIcon, ServiceRequestsIcon, RoomsIcon, ServicesIcon, StaffIcon, GuestSiteIcon, FolioIcon, UsersIcon, DataRequestsIcon, CookieConsentsIcon } from '@/components/ui/Icons'
import { Tag } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { useSelectedHotel } from './HotelSelector'
import { getHotels } from '@/lib/database/hotels'

// Super User navigation items
const superAdminNavItems = [
  { href: '/', label: 'Dashboard', icon: DashboardIcon },
  { href: '/hotels', label: 'Hotels', icon: HotelsIcon },
  { href: '/users', label: 'Users', icon: UsersIcon },
  { href: '/admin/folios', label: 'Folios', icon: FolioIcon },
  { href: '/admin/data-requests', label: 'Data Requests', icon: DataRequestsIcon },
  { href: '/admin/cookie-consents', label: 'Cookie Consents', icon: CookieConsentsIcon },
]

// Hotel Admin navigation items
const hotelAdminNavItems = [
  { href: '/admin/hotel', label: 'Dashboard', icon: DashboardIcon },
  { href: '/service-requests', label: 'Service Requests', icon: ServiceRequestsIcon },
  { href: '/rooms', label: 'Rooms', icon: RoomsIcon },
  { href: '/folio', label: 'Folios', icon: FolioIcon },
  { href: '/services', label: 'Services', icon: ServicesIcon },
  { href: '/staff', label: 'Staff', icon: StaffIcon },
  { href: '/guest-settings', label: 'Guest Site', icon: GuestSiteIcon },
  { href: '/admin/promotions', label: 'Promotions', icon: Tag },
]

// Front Desk navigation items
const frontDeskNavItems = [
  { href: '/front-desk', label: 'Dashboard', icon: DashboardIcon },
  { href: '/rooms', label: 'Rooms', icon: RoomsIcon },
  { href: '/service-requests', label: 'Service Requests', icon: ServiceRequestsIcon },
  { href: '/folio', label: 'Folios', icon: FolioIcon },
]

export function Header() {
  const pathname = usePathname()
  const selectedHotelId = useSelectedHotel()
  const [user, setUser] = useState<any>(null)
  const [selectedHotel, setSelectedHotel] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const isSuperAdmin = user?.role_id === 'super_admin'
  const isFrontDesk = user?.role_id === 'front_desk'
  const navItems = isSuperAdmin 
    ? superAdminNavItems 
    : isFrontDesk 
    ? frontDeskNavItems 
    : hotelAdminNavItems

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (selectedHotelId) {
      loadSelectedHotel()
    } else {
      setSelectedHotel(null)
    }
  }, [selectedHotelId])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      setUser(currentUser)
    } catch (error) {
      logger.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSelectedHotel = async () => {
    try {
      const hotels = await getHotels()
      const hotel = hotels.find(h => h.id === selectedHotelId)
      if (hotel) {
        setSelectedHotel(hotel)
      }
    } catch (error) {
      logger.error('Failed to load selected hotel:', error)
    }
  }

  if (loading) {
    return (
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-center px-4 h-14 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">IT</span>
            </div>
            <div className="text-xs font-semibold text-gray-900">InnTouch</div>
          </div>
        </div>
        <nav className="flex items-center justify-center overflow-x-auto scrollbar-hide h-12">
          <div className="flex items-center space-x-1 px-3 min-w-max">
            <div className="px-2 py-1.5 text-[10px] font-medium text-gray-400">Loading...</div>
          </div>
        </nav>
      </header>
    )
  }

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-center px-4 h-14 border-b border-gray-200">
        {/* Centered Logo */}
        <div className="flex items-center space-x-2">
          {(() => {
            const guestSettings = selectedHotel?.guest_settings && typeof selectedHotel.guest_settings === 'object' && !Array.isArray(selectedHotel.guest_settings)
              ? selectedHotel.guest_settings as any
              : null
            const adminLogo = guestSettings?.admin_logo
            
            if (adminLogo) {
              return (
                <img
                  src={adminLogo}
                  alt="Hotel Logo"
                  className="w-8 h-8 object-contain"
                />
              )
            }
            return (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">IT</span>
              </div>
            )
          })()}
          <div className="text-xs font-semibold text-gray-900">InnTouch</div>
        </div>
      </div>
      
      {/* Navigation Bar */}
      <nav className="flex items-center overflow-x-auto scrollbar-hide h-12">
        <div className="flex items-center space-x-1 px-3 min-w-max">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-1.5 text-[10px] font-medium rounded-lg whitespace-nowrap transition-colors flex items-center ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1.5"><item.icon className="w-4 h-4" /></span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}

