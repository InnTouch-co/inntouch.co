/**
 * Generate or retrieve a session ID for guest users
 * Used for tracking cookie consents and other guest-specific data
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const storageKey = 'guest_session_id'
  let sessionId = localStorage.getItem(storageKey)

  if (!sessionId) {
    // Generate a new session ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem(storageKey, sessionId)
  }

  return sessionId
}


