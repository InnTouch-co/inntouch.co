# WhatsApp Message Template Setup

## Problem
Twilio WhatsApp only allows freeform messages within 24 hours of the last message from the recipient. For order confirmations (which may be the first message), you need to use a **Message Template**.

## Solution: Create a Message Template

### Step 1: Go to Twilio Console
1. Log in to https://console.twilio.com
2. Navigate to: **Messaging** → **Content Manager** → **Templates**
3. Click **Create New Template**

### Step 2: Create Order Confirmation Template

**Template Name:** `order_confirmation` (or any name you prefer)

**Template Content:**
```
✅ Order Confirmed!

Order #{{1}}
Room {{2}} - {{3}}

Items:
{{4}}

Total: ${{5}}

Estimated delivery: {{6}} minutes

We'll notify you when your order is ready! 🍽️
```

**Template Variables:**
- `{{1}}` = Order Number (e.g., ORD-2025-000001)
- `{{2}}` = Room Number (e.g., 3)
- `{{3}}` = Guest Name (e.g., John Doe)
- `{{4}}` = Items List (e.g., "• 1x Beef Steak - $28.00\n• 2x Mojito - $24.00")
- `{{5}}` = Total Amount (e.g., 52.00)
- `{{6}}` = Estimated Delivery Minutes (e.g., 25)

**Note:** WhatsApp templates have specific formatting rules. You may need to adjust based on WhatsApp's requirements.

### Step 3: Submit for Approval
- Templates need to be approved by WhatsApp (usually takes 24-48 hours)
- Once approved, you'll get a **Content SID**

### Step 4: Add Content SID to Environment Variables

Add to your `.env.local`:

```env
TWILIO_WHATSAPP_TEMPLATE_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Replace `HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with your actual Content SID from Twilio.

### Step 5: Update Code (Already Done)
The code is already set up to use the template if `TWILIO_WHATSAPP_TEMPLATE_SID` is set.

## Alternative: Quick Test (Sandbox Only)

If you're still in Twilio Sandbox mode:
1. Send a message to the sandbox number first: `+1 415 523 8886`
2. Reply with the join code
3. Then you can send freeform messages within 24 hours

**Note:** This only works for testing. For production, you must use Message Templates.

## Testing

After setting up the template, test with:

```bash
curl -X POST "http://localhost:3000/api/messaging/test" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+17737915686",
    "message": "Test order confirmation",
    "type": "whatsapp"
  }'
```

## Troubleshooting

### Error 63016: "outside the allowed window"
- **Solution:** Create and use a Message Template (see above)
- **Temporary:** Send a message to the sandbox number first to open the 24-hour window

### Template Not Approved
- Templates can take 24-48 hours to be approved
- Check status in Twilio Console → Content Manager → Templates
- Make sure template follows WhatsApp's formatting guidelines

### Template Variables Not Working
- Ensure variable placeholders match exactly: `{{1}}`, `{{2}}`, etc.
- Variables must be passed in the correct order
- Some special characters may not be allowed in templates

## Additional Templates to Create

You'll need multiple templates for different scenarios. Here are all the templates to submit:

---

### Template 2: Order Ready

**Template Name:** `order_ready`

**Template Content:**
```
🎉 Your order is ready!

Order #{{1}}
Room {{2}}

Your order has been prepared and is ready for delivery.

We'll bring it to your room shortly! 🚚
```

**Template Variables:**
- `{{1}}` = Order Number (e.g., ORD-2025-000001)
- `{{2}}` = Room Number (e.g., 3)

**Category:** UTILITY

---

### Template 3: Order Delivered

**Template Name:** `order_delivered`

**Template Content:**
```
✅ Order Delivered!

Order #{{1}} has been delivered to Room {{2}}.

Thank you for your order! We hope you enjoy your meal. 🍽️

If you need anything else, just let us know!
```

**Template Variables:**
- `{{1}}` = Order Number (e.g., ORD-2025-000001)
- `{{2}}` = Room Number (e.g., 3)

**Category:** UTILITY

---

### Template 4: Check-in Confirmation

**Template Name:** `checkin_confirmation`

**Template Content:**
```
Welcome to {{1}}! 🏨

Hello {{2}},

Your check-in is confirmed for Room {{3}}.

Check-in: {{4}}
Check-out: {{5}}

Access our guest services and order room service:
🔗 {{6}}

We're delighted to have you with us! If you need anything during your stay, just let us know.

Enjoy your stay! ✨
```

