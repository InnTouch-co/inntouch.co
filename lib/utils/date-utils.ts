/**
 * Date utility functions
 */

/**
 * Check if a checkout date is overdue (past today)
 * @param checkoutDate - Checkout date in YYYY-MM-DD format
 * @returns true if checkout date is in the past
 */
export function isCheckoutOverdue(checkoutDate: string | null | undefined): boolean {
  if (!checkoutDate) return false
  
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset to start of day for accurate comparison
  
  const checkout = new Date(checkoutDate)
  checkout.setHours(0, 0, 0, 0)
  
  return checkout < today
}

/**
 * Check if checkout is today
 * @param checkoutDate - Checkout date in YYYY-MM-DD format
 * @returns true if checkout date is today
 */
export function isCheckoutToday(checkoutDate: string | null | undefined): boolean {
  if (!checkoutDate) return false
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const checkout = new Date(checkoutDate)
  checkout.setHours(0, 0, 0, 0)
  
  return checkout.getTime() === today.getTime()
}

/**
 * Check if check-in is today
 * @param checkInDate - Check-in date in YYYY-MM-DD format
 * @returns true if check-in date is today
 */
export function isCheckInToday(checkInDate: string | null | undefined): boolean {
  if (!checkInDate) return false
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const checkIn = new Date(checkInDate)
  checkIn.setHours(0, 0, 0, 0)
  
  return checkIn.getTime() === today.getTime()
}

/**
 * Get days overdue
 * @param checkoutDate - Checkout date in YYYY-MM-DD format
 * @returns Number of days overdue (negative if not overdue)
 */
export function getDaysOverdue(checkoutDate: string | null | undefined): number {
  if (!checkoutDate) return 0
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const checkout = new Date(checkoutDate)
  checkout.setHours(0, 0, 0, 0)
  
  const diffTime = today.getTime() - checkout.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}


