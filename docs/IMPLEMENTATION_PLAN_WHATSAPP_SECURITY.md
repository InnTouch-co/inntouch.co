# Implementation Plan: WhatsApp Messaging + Security Validation

## Overview
Complete implementation plan combining Twilio/WhatsApp integration with room validation security, broken into testable phases.

**Cost Estimate:** ~$74/month for 100 orders/day (WhatsApp + SMS)

---

## Phase 1: Foundation & Twilio Setup
**Goal:** Set up Twilio account, basic configuration, and test messaging

### Tasks:

1. **Twilio Account Setup**
   - Create Twilio account at https://www.twilio.com/try-twilio
   - Get $15.50 free trial credit
   - Complete account verification
   - Get Account SID and Auth Token
   - Set up WhatsApp Business API (connect Meta Business account)
   - Get WhatsApp sender number (from Twilio)

2. **Environment Configuration**
   - Add to `.env`:
     ```
     TWILIO_ACCOUNT_SID=your_account_sid
     TWILIO_AUTH_TOKEN=your_auth_token
     TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Twilio sandbox number
     TWILIO_PHONE_NUMBER=+1234567890  # For SMS (optional)
     TWILIO_WEBHOOK_SECRET=your_webhook_secret
     ```

3. **Install Dependencies**
   ```bash
   npm install twilio
   ```

4. **Create Twilio Service Layer**
   - File: `lib/messaging/twilio.ts`
   - Initialize Twilio client
   - Basic send WhatsApp message function
   - Basic send SMS function
   - Test connection

5. **Create Test API Endpoint**
   - File: `app/api/messaging/test/route.ts`
   - Endpoint: `POST /api/messaging/test`
   - Send test WhatsApp message to your phone number
   - Send test SMS (optional)

### Testing Phase 1:

**Test Cases:**
1. ✅ Twilio client initializes
2. ✅ Can send test WhatsApp message
3. ✅ Can send test SMS message
4. ✅ Messages received on phone
5. ✅ Environment variables loaded correctly

**How to Test:**
```bash
# Test sending WhatsApp message
curl -X POST "http://localhost:3000/api/messaging/test" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "message": "Test message", "type": "whatsapp"}'

# Test sending SMS
curl -X POST "http://localhost:3000/api/messaging/test" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "message": "Test SMS", "type": "sms"}'
```

**Expected Result:**
- WhatsApp message received
- SMS received (if tested)
- No errors in console
- API returns success

### Deliverables:
- ✅ Twilio account set up
- ✅ Can send WhatsApp messages
- ✅ Can send SMS messages
- ✅ Basic service layer working
- ✅ Test endpoint functional

---

## Phase 2: Room Validation System
**Goal:** Implement security validation to prevent abuse

### Tasks:

1. **Create Validation Database Queries**
   - File: `lib/database/room-validation.ts`
   - Query: Get room by number
   - Query: Get active booking for room
   - Query: Check checkout time

2. **Create Validation Functions**
   - File: `lib/validation/room-validation.ts`
   - `validateRoomExists(roomNumber, hotelId)`
   - `getActiveBookingForRoom(roomNumber, hotelId)`
   - `validateCheckoutTime(booking)`
   - `validateRoomStatus(roomNumber, hotelId)`

3. **Create Validation API Endpoint**
   - File: `app/api/guest/validate-room/route.ts`
   - Endpoint: `GET /api/guest/validate-room`
   - Returns: `{ valid: boolean, reason?: string, booking?: {...} }`

4. **Add Validation Types**
   - File: `lib/validation/types.ts`
   - Validation result types
   - Error types

### Testing Phase 2:

**Test Cases:**
1. ✅ Valid room with active booking → `{ valid: true }`
2. ✅ Room doesn't exist → `{ valid: false, reason: "Room not found" }`
3. ✅ Room exists but no booking → `{ valid: false, reason: "Not checked in" }`
4. ✅ Room checked out → `{ valid: false, reason: "Checked out" }`
5. ✅ Room in maintenance → `{ valid: false, reason: "Room unavailable" }`

**How to Test:**
```bash
# Test with valid room
curl "http://localhost:3000/api/guest/validate-room?room_number=205&hotel_id=xxx"

# Test with checked-out room
curl "http://localhost:3000/api/guest/validate-room?room_number=205&hotel_id=xxx"
```

