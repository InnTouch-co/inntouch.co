'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/hotels', label: 'Hotels', icon: '🏨' },
  { href: '/users', label: 'Users', icon: '👥' },
  { href: '/rooms', label: 'Rooms', icon: '🛏️' },
  { href: '/bookings', label: 'Bookings', icon: '📅' },
  { href: '/inventory', label: 'Inventory', icon: '📦' },
  { href: '/content', label: 'Content', icon: '📝' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/services', label: 'Services', icon: '⚙️' },
  { href: '/products', label: 'Products', icon: '🍽️' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white shadow-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-blue-600">Inntouch Admin</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 text-gray-900 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

