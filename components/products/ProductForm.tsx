'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { extractTextFromJson, textToJson } from '@/lib/utils/json-text'
import type { Product, ProductInsert } from '@/types/database'

interface ProductFormProps {
  product?: Product
  onSubmit: (product: ProductInsert | Partial<ProductInsert>) => Promise<void>
  onCancel: () => void
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    title: product?.title ? extractTextFromJson(product.title) : '',
    descr: product?.descr || '',
    price: product?.price?.toString() || '0',
    image: product?.image || '',
    sort: product?.sort?.toString() || '100',
    active: product?.active ?? 1,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (!formData.title.trim()) {
        throw new Error('Title is required')
      }
      if (!formData.image.trim()) {
        throw new Error('Image URL is required')
      }

      await onSubmit({
        title: textToJson(formData.title),
        descr: formData.descr || null,
        price: parseFloat(formData.price),
        image: formData.image,
        sort: parseInt(formData.sort),
        active: formData.active,
        ext_data: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      
      <Input
        label="Product Name"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Enter product name"
        required
      />

      <Input
        label="Description"
        value={formData.descr}
        onChange={(e) => setFormData({ ...formData, descr: e.target.value })}
      />

      <Input
        label="Price"
        type="number"
        step="0.01"
        value={formData.price}
        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        required
      />

      <Input
        label="Image URL"
        value={formData.image}
        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
        required
      />

      <Input
        label="Sort Order"
        type="number"
        value={formData.sort}
        onChange={(e) => setFormData({ ...formData, sort: e.target.value })}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Active
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formData.active}
          onChange={(e) => setFormData({ ...formData, active: Number(e.target.value) })}
        >
          <option value={1}>Active</option>
          <option value={0}>Inactive</option>
        </select>
      </div>


      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : product ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

