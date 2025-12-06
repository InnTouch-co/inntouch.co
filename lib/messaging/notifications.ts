/**
 * WhatsApp notification service
 * Handles sending notifications for various events using approved templates
 */

import { sendWhatsAppMessage } from './twilio'
import { 
  formatPhoneNumberForTwilio,
  orderReadyTemplateVariables,
  orderDeliveredTemplateVariables,
  checkInTemplateVariables,
  checkOutReminderTemplateVariables,
  serviceRequestTemplateVariables,
} from './templates'
import { logger, messagingLogger } from '@/lib/utils/logger'

/**
 * Send order ready notification to guest
 */
export async function sendOrderReadyNotification(
  orderNumber: string,
  roomNumber: string,
  guestPhone: string | null
): Promise<void> {
  messagingLogger.debug('Notifications', `Order Ready: ${orderNumber}, Room: ${roomNumber}, Phone: ${guestPhone || 'NULL'}`)
  
  if (!guestPhone) {
    messagingLogger.warn('Notifications', `No phone number for order ${orderNumber}, skipping ready notification`)
    return
  }

  const phoneNumber = formatPhoneNumberForTwilio(guestPhone)
  
  if (!phoneNumber) {
    messagingLogger.warn('Notifications', `Invalid phone number for order ${orderNumber}, skipping ready notification`)
    return
  }

  const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_ORDER_READY
  
  if (!templateSid) {
    messagingLogger.warn('Notifications', `ORDER_READY template SID not configured (set TWILIO_WHATSAPP_TEMPLATE_ORDER_READY)`)
    return
  }

  try {
    const variables = orderReadyTemplateVariables(orderNumber, roomNumber)
    messagingLogger.send('Notifications', phoneNumber, `order ready #${orderNumber}`)
    
    await sendWhatsAppMessage(phoneNumber, '', templateSid, variables)
    messagingLogger.success('Notifications', `order-ready-${orderNumber}`, `Order ready notification sent`)
  } catch (error: any) {
    messagingLogger.error('Notifications', error, `Failed to send order ready notification for ${orderNumber}`)
    // Don't throw - notification failures shouldn't break the flow
  }
}

/**
 * Send order delivered notification to guest
 */
export async function sendOrderDeliveredNotification(
  orderNumber: string,
  roomNumber: string,
  guestPhone: string | null
): Promise<void> {
  messagingLogger.debug('Notifications', `Order Delivered: ${orderNumber}, Room: ${roomNumber}, Phone: ${guestPhone || 'NULL'}`)
  
  if (!guestPhone) {
    messagingLogger.warn('Notifications', `No phone number for order ${orderNumber}, skipping delivered notification`)
    return
  }

  const phoneNumber = formatPhoneNumberForTwilio(guestPhone)
  
  if (!phoneNumber) {
    messagingLogger.warn('Notifications', `Invalid phone number for order ${orderNumber}, skipping delivered notification`)
    return
  }

  const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_ORDER_DELIVERED
  
  if (!templateSid) {
    messagingLogger.warn('Notifications', `ORDER_DELIVERED template SID not configured (set TWILIO_WHATSAPP_TEMPLATE_ORDER_DELIVERED)`)
    return
  }

  try {
    const variables = orderDeliveredTemplateVariables(orderNumber, roomNumber)
    messagingLogger.send('Notifications', phoneNumber, `order delivered #${orderNumber}`)
    
    await sendWhatsAppMessage(phoneNumber, '', templateSid, variables)
    messagingLogger.success('Notifications', `order-delivered-${orderNumber}`, `Order delivered notification sent`)
  } catch (error: any) {
    messagingLogger.error('Notifications', error, `Failed to send order delivered notification for ${orderNumber}`)
    // Don't throw - notification failures shouldn't break the flow
  }
}

/**
 * Send check-in confirmation notification to guest
 */
