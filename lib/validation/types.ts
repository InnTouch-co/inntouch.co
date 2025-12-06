/**
 * Validation result types
 */

export interface ValidationResult {
  valid: boolean
  reason?: string
  booking?: ActiveBooking | null
  room?: RoomInfo | null
}

export interface ActiveBooking {
  id: string
  hotel_id: string
  room_id: string
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  check_in_date: string
  check_out_date: string
  status: string
  room_number: string
}

export interface RoomInfo {
  id: string
  hotel_id: string
  room_number: string
  status: string
}

export interface RoomValidationResult {
  exists: boolean
  room: RoomInfo | null
  reason: string | null
}

