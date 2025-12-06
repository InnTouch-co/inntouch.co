'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { Download, Trash2, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface DataRequest {
  id: string
  user_id: string | null
  guest_id: string | null
  hotel_id: string
  request_type: 'access' | 'deletion' | 'portability' | 'rectification'
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  requested_at: string
  completed_at: string | null
  description: string | null
  verification_token: string | null
  verified: boolean
  // Guest/User information
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  user_name: string | null
  user_email: string | null
  // Active booking info
  has_active_booking?: boolean
  active_booking_checkout_date?: string | null
  active_booking_room_number?: string | null
}

export default function DataRequestsPage() {
  const selectedHotel = useSelectedHotel()
  const [requests, setRequests] = useState<DataRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [selectedRequest, setSelectedRequest] = useState<DataRequest | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<{ requestId: string; action: 'complete' | 'reject' } | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (selectedHotel && user?.role_id === 'super_admin') {
      loadRequests()
    }
  }, [selectedHotel, filter, user])

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

  const loadRequests = async () => {
    if (!selectedHotel) return

    try {
      setLoading(true)
      const response = await fetch(`/api/admin/data-requests?hotel_id=${selectedHotel}&status=${filter}`)
      
      if (!response.ok) {
        throw new Error('Failed to load data requests')
      }

      const data = await response.json()
      setRequests(data)
    } catch (error: any) {
      logger.error('Error loading data requests:', error)
      toast.error(error.message || 'Failed to load data requests')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessRequest = async (requestId: string, action: 'complete' | 'reject', forceProceed: boolean = false) => {
    const request = requests.find(r => r.id === requestId)
    
    // Check if this is a deletion request and guest is still checked in
    if (action === 'complete' && request?.request_type === 'deletion' && request?.has_active_booking && !forceProceed) {
      // Close details modal if open, then show warning modal
      setShowDetailsModal(false)
      setPendingAction({ requestId, action })
      setShowWarningModal(true)
      return
    }

    setProcessing(requestId)
    try {
      const response = await fetch(`/api/admin/data-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action === 'complete' ? 'completed' : 'rejected',
          force_proceed: forceProceed || false,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If it's a "guest still checked in" error and we haven't shown the modal, show it now
        if (data.has_active_booking && action === 'complete' && !forceProceed) {
          setShowDetailsModal(false)
          setPendingAction({ requestId, action })
          setShowWarningModal(true)
          setProcessing(null)
          return
        }
        throw new Error(data.error || 'Failed to process request')
      }

      toast.success(`Request ${action === 'complete' ? 'completed' : 'rejected'} successfully`)
      await loadRequests()
      setShowDetailsModal(false)
      setShowWarningModal(false)
      setPendingAction(null)
    } catch (error: any) {
      logger.error('Error processing request:', error)
      toast.error(error.message || 'Failed to process request')
    } finally {
      setProcessing(null)
    }
  }

  const handleConfirmProceed = () => {
    if (pendingAction) {
      handleProcessRequest(pendingAction.requestId, pendingAction.action, true)
    }
  }

  const handleExportData = async (requestId: string) => {
    try {
      const request = requests.find(r => r.id === requestId)
      if (!request) return

      const response = await fetch(`/api/admin/data-requests/${requestId}/export`)
      
      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `guest-data-${requestId}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Data exported successfully')
    } catch (error: any) {
      logger.error('Error exporting data:', error)
      toast.error(error.message || 'Failed to export data')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-yellow-500" size={18} />
      case 'in_progress':
        return <Clock className="text-blue-500" size={18} />
      case 'completed':
        return <CheckCircle className="text-green-500" size={18} />
      case 'rejected':
        return <XCircle className="text-red-500" size={18} />
      default:
        return <Clock className="text-gray-500" size={18} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
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
          <p className="text-gray-600">Please select a hotel to view data requests.</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Data Requests</h1>
          <p className="text-xs sm:text-sm text-gray-600">Manage GDPR data subject requests</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setFilter('all')}
            variant={filter === 'all' ? 'primary' : 'outline'}
            className="text-xs sm:text-sm"
          >
            All
          </Button>
          <Button
            onClick={() => setFilter('pending')}
            variant={filter === 'pending' ? 'primary' : 'outline'}
            className="text-xs sm:text-sm"
          >
            Pending
          </Button>
          <Button
            onClick={() => setFilter('completed')}
            variant={filter === 'completed' ? 'primary' : 'outline'}
            className="text-xs sm:text-sm"
          >
            Completed
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">Loading data requests...</div>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">No data requests found.</div>
        </Card>
      ) : (
        <>
          {/* Mobile: Card Layout */}
          <div className="md:hidden space-y-3">
            {requests.map((request) => {
              const requesterName = request.guest_name || request.user_name || 'Unknown'
              const requesterEmail = request.guest_email || request.user_email || null
              const requesterType = request.guest_id ? 'Guest' : request.user_id ? 'User' : 'Unknown'

              return (
                <Card key={request.id} className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(request.status)}
                          <span className="text-sm font-semibold text-gray-900 capitalize">
                            {request.request_type.replace('_', ' ')}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="text-right">
                        {request.verified ? (
                          <span className="text-green-600 text-xs">✓ Verified</span>
                        ) : (
                          <span className="text-yellow-600 text-xs">⚠ Unverified</span>
                        )}
                      </div>
                    </div>

                    {/* Requester Info */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                      <div className="text-xs font-medium text-gray-700">Requested By</div>
                      <div className="text-sm font-semibold text-gray-900">{requesterName}</div>
                      {requesterEmail && (
                        <div className="text-xs text-gray-600 truncate">{requesterEmail}</div>
                      )}
                      <div className="text-xs text-gray-500">{requesterType}</div>
                    </div>

                    {/* Booking Status */}
                    {request.has_active_booking ? (
                      <div className="bg-orange-50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>
                            Checked In
                          </span>
                        </div>
                        {request.active_booking_room_number && (
                          <div className="text-xs text-gray-700">Room {request.active_booking_room_number}</div>
                        )}
                        {request.active_booking_checkout_date && (
                          <div className="text-xs text-gray-600">Checkout: {new Date(request.active_booking_checkout_date).toLocaleDateString()}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">Not checked in</div>
                    )}

                    {/* Request Date */}
                    <div className="text-xs text-gray-600">
                      Requested: {new Date(request.requested_at).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <Button
                        onClick={() => {
                          setSelectedRequest(request)
                          setShowDetailsModal(true)
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <Eye size={14} className="mr-1" />
                        View
                      </Button>
                      {request.request_type === 'access' && request.status === 'pending' && (
                        <Button
                          onClick={() => handleExportData(request.id)}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs"
                        >
                          <Download size={14} className="mr-1" />
                          Export
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Desktop: Table Layout */}
          <Card className="hidden md:block p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => {
                  const requesterName = request.guest_name || request.user_name || 'Unknown'
                  const requesterEmail = request.guest_email || request.user_email || null
                  const requesterType = request.guest_id ? 'Guest' : request.user_id ? 'User' : 'Unknown'

                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {request.request_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{requesterName}</div>
                          {requesterEmail && (
                            <div className="text-xs text-gray-500">{requesterEmail}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-0.5">{requesterType}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {request.has_active_booking ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>
                                Checked In
                              </span>
                            </div>
                            {request.active_booking_room_number && (
                              <div className="text-xs text-gray-500 mt-1">Room {request.active_booking_room_number}</div>
                            )}
                            {request.active_booking_checkout_date && (
                              <div className="text-xs text-gray-500">Checkout: {new Date(request.active_booking_checkout_date).toLocaleDateString()}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not checked in</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(request.requested_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {request.verified ? (
                          <span className="text-green-600 text-sm">✓ Verified</span>
                        ) : (
                          <span className="text-yellow-600 text-sm">⚠ Unverified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedRequest(request)
                              setShowDetailsModal(true)
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Eye size={16} className="mr-1" />
                          </Button>
                          {request.request_type === 'access' && request.status === 'pending' && (
                            <Button
                              onClick={() => handleExportData(request.id)}
                              variant="outline"
                              size="sm"
                            >
                              <Download size={16} className="mr-1" />
                              Export
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}

      {/* Warning Modal for Checked-In Guests */}
      {showWarningModal && pendingAction && (
        <Modal
          isOpen={showWarningModal}
          onClose={() => {
            setShowWarningModal(false)
            setPendingAction(null)
          }}
          title="Guest Still Checked In"
          zIndex={60}
        >
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-2">
                This guest is currently checked in. If you proceed with anonymization:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Guest name will show as "Deleted User" in the rooms page</li>
                <li>Email and phone will be removed</li>
                <li>Booking and order records will be anonymized</li>
                <li>Guest can still check out normally</li>
              </ul>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleConfirmProceed}
                disabled={processing === pendingAction.requestId}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                {processing === pendingAction.requestId ? 'Processing...' : 'Anonymize Now'}
              </Button>
              <Button
                onClick={() => {
                  setShowWarningModal(false)
                  setPendingAction(null)
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedRequest(null)
          }}
          title={`Data Request: ${selectedRequest.request_type.replace('_', ' ')}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested By</label>
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  {selectedRequest.guest_name || selectedRequest.user_name || 'Unknown'}
                </div>
                {(selectedRequest.guest_email || selectedRequest.user_email) && (
                  <div className="text-gray-600 mt-1">
                    {selectedRequest.guest_email || selectedRequest.user_email}
                  </div>
                )}
                {selectedRequest.guest_phone && (
                  <div className="text-gray-600 mt-1">
                    {selectedRequest.guest_phone}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {selectedRequest.guest_id ? 'Guest' : selectedRequest.user_id ? 'User' : 'Unknown'}
                </div>
              </div>
            </div>

            {selectedRequest.has_active_booking && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>
                    Guest Still Checked In
                  </span>
                </div>
                {selectedRequest.active_booking_room_number && (
                  <p className="text-sm text-gray-700">Room: {selectedRequest.active_booking_room_number}</p>
                )}
                {selectedRequest.active_booking_checkout_date && (
                  <p className="text-sm text-gray-700">Checkout Date: {new Date(selectedRequest.active_booking_checkout_date).toLocaleDateString()}</p>
                )}
                <p className="text-xs text-orange-700 mt-2">
                  ⚠️ If you anonymize now, the guest name will show as "Deleted User" in the rooms page while they're still checked in.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedRequest.status)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested At</label>
              <p className="text-sm text-gray-600">
                {new Date(selectedRequest.requested_at).toLocaleString()}
              </p>
            </div>

            {selectedRequest.completed_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completed At</label>
                <p className="text-sm text-gray-600">
                  {new Date(selectedRequest.completed_at).toLocaleString()}
                </p>
              </div>
            )}

            {selectedRequest.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-sm text-gray-600">{selectedRequest.description}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification</label>
              <div className="flex items-center gap-3">
                {selectedRequest.verified ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                    ✓ Verified
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                      ⚠ Not verified
                    </span>
                    {selectedRequest.guest_email && (
                      <Button
                        onClick={async () => {
                          try {
                            // Resend verification email
                            const response = await fetch(`/api/admin/data-requests/${selectedRequest.id}/resend-verification`, {
                              method: 'POST',
                            })
                            if (response.ok) {
                              toast.success('Verification email sent successfully')
                            } else {
                              const data = await response.json()
                              throw new Error(data.error || 'Failed to resend verification email')
                            }
                          } catch (error: any) {
                            logger.error('Error resending verification email:', error)
                            toast.error(error.message || 'Failed to resend verification email')
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Resend Email
                      </Button>
                    )}
                  </>
                )}
              </div>
              {!selectedRequest.verified && (
                <p className="text-xs text-gray-500 mt-2">
                  Guest must verify their email address before processing this request.
                </p>
              )}
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleProcessRequest(selectedRequest.id, 'complete')}
                  disabled={processing === selectedRequest.id}
                  className="flex-1"
                >
                  {processing === selectedRequest.id ? 'Processing...' : 'Mark as Completed'}
                </Button>
                <Button
                  onClick={() => handleProcessRequest(selectedRequest.id, 'reject')}
                  disabled={processing === selectedRequest.id}
                  variant="outline"
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