**Expected Result:**
- Returns correct validation status
- Handles all scenarios
- Clear error messages

### Deliverables:
- ✅ Room validation working
- ✅ API endpoint responding
- ✅ All validation scenarios tested
- ✅ Ready to integrate with orders

---

## Phase 3: Order Creation with Validation
**Goal:** Create orders with security validation integrated

### Tasks:

1. **Create Orders Table (Database Migration)**
   - File: `supabase/migrations/XXX_create_orders_table.sql`
   - Orders table with all fields
   - Order items table
   - Indexes

2. **Create Order Service**
   - File: `lib/database/orders.ts`
   - `createOrder(orderData)`
   - `getOrderById(id)`
   - `updateOrderStatus(id, status)`

3. **Update Order Creation API**
   - File: `app/api/guest/orders/route.ts`
   - Endpoint: `POST /api/guest/orders`
   - **Integrate validation from Phase 2**
   - Validate before creating order
   - Create order if valid
   - Return order with order number

4. **Add Validation Middleware**
   - File: `lib/validation/order-validation.ts`
   - `validateOrderRequest(orderData)`
   - Runs all validations
   - Returns validation result

5. **Error Handling**
   - Clear error messages
   - HTTP status codes
   - Validation logging

### Testing Phase 3:

**Test Cases:**
1. ✅ Valid order (checked-in room) → Order created, returns order number
2. ✅ Invalid room → Error: "Room not found" (400)
3. ✅ Room checked out → Error: "Room has been checked out" (400)
4. ✅ No active booking → Error: "Room is not checked in" (400)
5. ✅ Guest name mismatch → Error: "Guest name doesn't match" (400)
6. ✅ Order saved to database correctly
7. ✅ Order number generated correctly

**How to Test:**
```bash
# Create valid order
curl -X POST "http://localhost:3000/api/guest/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "xxx",
    "room_number": "205",
    "guest_name": "John Smith",
    "items": [...],
    "total": 32.00
  }'

# Try invalid order (checked-out room)
curl -X POST "http://localhost:3000/api/guest/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "room_number": "205", # checked out
    ...
  }'
```

**Expected Result:**
- Valid orders: Created successfully with order number
- Invalid orders: Rejected with clear error
- Orders saved to database
- Validation working correctly

### Deliverables:
- ✅ Orders table created
- ✅ Order creation API working
- ✅ Validation integrated
- ✅ Invalid orders rejected
- ✅ Orders saved correctly

---

## Phase 4: Guest Order Confirmation (WhatsApp)
**Goal:** Send order confirmation to guests via WhatsApp

### Tasks:

1. **Create Message Templates**
   - File: `lib/messaging/templates.ts`
   - `orderConfirmationTemplate(order)`
   - Format order details
   - Include order number, items, total, ETA

2. **Integrate with Order Creation**
   - Update `app/api/guest/orders/route.ts`
   - After order created successfully
   - Get guest phone number from booking
   - Send WhatsApp confirmation

3. **Add Phone Number Retrieval**
   - Get phone from booking
   - Format phone number
   - Validate phone number

4. **Error Handling for Messages**
   - If WhatsApp fails, log error
   - Don't fail order creation if message fails
   - Retry logic (optional)

5. **Update Order Status**
   - Mark order as "confirmed" after message sent
   - Log message sent status

### Testing Phase 4:

**Test Cases:**
1. ✅ Order created → Guest receives WhatsApp confirmation
2. ✅ Message includes correct order details
3. ✅ Message includes order number
4. ✅ Message includes total amount
5. ✅ Message includes estimated delivery time
6. ✅ If phone number missing → Order still created, message skipped
7. ✅ If WhatsApp fails → Order still created, error logged

**How to Test:**
```bash
# Create order (should trigger WhatsApp)
curl -X POST "http://localhost:3000/api/guest/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "room_number": "205",
    "guest_name": "John Smith",
    ...
  }'

# Check phone receives WhatsApp message
```

**Expected Result:**
- Guest receives WhatsApp message
- Message contains all order details
- Order created even if message fails
- Message format looks good

### Deliverables:
- ✅ Order confirmation messages working
- ✅ Messages sent automatically
- ✅ Template formatting correct
- ✅ Error handling in place

---

