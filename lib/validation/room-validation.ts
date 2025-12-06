import {
  getRoomByNumber,
  getActiveBookingForRoom,
  validateRoomExists,
} from '@/lib/database/room-validation'
import type { ValidationResult, RoomValidationResult, ActiveBooking } from './types'

/**
 * Validate room exists and is available
 */
export async function validateRoom(roomNumber: string, hotelId: string): Promise<RoomValidationResult> {
  return await validateRoomExists(roomNumber, hotelId)
}

/**
 * Validate checkout time hasn't passed
 * Default checkout time is 11:00 AM
 */
export function validateCheckoutTime(booking: ActiveBooking | null, checkoutTime: string = '11:00'): boolean {
  if (!booking) {
    return false
  }

  const today = new Date().toISOString().split('T')[0]
  const currentTime = new Date().toTimeString().slice(0, 5) // HH:MM format

  // If checkout date is in the future, it's valid
  if (booking.check_out_date > today) {
    return true
  }

  // If checkout date is today, check if current time is before checkout time
  if (booking.check_out_date === today) {
    return currentTime < checkoutTime
  }

  // Checkout date is in the past
  return false
}

/**
 * Complete room validation for order placement
 * Checks:
 * 1. Room exists
 * 2. Room is not in maintenance
 * 3. Room has active booking
 * 4. Checkout time hasn't passed
 * 5. Guest phone matches booking (if provided)
 */
export async function validateRoomForOrder(
  roomNumber: string,
  hotelId: string,
  guestName?: string,
  guestPhone?: string
): Promise<ValidationResult> {
  // Step 1: Validate room exists
  const roomValidation = await validateRoom(roomNumber, hotelId)
  
  if (!roomValidation.exists) {
    return {
      valid: false,
      reason: roomValidation.reason || 'Room not found',
      room: null,
      booking: null,
    }
  }

  if (roomValidation.reason === 'Room is in maintenance') {
    return {
      valid: false,
      reason: 'Room is in maintenance and unavailable',
      room: roomValidation.room,
      booking: null,
    }
  }

  // Check if room status is occupied (required for orders)
  if (roomValidation.room && roomValidation.room.status !== 'occupied') {
    return {
      valid: false,
      reason: `Room ${roomNumber} is ${roomValidation.room.status}. Only occupied rooms can accept orders. Please check in first.`,
      room: roomValidation.room,
      booking: null,
    }
  }

  // Step 2: Get active booking
  const booking = await getActiveBookingForRoom(roomNumber, hotelId)
  
  if (!booking) {
    return {
      valid: false,
      reason: 'Room is not currently checked in',
      room: roomValidation.room,
      booking: null,
    }
  }

  // Step 3: Validate checkout time
  // Note: We check checkout date, but not checkout time, because:
  // 1. Booking status ('checked_in') is the source of truth
  // 2. Guests may still be in the room and want to order even after checkout time
  // 3. The room status should be updated when checkout is actually processed
  const today = new Date().toISOString().split('T')[0]
  if (booking.check_out_date < today) {
    // Checkout date is in the past - booking is no longer active
    return {
      valid: false,
      reason: 'Room has been checked out',
      room: roomValidation.room,
      booking,
    }
  }

  // Step 4: Validate guest phone matches (required if provided)
  if (guestPhone) {
    const phoneMatch = matchGuestPhone(guestPhone, booking.guest_phone)
    if (!phoneMatch.matches) {
      return {
        valid: false,
        reason: phoneMatch.reason || 'Phone number does not match booking',
        room: roomValidation.room,
        booking,
      }
    }
  } else {
    // Phone is required for order validation
    return {
      valid: false,
      reason: 'Phone number is required for order verification',
      room: roomValidation.room,
      booking,
    }
  }

  // All validations passed
  return {
    valid: true,
    reason: undefined,
    room: roomValidation.room,
    booking,
  }
}

/**
 * Match guest name with booking name (fuzzy matching)
 */
export function matchGuestName(orderName: string, bookingName: string): { matches: boolean; reason?: string } {
  if (!orderName || !bookingName) {
    return { matches: false, reason: 'Name is required' }
  }

  // Normalize names: lowercase, trim, remove extra spaces
  const normalizedOrder = orderName.toLowerCase().trim().replace(/\s+/g, ' ')
  const normalizedBooking = bookingName.toLowerCase().trim().replace(/\s+/g, ' ')

  // Exact match
  if (normalizedOrder === normalizedBooking) {
    return { matches: true }
  }

  // Check if order name contains booking name or vice versa (for middle names)
  if (normalizedOrder.includes(normalizedBooking) || normalizedBooking.includes(normalizedOrder)) {
    return { matches: true }
  }

  // Split into words and check if all words from order are in booking
  const orderWords = normalizedOrder.split(' ')
  const bookingWords = normalizedBooking.split(' ')
  
  // If all order words are in booking, it's a match (handles middle names)
  const allWordsMatch = orderWords.every(word => 
    bookingWords.some(bookingWord => bookingWord.includes(word) || word.includes(bookingWord))
  )

  if (allWordsMatch && orderWords.length > 0) {
    return { matches: true }
  }

  return { matches: false, reason: 'Guest name does not match booking' }
}

/**
 * Match guest phone with booking phone (normalized comparison)
 */
export function matchGuestPhone(orderPhone: string, bookingPhone: string | null): { matches: boolean; reason?: string } {
  if (!orderPhone) {
    return { matches: false, reason: 'Phone number is required' }
  }

  if (!bookingPhone) {
    return { matches: false, reason: 'No phone number on file for this booking' }
  }

  // Normalize phone numbers: remove all non-digit characters except +
  const normalizePhone = (phone: string): string => {
    // Remove spaces, dashes, parentheses, and other formatting
    let normalized = phone.replace(/[\s\-\(\)\.]/g, '')
    // If it doesn't start with +, add it (assuming country code)
    if (!normalized.startsWith('+')) {
      // If it starts with 1 (US/Canada), add +
      if (normalized.startsWith('1') && normalized.length === 11) {
        normalized = '+' + normalized
      } else if (normalized.length === 10) {
        // Assume US number, add +1
        normalized = '+1' + normalized
      } else {
        normalized = '+' + normalized
      }
    }
    return normalized
  }

  const normalizedOrder = normalizePhone(orderPhone)
  const normalizedBooking = normalizePhone(bookingPhone)

  // Exact match after normalization
  if (normalizedOrder === normalizedBooking) {
    return { matches: true }
  }

  // Also check last 10 digits (in case country code differs)
  const orderLast10 = normalizedOrder.slice(-10)
  const bookingLast10 = normalizedBooking.slice(-10)
  
  if (orderLast10 === bookingLast10 && orderLast10.length === 10) {
    return { matches: true }
  }

  return { matches: false, reason: 'Phone number does not match booking' }
}

