/**
 * Formats a phone number string to US format: +1 (XXX) XXX-XXXX
 * Strips all non-digit characters except + and 1, then formats
 */
export function formatPhoneNumber(value: string): string {
  // If empty, return empty
  if (!value) return ''
  
  // Remove all characters except digits and +
  const cleaned = value.replace(/[^\d+]/g, '')
  
  // If only +, return just +
  if (cleaned === '+') return '+'
  
  // Check if it starts with +
  const hasPlus = cleaned.startsWith('+')
  
  // Extract digits (remove + signs)
  let digits = cleaned.replace(/\+/g, '')
  
  // Limit to 11 digits max (1 country code + 10 digits)
  digits = digits.slice(0, 11)
  
  // If digits start with 1 and we have 11 digits, remove the leading 1 (country code)
  // Otherwise keep all digits
  let phoneDigits = digits
  if (phoneDigits.length === 11 && phoneDigits[0] === '1') {
    phoneDigits = phoneDigits.slice(1)
  } else if (hasPlus && phoneDigits.length > 0 && phoneDigits[0] === '1' && phoneDigits.length < 11) {
    // If user typed +1 and then digits, remove the 1
    phoneDigits = phoneDigits.slice(1)
  }
  
  // Build formatted string
  let formatted = hasPlus ? '+1 ' : ''
  
  if (phoneDigits.length === 0) {
    return formatted.trim() || ''
  } else if (phoneDigits.length <= 3) {
    formatted += phoneDigits
  } else if (phoneDigits.length <= 6) {
    formatted += `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3)}`
  } else {
    formatted += `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6, 10)}`
  }
  
  return formatted
}

/**
 * Handles phone input change event and applies mask
 */
export function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>): string {
  const input = e.target.value
  return formatPhoneNumber(input)
}

/**
 * Strips formatting from phone number, returning only digits
 * Useful for storing in database
 */
export function stripPhoneFormat(phone: string): string {
  if (!phone) return ''
  // Remove all non-digit characters except + at the start
  const digits = phone.replace(/[^\d+]/g, '')
  // If starts with +1, return with it; otherwise just digits
  if (digits.startsWith('+1') || digits.startsWith('1')) {
    return '+1' + digits.replace(/^\+?1?/, '').replace(/\D/g, '')
  }
  return digits.replace(/\D/g, '')
}

