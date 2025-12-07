'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getCurrentUserClient, signOut } from '@/lib/auth/auth-client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { getRoleDisplayName } from '@/lib/auth/roles'
import { supabase } from '@/lib/supabase/client'
import { getHotels } from '@/lib/database/hotels'
import { DashboardIcon, HotelsIcon, UsersIcon, ServiceRequestsIcon, RoomsIcon, ServicesIcon, StaffIcon, GuestSiteIcon, FolioIcon, DataRequestsIcon, CookieConsentsIcon } from '@/components/ui/Icons'
import { Tag } from 'lucide-react'
import { HotelSelector, useSelectedHotel } from './HotelSelector'
import { logger } from '@/lib/utils/logger'

// Super User navigation items
const superAdminNavItems = [
  { href: '/', label: 'Dashboard', icon: DashboardIcon },
  { href: '/hotels', label: 'Hotels', icon: HotelsIcon },
  { href: '/users', label: 'Users', icon: UsersIcon },
  { href: '/admin/folios', label: 'Folio Management', icon: FolioIcon },
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

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const selectedHotelId = useSelectedHotel()
  const [user, setUser] = useState<any>(null)
  const [userHotel, setUserHotel] = useState<any>(null)
  const [selectedHotel, setSelectedHotel] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
      
      // If user is staff, load their hotel information
      if (currentUser?.role_id && ['staff', 'front_desk', 'housekeeping', 'maintenance'].includes(currentUser.role_id)) {
        await loadUserHotel(currentUser.id)
      }
    } catch (error) {
      logger.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserHotel = async (userId: string) => {
    try {
      // Get hotel assignment for this user
      const { data: userAssignments } = await supabase
        .from('hotel_users')
        .select('hotel_id')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .limit(1)
      
      if (userAssignments && userAssignments.length > 0) {
        const hotelId = userAssignments[0].hotel_id
        const hotels = await getHotels()
        const hotel = hotels.find(h => h.id === hotelId)
        if (hotel) {
          setUserHotel(hotel)
        }
      }
    } catch (error) {
      logger.error('Failed to load user hotel:', error)
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

  // Determine which nav items to show based on user role
  const isSuperAdmin = user?.role_id === 'super_admin'
  const isHotelAdmin = user?.role_id === 'hotel_admin'
  const isFrontDesk = user?.role_id === 'front_desk'
  const isStaff = user?.role_id && ['staff', 'front_desk', 'housekeeping', 'maintenance'].includes(user.role_id)
  const navItems = isSuperAdmin 
    ? superAdminNavItems 
    : isFrontDesk 
    ? frontDeskNavItems 
    : hotelAdminNavItems

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return 'U'
    const name = extractTextFromJson(user.name)
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleLogout = async () => {
    try {
      // Clear login timestamp from localStorage
      if (user?.id && typeof window !== 'undefined') {
        const loginTimeKey = `login_time_${user.id}`
        localStorage.removeItem(loginTimeKey)
      }
      
      await signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      logger.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <>
        {/* Mobile: Horizontal Navbar (only for super_admin) */}
        <nav className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center justify-center overflow-x-auto shadow-sm scrollbar-hide">
          <div className="flex items-center space-x-1 px-3 min-w-max">
            {superAdminNavItems.map((item) => {
              const IconComponent = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-medium rounded-lg whitespace-nowrap flex items-center text-gray-700"
                >
                  <span className="mr-1.5"><IconComponent className="w-4 h-4" /></span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
        {/* Desktop: Sidebar */}
        <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex-col z-50">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">IT</span>
              </div>
              <div>
                <div className="text-base md:text-lg font-bold text-gray-900">InnTouch</div>
              </div>
            </div>
          </div>
        </aside>
      </>
    )
  }

  return (
    <>
      {/* Mobile: Horizontal Navbar (only for super_admin, since hotel_admin has Header with nav) */}
      {isSuperAdmin && (
        <nav className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center justify-center overflow-x-auto shadow-sm scrollbar-hide">
          <div className="flex items-center space-x-1 px-3 min-w-max">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/')
              return (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  className={`px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center ${
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
      )}

      {/* Desktop: Vertical Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex-col z-50">
        {/* Logo Section - Hidden for super admin */}
        {!isSuperAdmin && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-center h-full">
            {(() => {
              const guestSettings = selectedHotel?.guest_settings && typeof selectedHotel.guest_settings === 'object' && !Array.isArray(selectedHotel.guest_settings)
                ? selectedHotel.guest_settings as any
                : null
              const adminLogo = guestSettings?.admin_logo
              
              // Show admin logo if available
              if (adminLogo) {
                return (
                  <img
                    src={adminLogo}
                    alt="Admin Panel Logo"
                    className="h-full w-auto object-contain"
                  />
                )
              }
              
              // Default fallback
              return (
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">IT</span>
                </div>
              )
            })()}
          </div>
        </div>
        )}

        {/* Navigation Items */}
        <HotelSelector />
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/')
              return (
                <Link
                  key={`desktop-${item.href}`}
                  href={item.href}
                  className={`flex items-center px-4 py-2.5 text-xs md:text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3"><item.icon className="w-5 h-5" /></span>
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        {user && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-xs md:text-sm">{getUserInitials()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs md:text-sm font-medium text-gray-900 truncate">
                  {extractTextFromJson(user.name)}
                </div>
                <div className="text-[10px] md:text-xs text-gray-500 truncate">{user.email || ''}</div>
                {isStaff && userHotel && (
                    <div className="text-[10px] md:text-xs text-gray-500 truncate mt-1 flex items-center gap-1">
                    <span>{extractTextFromJson(userHotel.title)}</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{getRoleDisplayName(user.role_id || '')}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

