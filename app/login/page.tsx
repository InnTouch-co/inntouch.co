'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { signIn } from '@/lib/auth/auth-client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn(email, password)
      
      // Store login timestamp for session timeout tracking
      if (result.user?.id) {
        const loginTimeKey = `login_time_${result.user.id}`
        const loginTimestamp = Math.floor(Date.now() / 1000)
        localStorage.setItem(loginTimeKey, loginTimestamp.toString())
      }
      
      // Wait a moment for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force a hard navigation to ensure cookies are sent
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">IT</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">InnTouch</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                <strong>
                  {new URLSearchParams(window.location.search).get('error') === 'session_expired' 
                    ? 'Session Expired' 
                    : 'Access Error'}
                </strong>
                {new URLSearchParams(window.location.search).get('error') === 'session_expired' ? (
                  <div className="mt-2 text-xs">
                    Your session has expired after 1 hour of inactivity. Please sign in again.
                  </div>
                ) : (
                  <div className="mt-2 text-xs">
                    {new URLSearchParams(window.location.search).get('error')}
                    <br />
                    Make sure you've created your user record in the database. See AUTH_SETUP.md for instructions.
                  </div>
                )}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Contact your administrator if you need access</p>
          </div>
        </div>
      </div>
    </div>
  )
}

