/**
 * Message templates for WhatsApp notifications
 */

import { logger } from '@/lib/utils/logger'

export interface OrderConfirmationData {
  order_number: string
  guest_name: string
  room_number: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  total_amount: number
  special_instructions?: string | null
  estimated_delivery_minutes?: number
}

/**
 * Format order confirmation message for guest (freeform fallback)
 */
export function orderConfirmationTemplate(data: OrderConfirmationData): string {
  const { order_number, guest_name, room_number, items, total_amount, special_instructions, estimated_delivery_minutes = 25 } = data

  let message = `✅ Order Confirmed!\n\n`
  message += `Order #${order_number}\n`
  message += `Room ${room_number} - ${guest_name}\n\n`
  message += `Items:\n`

  // Format items
  items.forEach(item => {
    const itemTotal = (item.price || 0) * (item.quantity || 1)
    message += `• ${item.quantity}x ${item.name} - $${itemTotal.toFixed(2)}\n`
  })

  message += `\nTotal: $${total_amount.toFixed(2)}\n`

  // Add special instructions if present
  if (special_instructions) {
    message += `Special: ${special_instructions}\n`
  }

  message += `\nEstimated delivery: ${estimated_delivery_minutes} minutes\n\n`
  message += `We'll notify you when your order is ready! 🍽️`

  return message
}

/**
 * Sanitize template variable value for Twilio
 * Removes newlines, tabs, excessive spaces, and problematic characters
 * Note: Does NOT remove $ sign as it might be needed for amounts
 */
function sanitizeTemplateVariable(value: string): string {
  if (!value) return ''
  
  let sanitized = String(value)
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\r/g, ' ') // Replace carriage returns with spaces
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .replace(/ {2,}/g, ' ') // Replace multiple spaces with single space
    .trim()
  
  // Remove any remaining control characters (except space)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')
  
  // Limit length
  sanitized = sanitized.substring(0, 1000)
  
  return sanitized
}

/**
 * Format order confirmation template variables for WhatsApp template
 * Returns array of variables matching template: {{1}}, {{2}}, etc.
 */
export function orderConfirmationTemplateVariables(data: OrderConfirmationData): string[] {
  const { order_number, guest_name, room_number, items, total_amount, estimated_delivery_minutes = 25 } = data
  
  // Format items list - use comma separation instead of newlines
  // Twilio doesn't allow newlines in ContentVariables
  // Also ensure item names are sanitized BEFORE formatting
  const itemsList = items.map(item => {
    const itemTotal = (item.price || 0) * (item.quantity || 1)
    const itemName = sanitizeTemplateVariable(item.name || 'Item')
    const formatted = `${item.quantity}x ${itemName} - $${itemTotal.toFixed(2)}`
    // Sanitize the entire formatted string again to catch any issues
    return sanitizeTemplateVariable(formatted)
  }).join(', ') // Use comma instead of newline
  
  // Template variables (must match template exactly):
  // {{1}} = Order Number
  // {{2}} = Room Number
  // {{3}} = Guest Name
  // {{4}} = Items List (comma-separated, no newlines)
  // {{5}} = Total Amount
  // {{6}} = Estimated Delivery Minutes
  
  const variables = [
    sanitizeTemplateVariable(order_number),
    sanitizeTemplateVariable(room_number),
    sanitizeTemplateVariable(guest_name),
    sanitizeTemplateVariable(itemsList),
    sanitizeTemplateVariable(total_amount.toFixed(2)), // Template already has $ sign: "Total: ${{5}}"
    sanitizeTemplateVariable(estimated_delivery_minutes.toString()),
  ]
  
  // Validate: ensure we have exactly 6 variables
  if (variables.length !== 6) {
    logger.error(`Order confirmation template expects 6 variables, got ${variables.length}`)
  }
  
  return variables
}

/**
 * Order ready notification template variables
 */
export function orderReadyTemplateVariables(order_number: string, room_number: string): string[] {
  return [
    sanitizeTemplateVariable(order_number),
    sanitizeTemplateVariable(room_number),
  ]
}

/**
 * Order delivered notification template variables
 */
export function orderDeliveredTemplateVariables(order_number: string, room_number: string): string[] {
  return [
    sanitizeTemplateVariable(order_number),
    sanitizeTemplateVariable(room_number),
  ]
}

/**
 * Check-in confirmation template variables
 */
export function checkInTemplateVariables(
  hotel_name: string,
  guest_name: string,
  room_number: string,
  check_in_date: string,
  check_out_date: string,
  guest_site_link: string
): string[] {
  return [
    sanitizeTemplateVariable(hotel_name),
    sanitizeTemplateVariable(guest_name),
    sanitizeTemplateVariable(room_number),
    sanitizeTemplateVariable(check_in_date),
    sanitizeTemplateVariable(check_out_date),
    sanitizeTemplateVariable(guest_site_link),
  ]
}

/**
 * Check-out reminder template variables
 */
export function checkOutReminderTemplateVariables(
  guest_name: string,
  check_out_date: string,
  room_number: string,
  guest_site_link: string
): string[] {
  return [
    sanitizeTemplateVariable(guest_name),
    sanitizeTemplateVariable(check_out_date),
    sanitizeTemplateVariable(room_number),
    sanitizeTemplateVariable(guest_site_link),
  ]
}

/**
 * Service request confirmation template variables
 */
export function serviceRequestTemplateVariables(
  guest_name: string,
  service_type: string,
  room_number: string,
  date: string,
  time: string
): string[] {
  return [
    sanitizeTemplateVariable(guest_name),
    sanitizeTemplateVariable(service_type),
    sanitizeTemplateVariable(room_number),
    sanitizeTemplateVariable(date),
    sanitizeTemplateVariable(time),
  ]
}

/**
 * Format phone number for Twilio (E.164 format)
 * Handles various input formats and normalizes to +1234567890
 * Uses the same normalization logic as room validation
 */
export function formatPhoneNumberForTwilio(phone: string | null | undefined): string | null {
  if (!phone) {
    return null
  }

  // If already in E.164 format (starts with +), validate and return
  if (phone.startsWith('+')) {
    const digitsOnly = phone.replace('+', '').replace(/\D/g, '')
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return phone
    } else {
      logger.warn(`Invalid E.164 phone format: ${phone} (${digitsOnly.length} digits)`)
    }
  }

  // Normalize phone number (remove all non-digit characters)
  const normalized = phone.replace(/[^\d]/g, '')

  // If empty after normalization, return null
  if (!normalized || normalized.length === 0) {
    logger.warn(`No digits found in phone: "${phone}"`)
    return null
  }

  // Handle different formats
  let cleaned: string

  // If it's 10 digits, assume US number and add +1
  if (normalized.length === 10) {
    cleaned = '+1' + normalized
  }
  // If it's 11 digits and starts with 1, add +
  else if (normalized.length === 11 && normalized.startsWith('1')) {
    cleaned = '+' + normalized
  }
  // If it already has country code (11+ digits), add +
  else if (normalized.length >= 11) {
    cleaned = '+' + normalized
  }
  // Otherwise, try to add +1 (US default)
  else {
    cleaned = '+1' + normalized
  }

  // Validate length (should be 10-15 digits after +)
  const digitsOnly = cleaned.replace('+', '')
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    logger.warn(`Invalid phone number length: ${phone} -> ${cleaned} (${digitsOnly.length} digits)`)
    return null
  }

  return cleaned
}

