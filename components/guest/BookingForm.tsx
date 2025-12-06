'use client'

import { useState, useEffect } from 'react'
import { Service } from '@/lib/guest/types'
import { X } from 'lucide-react'
import { useHotelTimezone, getHotelTomorrow } from '@/lib/hooks/useHotelTimezone'

interface BookingFormProps {
  service: Service
  onClose: () => void
  onSubmit: (booking: {
    serviceName: string
    guestName: string
    roomNumber: string
    date: string
    time: string
    notes?: string
  }) => void
  defaultRoomNumber?: string
  hotelId?: string
}

export function BookingForm({ service, onClose, onSubmit, defaultRoomNumber, hotelId }: BookingFormProps) {
  const [guestName, setGuestName] = useState('')
  const [roomNumber, setRoomNumber] = useState(defaultRoomNumber || '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get hotel timezone
  const hotelTimezone = useHotelTimezone(hotelId)
  
  // Get tomorrow's date in hotel timezone as minimum date
  const minDate = getHotelTomorrow(hotelTimezone)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!guestName.trim() || !roomNumber.trim() || !date || !time || !acceptedTerms) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      onSubmit({
        serviceName: service.title,
        guestName: guestName.trim(),
        roomNumber: roomNumber.trim(),
        date,
        time,
        notes: notes.trim() || undefined,
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">Book {service.title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-2">
                Guest Name *
              </label>
              <input
                id="guestName"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Room Number *
              </label>
              <input
                id="roomNumber"
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Enter your room number"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  min={minDate}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                placeholder="Any special requests or notes..."
              />
            </div>
            
            {/* Terms Acceptance */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
                className="mt-1 w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-2 focus:ring-gray-900 cursor-pointer"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-700 cursor-pointer">
                I agree to the{' '}
                {hotelId ? (
                  <>
                    <a 
                      href={`/guest/${hotelId}/legal/terms-of-service${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-900 transition-colors"
                    >
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a 
                      href={`/guest/${hotelId}/legal/privacy-policy${roomNumber ? `?room=${encodeURIComponent(roomNumber)}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-900 transition-colors"
                    >
                      Privacy Policy
                    </a>
                  </>
                ) : (
                  <>
                    <a 
                      href="/terms-of-service"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-900 transition-colors"
                    >
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a 
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-gray-900 transition-colors"
                    >
                      Privacy Policy
                    </a>
                  </>
                )}
                {' '}*
              </label>
            </div>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !guestName.trim() || !roomNumber.trim() || !date || !time || !acceptedTerms}
                className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

