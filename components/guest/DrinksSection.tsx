'use client'

import { DrinkItem } from '@/lib/guest/types'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { ImageModal } from './ImageModal'

interface DrinksSectionProps {
  drinks: DrinkItem[]
  onAddToCart: (item: DrinkItem) => void
}

interface DrinkCategory {
  id: string
  name: string
  items: DrinkItem[]
}

export function DrinksSection({ drinks, onAddToCart }: DrinksSectionProps) {
  // Group drinks by category
  const categories = useMemo(() => {
    const categoryMap = new Map<string, DrinkCategory>()
    
    drinks.forEach((drink) => {
      const categoryName = drink.category || 'Other'
      const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-')
      
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          items: [],
        })
      }
      
      categoryMap.get(categoryId)!.items.push(drink)
    })
    
    return Array.from(categoryMap.values())
  }, [drinks])

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(cat => cat.id))
  )

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Drinks Categories */}
      {categories.map((category) => {
        const isExpanded = expandedCategories.has(category.id)

        // Don't show category if it has no items
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
                {category.items.map((drink) => (
                  <DrinkItemRow
                    key={drink.id}
                    drink={drink}
                    onAddToCart={() => onAddToCart(drink)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface DrinkItemRowProps {
  drink: DrinkItem
  onAddToCart: () => void
}

function DrinkItemRow({ drink, onAddToCart }: DrinkItemRowProps) {
  const [imageError, setImageError] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const imageUrl = drink.image || drink.photo

  return (
    <>
      <div className="flex gap-4 p-4 border border-gray-700 rounded-xl bg-gray-700/50">
        {/* Drink Image */}
        {imageUrl && !imageError && (
          <button
            onClick={() => setIsImageModalOpen(true)}
            className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
            aria-label={`View ${drink.name} image`}
          >
            <Image
              src={imageUrl}
              alt={drink.name}
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

      {/* Drink Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <h4 className="text-lg font-semibold text-white">{drink.name}</h4>
          <span className="text-lg font-semibold text-white ml-4 flex-shrink-0">
            ${drink.price.toFixed(2)}
          </span>
        </div>

        {drink.description && (
          <p className="text-sm text-gray-300 mb-3">{drink.description}</p>
        )}

        {/* Ingredients */}
        {drink.ingredients && drink.ingredients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {drink.ingredients.map((ingredient, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-600 text-gray-200 text-xs font-medium rounded-full"
              >
                {ingredient}
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
          alt={drink.name}
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}
    </>
  )
}

