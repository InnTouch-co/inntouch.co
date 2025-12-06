'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { getHotels } from '@/lib/database/hotels'
import { SearchableHotelSelector } from '@/components/admin/SearchableHotelSelector'
import type { Hotel } from '@/types/database'
import { logger } from '@/lib/utils/logger'

export const dynamic = 'force-dynamic'

interface Order {
  id: string
  order_number: string
  subtotal: number
  discount_amount: number
  total_amount: number
  created_at: string
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

export default function AdminFoliosPage() {
  const [user, setUser] = useState<any>(null)
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotelId, setSelectedHotelId] = useState<string>('')
  const [folios, setFolios] = useState<Folio[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingFolios, setLoadingFolios] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all')
  
  // Edit adjustment modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [folioToEdit, setFolioToEdit] = useState<Folio | null>(null)
  const [editTaxAmount, setEditTaxAmount] = useState('')
  const [editPosReceiptNumber, setEditPosReceiptNumber] = useState('')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    loadUser()
    loadHotels()
  }, [])

  useEffect(() => {
    if (selectedHotelId) {
      loadFolios()
    } else {
      setFolios([])
    }
  }, [selectedHotelId, filter])

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

  const loadHotels = async () => {
    try {
      const hotelsList = await getHotels()
      setHotels(hotelsList)
    } catch (error) {
      logger.error('Failed to load hotels:', error)
    }
  }

  const loadFolios = async () => {
    if (!selectedHotelId) return
    try {
      setLoadingFolios(true)
      const response = await fetch(`/api/folios?hotel_id=${selectedHotelId}&payment_status=${filter === 'all' ? '' : filter}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load folios')
      }

      setFolios(data)
    } catch (error: any) {
      logger.error('Failed to load folios:', error)
      setError(error.message || 'Failed to load folios')
    } finally {
      setLoadingFolios(false)
    }
  }

  const handleEditAdjustment = (folio: Folio) => {
    if (!folio.adjustment) {
      // If no adjustment exists, create one with current values
      setFolioToEdit(folio)
      setEditTaxAmount('0.00')
      setEditPosReceiptNumber('')
      setEditNotes('')
    } else {
      setFolioToEdit(folio)
      setEditTaxAmount(folio.adjustment.tax_amount.toString())
      setEditPosReceiptNumber(folio.adjustment.pos_receipt_number || '')
      setEditNotes(folio.adjustment.notes || '')
    }
    setShowEditModal(true)
  }

  const handleConfirmEdit = async () => {
    if (!folioToEdit) return

    const tax = parseFloat(editTaxAmount)
    if (isNaN(tax) || tax < 0) {
      setError('Please enter a valid tax amount')
      return
    }

    setSubmitting(folioToEdit.booking_id)
    setError('')

    try {
      const subtotal = folioToEdit.adjustment?.subtotal_amount || folioToEdit.total_amount
      
      if (folioToEdit.adjustment) {
        // Update existing adjustment
        const response = await fetch(`/api/folios/${folioToEdit.booking_id}/adjustment`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subtotal_amount: subtotal,
            tax_amount: tax,
            final_amount: subtotal + tax,
            pos_receipt_number: editPosReceiptNumber.trim() || null,
            notes: editNotes.trim() || null,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update adjustment')
        }
      } else {
        // Create new adjustment (mark as paid)
        const response = await fetch('/api/folios/mark-paid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            booking_id: folioToEdit.booking_id,
            subtotal_amount: subtotal,
            tax_amount: tax,
            final_amount: subtotal + tax,
            pos_receipt_number: editPosReceiptNumber.trim() || null,
            notes: editNotes.trim() || null,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create adjustment')
        }
      }

      await loadFolios()
      setShowEditModal(false)
      setFolioToEdit(null)
      setError('')
    } catch (error: any) {
      logger.error('Failed to save adjustment:', error)
      setError(error.message || 'Failed to save adjustment')
    } finally {
      setSubmitting(null)
    }
  }

  const handleDeleteFolio = async (folio: Folio) => {
    if (!confirm(`Delete folio for ${folio.booking.guest_name} (Room ${folio.booking.room_number})? This action cannot be undone.`)) {
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

      await loadFolios()
    } catch (error: any) {
      logger.error('Failed to delete folio:', error)
      setError(error.message || 'Failed to delete folio')
    } finally {
      setDeleting(null)
    }
  }

  const filteredFolios = folios.filter(folio => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        folio.booking.guest_name.toLowerCase().includes(query) ||
        folio.booking.room_number.toLowerCase().includes(query) ||
        folio.booking.guest_email?.toLowerCase().includes(query) ||
        folio.booking.guest_phone?.toLowerCase().includes(query) ||
        folio.orders.some(order => order.order_number.toLowerCase().includes(query))
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

  if (user?.role_id !== 'super_admin') {
    return null
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Folio Management</h1>
        <p className="text-sm text-gray-600">Super Admin - Adjust or delete folios</p>
      </div>

      {/* Hotel Selector */}
      <Card className="mb-6 overflow-visible">
        <div className="p-4">
          <SearchableHotelSelector
            hotels={hotels}
            selectedHotelId={selectedHotelId}
            onSelect={setSelectedHotelId}
          />
        </div>
      </Card>

      {!selectedHotelId ? (
        <Card>
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">Please select a hotel to view folios.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Search and Filters */}
          <Card className="mb-4">
            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by guest, room, email, phone, or order number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('pending')}
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      filter === 'pending'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilter('paid')}
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
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

          {loadingFolios ? (
            <Card>
              <div className="p-8 text-center">
                <div className="text-gray-500 mb-2">Loading folios...</div>
              </div>
            </Card>
          ) : filteredFolios.length === 0 ? (
            <Card>
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'No folios match your search.' : 'No folios found.'}
                </p>
              </div>
            </Card>
          ) : (
            <>
              {/* Mobile: Card Layout */}
              <div className="md:hidden space-y-3">
                {filteredFolios.map((folio) => {
                  const totalDiscount = folio.orders.reduce((sum, o) => sum + (o.discount_amount || 0), 0)
                  const subtotal = folio.adjustment?.subtotal_amount || folio.orders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
                  return (
                    <Card key={folio.booking_id} className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 text-sm">{folio.booking.guest_name}</div>
                            <div className="text-gray-600 text-xs mt-0.5">Room {folio.booking.room_number}</div>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              folio.payment_status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {folio.payment_status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </div>

                        {/* Contact Info */}
                        {(folio.booking.guest_email || folio.booking.guest_phone) && (
                          <div className="text-xs text-gray-600 space-y-0.5">
                            {folio.booking.guest_email && (
                              <div className="truncate">{folio.booking.guest_email}</div>
                            )}
                            {folio.booking.guest_phone && (
                              <div>{folio.booking.guest_phone}</div>
                            )}
                          </div>
                        )}

                        {/* Orders */}
                        <div className="text-xs">
                          <span className="font-medium text-gray-700">Orders: </span>
                          <span className="text-gray-900">{folio.orders.length}</span>
                          {folio.orders.length > 0 && (
                            <div className="text-gray-500 mt-0.5 truncate" title={folio.orders.map(o => o.order_number).join(', ')}>
                              {folio.orders.slice(0, 2).map(o => o.order_number).join(', ')}
                              {folio.orders.length > 2 && ` +${folio.orders.length - 2}`}
                            </div>
                          )}
                        </div>

                        {/* Financial Summary */}
                        <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                          </div>
                          {totalDiscount > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Discount:</span>
                              <span className="font-medium text-green-600">-${totalDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          {folio.adjustment && (
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Tax:</span>
                              <span className="font-medium text-gray-900">${folio.adjustment.tax_amount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
                            <span className="font-semibold text-gray-900">Total:</span>
                            <span className="font-bold text-gray-900">
                              ${folio.adjustment ? folio.adjustment.final_amount.toFixed(2) : folio.total_amount.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Check-out Date */}
                        <div className="text-xs text-gray-500">
                          Check-out: {new Date(folio.booking.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-gray-200">
                          <Button
                            onClick={() => handleEditAdjustment(folio)}
                            disabled={submitting === folio.booking_id || deleting === folio.booking_id}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                          >
                            {folio.adjustment ? 'Edit' : 'Adjust'}
                          </Button>
                          <Button
                            onClick={() => handleDeleteFolio(folio)}
                            disabled={submitting === folio.booking_id || deleting === folio.booking_id}
                            variant="danger"
                            size="sm"
                            className="flex-1 text-xs"
                          >
                            {deleting === folio.booking_id ? '...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>

              {/* Desktop: Table Layout */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full bg-white border border-gray-200 rounded-lg text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Guest / Room</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Contact</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Orders</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Subtotal</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Discount</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Tax</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Final</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Status</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">Check-Out</th>
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
                        <div className="text-gray-900 text-xs font-medium">{folio.orders.length}</div>
                        {folio.orders.length > 0 && (
                          <div className="text-gray-500 text-xs mt-0.5" title={folio.orders.map(o => o.order_number).join(', ')}>
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
                      <td className="px-2 py-2 text-gray-500 text-xs">
                        {new Date(folio.booking.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => handleEditAdjustment(folio)}
                            disabled={submitting === folio.booking_id || deleting === folio.booking_id}
                            variant="outline"
                            size="sm"
                            className="px-2 py-1 text-xs h-auto"
                          >
                            {folio.adjustment ? 'Edit' : 'Adjust'}
                          </Button>
                          <Button
                            onClick={() => handleDeleteFolio(folio)}
                            disabled={submitting === folio.booking_id || deleting === folio.booking_id}
                            variant="danger"
                            size="sm"
                            className="px-2 py-1 text-xs h-auto"
                          >
                            {deleting === folio.booking_id ? '...' : 'Del'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </>
      )}

      {/* Edit Adjustment Modal */}
      {showEditModal && folioToEdit && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            if (!submitting) {
              setShowEditModal(false)
              setFolioToEdit(null)
              setEditTaxAmount('')
              setEditPosReceiptNumber('')
              setEditNotes('')
              setError('')
            }
          }}
          title={folioToEdit.adjustment ? 'Edit Folio Adjustment' : 'Create Folio Adjustment'}
        >
          <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="font-medium text-gray-700">{folioToEdit.booking.guest_name}</p>
              <p className="text-gray-600">Room {folioToEdit.booking.room_number}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtotal (Pre-tax)
              </label>
              <div className="text-lg font-semibold text-gray-900">
                ${(folioToEdit.adjustment?.subtotal_amount || folioToEdit.orders.reduce((sum, o) => sum + (o.subtotal || 0), 0)).toFixed(2)}
              </div>
            </div>

            {(() => {
              const totalDiscount = folioToEdit.orders.reduce((sum, o) => sum + (o.discount_amount || 0), 0)
              return totalDiscount > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount
                  </label>
                  <div className="text-lg font-semibold text-green-600">
                    -${totalDiscount.toFixed(2)}
                  </div>
                </div>
              ) : null
            })()}

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
                ${((folioToEdit.adjustment?.subtotal_amount || folioToEdit.total_amount) + (parseFloat(editTaxAmount) || 0)).toFixed(2)}
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
                  setShowEditModal(false)
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
                onClick={handleConfirmEdit}
                disabled={submitting === folioToEdit.booking_id || !editTaxAmount || parseFloat(editTaxAmount) < 0}
                className="flex-1"
              >
                {submitting === folioToEdit.booking_id ? 'Saving...' : folioToEdit.adjustment ? 'Update' : 'Create & Mark Paid'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

