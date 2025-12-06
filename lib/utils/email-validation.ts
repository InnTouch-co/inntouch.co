/**
 * Validates email format
 * Returns true if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) {
    return false
  }

  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Formats email input (trims whitespace, converts to lowercase)
 * This provides real-time formatting as user types
 */
export function formatEmail(value: string): string {
  if (!value) return ''
  
  // Trim whitespace
  let formatted = value.trim()
  
  // Convert to lowercase (emails are case-insensitive)
  // Only convert if user hasn't typed @ yet (to avoid interfering with typing)
  if (!formatted.includes('@')) {
    formatted = formatted.toLowerCase()
  } else {
    // After @, only convert domain part to lowercase
    const [localPart, domain] = formatted.split('@')
    if (domain) {
      formatted = localPart + '@' + domain.toLowerCase()
    }
  }
  
  return formatted
}

/**
 * Validates and formats email
 * Returns formatted email if valid, or original value if invalid
 */
export function validateAndFormatEmail(value: string): string {
  const formatted = formatEmail(value)
  
  // If empty, return empty
  if (!formatted) return ''
  
  // If it looks like user is still typing (no @ or incomplete), return formatted
  if (!formatted.includes('@') || formatted.endsWith('@')) {
    return formatted
  }
  
  // If complete email, validate it
  if (isValidEmail(formatted)) {
    return formatted
  }
  
  // Return formatted even if invalid (let browser validation handle it)
  return formatted
}

