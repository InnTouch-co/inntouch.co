'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Toaster } from 'sonner'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SidebarProvider } from './SidebarContext'
import { PasswordChangeModal } from '@/components/auth/PasswordChangeModal'
import { getCurrentUserClient, signOut } from '@/lib/auth/auth-client'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [checkingPassword, setCheckingPassword] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const isLoginPage = pathname === '/login'
  // Guest pages are /guest/[hotelId], not /guest-settings
  const isGuestPage = pathname.startsWith('/guest/')
  // Kitchen and bar pages have their own layout (no sidebar/header)
  const isKitchenBarPage = pathname === '/kitchen' || pathname === '/bar' || pathname.startsWith('/kitchen/') || pathname.startsWith('/bar/')
  const isSuperAdmin = user?.role_id === 'super_admin'

  useEffect(() => {
    if (!isLoginPage && !isGuestPage) {
      loadUser()
      checkPasswordChangeRequired()
    } else {
      setCheckingPassword(false)
      setLoadingUser(false)
    }
  }, [isLoginPage, isGuestPage])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      setUser(currentUser)
    } catch (error) {
      logger.error('Failed to load user:', error)
    } finally {
      setLoadingUser(false)
    }
  }


  // Check session timeout - logout after 1 hour from login
  useEffect(() => {
    if (isLoginPage || isGuestPage || isKitchenBarPage) return

    const checkSessionTimeout = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/login')
          return
        }

        const currentTime = Math.floor(Date.now() / 1000)
        const sessionExpiry = session.expires_at || 0
        
        // Get login timestamp from localStorage or use session expiry minus 1 hour as fallback
        const loginTimeKey = `login_time_${session.user.id}`
        let loginTimestamp = sessionExpiry - 3600 // Default: assume 1 hour session
        
        if (typeof window !== 'undefined') {
          const storedLoginTime = localStorage.getItem(loginTimeKey)
          if (storedLoginTime) {
            loginTimestamp = parseInt(storedLoginTime, 10)
          } else {
            // Store current login time if not stored
            loginTimestamp = currentTime
            localStorage.setItem(loginTimeKey, loginTimestamp.toString())
          }
        }

        // Calculate session age
        const sessionAge = currentTime - loginTimestamp
        const oneHourInSeconds = 3600
        
        // Check if session expired or is older than 1 hour
        if (sessionExpiry <= currentTime || sessionAge >= oneHourInSeconds) {
          // Clear login timestamp and logout
          if (typeof window !== 'undefined') {
            localStorage.removeItem(loginTimeKey)
          }
          await signOut()
          router.push('/login?error=session_expired')
        }
      } catch (error) {
        logger.error('Error checking session timeout:', error)
      }
    }

    // Check immediately
    checkSessionTimeout()

    // Check every 30 seconds
    const interval = setInterval(checkSessionTimeout, 30000)

    return () => clearInterval(interval)
  }, [isLoginPage, isGuestPage, router])

  const checkPasswordChangeRequired = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (currentUser?.must_change_password === true) {
        setShowPasswordModal(true)
      }
    } catch (error) {
      logger.error('Error checking password change requirement:', error)
    } finally {
      setCheckingPassword(false)
    }
  }

  const handlePasswordChangeSuccess = () => {
    setShowPasswordModal(false)
    // Refresh the page to ensure all data is updated
    router.refresh()
  }

  // Kitchen/bar pages have their own full-screen layout (no sidebar/header)
  if (isLoginPage || isGuestPage || isKitchenBarPage) {
    return (
      <>
        <Toaster position="top-center" richColors />
        {!checkingPassword && (
          <PasswordChangeModal
            isOpen={showPasswordModal}
            onSuccess={handlePasswordChangeSuccess}
          />
        )}
        <div className={isKitchenBarPage ? 'min-h-screen w-full' : ''}>
          {children}
        </div>
      </>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col min-h-screen">
        <Toaster position="top-center" richColors />
        <Sidebar />
        {!isSuperAdmin && <Header />}
        <main className={`${isSuperAdmin ? 'pt-14 md:pt-0 md:ml-64' : 'pt-[104px] md:pt-0 md:ml-64'} flex-1 transition-all duration-300 pb-8`}>
          <div className={`${pathname === '/rooms' ? 'max-w-full' : 'max-w-7xl'} mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8`}>
            {children}
          </div>
        </main>
        {!checkingPassword && (
          <PasswordChangeModal
            isOpen={showPasswordModal}
            onSuccess={handlePasswordChangeSuccess}
          />
        )}
        
        {/* Cookie Consent Banner - Only for guest site, not admin */}
      </div>
    </SidebarProvider>
  )
}

