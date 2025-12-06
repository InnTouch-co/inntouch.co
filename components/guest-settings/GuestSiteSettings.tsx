'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import type { Hotel, Service } from '@/types/database'
import { extractTextFromJson } from '@/lib/utils/json-text'
import { ExternalLink, GripVertical, Upload, X, Save } from 'lucide-react'
import { VideoUpload } from './VideoUpload'
import { LogoUpload } from './LogoUpload'
import { ServiceReorder } from './ServiceReorder'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface GuestSiteSettingsProps {
  hotel: Hotel
  services: Service[]
  onSaveSettings: (settings: any) => Promise<void>
  onReorderServices: (services: Service[]) => Promise<void>
}

export function GuestSiteSettings({
  hotel,
  services,
  onSaveSettings,
  onReorderServices,
}: GuestSiteSettingsProps) {
  const [activeTab, setActiveTab] = useState<'hero' | 'services'>('hero')
  const [heroVideo, setHeroVideo] = useState<string | null>(
    (hotel as any).guest_settings?.hero_video || null
  )
  const [heroLogo, setHeroLogo] = useState<string | null>(
    (hotel as any).guest_settings?.hero_logo || null
  )
  const [adminLogo, setAdminLogo] = useState<string | null>(
    (hotel as any).guest_settings?.admin_logo || null
  )
  const [isSaving, setIsSaving] = useState(false)

  const hotelName = extractTextFromJson(hotel.title) || 'Hotel'
  const guestSiteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/guest/${hotel.id}`
    : ''

  const handleVideoUpload = (videoUrl: string) => {
    setHeroVideo(videoUrl)
  }

  const handleLogoUpload = (logoUrl: string) => {
    setHeroLogo(logoUrl)
  }

  const handleAdminLogoUpload = (logoUrl: string) => {
    setAdminLogo(logoUrl)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const settings = {
        guest_settings: {
          hero_video: heroVideo,
          hero_logo: heroLogo,
          admin_logo: adminLogo,
        }
      }
      await onSaveSettings(settings)
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
      logger.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenGuestSite = () => {
    if (guestSiteUrl) {
      window.open(guestSiteUrl, '_blank')
    }
  }

  const handleOpenQRCodePage = () => {
    // Navigate to rooms page with QR code view
    if (typeof window !== 'undefined') {
      window.location.href = '/rooms'
    }
  }

  return (
    <div className="w-full">
      <div className="w-full">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Guest Site Settings</h1>
            <p className="text-sm text-gray-600 mt-1">Configure your hotel's guest-facing website</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenGuestSite}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <ExternalLink size={14} />
              View Site
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="flex items-center gap-2"
            >
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveTab('hero')}
              className={`py-2 px-1 border-b-2 font-medium text-xs ${
                activeTab === 'hero'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Hero Section
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`py-2 px-1 border-b-2 font-medium text-xs ${
                activeTab === 'services'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Service Order
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'hero' && (
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Logos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Guest Site Logo</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Upload your hotel logo to display in the hero section. Recommended: PNG or SVG with transparent background.
                  </p>
                  <LogoUpload
                    currentLogo={heroLogo}
                    onLogoUpload={handleLogoUpload}
                    hotelId={hotel.id}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Admin Panel Logo</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Upload your hotel logo to display in the admin panel side menu. Recommended: PNG or SVG with transparent background.
                  </p>
                  <LogoUpload
                    currentLogo={adminLogo}
                    onLogoUpload={handleAdminLogoUpload}
                    hotelId={hotel.id}
                  />
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-2">Hero Video</h2>
              <p className="text-sm text-gray-600 mb-4">
                Upload a horizontal video for the hero section. Recommended aspect ratio: 16:9
              </p>
              <VideoUpload
                currentVideo={heroVideo}
                onVideoUpload={handleVideoUpload}
                hotelId={hotel.id}
              />
            </Card>
          </div>
        )}

        {activeTab === 'services' && (
          <Card className="p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Service Order</h2>
            <ServiceReorder
              services={services}
              onReorder={onReorderServices}
            />
          </Card>
        )}
      </div>
    </div>
  )
}

