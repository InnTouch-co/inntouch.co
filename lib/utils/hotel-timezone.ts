/**
 * Hotel timezone utility functions
 * Handles date/time conversion and formatting based on hotel's timezone
 */

import { getHotelById } from '@/lib/database/hotels'

/**
 * Get hotel timezone (defaults to 'America/Chicago' if not set)
 */
export async function getHotelTimezone(hotelId: string): Promise<string> {
  try {
    const hotel = await getHotelById(hotelId)
    return (hotel as any).timezone || 'America/Chicago'
  } catch (error) {
    // Default to Central Time if hotel not found
    return 'America/Chicago'
  }
}

/**
 * Convert a date to hotel timezone
 * @param date - Date to convert (can be Date object, ISO string, or date string)
 * @param hotelId - Hotel ID
 * @returns Date object in hotel timezone
 */
export async function convertToHotelTimezone(
  date: Date | string,
  hotelId: string
): Promise<Date> {
  const timezone = await getHotelTimezone(hotelId)
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Get date/time string in hotel timezone
  const dateStr = dateObj.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Parse the formatted string back to Date (this creates a date in local timezone)
  // We need to create a date that represents the same moment in hotel timezone
  const [datePart, timePart] = dateStr.split(', ')
  const [month, day, year] = datePart.split('/')
  const [hour, minute, second] = timePart.split(':')
  
  // Create date string in ISO format
  const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`
  
  // Return as Date object (this will be interpreted in local timezone, but represents hotel time)
  return new Date(isoString)
}

/**
 * Get current date in hotel timezone (YYYY-MM-DD format)
 */
export async function getHotelCurrentDate(hotelId: string): Promise<string> {
  const timezone = await getHotelTimezone(hotelId)
  const now = new Date()
  
  return now.toLocaleDateString('en-CA', { timeZone: timezone }) // en-CA gives YYYY-MM-DD format
}

/**
 * Get current time in hotel timezone (HH:MM format)
 */
export async function getHotelCurrentTime(hotelId: string): Promise<string> {
  const timezone = await getHotelTimezone(hotelId)
  const now = new Date()
  
  return now.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get current date and time in hotel timezone
 * @returns Object with date (YYYY-MM-DD) and time (HH:MM) strings
 */
export async function getHotelCurrentDateTime(hotelId: string): Promise<{
  date: string
  time: string
  datetime: Date
}> {
  const timezone = await getHotelTimezone(hotelId)
  const now = new Date()
  
  const date = now.toLocaleDateString('en-CA', { timeZone: timezone })
  const time = now.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
  
  // Get full datetime string in hotel timezone
  const datetimeStr = now.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Parse to create a Date object representing hotel timezone
  const [datePart, timePart] = datetimeStr.split(', ')
  const [month, day, year] = datePart.split('/')
  const [hour, minute, second] = timePart.split(':')
  const datetime = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
  
  return { date, time, datetime }
}

/**
 * Format a date for display in hotel timezone
 * @param date - Date to format
 * @param hotelId - Hotel ID
 * @param format - Format type ('date', 'time', 'datetime', 'iso')
 */
export async function formatDateForHotel(
  date: Date | string,
  hotelId: string,
  format: 'date' | 'time' | 'datetime' | 'iso' = 'datetime'
): Promise<string> {
  const timezone = await getHotelTimezone(hotelId)
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  switch (format) {
    case 'date':
      return dateObj.toLocaleDateString('en-CA', { timeZone: timezone }) // YYYY-MM-DD
    case 'time':
      return dateObj.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }) // HH:MM
    case 'datetime':
      return dateObj.toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    case 'iso':
      // Return ISO string adjusted for hotel timezone
      const dateStr = dateObj.toLocaleDateString('en-CA', { timeZone: timezone })
      const timeStr = dateObj.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
      return `${dateStr}T${timeStr}`
    default:
      return dateObj.toISOString()
  }
}

/**
 * Convert a date string (YYYY-MM-DD) from hotel timezone to UTC for database storage
 * This ensures dates are stored consistently regardless of server timezone
 */
export async function convertHotelDateToUTC(
  dateString: string,
  hotelId: string
): Promise<string> {
  const timezone = await getHotelTimezone(hotelId)
  
  // Create a date object assuming the date string is in hotel timezone
  // We'll use a trick: create date at noon in hotel timezone, then convert to UTC
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Create date string with time component in hotel timezone
  const dateTimeStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T12:00:00`
  
  // Use Intl.DateTimeFormat to get the UTC equivalent
  const tempDate = new Date(dateTimeStr)
  const utcDate = new Date(tempDate.toLocaleString('en-US', { timeZone: 'UTC' }))
  const hotelDate = new Date(tempDate.toLocaleString('en-US', { timeZone: timezone }))
  
  // Calculate offset
  const offset = hotelDate.getTime() - utcDate.getTime()
  const adjustedDate = new Date(tempDate.getTime() - offset)
  
  // Return just the date part (YYYY-MM-DD)
  return adjustedDate.toISOString().split('T')[0]
}

/**
 * Convert a time string (HH:MM) from hotel timezone to UTC
 * Note: This is complex because time alone doesn't have date context
 * For time-only values, we'll store them as-is and handle conversion during comparison
 */
export async function convertHotelTimeToUTC(
  timeString: string,
  hotelId: string,
  referenceDate: string = new Date().toISOString().split('T')[0]
): Promise<string> {
  const timezone = await getHotelTimezone(hotelId)
  const [hour, minute] = timeString.split(':').map(Number)
  
  // Create a date with the time in hotel timezone
  const dateTimeStr = `${referenceDate}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
  
  // Parse as if it's in hotel timezone and get UTC equivalent
  // This is a simplified approach - for production, consider using a library like date-fns-tz
  const tempDate = new Date(dateTimeStr)
  
  // Get what this time represents in UTC
  const utcTime = tempDate.toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
  
  return utcTime
}

/**
 * Check if a date/time is within hotel's current time
 * Useful for promotion time validation
 */
export async function isWithinHotelTimeRange(
  startTime: string,
  endTime: string,
  hotelId: string
): Promise<boolean> {
  const { time } = await getHotelCurrentDateTime(hotelId)
  return time >= startTime && time <= endTime
}

/**
 * Get current day of week in hotel timezone (0 = Sunday, 6 = Saturday)
 */
export async function getHotelCurrentDayOfWeek(hotelId: string): Promise<number> {
  const timezone = await getHotelTimezone(hotelId)
  const now = new Date()
  
  // Get date string in hotel timezone
  const hotelDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone })
  const [year, month, day] = hotelDateStr.split('-').map(Number)
  
  // Create a date object with the hotel's date at noon (to avoid timezone issues)
  const hotelDate = new Date(year, month - 1, day, 12, 0, 0)
  
  return hotelDate.getDay()
}

/**
 * Get common timezone options for dropdown
 */
export const COMMON_TIMEZONES = [
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'UTC', label: 'UTC' },
]

