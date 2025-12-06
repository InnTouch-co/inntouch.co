# WhatsApp Notifications Integration

## Overview

WhatsApp notifications have been fully integrated using approved Twilio Message Templates. All notifications are sent automatically when specific events occur.

## Environment Variables Required

Add these to your `.env.local` file with your approved template Content SIDs:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# WhatsApp Template Content SIDs (from Twilio Console after approval)
TWILIO_WHATSAPP_TEMPLATE_ORDER_CONFIRMATION=HX...
TWILIO_WHATSAPP_TEMPLATE_ORDER_READY=HX...
TWILIO_WHATSAPP_TEMPLATE_ORDER_DELIVERED=HX...
TWILIO_WHATSAPP_TEMPLATE_CHECKIN=HX...
TWILIO_WHATSAPP_TEMPLATE_CHECKOUT_REMINDER=HX...
TWILIO_WHATSAPP_TEMPLATE_SERVICE_REQUEST=HX...

# Base URL for guest site links (used in check-in notifications)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# OR
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Implemented Notifications

### 1. Order Confirmation ✅
- **Trigger**: When a guest places an order
- **Template**: `TWILIO_WHATSAPP_TEMPLATE_ORDER_CONFIRMATION`
- **Variables**:
  - Order Number
  - Room Number
  - Guest Name
  - Items List
  - Total Amount
  - Estimated Delivery Minutes
- **Location**: `app/api/guest/orders/route.ts`

### 2. Order Ready ✅
- **Trigger**: When staff marks an order as "ready"
- **Template**: `TWILIO_WHATSAPP_TEMPLATE_ORDER_READY`
- **Variables**:
  - Order Number
  - Room Number
- **Location**: `app/api/orders/[id]/status/route.ts`

### 3. Order Delivered ✅
- **Trigger**: When staff marks an order as "delivered"
- **Template**: `TWILIO_WHATSAPP_TEMPLATE_ORDER_DELIVERED`
- **Variables**:
  - Order Number
  - Room Number
- **Location**: `app/api/orders/[id]/status/route.ts`

### 4. Check-In Confirmation ✅
- **Trigger**: When staff checks in a guest
- **Template**: `TWILIO_WHATSAPP_TEMPLATE_CHECKIN`
- **Variables**:
  - Hotel Name
  - Guest Name
  - Room Number
  - Check-in Date
  - Check-out Date
  - Guest Site Link
- **Location**: `app/api/bookings/check-in/route.ts`

### 5. Check-Out Reminder ⚠️ (Not Yet Implemented)
- **Trigger**: Should be sent on check-out day (requires scheduled job)
- **Template**: `TWILIO_WHATSAPP_TEMPLATE_CHECKOUT_REMINDER`
- **Variables**:
  - Guest Name
  - Check-out Date
  - Room Number
  - Guest Site Link
- **Note**: This requires a scheduled job/cron to send reminders. Function is ready in `lib/messaging/notifications.ts`

### 6. Service Request Confirmation ⚠️ (Partial)
- **Trigger**: When a guest books a service (spa, fitness)
- **Template**: `TWILIO_WHATSAPP_TEMPLATE_SERVICE_REQUEST`
- **Variables**:
  - Guest Name
  - Service Type
  - Room Number
  - Date
  - Time
- **Location**: `app/api/guest/service-requests/route.ts`
- **Note**: Currently, the booking form doesn't collect guest phone number, so notifications won't be sent unless the phone is available from the active booking.

## How It Works

1. **Template-Based Messaging**: All notifications use Twilio Message Templates (Content SIDs) to bypass the 24-hour messaging window restriction.

2. **Non-Blocking**: All notifications are sent asynchronously and won't block the main operation (order creation, check-in, etc.).

3. **Error Handling**: If a notification fails, it's logged but doesn't affect the main operation.

4. **Phone Number Formatting**: Phone numbers are automatically formatted to E.164 format (+1234567890) for Twilio.

## Testing

### Test Order Confirmation
1. Place an order from the guest site
2. Check WhatsApp for confirmation message

### Test Order Status Updates
1. In admin panel, mark an order as "ready"
2. Guest should receive "Order Ready" notification
3. Mark order as "delivered"
4. Guest should receive "Order Delivered" notification

### Test Check-In Notification
1. Check in a guest from the rooms page
2. Guest should receive check-in confirmation with guest site link

## Troubleshooting

### Notifications Not Sending

1. **Check Template SIDs**: Ensure all template SIDs are set in `.env.local`
2. **Check Phone Numbers**: Verify guest phone numbers are in correct format
3. **Check Logs**: Look for `[WhatsApp]` or `[Notifications]` in server logs
4. **Verify Templates**: Ensure templates are approved in Twilio Console

### Common Errors

- **"Template required"**: Template SID is missing or incorrect
- **"Invalid phone number"**: Phone number format is incorrect
- **"Message outside 24-hour window"**: Should not occur with templates, but check template SID

## Next Steps

1. **Add Phone Number to Booking Form**: Update `BookingForm.tsx` to collect guest phone number for service booking notifications
2. **Implement Check-Out Reminders**: Create a scheduled job to send check-out reminders on check-out day
3. **Add Staff Notifications**: Consider adding WhatsApp group notifications for staff (kitchen, delivery, etc.)

## Files Modified

- `lib/messaging/twilio.ts` - Added support for template variables
- `lib/messaging/templates.ts` - Added template variable formatters
- `lib/messaging/notifications.ts` - New notification service
- `app/api/guest/orders/route.ts` - Order confirmation notification
- `app/api/orders/[id]/status/route.ts` - Order status update notifications
- `app/api/bookings/check-in/route.ts` - Check-in notification
- `app/api/guest/service-requests/route.ts` - Service request notification (partial)