## Phase 5: Staff Notifications (WhatsApp Groups)
**Goal:** Notify staff via WhatsApp groups when orders come in

### Tasks:

1. **Create Staff Notification Service**
   - File: `lib/messaging/staff-notifications.ts`
   - `sendOrderNotificationToStaff(order, groupType)`
   - Determine which groups to notify
   - Format staff notification message

2. **Create Staff Notification Templates**
   - File: `lib/messaging/templates.ts` (add staff templates)
   - `staffOrderNotificationTemplate(order)`
   - Include all order details
   - Include special instructions

3. **Set Up WhatsApp Groups**
   - Create groups in WhatsApp:
     - Kitchen Staff
     - Delivery Staff
     - Front Desk (optional)
   - Get group IDs or phone numbers
   - Add to environment variables

4. **Integrate with Order Creation**
   - Update `app/api/guest/orders/route.ts`
   - After order created
   - Determine order type (restaurant, room service, bar)
   - Send to appropriate groups

5. **Add Group Routing Logic**
   - Restaurant orders → Kitchen + Delivery
   - Room service → Kitchen + Room Service
   - Bar orders → Bar Staff
   - Urgent orders → All groups

### Testing Phase 5:

**Test Cases:**
1. ✅ New order → Kitchen group receives notification
2. ✅ New order → Delivery group receives notification
3. ✅ Message includes order details
4. ✅ Message includes room number
5. ✅ Message includes special instructions
6. ✅ Different order types → Different groups notified
7. ✅ Urgent orders → All groups notified

**How to Test:**
```bash
# Create order (should notify staff)
curl -X POST "http://localhost:3000/api/guest/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "room_number": "205",
    "order_type": "room_service",
    ...
  }'

# Check WhatsApp groups receive messages
```

**Expected Result:**
- Staff groups receive notifications
- Messages contain all details
- Correct groups notified
- Messages formatted well

### Deliverables:
- ✅ Staff notifications working
- ✅ WhatsApp groups receiving messages
- ✅ Group routing logic working
- ✅ All staff informed of new orders

---

## Phase 6: Frontend Integration - Checkout with Validation
**Goal:** Update checkout page with real-time validation

### Tasks:

1. **Create Validation Hook**
   - File: `hooks/useRoomValidation.ts`
   - `useRoomValidation(roomNumber, guestName)`
   - Calls validation API
   - Returns validation state

2. **Update CheckoutPage Component**
   - File: `components/guest/CheckoutPage.tsx`
   - Add validation on room number change
   - Show validation status
   - Disable checkout if invalid
   - Show error messages

3. **Add Validation UI**
   - Loading state during validation
   - Success indicator (✓ Room verified)
   - Error messages (❌ Room checked out)
   - Disable submit button if invalid

4. **Real-Time Validation**
   - Validate when room number changes
   - Validate when guest name changes
   - Debounce validation calls (500ms)

5. **Update Order Submission**
   - Call new orders API endpoint
   - Handle validation errors
   - Show success/error messages
   - Redirect on success

### Testing Phase 6:

**Test Cases:**
1. ✅ Enter valid room → Shows "✓ Room verified"
2. ✅ Enter invalid room → Shows error, disables checkout
3. ✅ Enter checked-out room → Shows "Room checked out" error
4. ✅ Change room number → Re-validates automatically
5. ✅ Submit with invalid room → Button disabled, can't submit
6. ✅ Submit valid order → Order created, success message
7. ✅ Submit order → Receives WhatsApp confirmation

**How to Test:**
- Open checkout page in browser
- Enter different room numbers
- Observe validation messages
- Try to submit with invalid room
- Submit valid order and check WhatsApp

**Expected Result:**
- Real-time validation feedback
- Can't submit invalid orders
- Clear error messages
- Valid orders create successfully
- WhatsApp confirmation received

### Deliverables:
- ✅ Frontend validates in real-time
- ✅ Visual feedback for validation
- ✅ Prevents invalid submissions
- ✅ Order creation integrated
- ✅ Better user experience

---

## Phase 7: Order Status Updates (WhatsApp)
**Goal:** Send status updates to guests as order progresses

### Tasks:

1. **Create Status Update Templates**
   - File: `lib/messaging/templates.ts`
   - `orderStatusUpdateTemplate(order, status)`
   - Different messages for each status
   - Include ETA updates

