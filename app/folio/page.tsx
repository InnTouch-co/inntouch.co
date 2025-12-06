'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { useSelectedHotel } from '@/components/layout/HotelSelector'
import { logger } from '@/lib/utils/logger'
import { generateFolioPDF } from '@/lib/utils/pdfGenerator'
import { FileText, Download, Eye } from 'lucide-react'
import { useHotelTimezone } from '@/lib/hooks/useHotelTimezone'
import { formatTimestamp } from '@/lib/utils/formatTimestamp'

export const dynamic = 'force-dynamic'

interface Order {
  id: string
  order_number: string
  subtotal: number
  discount_amount: number
  total_amount: number
  created_at: string
  items: any
}

interface Folio {
  booking_id: string
  booking: {
    id: string
    guest_name: string
    guest_email: string | null
    guest_phone: string | null
    room_number: string
    check_in_date: string
    check_out_date: string
  }
  orders: Order[]
  total_amount: number
  payment_status: 'pending' | 'paid'
  created_at: string
  adjustment?: {
    subtotal_amount: number
    tax_amount: number
    final_amount: number
    pos_receipt_number: string | null
    notes: string | null
    adjusted_at: string
  } | null
}

export default function FolioPage() {
  const router = useRouter()
  const selectedHotel = useSelectedHotel()
  const hotelTimezone = useHotelTimezone(selectedHotel || undefined)
  const [user, setUser] = useState<any>(null)
  const [folios, setFolios] = useState<Folio[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false)
  const [folioToMarkPaid, setFolioToMarkPaid] = useState<Folio | null>(null)
  const [taxAmount, setTaxAmount] = useState('')
  const [posReceiptNumber, setPosReceiptNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [showEditAdjustmentModal, setShowEditAdjustmentModal] = useState(false)
  const [folioToEdit, setFolioToEdit] = useState<Folio | null>(null)
  const [editTaxAmount, setEditTaxAmount] = useState('')
  const [editPosReceiptNumber, setEditPosReceiptNumber] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedFolioForDetails, setSelectedFolioForDetails] = useState<Folio | null>(null)
  const [detailedFolioData, setDetailedFolioData] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (selectedHotel) {
      loadFolios()
    }
  }, [selectedHotel, filter])

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUserClient()
      if (!currentUser) {
        window.location.href = '/login'
        return
      }
      setUser(currentUser)
      setIsSuperAdmin(currentUser.role_id === 'super_admin')
    } catch (error) {
      logger.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFolios = async () => {
    if (!selectedHotel) return
    try {
      setLoading(true)
      const response = await fetch(`/api/folios?hotel_id=${selectedHotel}&payment_status=${filter === 'all' ? '' : filter}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load folios')
      }

      setFolios(data)
    } catch (error: any) {
      logger.error('Failed to load folios:', error)
      setError(error.message || 'Failed to load folios')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = (folio: Folio) => {
    setFolioToMarkPaid(folio)
    setTaxAmount('')
    setPosReceiptNumber('')
    setNotes('')
    setShowMarkPaidModal(true)
  }

  const handleConfirmMarkAsPaid = async () => {
    if (!folioToMarkPaid) return

    const tax = parseFloat(taxAmount)
    if (isNaN(tax) || tax < 0) {
      setError('Please enter a valid tax amount')
      return
    }

    setSubmitting(folioToMarkPaid.booking_id)
    setError('')

    try {
      const response = await fetch('/api/folios/mark-paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: folioToMarkPaid.booking_id,
          subtotal_amount: folioToMarkPaid.total_amount,
          tax_amount: tax,
          final_amount: folioToMarkPaid.total_amount + tax,
          pos_receipt_number: posReceiptNumber.trim() || null,
          notes: notes.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark folio as paid')
      }

      // Refresh folios to show updated status
      await loadFolios()
      setShowMarkPaidModal(false)
      setFolioToMarkPaid(null)
      alert('Folio marked as paid successfully!')
    } catch (error: any) {
      logger.error('Failed to mark folio as paid:', error)
      setError(error.message || 'Failed to mark folio as paid')
    } finally {
      setSubmitting(null)
    }
  }

  const handleEditAdjustment = (folio: Folio) => {
    if (!folio.adjustment) return
    setFolioToEdit(folio)
    setEditTaxAmount(folio.adjustment.tax_amount.toString())
    setEditPosReceiptNumber(folio.adjustment.pos_receipt_number || '')
    setEditNotes(folio.adjustment.notes || '')
    setShowEditAdjustmentModal(true)
  }

  const handleConfirmEditAdjustment = async () => {
    if (!folioToEdit || !folioToEdit.adjustment) return

    const tax = parseFloat(editTaxAmount)
    if (isNaN(tax) || tax < 0) {
      setError('Please enter a valid tax amount')
      return
    }

    setSubmitting(folioToEdit.booking_id)
    setError('')

    try {
      const response = await fetch(`/api/folios/${folioToEdit.booking_id}/adjustment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subtotal_amount: folioToEdit.adjustment.subtotal_amount,
          tax_amount: tax,
          final_amount: folioToEdit.adjustment.subtotal_amount + tax,
          pos_receipt_number: editPosReceiptNumber.trim() || null,
          notes: editNotes.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update adjustment')
      }

      // Refresh folios to show updated adjustment
      await loadFolios()
      setShowEditAdjustmentModal(false)
      setFolioToEdit(null)
      alert('Adjustment updated successfully!')
    } catch (error: any) {
      logger.error('Failed to update adjustment:', error)
      setError(error.message || 'Failed to update adjustment')
    } finally {
      setSubmitting(null)
    }
  }

  const handleDeleteFolio = async (folio: Folio) => {
    if (!confirm(`Are you sure you want to delete the folio for ${folio.booking.guest_name} (Room ${folio.booking.room_number})? This action cannot be undone.`)) {
      return
    }

    setDeleting(folio.booking_id)
    setError('')

    try {
      const response = await fetch(`/api/folios/${folio.booking_id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete folio')
      }

      // Refresh folios to remove deleted folio
      await loadFolios()
      alert('Folio deleted successfully!')
    } catch (error: any) {
      logger.error('Failed to delete folio:', error)
      setError(error.message || 'Failed to delete folio')
    } finally {
      setDeleting(null)
    }
  }

  const handleViewDetails = async (folio: Folio) => {
    setSelectedFolioForDetails(folio)
    setShowDetailsModal(true)
    setLoadingDetails(true)
    setDetailedFolioData(null)

    try {
      const response = await fetch(`/api/folios/${folio.booking_id}/detailed`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load folio details')
      }

      setDetailedFolioData(data.folio)
    } catch (error: any) {
      logger.error('Failed to load folio details:', error)
      setError(error.message || 'Failed to load folio details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleDownloadPDF = async (folio: Folio) => {
    setDownloadingPDF(true)
    try {
      // If we already have detailed data, use it; otherwise fetch it
      let folioData = detailedFolioData
      if (!folioData || folioData.booking_id !== folio.booking_id) {
        const response = await fetch(`/api/folios/${folio.booking_id}/detailed`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load folio details')
        }

        folioData = data.folio
      }

      generateFolioPDF(folioData)
    } catch (error: any) {
      logger.error('Failed to generate PDF:', error)
      setError(error.message || 'Failed to generate PDF')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const filteredFolios = folios.filter(folio => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        folio.booking.guest_name.toLowerCase().includes(query) ||
        folio.booking.room_number.toLowerCase().includes(query) ||
        folio.booking.guest_email?.toLowerCase().includes(query) ||
        folio.booking.guest_phone?.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Guest Folios</h1>
        <p className="text-xs md:text-sm text-gray-600">Manage guest billing and payments</p>
      </div>

      {!selectedHotel ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-sm md:text-base text-gray-500">Please select a hotel to view folios.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card className="mb-6">
            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by guest name, room, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'pending'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilter('paid')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'paid'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Paid
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {filteredFolios.length === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-sm md:text-base text-gray-500">
                  {searchQuery ? 'No folios match your search.' : 'No folios found.'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full bg-white border border-gray-200 rounded-lg text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Guest / Room</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Contact</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Dates</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Orders</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Subtotal</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Discount</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Tax</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Final</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredFolios.map((folio) => (
                    <tr key={folio.booking_id} className="hover:bg-gray-50">
                      <td className="px-2 py-2">
                        <div className="font-medium text-gray-900 text-xs">{folio.booking.guest_name}</div>
                        <div className="text-gray-500 text-xs mt-0.5">Room {folio.booking.room_number}</div>
                      </td>
                      <td className="px-2 py-2">
                        {folio.booking.guest_email && (
                          <div className="text-gray-600 text-xs truncate max-w-[120px]" title={folio.booking.guest_email}>
                            {folio.booking.guest_email}
                          </div>
                        )}
                        {folio.booking.guest_phone && (
                          <div className="text-gray-600 text-xs">{folio.booking.guest_phone}</div>
                        )}
                        {!folio.booking.guest_email && !folio.booking.guest_phone && (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-gray-600 text-xs">
                          {new Date(folio.booking.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {new Date(folio.booking.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-gray-900 text-xs font-medium">{folio.orders.length}</div>
                        {folio.orders.length > 0 && (
                          <div className="text-gray-500 text-xs mt-0.5" title={folio.orders.map(o => `${o.order_number} (${new Date(o.created_at).toLocaleDateString()})`).join('\n')}>
                            {folio.orders.slice(0, 2).map(o => o.order_number).join(', ')}
                            {folio.orders.length > 2 && ` +${folio.orders.length - 2}`}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-900 text-xs">
                        ${(folio.adjustment?.subtotal_amount || folio.orders.reduce((sum, o) => sum + (o.subtotal || 0), 0)).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-right text-xs">
                        {(() => {
                          const totalDiscount = folio.orders.reduce((sum, o) => sum + (o.discount_amount || 0), 0)
                          return totalDiscount > 0 ? (
                            <span className="text-green-600 font-medium">-${totalDiscount.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )
                        })()}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-900 text-xs">
                        {folio.adjustment ? `$${folio.adjustment.tax_amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-gray-900 text-xs">
                        {folio.adjustment ? `$${folio.adjustment.final_amount.toFixed(2)}` : `$${folio.total_amount.toFixed(2)}`}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                            folio.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {folio.payment_status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => handleViewDetails(folio)}
                            variant="outline"
                            size="sm"
                            className="px-2 py-1 text-xs h-auto"
                            title="View Details"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => handleDownloadPDF(folio)}
                            variant="outline"
                            size="sm"
                            className="px-2 py-1 text-xs h-auto"
                            disabled={downloadingPDF}
                            title="Download PDF"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          {folio.payment_status === 'pending' && (
                            <Button
                              onClick={() => handleMarkAsPaid(folio)}
                              disabled={submitting === folio.booking_id}
                              size="sm"
                              className="px-2 py-1 text-xs h-auto"
                            >
                              {submitting === folio.booking_id ? '...' : 'Mark Paid'}
                            </Button>
                          )}
                          {folio.payment_status === 'paid' && folio.adjustment && isSuperAdmin && (
                            <Button
                              onClick={() => handleEditAdjustment(folio)}
                              disabled={submitting === folio.booking_id}
                              variant="outline"
                              size="sm"
                              className="px-2 py-1 text-xs h-auto"
                            >
                              Edit
                            </Button>
                          )}
                          {isSuperAdmin && (
                            <Button
                              onClick={() => handleDeleteFolio(folio)}
                              disabled={deleting === folio.booking_id}
                              variant="danger"
                              size="sm"
                              className="px-2 py-1 text-xs h-auto"
                            >
                              {deleting === folio.booking_id ? '...' : 'Del'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && folioToMarkPaid && (
        <Modal
          isOpen={showMarkPaidModal}
          onClose={() => {
            if (!submitting) {
              setShowMarkPaidModal(false)
              setFolioToMarkPaid(null)
              setTaxAmount('')
              setPosReceiptNumber('')
              setNotes('')
              setError('')
            }
          }}
          title="Mark Folio as Paid"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">Guest: {folioToMarkPaid.booking.guest_name}</p>
              <p className="text-sm text-gray-600">Room: {folioToMarkPaid.booking.room_number}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtotal (Pre-tax) *
              </label>
              <div className="text-lg font-semibold text-gray-900">
                ${folioToMarkPaid.total_amount.toFixed(2)}
              </div>
            </div>

            <div>
              <label htmlFor="taxAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Tax Amount (from POS) *
              </label>
              <input
                id="taxAmount"
                type="number"
                step="0.01"
                min="0"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Final Amount
              </label>
              <div className="text-lg font-semibold text-gray-900">
                ${(folioToMarkPaid.total_amount + (parseFloat(taxAmount) || 0)).toFixed(2)}
              </div>
            </div>

            <div>
              <label htmlFor="posReceiptNumber" className="block text-sm font-medium text-gray-700 mb-1">
                POS Receipt # (optional)
              </label>
              <input
                id="posReceiptNumber"
                type="text"
                value={posReceiptNumber}
                onChange={(e) => setPosReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter receipt number"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Additional notes..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowMarkPaidModal(false)
                  setFolioToMarkPaid(null)
                  setTaxAmount('')
                  setPosReceiptNumber('')
                  setNotes('')
                  setError('')
                }}
                variant="outline"
                className="flex-1"
                disabled={submitting === folioToMarkPaid.booking_id}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmMarkAsPaid}
                disabled={submitting === folioToMarkPaid.booking_id || !taxAmount || parseFloat(taxAmount) < 0}
                className="flex-1"
              >
                {submitting === folioToMarkPaid.booking_id ? 'Processing...' : 'Confirm & Mark as Paid'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Adjustment Modal (Super Admin Only) */}
      {showEditAdjustmentModal && folioToEdit && folioToEdit.adjustment && (
        <Modal
          isOpen={showEditAdjustmentModal}
          onClose={() => {
            if (!submitting) {
              setShowEditAdjustmentModal(false)
              setFolioToEdit(null)
              setEditTaxAmount('')
              setEditPosReceiptNumber('')
              setEditNotes('')
              setError('')
            }
          }}
          title="Edit Folio Adjustment"
        >
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">Guest: {folioToEdit.booking.guest_name}</p>
              <p className="text-sm text-gray-600">Room: {folioToEdit.booking.room_number}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtotal (Pre-tax) *
              </label>
              <div className="text-lg font-semibold text-gray-900">
                ${folioToEdit.adjustment.subtotal_amount.toFixed(2)}
              </div>
            </div>

            <div>
              <label htmlFor="editTaxAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Tax Amount (from POS) *
              </label>
              <input
                id="editTaxAmount"
                type="number"
                step="0.01"
                min="0"
                value={editTaxAmount}
                onChange={(e) => setEditTaxAmount(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Final Amount
              </label>
              <div className="text-lg font-semibold text-gray-900">
                ${(folioToEdit.adjustment.subtotal_amount + (parseFloat(editTaxAmount) || 0)).toFixed(2)}
              </div>
            </div>

            <div>
              <label htmlFor="editPosReceiptNumber" className="block text-sm font-medium text-gray-700 mb-1">
                POS Receipt # (optional)
              </label>
              <input
                id="editPosReceiptNumber"
                type="text"
                value={editPosReceiptNumber}
                onChange={(e) => setEditPosReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter receipt number"
              />
            </div>

            <div>
              <label htmlFor="editNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                id="editNotes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Additional notes..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setShowEditAdjustmentModal(false)
                  setFolioToEdit(null)
                  setEditTaxAmount('')
                  setEditPosReceiptNumber('')
                  setEditNotes('')
                  setError('')
                }}
                variant="outline"
                className="flex-1"
                disabled={submitting === folioToEdit.booking_id}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmEditAdjustment}
                disabled={submitting === folioToEdit.booking_id || !editTaxAmount || parseFloat(editTaxAmount) < 0}
                className="flex-1"
              >
                {submitting === folioToEdit.booking_id ? 'Updating...' : 'Update Adjustment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Detailed View Modal */}
      {showDetailsModal && selectedFolioForDetails && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedFolioForDetails(null)
            setDetailedFolioData(null)
            setError('')
          }}
          title="Folio Details"
          size="large"
        >
          {loadingDetails ? (
            <div className="p-8 text-center">
              <div className="text-gray-500">Loading folio details...</div>
            </div>
          ) : detailedFolioData ? (
            <div className="space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Hotel Information */}
              {detailedFolioData.hotel && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Hotel Information</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Name:</strong> {detailedFolioData.hotel.name}</p>
                    {detailedFolioData.hotel.address && <p><strong>Address:</strong> {detailedFolioData.hotel.address}</p>}
                    {detailedFolioData.hotel.phone && <p><strong>Phone:</strong> {detailedFolioData.hotel.phone}</p>}
                    {detailedFolioData.hotel.email && <p><strong>Email:</strong> {detailedFolioData.hotel.email}</p>}
                  </div>
                </div>
              )}

              {/* Guest Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Guest Information</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Name:</strong> {detailedFolioData.booking.guest_name}</p>
                  <p><strong>Room:</strong> {detailedFolioData.booking.room_number}</p>
                  {detailedFolioData.booking.guest_email && <p><strong>Email:</strong> {detailedFolioData.booking.guest_email}</p>}
                  {detailedFolioData.booking.guest_phone && <p><strong>Phone:</strong> {detailedFolioData.booking.guest_phone}</p>}
                  <p><strong>Check-in:</strong> {new Date(detailedFolioData.booking.check_in_date).toLocaleDateString()}</p>
                  <p><strong>Check-out:</strong> {new Date(detailedFolioData.booking.check_out_date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Orders */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Orders ({detailedFolioData.orders.length})</h3>
                <div className="space-y-4">
                  {detailedFolioData.orders.map((order: any) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">Order #{order.order_number}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimestamp(order.created_at, hotelTimezone, { format: 'datetime' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">${order.total_amount.toFixed(2)}</p>
                          {order.discount_amount > 0 && (
                            <p className="text-xs text-green-600">Discount: -${order.discount_amount.toFixed(2)}</p>
                          )}
                        </div>
                      </div>

                      {/* Order Items */}
                      {order.items && order.items.length > 0 && (
                        <div className="mt-3">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-2 text-left text-gray-700 font-medium">Item</th>
                                <th className="px-2 py-2 text-center text-gray-700 font-medium">Qty</th>
                                <th className="px-2 py-2 text-right text-gray-700 font-medium">Unit Price</th>
                                <th className="px-2 py-2 text-right text-gray-700 font-medium">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {order.items.map((item: any, idx: number) => (
                                <tr key={idx}>
                                  <td className="px-2 py-2">
                                    <div className="text-gray-900">{item.menu_item_name || 'Unknown Item'}</div>
                                    {item.special_instructions && (
                                      <div className="text-xs text-gray-500 italic mt-1">
                                        Note: {item.special_instructions}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 text-center text-gray-700">{item.quantity}</td>
                                  <td className="px-2 py-2 text-right text-gray-700">${item.unit_price.toFixed(2)}</td>
                                  <td className="px-2 py-2 text-right text-gray-900 font-medium">${item.total_price.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {order.special_instructions && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-gray-700">
                          <strong>Order Note:</strong> {order.special_instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Folio Summary */}
              <div className="bg-gray-50 p-4 rounded-lg border-t-2 border-gray-300">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Folio Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="text-gray-900 font-medium">
                      ${detailedFolioData.orders.reduce((sum: number, o: any) => sum + o.subtotal, 0).toFixed(2)}
                    </span>
                  </div>
                  {detailedFolioData.orders.reduce((sum: number, o: any) => sum + (o.discount_amount || 0), 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Total Discount:</span>
                      <span className="text-green-600 font-medium">
                        -${detailedFolioData.orders.reduce((sum: number, o: any) => sum + (o.discount_amount || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {detailedFolioData.adjustment && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Tax:</span>
                        <span className="text-gray-900 font-medium">
                          ${detailedFolioData.adjustment.tax_amount.toFixed(2)}
                        </span>
                      </div>
                      {detailedFolioData.adjustment.pos_receipt_number && (
                        <div className="flex justify-between">
                          <span className="text-gray-700">POS Receipt #:</span>
                          <span className="text-gray-900">{detailedFolioData.adjustment.pos_receipt_number}</span>
                        </div>
                      )}
                      {detailedFolioData.adjustment.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-300">
                          <p className="text-gray-700"><strong>Notes:</strong> {detailedFolioData.adjustment.notes}</p>
                        </div>
                      )}
                      {detailedFolioData.adjustment.adjusted_by && (
                        <div className="text-xs text-gray-500 mt-2">
                          Adjusted by {detailedFolioData.adjustment.adjusted_by} on {new Date(detailedFolioData.adjustment.adjusted_at).toLocaleString()}
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-300 mt-2">
                    <span className="text-base font-semibold text-gray-900">Final Amount:</span>
                    <span className="text-base font-bold text-gray-900">
                      ${detailedFolioData.adjustment 
                        ? detailedFolioData.adjustment.final_amount.toFixed(2)
                        : detailedFolioData.total_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-gray-700">Payment Status:</span>
                    <span className={`font-medium ${
                      detailedFolioData.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {detailedFolioData.payment_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleDownloadPDF(selectedFolioForDetails)}
                  disabled={downloadingPDF}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {downloadingPDF ? 'Generating...' : 'Download PDF'}
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedFolioForDetails(null)
                    setDetailedFolioData(null)
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-red-600">Failed to load folio details</div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

