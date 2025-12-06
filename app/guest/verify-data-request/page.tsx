'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function VerifyDataRequestPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Verification token is missing.')
      return
    }

    const verifyRequest = async () => {
      try {
        const response = await fetch(`/api/guest/data-request/verify?token=${token}`)
        const data = await response.json()

        if (response.ok && data.success) {
          setStatus('success')
          setMessage(data.message || 'Your request has been verified successfully.')
        } else if (data.expired) {
          setStatus('expired')
          setMessage(data.error || 'This verification link has expired. Please submit a new request.')
        } else {
          setStatus('error')
          setMessage(data.error || 'Failed to verify request.')
        }
      } catch (error: any) {
        setStatus('error')
        setMessage('An error occurred while verifying your request. Please try again later.')
      }
    }

    verifyRequest()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Your Request</h1>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Request Verified!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-green-800">
                Your request will be processed within 30 days as required by GDPR regulations. You will be notified once it's complete.
              </p>
            </div>
          </>
        )}

        {status === 'expired' && (
          <>
            <XCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-orange-800">
                Verification links expire after 7 days for security reasons. Please submit a new request if you still need assistance.
              </p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-red-800">
                If you continue to experience issues, please contact the hotel front desk for assistance.
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

