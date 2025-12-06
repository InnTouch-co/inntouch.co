'use client'

import { Card } from '@/components/ui/Card'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  photo?: string
  category?: string
  cooking_instructions?: string
  ingredients?: string
  dietary_info?: string[]
  allergens?: string[]
  preparation_time?: number
  calories?: number
  spice_level?: string
}

interface MenuItemCardProps {
  item: MenuItem
  onEdit: (item: MenuItem) => void
  onRemove: (id: string) => void
}

export function MenuItemCard({ item, onEdit, onRemove }: MenuItemCardProps) {
  const getSpiceIcon = (level?: string) => {
    if (!level || level === 'None') return null
    const count = { 'Mild': 1, 'Medium': 2, 'Hot': 3, 'Extra Hot': 4 }[level] || 0
    return Array(count).fill('🌶️').join('')
  }

  return (
    <Card className="overflow-hidden bg-white border-gray-200 hover:shadow-lg transition-shadow group">
      {/* Compact Image - Square */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {item.photo ? (
          <img
            src={item.photo}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="w-7 h-7 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
            title="Edit"
          >
            <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="w-7 h-7 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        {item.category && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 bg-white text-gray-900 text-xs font-semibold rounded shadow-sm">
              {item.category}
            </span>
          </div>
        )}
      </div>

      {/* Compact Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">{item.name}</h3>
          <span className="text-blue-600 flex items-center gap-0.5 text-sm font-semibold shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {item.price.toFixed(2)}
          </span>
        </div>

        <p className="text-gray-600 text-xs mb-2 line-clamp-2">
          {item.description}
        </p>

        {/* Compact Info Row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {item.preparation_time || 0}m
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            {item.calories || 0}cal
          </div>
          {getSpiceIcon(item.spice_level) && (
            <div className="text-xs">
              {getSpiceIcon(item.spice_level)}
            </div>
          )}
        </div>

        {/* Compact Dietary Tags */}
        {item.dietary_info && item.dietary_info.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.dietary_info.slice(0, 2).map(diet => (
              <span
                key={diet}
                className="px-1.5 py-0 text-xs border border-green-300 text-green-700 bg-green-50 rounded-full flex items-center gap-0.5"
              >
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {diet}
              </span>
            ))}
            {item.dietary_info.length > 2 && (
              <span className="px-1.5 py-0 text-xs border border-gray-300 text-gray-600 rounded-full">
                +{item.dietary_info.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
