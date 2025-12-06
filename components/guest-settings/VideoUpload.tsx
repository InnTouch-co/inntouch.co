'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Upload, X, Play, Crop } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface VideoUploadProps {
  currentVideo: string | null
  onVideoUpload: (videoUrl: string) => void
  hotelId: string
}

export function VideoUpload({ currentVideo, onVideoUpload, hotelId }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewVideo, setPreviewVideo] = useState<string | null>(currentVideo)
  const [showCrop, setShowCrop] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Update preview video when currentVideo prop changes
  useEffect(() => {
    if (currentVideo && !showCrop) {
      setPreviewVideo(currentVideo)
    }
  }, [currentVideo, showCrop])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      // User cancelled file selection
      return
    }

    // Log file selection for debugging
    logger.info('File selected:', { name: file.name, size: file.size, type: file.type })

    if (!file.type.startsWith('video/')) {
      const errorMsg = 'Please select a video file'
      logger.warn('Invalid file type selected:', file.type)
      toast.error(errorMsg, {
        duration: 4000,
      })
      // Reset input to allow selecting again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
    
    if (file.size > maxSize) {
      const errorMsg = `Video file must be less than 10MB. Your file is ${fileSizeMB}MB`
      logger.warn('File too large:', { fileSize: file.size, maxSize, fileSizeMB })
      
      // Show error toast
      toast.error(errorMsg, {
        duration: 6000,
        position: 'top-center',
      })
      
      // Also log to console as fallback
      console.error('❌', errorMsg)
      
      // Reset input to allow selecting again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Prevent any further processing
      return
    }

    // Clean up previous blob URL if exists
    if (previewVideo && previewVideo.startsWith('blob:')) {
      URL.revokeObjectURL(previewVideo)
    }

    setVideoFile(file)
    const videoUrl = URL.createObjectURL(file)
    setPreviewVideo(videoUrl)
    setShowCrop(true)
    
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Helper function to extract file path from Supabase URL
  const extractStoragePath = (url: string): string | null => {
    try {
      // URL format: https://...supabase.co/storage/v1/object/public/services/{hotelId}/videos/{fileName}
      // Or: https://...supabase.co/storage/v1/object/public/services/{path}
      const urlParts = url.split('/')
      
      // Find the index of 'services' in the URL
      const servicesIndex = urlParts.findIndex(part => part === 'services')
      if (servicesIndex === -1) {
        logger.warn('Could not find "services" in URL:', url)
        return null
      }
      
      // Get everything after 'services' - this is the storage path
      const pathParts = urlParts.slice(servicesIndex + 1)
      const storagePath = pathParts.join('/')
      
      logger.info('Extracted storage path:', { url, storagePath })
      return storagePath
    } catch (error) {
      logger.error('Error extracting storage path:', error)
      return null
    }
  }

  // Helper function to delete old video from Supabase storage
  const deleteOldVideo = async (oldVideoUrl: string | null) => {
    if (!oldVideoUrl) {
      logger.info('No old video URL provided, skipping deletion')
      return
    }

    // Skip deletion for default/placeholder videos (not in Supabase storage)
    if (oldVideoUrl.includes('pexels.com') || oldVideoUrl.includes('default') || !oldVideoUrl.includes('supabase')) {
      logger.info('Skipping deletion - video is not in Supabase storage:', oldVideoUrl)
      return
    }

    try {
      const storagePath = extractStoragePath(oldVideoUrl)
      if (!storagePath) {
        logger.warn('Could not extract storage path from URL, skipping deletion:', oldVideoUrl)
        toast.error('Could not delete old video: invalid URL format', { duration: 3000 })
        return
      }

      // Only delete if it's in the hotelId/videos folder (custom upload)
      if (storagePath.startsWith(`${hotelId}/videos/`)) {
        logger.info('Deleting old video from storage:', storagePath)
        const { error, data } = await supabase.storage
          .from('services')
          .remove([storagePath])
        
        if (error) {
          logger.error('Error deleting old video from Supabase:', error)
          toast.error(`Failed to delete old video: ${error.message}`, { duration: 4000 })
          // Don't throw - continue with upload even if deletion fails
        } else {
          logger.info('Old video deleted successfully from Supabase:', storagePath)
          toast.success('Old video deleted', { duration: 2000 })
        }
      } else {
        logger.warn('Old video is not in expected location, skipping deletion:', storagePath)
        toast.warning('Old video not in expected location, skipping deletion', { duration: 3000 })
      }
    } catch (error) {
      logger.error('Error in deleteOldVideo:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Error deleting old video: ${errorMessage}`, { duration: 4000 })
      // Don't throw - continue with upload even if deletion fails
    }
  }

  const handleCrop = async () => {
    if (!videoFile) {
      logger.warn('Cannot upload: missing videoFile')
      toast.error('No video file selected')
      return
    }

    try {
      setUploading(true)
      
      // Delete old video before uploading new one
      if (currentVideo) {
        await deleteOldVideo(currentVideo)
      }
      
      const fileExt = videoFile.name.split('.').pop()
      const fileName = `hero-video-${Date.now()}.${fileExt}`
      const filePath = `${hotelId}/videos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('services')
        .upload(filePath, videoFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        if (uploadError.message.includes('Bucket') || uploadError.message.includes('not found')) {
          throw new Error('Storage bucket "services" not found. Please check Supabase Dashboard > Storage.')
        }
        if (uploadError.message.includes('MIME type') || uploadError.message.includes('not allowed')) {
          throw new Error('Video files are not allowed in the services bucket. Please update the bucket settings in Supabase Dashboard to allow video MIME types (video/mp4, video/webm, etc.).')
        }
        throw uploadError
      }

      const { data } = supabase.storage
        .from('services')
        .getPublicUrl(filePath)

      onVideoUpload(data.publicUrl)
      setPreviewVideo(data.publicUrl)
      setShowCrop(false)
      setVideoFile(null)
      
      // Clean up object URL
      if (previewVideo && previewVideo.startsWith('blob:')) {
        URL.revokeObjectURL(previewVideo)
      }

      toast.success('Video uploaded successfully')
    } catch (error) {
      logger.error('Error uploading video:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload video'
      toast.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!currentVideo) return

    try {
      // Extract file path from URL
      // URL format: https://...supabase.co/storage/v1/object/public/services/{hotelId}/videos/{fileName}
      const urlParts = currentVideo.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${hotelId}/videos/${fileName}`

      const { error: removeError } = await supabase.storage
        .from('services')
        .remove([filePath])

      if (removeError) {
        logger.error('Error removing video:', removeError)
        throw removeError
      }

      onVideoUpload('')
      setPreviewVideo(null)
      toast.success('Video removed')
    } catch (error) {
      logger.error('Error removing video:', error)
      toast.error('Failed to remove video')
    }
  }

  return (
    <div className="space-y-3">
      {/* Hidden file input - always available */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewVideo && !showCrop && (
        <div className="relative">
          <video
            src={previewVideo}
            controls
            className="w-full max-w-md rounded-lg"
            style={{ maxHeight: '240px' }}
          />
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Upload size={14} />
              Replace Video
            </Button>
            <Button
              onClick={handleRemove}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <X size={14} />
              Remove
            </Button>
          </div>
        </div>
      )}

      {showCrop && videoFile && (
        <div className="space-y-3">
          <div className="relative">
            <video
              ref={videoRef}
              src={previewVideo || undefined}
              controls
              className="w-full max-w-md rounded-lg"
              style={{ maxHeight: '240px' }}
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2">
            <Button
              onClick={handleCrop}
              disabled={uploading}
              size="sm"
              className="flex items-center gap-2"
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </Button>
            <Button
              onClick={() => {
                setShowCrop(false)
                setVideoFile(null)
                if (previewVideo && previewVideo.startsWith('blob:')) {
                  URL.revokeObjectURL(previewVideo)
                }
                setPreviewVideo(currentVideo)
              }}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!previewVideo && !showCrop && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Upload hero video</p>
          <p className="text-xs text-gray-500 mb-3">
            Recommended: Horizontal video (16:9 aspect ratio), max 10MB
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            className="flex items-center gap-2 mx-auto"
          >
            <Upload size={14} />
            Select Video
          </Button>
        </div>
      )}
    </div>
  )
}