2. **Create Status Update Service**
   - File: `lib/messaging/order-updates.ts`
   - `sendStatusUpdate(orderId, newStatus)`
   - Get order details
   - Send appropriate message

3. **Create Status Update API**
   - File: `app/api/orders/[id]/status/route.ts`
   - Endpoint: `PATCH /api/orders/[id]/status`
   - Update order status
   - Trigger WhatsApp notification

4. **Add Status Update to Admin Panel**
   - Update order status buttons
   - Call status update API
   - Show confirmation

5. **Status Flow**
   - Pending → Preparing
   - Preparing → Ready
   - Ready → Out for Delivery
   - Out for Delivery → Delivered

### Testing Phase 7:

**Test Cases:**
1. ✅ Status changed to "Preparing" → Guest receives update
2. ✅ Status changed to "Ready" → Guest receives update
3. ✅ Status changed to "Out for Delivery" → Guest receives update
4. ✅ Status changed to "Delivered" → Guest receives final confirmation
5. ✅ Each status has appropriate message
6. ✅ ETA updates included

**How to Test:**
```bash
# Update order status
curl -X PATCH "http://localhost:3000/api/orders/1234/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "preparing"}'

# Check guest receives WhatsApp update
```

**Expected Result:**
- Guest receives status updates
- Messages sent at each status change
- Messages formatted correctly
- ETA updates included

### Deliverables:
- ✅ Status update messages working
- ✅ Guests notified of progress
- ✅ Admin can update status
- ✅ All status transitions covered

---

## Phase 8: Guest Name Matching
**Goal:** Verify guest name matches booking for additional security

### Tasks:

1. **Create Name Matching Function**
   - File: `lib/validation/name-matching.ts`
   - `matchGuestName(orderName, bookingName)`
   - Fuzzy matching (case-insensitive)
   - Handle middle names
   - Handle name variations

2. **Update Validation to Include Name Check**
   - Update `lib/validation/room-validation.ts`
   - Add name matching to validation flow
   - Get booking guest name
   - Compare with order guest name

3. **Update Validation API**
   - Update `app/api/guest/validate-room/route.ts`
   - Include name matching in response
   - Return name match status

4. **Update Frontend**
   - Show name validation status
   - Warn if name doesn't match
   - Allow submission with warning (or require exact match)

5. **Update Order Creation**
   - Validate name on order creation
   - Reject if name doesn't match (strict) or flag for review (lenient)

### Testing Phase 8:

**Test Cases:**
1. ✅ Exact name match → "✓ Name verified"
2. ✅ Case difference (John vs john) → "✓ Name verified"
3. ✅ Middle name difference → "✓ Name verified" (fuzzy)
4. ✅ Completely different name → "⚠ Name doesn't match"
5. ✅ Name validation in order creation → Validates on submit
6. ✅ Mismatched name → Order rejected or flagged

**How to Test:**
- Enter room number
- Enter matching guest name → Should verify
- Enter different name → Should warn
- Try to submit with mismatched name → Should reject or flag

**Expected Result:**
- Name matching works
- Fuzzy matching handles variations
- Clear warnings for mismatches
- Security enhanced

### Deliverables:
- ✅ Guest name validation working
- ✅ Fuzzy matching implemented
- ✅ Frontend shows name status
- ✅ Additional security layer

---

## Phase 9: Two-Way Communication (Webhooks)
**Goal:** Handle incoming messages from guests and respond

### Tasks:

1. **Set Up Twilio Webhook**
   - Configure webhook in Twilio Console
   - Go to WhatsApp → Sandbox → Configure
   - Webhook URL: `https://yourdomain.com/api/messaging/webhook`
   - Set webhook secret
   - For production: Configure in WhatsApp Business API settings

2. **Create Webhook Endpoint**
   - File: `app/api/messaging/webhook/route.ts`
   - Endpoint: `POST /api/messaging/webhook`
   - Verify webhook signature (Twilio request validation)
   - Parse incoming messages (Twilio webhook format)

3. **Handle Incoming Messages**
   - Identify message sender (phone number from Twilio)
   - Find associated order/room
   - Route message to appropriate handler
   - Store message in database

4. **Create Message Routing**
   - Guest messages → Route to staff
   - Staff can respond → Send to guest
   - Auto-responses for common queries

5. **Add Message Storage**
   - Create messages table
   - Store all messages
   - Link to orders/rooms

