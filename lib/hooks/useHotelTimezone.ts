'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

/**
 * Client-side hook to get hotel timezone
 */
export function useHotelTimezone(hotelId: string | undefined) {
  const [timezone, setTimezone] = useState<string>('America/Chicago') // Default

  useEffect(() => {
    if (!hotelId) return

    // Fetch hotel timezone from API
    fetch(`/api/hotels/${hotelId}/timezone`)
      .then(res => res.json())
      .then(data => {
        if (data.timezone) {
          setTimezone(data.timezone)
        }
      })
      .catch(() => {
        // Keep default on error
      })
  }, [hotelId])

  return timezone
}

/**
 * Get current date in hotel timezone (YYYY-MM-DD format)
 */
export function getHotelDate(hotelTimezone: string): string {
  const now = new Date()
  return now.toLocaleDateString('en-CA', { timeZone: hotelTimezone })
}

/**
 * Get current time in hotel timezone (HH:MM format)
 */
export function getHotelTime(hotelTimezone: string): string {
  const now = new Date()
  return now.toLocaleTimeString('en-US', {
    timeZone: hotelTimezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get tomorrow's date in hotel timezone (YYYY-MM-DD format)
 */
export function getHotelTomorrow(hotelTimezone: string): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString('en-CA', { timeZone: hotelTimezone })
}


