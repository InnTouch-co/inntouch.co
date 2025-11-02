'use client'

import { useState, useRef, useEffect } from 'react'
import { extractTextFromJson } from '@/lib/utils/json-text'

interface Hotel {
  id: string
  title: any
  address?: string | null
}

interface SearchableHotelSelectorProps {
  hotels: Hotel[]
  selectedHotelIds: string[]
  onSelectionChange: (hotelIds: string[]) => void
}

export function SearchableHotelSelector({ 
  hotels, 
  selectedHotelIds, 
  onSelectionChange 
}: SearchableHotelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredHotels = hotels.filter(hotel => {
    const hotelName = extractTextFromJson(hotel.title).toLowerCase()
    const hotelAddress = (hotel.address || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return hotelName.includes(query) || hotelAddress.includes(query)
  })

  const selectedHotels = hotels.filter(h => selectedHotelIds.includes(h.id))

  const toggleHotel = (hotelId: string) => {
    if (selectedHotelIds.includes(hotelId)) {
      onSelectionChange(selectedHotelIds.filter(id => id !== hotelId))
    } else {
      onSelectionChange([...selectedHotelIds, hotelId])
    }
  }

  const removeHotel = (hotelId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectionChange(selectedHotelIds.filter(id => id !== hotelId))
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Assign to Hotels
      </label>
      
      {/* Selected Hotels Display */}
      {selectedHotels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 border border-gray-200 rounded-lg min-h-[40px]">
          {selectedHotels.map(hotel => (
            <span
              key={hotel.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
            >
              {extractTextFromJson(hotel.title)}
              <button
                type="button"
                onClick={(e) => removeHotel(hotel.id, e)}
                className="text-blue-600 hover:text-blue-900 ml-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search hotels by name or address..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredHotels.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No hotels found
              </div>
            ) : (
              filteredHotels.map(hotel => {
                const isSelected = selectedHotelIds.includes(hotel.id)
                return (
                  <div
                    key={hotel.id}
                    onClick={() => {
                      toggleHotel(hotel.id)
                      setSearchQuery('')
                    }}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="font-medium text-gray-900">
                            {extractTextFromJson(hotel.title)}
                          </div>
                        </div>
                        {hotel.address && (
                          <div className="ml-6 text-sm text-gray-500 mt-1">
                            {hotel.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
      
      <p className="mt-1 text-xs text-gray-500">
        Search and select hotels to assign this user to.
      </p>
    </div>
  )
}


