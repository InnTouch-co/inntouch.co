'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface LogoUploadProps {
  currentLogo: string | null
  onLogoUpload: (logoUrl: string) => void
  hotelId: string
}

export function LogoUpload({ currentLogo, onLogoUpload, hotelId }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewLogo, setPreviewLogo] = useState<string | null>(currentLogo)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update preview logo when currentLogo prop changes
  useEffect(() => {
    if (currentLogo && !uploading) {
      setPreviewLogo(currentLogo)
    }
  }, [currentLogo, uploading])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file must be less than 5MB')
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Show preview
    const logoUrl = URL.createObjectURL(file)
    setPreviewLogo(logoUrl)
    
    // Upload immediately
    handleUpload(file)
    
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      
      // Delete old logo if it exists
      if (currentLogo) {
        try {
          // Extract file path from URL
          // URL format: https://...supabase.co/storage/v1/object/public/services/{hotelId}/logos/{fileName}
          const urlParts = currentLogo.split('/')
          const fileName = urlParts[urlParts.length - 1]
          const oldFilePath = `${hotelId}/logos/${fileName}`

          const { error: removeError } = await supabase.storage
            .from('services')
            .remove([oldFilePath])

          if (removeError) {
            // Log but don't fail if old file doesn't exist
            logger.warn('Could not remove old logo:', removeError)
          }
        } catch (error) {
          // Log but don't fail if old file deletion fails
          logger.warn('Error removing old logo:', error)
        }
      }
      
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `${hotelId}/logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('services')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        if (uploadError.message.includes('Bucket') || uploadError.message.includes('not found')) {
          throw new Error('Storage bucket "services" not found. Please check Supabase Dashboard > Storage.')
        }
        throw uploadError
      }

      const { data } = supabase.storage
        .from('services')
        .getPublicUrl(filePath)

      onLogoUpload(data.publicUrl)
      setPreviewLogo(data.publicUrl)
      
      // Clean up object URL
      if (previewLogo && previewLogo.startsWith('blob:')) {
        URL.revokeObjectURL(previewLogo)
      }

      toast.success('Logo uploaded successfully')
    } catch (error) {
      logger.error('Error uploading logo:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload logo'
      toast.error(errorMessage)
      // Revert preview on error
      setPreviewLogo(currentLogo)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!currentLogo) return

    try {
      // Extract file path from URL
      // URL format: https://...supabase.co/storage/v1/object/public/services/{hotelId}/logos/{fileName}
      const urlParts = currentLogo.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${hotelId}/logos/${fileName}`

      const { error: removeError } = await supabase.storage
        .from('services')
        .remove([filePath])

      if (removeError) {
        logger.error('Error removing logo:', removeError)
        throw removeError
      }

      onLogoUpload('')
      setPreviewLogo(null)
      toast.success('Logo removed')
    } catch (error) {
      logger.error('Error removing logo:', error)
      toast.error('Failed to remove logo')
    }
  }

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewLogo && (
        <div className="relative">
          <div className="inline-block p-4 bg-gray-300 rounded-lg border border-gray-400">
            <img
              src={previewLogo}
              alt="Hotel Logo"
              className="max-h-32 max-w-xs object-contain"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              disabled={uploading}
              className="flex items-center gap-2"
            >
              <Upload size={14} />
              {uploading ? 'Uploading...' : 'Replace Logo'}
            </Button>
            <Button
              onClick={handleRemove}
              variant="outline"
              size="sm"
              disabled={uploading}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <X size={14} />
              Remove
            </Button>
          </div>
        </div>
      )}

      {!previewLogo && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Upload hotel logo</p>
          <p className="text-xs text-gray-500 mb-3">
            Recommended: PNG or SVG with transparent background, max 5MB
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            disabled={uploading}
            className="flex items-center gap-2 mx-auto"
          >
            <Upload size={14} />
            {uploading ? 'Uploading...' : 'Select Logo'}
          </Button>
        </div>
      )}
    </div>
  )
}

