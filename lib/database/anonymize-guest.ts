import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * Anonymize guest data for GDPR compliance
 * Replaces personal identifiers with anonymized values while keeping records for legal/financial purposes
 */
export async function anonymizeGuestData(guestId: string): Promise<void> {
  const supabase = await createClient()

  try {
    // 1. Anonymize guest record
    const { error: guestError } = await supabase
      .from('guests')
      .update({
        name: 'Deleted User',
        email: null,
        phone: null,
        preferences: null,
        notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', guestId)
      .eq('is_deleted', false)

    if (guestError) {
      logger.error('Error anonymizing guest:', guestError)
      throw new Error(`Failed to anonymize guest: ${guestError.message}`)
    }

    // 2. Anonymize bookings
    // IMPORTANT: Do NOT update booking status - only anonymize personal data
    // Booking status should remain unchanged (checked_in stays checked_in, checked_out stays checked_out)
    // Room status should also remain unchanged
    // We explicitly only update guest_name, guest_email, guest_phone, and updated_at
    // Status field is NOT included in the update, so it will remain unchanged
    const { error: bookingsError } = await supabase
      .from('bookings')
      .update({
        guest_name: 'Deleted User',
        guest_email: null,
        guest_phone: null,
        updated_at: new Date().toISOString(),
        // CRITICAL: Do NOT include 'status' in this update object
        // Status must remain unchanged to preserve booking state
      })
      .eq('guest_id', guestId)
      .eq('is_deleted', false)

    if (bookingsError) {
      logger.error('Error anonymizing bookings:', bookingsError)
      throw new Error(`Failed to anonymize bookings: ${bookingsError.message}`)
    }

    // 3. Anonymize orders
    const { error: ordersError } = await supabase
      .from('orders')
      .update({
        guest_name: 'Deleted User',
        guest_phone: null,
        updated_at: new Date().toISOString(),
      })
      .eq('guest_id', guestId)
      .eq('is_deleted', false)

    if (ordersError) {
      logger.error('Error anonymizing orders:', ordersError)
      throw new Error(`Failed to anonymize orders: ${ordersError.message}`)
    }

    // 4. Anonymize service requests
    const { error: serviceRequestsError } = await supabase
      .from('service_requests')
      .update({
        guest_name: 'Deleted User',
        guest_phone: null,
        updated_at: new Date().toISOString(),
      })
      .eq('guest_id', guestId)
      .eq('is_deleted', false)

    if (serviceRequestsError) {
      logger.error('Error anonymizing service requests:', serviceRequestsError)
      throw new Error(`Failed to anonymize service requests: ${serviceRequestsError.message}`)
    }

    // 5. Soft delete consent records
    const { error: cookieConsentsError } = await supabase
      .from('cookie_consents')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('guest_id', guestId)
      .eq('is_deleted', false)

    if (cookieConsentsError) {
      logger.error('Error deleting cookie consents:', cookieConsentsError)
      // Don't throw - consent records might not exist
    }

    const { error: dataConsentsError } = await supabase
      .from('data_consents')
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq('guest_id', guestId)
      .eq('is_deleted', false)

    if (dataConsentsError) {
      logger.error('Error deleting data consents:', dataConsentsError)
      // Don't throw - consent records might not exist
    }

    logger.info(`Successfully anonymized guest data for guest_id: ${guestId}`)
  } catch (error: any) {
    logger.error('Error in anonymizeGuestData:', error)
    throw error
  }
}