**Template Variables:**
- `{{1}}` = Hotel Name (e.g., Grand Hotel)
- `{{2}}` = Guest Name (e.g., John Doe)
- `{{3}}` = Room Number (e.g., 3)
- `{{4}}` = Check-in Date (e.g., Nov 14, 2025)
- `{{5}}` = Check-out Date (e.g., Nov 15, 2025)
- `{{6}}` = Guest Site Link (e.g., https://yourdomain.com/guest/abc123?room=3)

**Category:** UTILITY

**Note:** The guest site link should be dynamically generated with the hotel ID and room number when sending the message.

**Link Formatting:** Consider using a URL shortener (e.g., Bit.ly) to create cleaner, shorter links. See `docs/WHATSAPP_LINK_FORMATTING.md` for options.

---

### Template 5: Check-out Reminder

**Template Name:** `checkout_reminder`

**Template Content:**
```
Reminder: Check-out Today 📅

Hello {{1}},

This is a friendly reminder that your check-out is scheduled for today, {{2}}.

Room: {{3}}

View your orders and services:
🔗 {{4}}

Please visit the front desk to complete your checkout. If you have any pending service charges, they will be settled at that time.

Thank you for staying with us! We hope to see you again soon! 🙏
```

**Template Variables:**
- `{{1}}` = Guest Name (e.g., John Doe)
- `{{2}}` = Check-out Date (e.g., Nov 15, 2025)
- `{{3}}` = Room Number (e.g., 3)
- `{{4}}` = Guest Site Link (e.g., https://yourdomain.com/guest/abc123?room=3)

**Category:** UTILITY

**Note:** The guest site link should be dynamically generated with the hotel ID and room number when sending the message. This allows guests to view their orders and access services before checkout.

**Link Formatting:** Consider using a URL shortener (e.g., Bit.ly) to create cleaner, shorter links. See `docs/WHATSAPP_LINK_FORMATTING.md` for options.

---

### Template 6: Service Request Confirmation

**Template Name:** `service_request_confirmation`

**Template Content:**
```
✅ Service Request Confirmed!

Hello {{1}},

Your {{2}} booking request has been received.

Room: {{3}}
Date: {{4}}
Time: {{5}}

We'll confirm your appointment shortly. If you have any questions, please contact the front desk.

Thank you! 🙏
```

**Template Variables:**
- `{{1}}` = Guest Name (e.g., John Doe)
- `{{2}}` = Service Type (e.g., Spa Appointment, Fitness Session)
- `{{3}}` = Room Number (e.g., 3)
- `{{4}}` = Date (e.g., Nov 15, 2025)
- `{{5}}` = Time (e.g., 2:00 PM)

**Category:** UTILITY

---

## Step-by-Step: Submitting All Templates

### For Each Template:

1. **Go to Twilio Console**
   - Navigate to: **Messaging** → **Content Manager** → **Templates**
   - Click **Create New Template**

2. **Fill in Template Details**
   - **Template Name:** Use the name provided above (e.g., `order_ready`)
   - **Category:** Select **UTILITY** (for transactional messages)
   - **Language:** Select your language (e.g., English)
   - **Content:** Copy and paste the template content

3. **Add Variables**
   - Replace `{{1}}`, `{{2}}`, etc. with actual variable placeholders
   - Twilio will automatically detect `{{1}}`, `{{2}}` format
   - Make sure variables are in order (1, 2, 3, etc.)

4. **Submit for Approval**
   - Click **Submit**
   - Wait for approval (24-48 hours typically)
   - Once approved, copy the **Content SID** (starts with `HX`)

5. **Add to Environment Variables**
   - Add each Content SID to `.env.local`:
   ```env
   TWILIO_WHATSAPP_TEMPLATE_ORDER_CONFIRMATION=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_TEMPLATE_ORDER_READY=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_TEMPLATE_ORDER_DELIVERED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_TEMPLATE_CHECKIN=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_TEMPLATE_CHECKOUT_REMINDER=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_WHATSAPP_TEMPLATE_SERVICE_REQUEST=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## Important Notes

1. **Template Approval Time:** Each template takes 24-48 hours to be approved by WhatsApp
2. **Submit All at Once:** You can submit all templates at the same time - they'll be reviewed in parallel
3. **Template Names:** Use clear, descriptive names (they're only for your reference)
4. **Variable Order:** Variables must be numbered sequentially: `{{1}}`, `{{2}}`, `{{3}}`, etc.
5. **Character Limits:** Keep templates concise - WhatsApp has character limits
6. **Emojis:** Use emojis sparingly - some may not be approved
7. **Category:** Always use **UTILITY** category for transactional messages

## Production Considerations

1. **Template Approval:** Plan ahead - templates need approval time (submit all at once!)
2. **Multiple Templates:** Each message type needs its own template
3. **Template Variables:** Keep templates simple and compliant with WhatsApp policies
4. **Testing:** Once approved, test each template before going live
5. **Fallback:** If a template fails, the system will log the error but won't block the action

