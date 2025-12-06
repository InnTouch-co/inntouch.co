'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { Service } from '@/types/database'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { GripVertical, Save } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface ServiceReorderProps {
  services: Service[]
  onReorder: (services: Service[]) => Promise<void>
}

export function ServiceReorder({ services, onReorder }: ServiceReorderProps) {
  const [orderedServices, setOrderedServices] = useState<Service[]>(
    [...services].sort((a, b) => {
      const orderA = a.display_order ?? 999
      const orderB = b.display_order ?? 999
      return orderA - orderB
    })
  )
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    if (draggedIndex !== index) {
      const newServices = [...orderedServices]
      const draggedService = newServices[draggedIndex]
      newServices.splice(draggedIndex, 1)
      newServices.splice(index, 0, draggedService)
      setOrderedServices(newServices)
      setDraggedIndex(index)
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await onReorder(orderedServices)
      toast.success('Service order saved successfully')
    } catch (error) {
      toast.error('Failed to save service order')
      logger.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const getServiceTitle = (service: Service) => {
    return extractTextFromJson(service.title) || service.service_type || 'Untitled Service'
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {orderedServices.map((service, index) => (
          <div
            key={service.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 p-3 bg-white border-2 rounded-lg cursor-move transition-all ${
              draggedIndex === index
                ? 'border-blue-500 bg-blue-50 opacity-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <GripVertical className="text-gray-400 w-4 h-4 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{getServiceTitle(service)}</div>
            </div>
            <div className="text-xs text-gray-400">#{index + 1}</div>
          </div>
        ))}
      </div>

      {orderedServices.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500">
          <p>No services available to reorder</p>
        </div>
      )}

      <div className="flex justify-end pt-3">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="flex items-center gap-2"
        >
          <Save size={14} />
          {isSaving ? 'Saving...' : 'Save Order'}
        </Button>
      </div>
    </div>
  )
}

