/**
 * Format timestamps in hotel timezone for display
 */

/**
 * Parse a timestamp string or Date object to a Date, ensuring UTC handling
 * @param timestamp - ISO timestamp string or Date object
 * @returns Date object in UTC
 */
export function parseTimestampAsUTC(timestamp: string | Date | null | undefined): Date {
  const now = new Date()
  
  if (!timestamp) {
    return now
  }
  
  if (timestamp instanceof Date) {
    return timestamp
  }
  
  try {
    let timestampStr = String(timestamp).trim()
    
    if (!timestampStr) {
      return now
    }
    
    // Replace space with 'T' if it's in format "YYYY-MM-DD HH:MM:SS"
    if (timestampStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
      timestampStr = timestampStr.replace(' ', 'T')
    }
    
    // If timestamp doesn't have timezone, assume it's UTC and add Z
    if (!timestampStr.endsWith('Z') && !timestampStr.match(/[+-]\d{2}:\d{2}$/)) {
      // If it has 'T' (ISO format), add Z for UTC
      if (timestampStr.includes('T')) {
        timestampStr = timestampStr + 'Z'
      } else if (timestampStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // If it's just a date, add time component
        timestampStr = timestampStr + 'T00:00:00Z'
      } else {
        // Try to parse as-is, might already be valid
        const testDate = new Date(timestampStr)
        if (!isNaN(testDate.getTime())) {
          return testDate
        }
        // If parsing fails, add Z and try again
        timestampStr = timestampStr + 'Z'
      }
    }
    
    const parsed = new Date(timestampStr)
    
    // Validate date
    if (isNaN(parsed.getTime())) {
      console.warn('Invalid timestamp, using current time:', timestamp, 'Parsed string:', timestampStr)
      return now
    }
    
    return parsed
  } catch (error) {
    console.warn('Error parsing timestamp, using current time:', error, 'timestamp:', timestamp)
    return now
  }
}

/**
 * Format a timestamp string to display in hotel timezone
 * @param timestamp - ISO timestamp string (e.g., "2025-11-17T22:27:02Z")
 * @param hotelTimezone - IANA timezone identifier (e.g., "America/Chicago")
 * @param format - Format type ('datetime', 'date', 'time', 'short')
 */
export function formatTimestampInHotelTimezone(
  timestamp: string | Date,
  hotelTimezone: string,
  format: 'datetime' | 'date' | 'time' | 'short' = 'datetime'
): string {
  // Ensure timestamp is treated as UTC if it's a string without timezone info
  let date: Date
  if (typeof timestamp === 'string') {
    // If timestamp doesn't end with Z or have timezone offset, assume it's UTC
    const timestampStr = timestamp.trim()
    if (!timestampStr.endsWith('Z') && !timestampStr.match(/[+-]\d{2}:\d{2}$/)) {
      // Add Z to indicate UTC
      date = new Date(timestampStr + (timestampStr.includes('T') ? 'Z' : ''))
    } else {
      date = new Date(timestampStr)
    }
  } else {
    date = timestamp
  }
  
  if (isNaN(date.getTime())) {
    return 'Invalid date'
  }
  
  switch (format) {
    case 'datetime':
      return date.toLocaleString('en-US', {
        timeZone: hotelTimezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    case 'date':
      return date.toLocaleDateString('en-US', {
        timeZone: hotelTimezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    case 'time':
      return date.toLocaleTimeString('en-US', {
        timeZone: hotelTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    case 'short':
      return date.toLocaleString('en-US', {
        timeZone: hotelTimezone,
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    default:
      return date.toLocaleString('en-US', { timeZone: hotelTimezone })
  }
}

/**
 * Format a timestamp for display (client-side hook version)
 * Uses hotel timezone from hook
 */
export function formatTimestamp(
  timestamp: string | Date,
  hotelTimezone: string,
  options?: {
    format?: 'datetime' | 'date' | 'time' | 'short'
    includeTimezone?: boolean
  }
): string {
  const format = options?.format || 'datetime'
  const includeTimezone = options?.includeTimezone || false
  
  let formatted = formatTimestampInHotelTimezone(timestamp, hotelTimezone, format)
  
  if (includeTimezone) {
    // Extract timezone abbreviation (e.g., "CST", "EST")
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    const timeZoneName = new Intl.DateTimeFormat('en-US', {
      timeZone: hotelTimezone,
      timeZoneName: 'short'
    }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value || ''
    
    formatted = `${formatted} ${timeZoneName}`
  }
  
  return formatted
}