export async function sendCheckInNotification(
  hotelName: string,
  guestName: string,
  roomNumber: string,
  checkInDate: string,
  checkOutDate: string,
  guestSiteLink: string,
  guestPhone: string | null
): Promise<void> {
  messagingLogger.debug('Notifications', `Check-in: ${guestName}, Room: ${roomNumber}, ${checkInDate} to ${checkOutDate}, Phone: ${guestPhone || 'NULL'}`)
  
  if (!guestPhone) {
    messagingLogger.warn('Notifications', `No phone number for check-in, skipping notification`)
    return
  }

  const phoneNumber = formatPhoneNumberForTwilio(guestPhone)
  
  if (!phoneNumber) {
    messagingLogger.warn('Notifications', `Invalid phone number for check-in, skipping notification`)
    return
  }

  const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_CHECKIN
  
  if (!templateSid) {
    messagingLogger.warn('Notifications', `CHECKIN template SID not configured (set TWILIO_WHATSAPP_TEMPLATE_CHECKIN)`)
    return
  }

  try {
    const variables = checkInTemplateVariables(
      hotelName,
      guestName,
      roomNumber,
      checkInDate,
      checkOutDate,
      guestSiteLink
    )
    messagingLogger.send('Notifications', phoneNumber, `check-in for ${guestName}`)
    
    await sendWhatsAppMessage(phoneNumber, '', templateSid, variables)
    messagingLogger.success('Notifications', `checkin-${roomNumber}`, `Check-in notification sent to ${guestName}`)
  } catch (error: any) {
    messagingLogger.error('Notifications', error, `Failed to send check-in notification for ${guestName}`)
    // Don't throw - notification failures shouldn't break the flow
  }
}

/**
 * Send check-out reminder notification to guest
 */
export async function sendCheckOutReminderNotification(
  guestName: string,
  checkOutDate: string,
  roomNumber: string,
  guestSiteLink: string,
  guestPhone: string | null
): Promise<void> {
  if (!guestPhone) {
    messagingLogger.warn('Notifications', `No phone number for check-out reminder, skipping notification`)
    return
  }

  const phoneNumber = formatPhoneNumberForTwilio(guestPhone)
  if (!phoneNumber) {
    messagingLogger.warn('Notifications', `Invalid phone number for check-out reminder, skipping notification`)
    return
  }

  const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_CHECKOUT_REMINDER
  if (!templateSid) {
    messagingLogger.warn('Notifications', `CHECKOUT_REMINDER template SID not configured (set TWILIO_WHATSAPP_TEMPLATE_CHECKOUT_REMINDER)`)
    return
  }

  try {
    const variables = checkOutReminderTemplateVariables(
      guestName,
      checkOutDate,
      roomNumber,
      guestSiteLink
    )
    messagingLogger.send('Notifications', phoneNumber, `check-out reminder for ${guestName}`)
    
    await sendWhatsAppMessage(phoneNumber, '', templateSid, variables)
    messagingLogger.success('Notifications', `checkout-reminder-${roomNumber}`, `Check-out reminder sent to ${guestName}`)
  } catch (error: any) {
    messagingLogger.error('Notifications', error, `Failed to send check-out reminder for ${guestName}`)
    // Don't throw - notification failures shouldn't break the flow
  }
}

/**
 * Send service request confirmation notification to guest
 */
export async function sendServiceRequestNotification(
  guestName: string,
  serviceType: string,
  roomNumber: string,
  date: string,
  time: string,
  guestPhone: string | null
): Promise<void> {
  if (!guestPhone) {
    messagingLogger.warn('Notifications', `No phone number for service request, skipping notification`)
    return
  }

  const phoneNumber = formatPhoneNumberForTwilio(guestPhone)
  if (!phoneNumber) {
    messagingLogger.warn('Notifications', `Invalid phone number for service request, skipping notification`)
    return
  }

  const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SERVICE_REQUEST
  if (!templateSid) {
    messagingLogger.warn('Notifications', `SERVICE_REQUEST template SID not configured (set TWILIO_WHATSAPP_TEMPLATE_SERVICE_REQUEST)`)
    return
  }

  try {
    const variables = serviceRequestTemplateVariables(
      guestName,
      serviceType,
      roomNumber,
      date,
      time
    )
    messagingLogger.send('Notifications', phoneNumber, `service request: ${serviceType}`)
    
    await sendWhatsAppMessage(phoneNumber, '', templateSid, variables)
    messagingLogger.success('Notifications', `service-${roomNumber}`, `Service request confirmation sent to ${guestName}`)
  } catch (error: any) {
    messagingLogger.error('Notifications', error, `Failed to send service request confirmation for ${guestName}`)
    // Don't throw - notification failures shouldn't break the flow
  }
}

