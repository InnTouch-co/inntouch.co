'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { PasswordChangeModal } from '@/components/auth/PasswordChangeModal'
import { getCurrentUserClient } from '@/lib/auth/auth-client'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [checkingPassword, setCheckingPassword] = useState(true)
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (!isLoginPage) {
      checkPasswordChangeRequired()
    } else {
      setCheckingPassword(false)
    }
  }, [isLoginPage])

  const checkPasswordChangeRequired = async () => {
    try {
      const user = await getCurrentUserClient()
      if (user?.must_change_password === true) {
        setShowPasswordModal(true)
      }
    } catch (error) {
      console.error('Error checking password change requirement:', error)
    } finally {
      setCheckingPassword(false)
    }
  }

  const handlePasswordChangeSuccess = () => {
    setShowPasswordModal(false)
    // Refresh the page to ensure all data is updated
    router.refresh()
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      <main className="ml-64 p-6 min-h-screen">
        {children}
      </main>
      {!checkingPassword && (
        <PasswordChangeModal
          isOpen={showPasswordModal}
          onSuccess={handlePasswordChangeSuccess}
        />
      )}
    </>
  )
}

