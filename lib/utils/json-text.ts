/**
 * Extracts text from JSON field (supports multilingual objects)
 * If it's an object with language keys, returns the 'en' value or first available
 * If it's already a string, returns it as-is
 */
export function extractTextFromJson(json: any, lang: string = 'en'): string {
  if (!json) return ''
  
  if (typeof json === 'string') {
    return json
  }
  
  if (typeof json === 'object') {
    // Try the requested language first
    if (json[lang]) {
      return String(json[lang])
    }
    // Fall back to 'en'
    if (json.en) {
      return String(json.en)
    }
    // Get the first available value
    const keys = Object.keys(json)
    if (keys.length > 0) {
      return String(json[keys[0]])
    }
  }
  
  return String(json)
}

/**
 * Converts simple text to JSON format for database storage
 */
export function textToJson(text: string): { [key: string]: string } {
  return { en: text }
}

