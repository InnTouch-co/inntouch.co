import twilio from 'twilio'
import { messagingLogger, logger } from '@/lib/utils/logger'

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

if (!accountSid || !authToken) {
  throw new Error('Twilio credentials are missing. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file.')
}

const client = twilio(accountSid, authToken)

/**
 * Send WhatsApp message
 * For messages outside 24-hour window, use a Message Template (contentSid)
 * @param to - Recipient phone number (E.164 format: +1234567890)
 * @param message - Message body (for freeform) or template content
 * @param contentSid - Optional: Template Content SID from Twilio (for template messages)
 * @param contentVariables - Optional: Template variables as array (for template messages)
 * @returns Message SID if successful
 */
export async function sendWhatsAppMessage(
  to: string, 
  message: string, 
  contentSid?: string,
  contentVariables?: string[]
): Promise<string> {
  messagingLogger.send('WhatsApp', to, contentSid ? 'template' : 'freeform')
  
  try {
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886' // Default to sandbox
    
    // Check Twilio credentials
    if (!process.env.TWILIO_ACCOUNT_SID) {
      messagingLogger.error('WhatsApp', new Error('TWILIO_ACCOUNT_SID is not set'))
      throw new Error('TWILIO_ACCOUNT_SID is not set in environment variables')
    }
    if (!process.env.TWILIO_AUTH_TOKEN) {
      messagingLogger.error('WhatsApp', new Error('TWILIO_AUTH_TOKEN is not set'))
      throw new Error('TWILIO_AUTH_TOKEN is not set in environment variables')
    }
    
    // Ensure phone number is in correct format
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
    
    // If contentSid is provided, use template message
    // Otherwise, try freeform message (only works within 24-hour window)
    const messageParams: any = {
      from: from,
      to: formattedTo,
    }

    if (contentSid) {
      // Use template message
      messageParams.contentSid = contentSid
      
      // If contentVariables provided, add them
      // CRITICAL: Twilio expects variables as a JSON string of an OBJECT with numeric keys: {1: "value1", 2: "value2", ...}
      // When stringified, numeric keys become string keys: {"1": "value1", "2": "value2", ...}
      // NOT an array! This is the correct format per Twilio documentation
      if (contentVariables && contentVariables.length > 0) {
        // Ensure all variables are strings - CRITICAL: Must keep ALL variables, even if empty
        // Twilio requires the exact number of variables that match the template
        // Build object with numeric keys (will be stringified as {"1": "...", "2": "..."})
        const variablesObject: Record<number, string> = {}
        
        contentVariables.forEach((v, index) => {
          const str = String(v || '').trim()
          const key = index + 1 // Numeric key: 1, 2, 3, etc.
          
          if (!str || str.length === 0) {
            logger.warn('Template variable empty, using placeholder:', key)
            variablesObject[key] = 'N/A' // Use placeholder instead of empty string
          } else {
            variablesObject[key] = str
          }
        })
        
        // Twilio expects a JSON string representation of an OBJECT
        // Format: JSON.stringify({1: "value1", 2: "value2"}) -> '{"1":"value1","2":"value2"}'
        // This matches Twilio's documentation example: JSON.stringify({ 1: "Name" })
        const variablesJson = JSON.stringify(variablesObject)
        messageParams.contentVariables = variablesJson
        
        // Validate JSON is valid and is an object (not array)
        try {
          const parsed = JSON.parse(variablesJson)
          if (Array.isArray(parsed)) {
            messagingLogger.error('WhatsApp', new Error('contentVariables must be an object, not an array'))
            throw new Error('contentVariables must be an object, not an array')
          }
        } catch (e) {
          messagingLogger.error('WhatsApp', e as Error)
          throw e
        }
      } else {
        logger.warn('Template SID provided but no content variables')
      }
    } else {
      // Try freeform message (may fail if outside 24-hour window)
      messageParams.body = message
      if (!message) {
        logger.warn('No template SID and no message body provided')
      }
    }
    
    const result = await client.messages.create(messageParams)
    
    messagingLogger.success('WhatsApp', result.sid)
    
    return result.sid
  } catch (error: any) {
    // Check if it's the 24-hour window error
    if (error.code === 63016 || error.message?.includes('outside the allowed window')) {
      logger.error('WhatsApp Error 63016: Message outside 24-hour window. Use a Message Template.')
      throw new Error('WHATSAPP_TEMPLATE_REQUIRED: Message outside 24-hour window. Please use a Message Template.')
    }
    
    // Check if it's the template language/locale error
    if (error.code === 63027 || error.message?.includes('template does not exist') || error.message?.includes('language and locale')) {
      logger.error('WhatsApp Error 63027: Template does not exist for language/locale. Verify Content SID:', contentSid)
      throw new Error('WHATSAPP_TEMPLATE_NOT_FOUND: Template does not exist for the specified language/locale. Verify template approval and Content SID in Twilio Console.')
    }
    
    messagingLogger.error('WhatsApp', error)
    throw error
  }
}

/**
 * Send message (WhatsApp only for now)
 * @param to - Recipient phone number
 * @param message - Message body
 * @returns Message SID if successful
 */
export async function sendMessage(
  to: string,
  message: string
): Promise<string> {
  return sendWhatsAppMessage(to, message)
}

/**
 * Verify Twilio connection
 * @returns Account information if connection is successful
 */
export async function verifyConnection() {
  try {
    const account = await client.api.accounts(accountSid).fetch()
    return {
      success: true,
      accountSid: account.sid,
      friendlyName: account.friendlyName,
    }
  } catch (error) {
    logger.error('Error verifying Twilio connection:', error)
    throw error
  }
}

export { client }