6. **Staff Response Interface**
   - Show incoming messages in admin panel
   - Allow staff to respond
   - Send response via WhatsApp

### Testing Phase 9:

**Test Cases:**
1. ✅ Guest sends WhatsApp message → Received by webhook
2. ✅ Message routed to staff group
3. ✅ Staff can see message in admin panel
4. ✅ Staff can respond → Guest receives response
5. ✅ Auto-responses work for common queries
6. ✅ Messages stored in database

**How to Test:**
- Send WhatsApp message to hotel number
- Check webhook receives message
- Check staff group receives notification
- Respond from admin panel
- Check guest receives response

**Expected Result:**
- Two-way communication working
- Messages routed correctly
- Staff can respond
- Messages stored

### Deliverables:
- ✅ Webhook receiving messages
- ✅ Message routing working
- ✅ Staff can respond
- ✅ Two-way communication functional

---

## Phase 10: Rate Limiting & Advanced Security
**Goal:** Add rate limiting and additional security measures

### Tasks:

1. **Create Rate Limiting Service**
   - File: `lib/validation/rate-limiting.ts`
   - `checkRateLimit(roomNumber)`
   - Max orders per room per day
   - Track in database or cache

2. **Integrate Rate Limiting**
   - Add to order validation
   - Check before creating order
   - Return clear error if limit exceeded

3. **Add IP Tracking**
   - Track IP addresses with orders
   - Flag suspicious patterns
   - Block abusive IPs (optional)

4. **Add Session Validation**
   - Check session age
   - Require refresh for old sessions
   - Validate session on order

5. **Add Validation Logging**
   - Log all validation attempts
   - Log failures for monitoring
   - Track validation metrics

6. **Create Admin Dashboard for Monitoring**
   - Show validation stats
   - Show rejected orders
   - Monitor for abuse patterns

### Testing Phase 10:

**Test Cases:**
1. ✅ Rate limiting → Max orders reached, rejects new order
2. ✅ Rate limit resets daily
3. ✅ IP tracking → Logs IP with orders
4. ✅ Session expiration → Requires refresh
5. ✅ Validation logging → Logs appear in database
6. ✅ Admin dashboard → Shows validation stats

**How to Test:**
- Place multiple orders from same room → Should hit rate limit
- Check rate limit error message
- Check logs for validation attempts
- Check admin dashboard for stats

**Expected Result:**
- Rate limiting prevents abuse
- IP tracking working
- Session validation works
- Monitoring in place

### Deliverables:
- ✅ Rate limiting implemented
- ✅ IP tracking working
- ✅ Session validation (if needed)
- ✅ Logging and monitoring
- ✅ Admin dashboard (optional)

---

## Phase 11: In-App Notifications for Staff
**Goal:** Add real-time in-app notifications in admin panel

### Tasks:

1. **Set Up WebSocket or SSE**
   - Choose: WebSocket (Socket.io) or Server-Sent Events
   - Set up connection
   - Create notification service

2. **Create Notification Component**
   - File: `components/admin/OrderNotifications.tsx`
   - Real-time notification display
   - Show new orders
   - Show status updates

3. **Integrate with Order Creation**
   - Emit notification when order created
   - Emit notification when status changes
   - Broadcast to connected staff

4. **Add Notification Preferences**
   - Staff can enable/disable notifications
   - Choose notification types
   - Sound alerts (optional)

5. **Add Notification History**
   - Show notification log
   - Mark as read/unread
   - Filter notifications

### Testing Phase 11:

**Test Cases:**
1. ✅ New order → Staff sees in-app notification
2. ✅ Status update → Staff sees notification
3. ✅ Multiple staff → All receive notifications
4. ✅ Notification preferences → Can enable/disable
5. ✅ Notification history → Shows past notifications

**How to Test:**
- Open admin panel
- Create order from guest portal
- Check admin panel shows notification
- Update order status
- Check notification appears

**Expected Result:**
- Real-time notifications working
- Staff see updates instantly
- Notification preferences work
- Better staff experience

### Deliverables:
- ✅ In-app notifications working
- ✅ Real-time updates
- ✅ Notification preferences
- ✅ Better staff experience

---

## Phase 12: Polish & Production Readiness
**Goal:** Final polish, error handling, and production deployment

