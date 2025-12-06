'use client'

import { MenuCategory, MenuItem } from '@/lib/guest/types'
import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { ImageModal } from './ImageModal'

interface MenuSectionProps {
  categories: MenuCategory[]
  onAddToCart: (item: MenuItem) => void
}

const dietaryOptions = ['vegetarian', 'vegan', 'dairy-free', 'gluten-free']

export function MenuSection({ categories, onAddToCart }: MenuSectionProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(cat => cat.id))
  )
  const [selectedDietaryFilters, setSelectedDietaryFilters] = useState<Set<string>>(new Set())

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleDietaryFilter = (filter: string) => {
    const newFilters = new Set(selectedDietaryFilters)
    if (newFilters.has(filter)) {
      newFilters.delete(filter)
    } else {
      newFilters.add(filter)
    }
    setSelectedDietaryFilters(newFilters)
  }

  const filterItems = (items: MenuItem[]) => {
    if (selectedDietaryFilters.size === 0) return items
    
    return items.filter(item => {
      const itemDietary = (item.dietary || item.dietary_info || []).map(d => d.toLowerCase())
      return Array.from(selectedDietaryFilters).some(filter => 
        itemDietary.includes(filter.toLowerCase())
      )
    })
  }

  return (
    <div className="space-y-6">
      {/* Dietary Preferences Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-lg font-semibold text-white">Dietary Preferences</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {dietaryOptions.map((option) => {
            const isSelected = selectedDietaryFilters.has(option)
            return (
              <button
                key={option}
                onClick={() => toggleDietaryFilter(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-green-600 text-white border-2 border-green-500'
                    : 'bg-gray-700 text-gray-300 border-2 border-transparent hover:bg-gray-600'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>

      {/* Menu Categories */}
      {categories.map((category) => {
        const isExpanded = expandedCategories.has(category.id)
        const filteredItems = filterItems(category.items)

        // Don't show category if it has no items
        if (filteredItems.length === 0 && selectedDietaryFilters.size > 0) {
          return null
        }

        // Don't show category if original items array is empty
        if (category.items.length === 0) {
          return null
        }

        return (
          <div key={category.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-4 bg-gray-700 hover:bg-gray-600 transition-colors border-b border-gray-700"
            >
              <h3 className="text-xl font-semibold text-white">{category.name}</h3>
              {isExpanded ? (
                <ChevronUp size={24} className="text-gray-400" />
              ) : (
                <ChevronDown size={24} className="text-gray-400" />
              )}
            </button>

            {/* Category Items */}
            {isExpanded && (
              <div className="px-6 pb-6 pt-6 space-y-6">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      onAddToCart={() => onAddToCart(item)}
                    />
                  ))
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No items match the selected dietary preferences.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface MenuItemRowProps {
  item: MenuItem
  onAddToCart: () => void
}

function MenuItemRow({ item, onAddToCart }: MenuItemRowProps) {
  const [imageError, setImageError] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const imageUrl = item.image || item.photo
  const dietary = item.dietary || item.dietary_info || []

  return (
    <>
      <div className="flex gap-4 p-4 border border-gray-700 rounded-xl bg-gray-700/50">
        {/* Item Image */}
        {imageUrl && !imageError && (
          <button
            onClick={() => setIsImageModalOpen(true)}
            className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
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
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Item Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <h4 className="text-lg font-semibold text-white">{item.name}</h4>
          <span className="text-lg font-semibold text-white ml-4 flex-shrink-0">
            ${item.price.toFixed(2)}
          </span>
        </div>

        {item.description && (
          <p className="text-sm text-gray-300 mb-3">{item.description}</p>
        )}

        {/* Dietary Tags */}
        {dietary.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {dietary.map((diet, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full"
              >
                {diet}
              </span>
            ))}
          </div>
        )}

        {/* Add to Cart Button */}
        <button
          onClick={onAddToCart}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white/20 transition-all hover:scale-105 font-medium text-sm"
        >
          <Plus size={18} />
          <span>Add to Cart</span>
        </button>
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

