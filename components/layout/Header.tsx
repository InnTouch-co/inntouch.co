'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUserClient, signOut } from '@/lib/auth/auth-client'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { getRoleDisplayName } from '@/lib/auth/roles'

export function Header() {
  const router = useRouter()
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

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">IT</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">InnTouch</div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
      {/* Left: Logo and Site */}
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">IT</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">InnTouch</div>
          <div className="text-xs text-gray-500">app.inntouch.app</div>
        </div>
      </div>

      {/* Center: Empty for now */}
      <div className="flex-1"></div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-4">
        {user && (
          <>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user ? extractTextFromJson(user.name) : 'User'}
              </div>
              <div className="text-xs text-gray-500">
                {user?.role_id ? getRoleDisplayName(user.role_id) : 'User'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign Out"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </header>
  )
}