### Tasks:

1. **Error Handling Improvements**
   - Comprehensive error handling
   - User-friendly error messages
   - Retry logic for failed messages
   - Fallback mechanisms

2. **Performance Optimization**
   - Optimize database queries
   - Add caching where appropriate
   - Optimize message sending
   - Reduce API call latency

3. **Testing & QA**
   - End-to-end testing
   - Load testing
   - Error scenario testing
   - User acceptance testing

4. **Documentation**
   - API documentation
   - Setup guide
   - Troubleshooting guide
   - User guide

5. **Monitoring & Analytics**
   - Set up error tracking (Sentry)
   - Message delivery tracking
   - Order metrics
   - Performance monitoring

6. **Production Deployment**
   - Environment setup
   - Webhook configuration
   - SSL certificates
   - Database backups

### Testing Phase 12:

**Test Cases:**
1. ✅ All features working end-to-end
2. ✅ Error handling robust
3. ✅ Performance acceptable
4. ✅ Monitoring in place
5. ✅ Production ready

**How to Test:**
- Complete end-to-end flow
- Test error scenarios
- Load test
- Check monitoring
- Verify production setup

**Expected Result:**
- System production ready
- All features working
- Monitoring in place
- Documentation complete

### Deliverables:
- ✅ Production-ready system
- ✅ Comprehensive error handling
- ✅ Monitoring and analytics
- ✅ Documentation complete
- ✅ Ready for launch

---

## Implementation Timeline

### Week 1: Foundation
- **Day 1-2:** Phase 1 (Twilio Setup)
- **Day 3-4:** Phase 2 (Room Validation)
- **Day 5:** Phase 3 (Order Creation with Validation)

### Week 2: Core Features
- **Day 1-2:** Phase 4 (Guest WhatsApp Confirmations)
- **Day 3-4:** Phase 5 (Staff WhatsApp Notifications)
- **Day 5:** Phase 6 (Frontend Integration)

### Week 3: Advanced Features
- **Day 1-2:** Phase 7 (Status Updates)
- **Day 3:** Phase 8 (Name Matching)
- **Day 4-5:** Phase 9 (Two-Way Communication)

### Week 4: Security & Polish
- **Day 1-2:** Phase 10 (Rate Limiting)
- **Day 3:** Phase 11 (In-App Notifications)
- **Day 4-5:** Phase 12 (Polish & Production)

---

## Testing Strategy

### Per Phase Testing:
- ✅ Unit tests for functions
- ✅ Integration tests for APIs
- ✅ Manual testing for UI
- ✅ End-to-end testing for flows

### Test Data Needed:
- Test hotel with rooms
- Test bookings (checked-in, checked-out)
- Test phone numbers for WhatsApp
- Test WhatsApp groups
- Twilio sandbox number for testing

### Test Scenarios:
1. Valid order flow (end-to-end)
2. Invalid room scenarios
3. Checked-out room scenarios
4. Message delivery scenarios
5. Error handling scenarios

---

## Success Criteria

### Phase 1-3 Complete:
- ✅ Twilio working
- ✅ Room validation working
- ✅ Orders created with validation

### Phase 4-6 Complete:
- ✅ Guest receives WhatsApp confirmations
- ✅ Staff receive notifications
- ✅ Frontend validates in real-time

### Phase 7-9 Complete:
- ✅ Status updates sent
- ✅ Name matching working
- ✅ Two-way communication working

### Phase 10-12 Complete:
- ✅ Rate limiting prevents abuse
- ✅ In-app notifications working
- ✅ Production ready

---

## Quick Start: Begin with Phase 1

Ready to start? Begin with Phase 1 (Twilio Setup) and test thoroughly before moving to Phase 2.

Each phase builds on the previous, so complete and test each phase before moving forward.

---

## Twilio Pricing Reference

**WhatsApp:**
- Template Messages: **$0.0042 per message** (0.42 cents)
- Session Messages: **$0.005 per message** (0.5 cents)
- Free for 24-hour customer conversations

**SMS:**
- US SMS: **$0.0079 per message** (0.79 cents)
- International: Varies by country

**Estimated Cost for 100 orders/day:**
- WhatsApp: ~$50/month
- SMS (verification): ~$24/month
- **Total: ~$74/month**

**Official Pricing:** https://www.twilio.com/en-us/pricing

