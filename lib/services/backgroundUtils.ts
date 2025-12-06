const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fhfnxyuiyionxebfomir.supabase.co'

export type ServiceType = 
  | 'restaurant' 
  | 'bar' 
  | 'spa' 
  | 'fitness' 
  | 'gym'
  | 'pool' 
  | 'laundry' 
  | 'concierge' 
  | 'roomservice' 
  | 'room_service'
  | 'additional' 
  | 'other'

export function getDefaultBackgroundUrl(serviceType: ServiceType | string | null | undefined): string {
  const type = serviceType || 'other'
  
  // Map service types to background filenames
  const backgroundMap: Record<string, string> = {
    'restaurant': 'restaraunt.png',
    'bar': 'bar.png',
    'spa': 'spa.png',
    'fitness': 'gym.png',
    'gym': 'gym.png',
    'pool': 'pool.png',
    'laundry': 'laundry.png',
    'concierge': 'concierge.png',
    'roomservice': 'room.png',
    'room_service': 'room.png',
    'additional': 'additional.png',
    'other': 'other.png',
  }
  
  const filename = backgroundMap[type] || 'other.png'
  return `${SUPABASE_URL}/storage/v1/object/public/services/backgrounds/${filename}`
}

/**
 * Converts a storage path to a public URL if needed
 * If it's already a full URL, returns it as is
 */
function convertToPublicUrl(imagePath: string): string {
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // If it's a storage path, convert to public URL
  // Remove 'services/' prefix if present since we're already specifying the bucket
  let cleanPath = imagePath
  if (cleanPath.startsWith('services/')) {
    cleanPath = cleanPath.replace('services/', '')
  }
  
  // Return public URL
  return `${SUPABASE_URL}/storage/v1/object/public/services/${cleanPath}`
}

export function getBackgroundImage(
  service: { 
    service_type?: string | null
    settings?: any
    photos?: string[] | null
  }
): string {
  // First check if there's a custom background in settings
  if (service.settings && typeof service.settings === 'object' && service.settings.background_image) {
    return convertToPublicUrl(service.settings.background_image)
  }
  
  // Then check if there's a photo that could be used as background
  if (service.photos && service.photos.length > 0) {
    return convertToPublicUrl(service.photos[0])
  }
  
  // Finally, use default background based on service type (always returns a string)
  return getDefaultBackgroundUrl(service.service_type)
}

