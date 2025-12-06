'use client'

import { useState, useEffect, useRef } from 'react'
import { extractTextFromJson } from '@/lib/utils/json-text'
import type { Hotel } from '@/types/database'
import { X, ChevronDown, Building2, MapPin, Phone, Mail } from 'lucide-react'

interface SearchableHotelSelectorProps {
  hotels: (Hotel & { user_count?: number; room_count?: number | null })[]
  selectedHotelId: string
  onSelect: (hotelId: string) => void
}

export function SearchableHotelSelector({
  hotels,
  selectedHotelId,
  onSelect,
}: SearchableHotelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedHotel = hotels.find(h => h.id === selectedHotelId)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredHotels = hotels.filter(hotel => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    const hotelName = extractTextFromJson(hotel.title).toLowerCase()
    const hotelAddress = (hotel.address || '').toLowerCase()
    const hotelEmail = (hotel.email || '').toLowerCase()
    const hotelPhone = (hotel.phone || '').toLowerCase()
    const hotelSite = (hotel.site || '').toLowerCase()
    
    return (
      hotelName.includes(query) ||
      hotelAddress.includes(query) ||
      hotelEmail.includes(query) ||
      hotelPhone.includes(query) ||
      hotelSite.includes(query)
    )
  })

  const handleSelect = (hotelId: string) => {
    onSelect(hotelId)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Hotel
      </label>
      
      {/* Selected Hotel Display / Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : (selectedHotel ? extractTextFromJson(selectedHotel.title) : '')}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search hotels by name, address, email, phone..."
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen)
            if (!isOpen) {
              setSearchQuery('')
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
        >
          {isOpen ? <X size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Selected Hotel Info (when not searching) */}
      {selectedHotel && !isOpen && (
        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 size={20} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">
                {extractTextFromJson(selectedHotel.title)}
              </h3>
              <div className="space-y-1 text-sm text-gray-600">
                {selectedHotel.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{selectedHotel.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 flex-wrap">
                  {selectedHotel.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-gray-400 flex-shrink-0" />
                      <span>{selectedHotel.phone}</span>
                    </div>
                  )}
                  {selectedHotel.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{selectedHotel.email}</span>
                    </div>
                  )}
                </div>
                {selectedHotel.site && (
                  <div className="text-xs text-gray-500 mt-1">
                    Site: {selectedHotel.site}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onSelect('')
                setSearchQuery('')
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Clear selection"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto"
        >
          {filteredHotels.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">
              No hotels found matching "{searchQuery}"
            </div>
          ) : (
            <div className="py-2">
              {filteredHotels.map(hotel => {
                const isSelected = selectedHotelId === hotel.id
                const hotelName = extractTextFromJson(hotel.title)
                
                return (
                  <button
                    key={hotel.id}
                    type="button"
                    onClick={() => handleSelect(hotel.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Building2 size={18} className={isSelected ? 'text-blue-600' : 'text-gray-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {hotelName}
                          </h4>
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          {hotel.address && (
                            <div className="flex items-center gap-2">
                              <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                              <span className="truncate">{hotel.address}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-4 flex-wrap">
                            {hotel.phone && (
                              <div className="flex items-center gap-2">
                                <Phone size={12} className="text-gray-400 flex-shrink-0" />
                                <span>{hotel.phone}</span>
                              </div>
                            )}
                            {hotel.email && (
                              <div className="flex items-center gap-2">
                                <Mail size={12} className="text-gray-400 flex-shrink-0" />
                                <span className="truncate">{hotel.email}</span>
                              </div>
                            )}
                          </div>
                          {hotel.site && (
                            <div className="text-gray-500">
                              Site: {hotel.site}
                            </div>
                          )}
                          {(hotel.room_count !== undefined || hotel.user_count !== undefined) && (
                            <div className="flex items-center gap-3 text-gray-500 pt-1">
                              {hotel.room_count !== undefined && (
                                <span>{hotel.room_count} room{hotel.room_count !== 1 ? 's' : ''}</span>
                              )}
                              {hotel.user_count !== undefined && (
                                <span>{hotel.user_count} user{hotel.user_count !== 1 ? 's' : ''}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

