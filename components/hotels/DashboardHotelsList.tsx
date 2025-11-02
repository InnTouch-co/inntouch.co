'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getHotels } from '@/lib/database/hotels'
import { extractTextFromJson } from '@/lib/utils/json-text'
import type { Hotel } from '@/types/database'

type HotelWithCounts = Hotel & { user_count?: number; room_count?: number }

export function DashboardHotelsList() {
  const router = useRouter()
  const [hotels, setHotels] = useState<HotelWithCounts[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHotels()
  }, [])

  const loadHotels = async () => {
    try {
      const data = await getHotels()
      // Limit to first 10 hotels
      setHotels(data.slice(0, 10))
    } catch (err) {
      console.error('Failed to load hotels:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (hotel: Hotel) => {
    router.push(`/hotels/${hotel.id}/edit`)
  }

  // Helper to get organization name for a hotel
  const getOrganizationName = (hotel: HotelWithCounts): string => {
    const siteParts = hotel.site?.split('-') || []
    if (siteParts.length >= 2) {
      return siteParts.slice(0, -1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') + ' International'
    }
    return extractTextFromJson(hotel.title) + ' Group'
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading hotels...</div>
    )
  }

  if (hotels.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No hotels found. Create one to get started.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {hotels.map((hotel) => (
        <div key={hotel.id} className="bg-white rounded-lg border border-gray-200 p-6 flex items-start justify-between hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4 flex-1">
            {/* Hotel Icon */}
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>

            {/* Hotel Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-gray-900">
                  {extractTextFromJson(hotel.title)}
                </h3>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">{getOrganizationName(hotel)}</span>
                {hotel.active ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Deactivated
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {hotel.address && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{hotel.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>{hotel.room_count || 0} Rooms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEdit(hotel)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2 font-medium transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

