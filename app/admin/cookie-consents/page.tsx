'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface CookieConsent {
  id: string
  user_id: string | null
  session_id: string | null
  hotel_id: string
  essential_cookies: boolean
  analytics_cookies: boolean
  marketing_cookies: boolean
  functional_cookies: boolean
  consent_given: boolean
  consent_date: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export default function CookieConsentsPage() {
  const selectedHotel = useSelectedHotel()
  const [consents, setConsents] = useState<CookieConsent[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (selectedHotel && user?.role_id === 'super_admin') {
      loadConsents()
    }
  }, [selectedHotel, user])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        window.location.href = '/login'
        return
      }
      setUser(currentUser)
      
      if (currentUser.role_id !== 'super_admin') {
        window.location.href = '/'
        return
      }
    } catch (error) {
      logger.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadConsents = async () => {
    if (!selectedHotel) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/cookie-consents?hotel_id=${selectedHotel}`)
      
      if (!response.ok) {
        throw new Error('Failed to load cookie consents')
      }

      const data = await response.json()
      setConsents(data)
    } catch (error: any) {
      logger.error('Error loading cookie consents:', error)
    } finally {
      setLoading(false)
    }
  }

  const getConsentStatusIcon = (consent: CookieConsent) => {
    if (consent.consent_given) {
      return <CheckCircle className="text-green-500" size={18} />
    }
    return <XCircle className="text-red-500" size={18} />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  if (user?.role_id !== 'super_admin') {
    return null
  }

  if (!selectedHotel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <p className="text-gray-600">Please select a hotel to view cookie consents.</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Cookie Consents</h1>
        <p className="text-sm text-gray-600">View and manage cookie consent records</p>
      </div>

      {loading ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">Loading consents...</div>
        </Card>
      ) : consents.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">No cookie consents found.</div>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preferences</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consents.map((consent) => (
                  <tr key={consent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getConsentStatusIcon(consent)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          consent.consent_given 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {consent.consent_given ? 'Given' : 'Not Given'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {consent.user_id ? 'Registered User' : 'Guest (Session)'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-2">
                        {consent.essential_cookies && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Essential</span>
                        )}
                        {consent.analytics_cookies && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Analytics</span>
                        )}
                        {consent.marketing_cookies && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Marketing</span>
                        )}
                        {consent.functional_cookies && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Functional</span>
                        )}
                        {!consent.analytics_cookies && !consent.marketing_cookies && !consent.functional_cookies && (
                          <span className="text-xs text-gray-400">Essential only</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(consent.consent_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {consent.ip_address && consent.ip_address !== 'unknown' ? consent.ip_address : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

