'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Settings, Check } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface CookieConsentBannerProps {
  hotelId?: string
  userId?: string
  sessionId?: string
  roomNumber?: string
}

export function CookieConsentBanner({ hotelId, userId, sessionId, roomNumber }: CookieConsentBannerProps) {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Cookie preferences
  const [preferences, setPreferences] = useState({
    essential: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    functional: false,
  })

  useEffect(() => {
    // Check if consent has been given
    const consentGiven = localStorage.getItem('cookie_consent_given')
    if (!consentGiven) {
      // Check if we have stored preferences
      const storedPrefs = localStorage.getItem('cookie_preferences')
      if (storedPrefs) {
        try {
          const prefs = JSON.parse(storedPrefs)
          setPreferences(prefs)
        } catch (e) {
          // Invalid stored preferences, use defaults
        }
      }
      setShowBanner(true)
    }
  }, [])

  const handleAcceptAll = async () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    }
    await saveConsent(allAccepted)
  }

  const handleRejectAll = async () => {
    const onlyEssential = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
    }
    await saveConsent(onlyEssential, true) // Pass true to indicate this is a rejection
  }

  const handleSavePreferences = async () => {
    await saveConsent(preferences)
    setShowSettings(false)
  }

  const saveConsent = async (prefs: typeof preferences, isRejection: boolean = false) => {
    setIsSaving(true)
    try {
      // Determine consent status:
      // - consent_given: true if user accepted essential cookies (always true since essential is required)
      // - But we track the actual preferences (analytics, marketing, functional) separately
      // When user rejects, they're still giving consent to essential cookies only
      const hasAcceptedNonEssential = prefs.analytics || prefs.marketing || prefs.functional
      
      // Save to localStorage immediately
      localStorage.setItem('cookie_consent_given', 'true') // Always true since essential cookies are required
      localStorage.setItem('cookie_preferences', JSON.stringify(prefs))
      localStorage.setItem('cookie_consent_date', new Date().toISOString())
      if (isRejection || !hasAcceptedNonEssential) {
        localStorage.setItem('cookie_rejected_non_essential', 'true')
      } else {
        localStorage.removeItem('cookie_rejected_non_essential')
      }

      // Save to database if we have hotelId
      if (hotelId) {
        try {
          const response = await fetch('/api/consent/cookies', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              hotel_id: hotelId,
              user_id: userId || null,
              session_id: sessionId || null,
              essential_cookies: prefs.essential,
              analytics_cookies: prefs.analytics,
              marketing_cookies: prefs.marketing,
              functional_cookies: prefs.functional,
              consent_given: true, // true = user made a choice (accepted or rejected), false = no response yet
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            logger.error('Failed to save consent to database:', {
              status: response.status,
              statusText: response.statusText,
              error: errorData
            })
            
            // Show specific error message
            const errorMessage = errorData.error || errorData.details || 'Failed to save consent to database'
            toast.error(errorMessage, { duration: 5000 })
            throw new Error(errorMessage)
          }

          const result = await response.json()
          logger.info('Cookie consent saved successfully:', result)
          
          // Log the preferences that were saved
          if (isRejection) {
            logger.info('✅ Rejection saved - Non-essential cookies rejected:', {
              essential: prefs.essential,
              analytics: prefs.analytics,
              marketing: prefs.marketing,
              functional: prefs.functional,
            })
          } else {
            logger.info('✅ Consent saved - Preferences:', {
              essential: prefs.essential,
              analytics: prefs.analytics,
              marketing: prefs.marketing,
              functional: prefs.functional,
            })
          }
          
          // Success is silent - don't show toast for normal operation
        } catch (error: any) {
          logger.error('Failed to save consent to database:', error)
          // Show error toast with specific message
          const errorMessage = error.message || 'Failed to save consent. Your preferences are saved locally.'
          if (!errorMessage.includes('saved locally')) {
            toast.error(errorMessage, { duration: 5000 })
          } else {
            toast.error('Failed to save consent. Your preferences are saved locally.', { duration: 5000 })
          }
          // Continue anyway - localStorage is saved
        }
      }

      setShowBanner(false)
    } catch (error) {
      logger.error('Failed to save consent:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!showBanner) {
    return null
  }

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">We Value Your Privacy</h3>
              <p className="text-sm text-gray-600 mb-2">
                We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. 
                By clicking "Accept All", you consent to our use of cookies. You can also customize your preferences.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {hotelId ? (
                  <>
                    <Link 
                      href={`/guest/${hotelId}/legal/cookie-policy${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`} 
                      className="hover:text-gray-700 underline"
                    >
                      Cookie Policy
                    </Link>
                    <span>•</span>
                    <Link 
                      href={`/guest/${hotelId}/legal/privacy-policy${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`} 
                      className="hover:text-gray-700 underline"
                    >
                      Privacy Policy
                    </Link>
                    <span>•</span>
                    <Link 
                      href={`/guest/${hotelId}/legal/terms-of-service${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`} 
                      className="hover:text-gray-700 underline"
                    >
                      Terms of Service
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/cookie-policy" className="hover:text-gray-700 underline">
                      Cookie Policy
                    </Link>
                    <span>•</span>
                    <Link href="/privacy-policy" className="hover:text-gray-700 underline">
                      Privacy Policy
                    </Link>
                    <span>•</span>
                    <Link href="/terms-of-service" className="hover:text-gray-700 underline">
                      Terms of Service
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                className="text-sm whitespace-nowrap"
                disabled={isSaving}
              >
                Customize
              </Button>
              <Button
                onClick={handleRejectAll}
                variant="outline"
                className="text-sm whitespace-nowrap"
                disabled={isSaving}
              >
                Reject All
              </Button>
              <Button
                onClick={handleAcceptAll}
                className="text-sm whitespace-nowrap bg-gray-900 text-white hover:bg-gray-800"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Accept All'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Cookie Preferences</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6 mb-6">
                {/* Essential Cookies */}
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Essential Cookies</h3>
                      <p className="text-sm text-gray-600">
                        Required for the website to function. These cannot be disabled.
                      </p>
                    </div>
                    <div className="ml-4 flex items-center">
                      <Check size={20} className="text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Includes: Session management, security, authentication
                  </p>
                </div>

                {/* Functional Cookies */}
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Functional Cookies</h3>
                      <p className="text-sm text-gray-600">
                        Enhance functionality and personalization.
                      </p>
                    </div>
                    <label className="ml-4 relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.functional}
                        onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Includes: Language preferences, room number memory
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Analytics Cookies</h3>
                      <p className="text-sm text-gray-600">
                        Help us understand how visitors use our website.
                      </p>
                    </div>
                    <label className="ml-4 relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Includes: Page views, user interactions, performance monitoring
                  </p>
                </div>

                {/* Marketing Cookies */}
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Marketing Cookies</h3>
                      <p className="text-sm text-gray-600">
                        Used for advertising and marketing purposes.
                      </p>
                    </div>
                    <label className="ml-4 relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Currently not in use. Will be enabled in the future with your consent.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setShowSettings(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePreferences}
                  className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

