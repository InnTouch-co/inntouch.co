'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { getRoleDisplayName } from '@/lib/auth/roles'

// Super User navigation items
const superAdminNavItems = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/hotels', label: 'Hotels', icon: '🏢' },
  { href: '/users', label: 'Users', icon: '👥' },
]

// Hotel Admin navigation items
const hotelAdminNavItems = [
  { href: '/admin/hotel', label: 'Dashboard', icon: '🏠' },
  { href: '/rooms', label: 'Rooms', icon: '🛏️' },
  { href: '/bookings', label: 'Bookings', icon: '📋' },
  { href: '/users', label: 'Staff', icon: '👥' },
  { href: '/services', label: 'Services', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      setUser(currentUser)
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  // Determine which nav items to show based on user role
  const isSuperAdmin = user?.role_id === 'super_admin'
  const isHotelAdmin = user?.role_id === 'hotel_admin'
  const navItems = isSuperAdmin ? superAdminNavItems : hotelAdminNavItems

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

  if (loading) {
    return (
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">IT</span>
            </div>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">IT</span>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">InnTouch</div>
            <div className="text-xs text-gray-500">
              {user?.role_id ? getRoleDisplayName(user.role_id).toUpperCase() : 'USER'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/')
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3 text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      {user && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-semibold text-sm">{getUserInitials()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {extractTextFromJson(user.name)}
              </div>
              <div className="text-xs text-gray-500 truncate">{user.email || ''}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

