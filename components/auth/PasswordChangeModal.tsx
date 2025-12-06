'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { getCurrentUserClient } from '@/lib/auth/auth-client'

interface PasswordChangeModalProps {
  isOpen: boolean
  onSuccess: () => void
}

export function PasswordChangeModal({ isOpen, onSuccess }: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    if (isOpen) {
      checkIfNewUser()
    }
  }, [isOpen])

  const checkIfNewUser = async () => {
    try {
      const user = await getCurrentUserClient()
      setIsNewUser(user?.must_change_password === true)
    } catch (error) {
      // Default to requiring current password if we can't check
      setIsNewUser(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation - for new users, current password is optional
    if (!isNewUser && !currentPassword) {
      setError('Current password is required')
      return
    }

    if (!newPassword || !confirmPassword) {
      setError('New password and confirmation are required')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (!isNewUser && currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: isNewUser ? undefined : currentPassword,
          newPassword,
          isNewUser,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      // Clear form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      // The server has already signed in with the new password and updated cookies
      // Reload the page to pick up the new session cookies
      // This ensures the user stays logged in with the new password
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Failed to change password')
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing - user must change password
      title="Change Your Password"
      closeOnOutsideClick={false}
    >
      <div className="space-y-4">
        <div className={`${isNewUser ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-4`}>
          <p className={`text-sm ${isNewUser ? 'text-green-800' : 'text-blue-800'}`}>
            <strong>{isNewUser ? 'Welcome!' : 'Security Notice:'}</strong> {isNewUser 
              ? 'Please set your password to continue. Use the temporary password from your invitation email as your current password.'
              : 'You must change your password before continuing. This is required for your account security.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isNewUser && (
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              required
              autoFocus
            />
          )}
          {isNewUser && (
            <Input
              label="Temporary Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter the temporary password from your email"
              required
              autoFocus
            />
          )}

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter your new password (min. 8 characters)"
            required
            minLength={8}
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            required
            minLength={8}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

