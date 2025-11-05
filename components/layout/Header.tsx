'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserClient } from '@/lib/auth/auth-client'

// Super User navigation items
const superAdminNavItems = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/hotels', label: 'Hotels', icon: '🏢' },
  { href: '/users', label: 'Users', icon: '👥' },
]

// Hotel Admin navigation items
const hotelAdminNavItems = [
  { href: '/admin/hotel', label: 'Dashboard', icon: '🏠' },
  { href: '/service-requests', label: 'Service Requests', icon: '📋' },
  { href: '/rooms', label: 'Rooms', icon: '🛏️' },
  { href: '/bookings', label: 'Bookings', icon: '📅' },
  { href: '/staff', label: 'Staff', icon: '👥' },
  { href: '/users', label: 'Users', icon: '👤' },
  { href: '/services', label: 'Services', icon: '⚙️' },
]

export function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const isSuperAdmin = user?.role_id === 'super_admin'
  const navItems = isSuperAdmin ? superAdminNavItems : hotelAdminNavItems

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
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">IT</span>
          </div>
          <div className="text-xs font-semibold text-gray-900">InnTouch</div>
        </div>
      </div>
      
      {/* Navigation Bar */}
      <nav className="flex items-center justify-center overflow-x-auto scrollbar-hide h-12">
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
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}

