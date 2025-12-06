'use client'

import { useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Download, Trash2, Cookie, ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner'
import { getOrCreateSessionId } from '@/lib/utils/session-id'

function PrivacySettingsContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const hotelId = (params.hotelId as string) || searchParams.get('hotel_id') || ''
  const roomNumber = searchParams.get('room')
  
  const [requestingData, setRequestingData] = useState(false)
  const [requestingDeletion, setRequestingDeletion] = useState(false)

  const handleViewData = async () => {
    if (!hotelId || !roomNumber) {
      toast.error('Hotel ID and room number are required')
      return
    }

    setRequestingData(true)
    try {
      const response = await fetch(`/api/guest/data-request?hotel_id=${hotelId}&room_number=${roomNumber}&type=access`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to request data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Your data has been downloaded')
    } catch (error: any) {
      logger.error('Error requesting data:', error)
      toast.error(error.message || 'Failed to download your data')
    } finally {
      setRequestingData(false)
    }
  }

  const handleRequestDeletion = async () => {
    if (!hotelId || !roomNumber) {
      toast.error('Hotel ID and room number are required')
      return
    }

    if (!confirm('Are you sure you want to request deletion of your data? This action cannot be undone.')) {
      return
    }

    setRequestingDeletion(true)
    try {
      const response = await fetch('/api/guest/data-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotel_id: hotelId,
          room_number: roomNumber,
          request_type: 'deletion',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to request deletion')
      }

      toast.success('Deletion request submitted. We will process it within 30 days.')
    } catch (error: any) {
      logger.error('Error requesting deletion:', error)
      toast.error(error.message || 'Failed to submit deletion request')
    } finally {
      setRequestingDeletion(false)
    }
  }

  const handleBack = () => {
    if (hotelId) {
      router.push(`/guest/${hotelId}${roomNumber ? `?room=${roomNumber}` : ''}`)
    } else {
      router.back()
    }
  }

  if (!hotelId || !roomNumber) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 max-w-md">
          <p className="text-gray-300 text-center text-sm">
            Please access this page from your guest portal with a valid room number.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-white">Privacy Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-3">
          {/* Download Data */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/30 rounded-lg">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white text-sm">Download My Data</h3>
                  <p className="text-xs text-gray-400">Get a copy of your personal data</p>
                </div>
              </div>
              <Button
                onClick={handleViewData}
                disabled={requestingData}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
              >
                {requestingData ? 'Preparing...' : 'Download'}
              </Button>
            </div>
          </div>

          {/* Request Deletion */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-900/30 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white text-sm">Request Data Deletion</h3>
                  <p className="text-xs text-gray-400">Permanently delete your data</p>
                </div>
              </div>
              <Button
                onClick={handleRequestDeletion}
                disabled={requestingDeletion}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
              >
                {requestingDeletion ? 'Submitting...' : 'Delete'}
              </Button>
            </div>
          </div>

          {/* Personalization Toggle */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-green-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white text-sm">Personalize My Experience</h3>
                  <p className="text-xs text-gray-400">Display your name for a welcoming experience</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={typeof window !== 'undefined' ? localStorage.getItem('personalization_enabled') !== 'false' : true}
                  onChange={(e) => {
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('personalization_enabled', e.target.checked ? 'true' : 'false')
                      toast.success(e.target.checked ? 'Personalization enabled' : 'Personalization disabled')
                      // Reload to apply changes
                      setTimeout(() => window.location.reload(), 500)
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-900/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>

          {/* Cookie Preferences */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-900/30 rounded-lg">
                  <Cookie className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white text-sm">Cookie Preferences</h3>
                  <p className="text-xs text-gray-400">Manage cookie settings</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  // Clear cookie consent to show the banner again
                  localStorage.removeItem('cookie_consent_given')
                  localStorage.removeItem('cookie_preferences')
                  localStorage.removeItem('cookie_consent_date')
                  localStorage.removeItem('cookie_rejected_non_essential')
                  // Force the banner to show by triggering a state update
                  // The banner will detect the missing consent and show automatically
                  toast.success('Cookie preferences cleared. The cookie banner will appear below.')
                  // Small delay to ensure localStorage is cleared before banner checks
                  setTimeout(() => {
                    window.location.reload()
                  }, 100)
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2"
              >
                Update
              </Button>
            </div>
          </div>

          {/* Legal Documents */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-700/50 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white text-sm">Legal Documents</h3>
                  <p className="text-xs text-gray-400">View policies and terms</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/guest/${hotelId}/legal/privacy-policy${roomNumber ? `?room=${encodeURIComponent(roomNumber)}&from=privacy-settings` : '?from=privacy-settings'}`)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-xs px-3 py-1.5"
                >
                  Privacy
                </Button>
                <Button
                  onClick={() => router.push(`/guest/${hotelId}/legal/terms-of-service${roomNumber ? `?room=${encodeURIComponent(roomNumber)}&from=privacy-settings` : '?from=privacy-settings'}`)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-xs px-3 py-1.5"
                >
                  Terms
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact - Compact */}
        <div className="mt-6 pt-6 border-t border-gray-800">
          <p className="text-xs text-gray-400 text-center">
            Questions? Contact <span className="text-gray-300">privacy@inntouch.co</span>
          </p>
        </div>
      </div>

      {/* Cookie Consent Banner - Show on privacy settings page so users can update preferences */}
      <CookieConsentBanner
        hotelId={hotelId}
        sessionId={getOrCreateSessionId()}
        roomNumber={roomNumber || undefined}
      />
    </div>
  )
}

export default function PrivacySettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 max-w-md">
          <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-300 text-center text-sm">Loading...</p>
        </div>
      </div>
    }>
      <PrivacySettingsContent />
    </Suspense>
  )
}
