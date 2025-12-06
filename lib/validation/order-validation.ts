import { validateRoomForOrder } from './room-validation'
import type { ValidationResult } from './types'

export interface OrderValidationData {
  hotel_id: string
  room_number: string
  guest_name: string
  guest_phone: string
  items: any[]
  total: number
}

/**
 * Validate order request before creation
 * Runs all security validations
 */
export async function validateOrderRequest(
  orderData: OrderValidationData
): Promise<ValidationResult> {
  const { hotel_id, room_number, guest_phone } = orderData

  // Validate room, booking, checkout time, and guest phone
  const validation = await validateRoomForOrder(room_number, hotel_id, undefined, guest_phone)

  return validation
}

