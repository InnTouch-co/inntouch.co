'use client'

import { MenuItem, DrinkItem } from '@/lib/guest/types'
import { Plus } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { ImageModal } from './ImageModal'

interface MenuItemCardProps {
  item: MenuItem | DrinkItem
  onAddToCart: () => void
}

export function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const imageUrl = (item as any).image || (item as any).photo
  
  return (
    <>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
        {imageUrl && !imageError && (
          <button
            onClick={() => setIsImageModalOpen(true)}
            className="relative h-48 w-full cursor-pointer hover:opacity-90 transition-opacity group"
            aria-label={`View ${item.name} image`}
          >
            <Image
              src={imageUrl}
              alt={item.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized
            />
            {/* Overlay hint */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </div>
          </button>
        )}
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-gray-300 line-clamp-2">{item.description}</p>
            )}
          </div>
        </div>
        
        {(() => {
          const menuItem = item as MenuItem
          const dietary = menuItem.dietary
          return dietary && Array.isArray(dietary) && dietary.length > 0
        })() && (
          <div className="flex flex-wrap gap-1 mb-3">
            {((item as MenuItem).dietary || []).map((diet, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-green-900 text-green-300 text-xs rounded-full"
              >
                {diet}
              </span>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-white">
            ${item.price.toFixed(2)}
          </span>
          <button
            onClick={onAddToCart}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Plus size={18} />
            <span className="text-sm font-medium">Add</span>
          </button>
        </div>
      </div>
    </div>

      {/* Image Modal */}
      {imageUrl && (
        <ImageModal
          imageUrl={imageUrl}
          alt={item.name}
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}
    </>
  )
}

