# WhatsApp Templates - Quick Reference

Copy and paste these templates directly into Twilio Console.

## Template 1: Order Confirmation ✅ (Already Submitted)

**Name:** `order_confirmation`  
**Category:** UTILITY

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

**Variables:**
- {{1}} = Order Number
- {{2}} = Room Number
- {{3}} = Guest Name
- {{4}} = Items List
- {{5}} = Total Amount
- {{6}} = Estimated Delivery Minutes

---

## Template 2: Order Ready

**Name:** `order_ready`  
**Category:** UTILITY

```
🎉 Your order is ready!

Order #{{1}}
Room {{2}}

Your order has been prepared and is ready for delivery.

We'll bring it to your room shortly! 🚚
```

**Variables:**
- {{1}} = Order Number
- {{2}} = Room Number

---

## Template 3: Order Delivered

**Name:** `order_delivered`  
**Category:** UTILITY

```
✅ Order Delivered!

Order #{{1}} has been delivered to Room {{2}}.

Thank you for your order! We hope you enjoy your meal. 🍽️

If you need anything else, just let us know!
```

**Variables:**
- {{1}} = Order Number
- {{2}} = Room Number

---

## Template 4: Check-in Confirmation

**Name:** `checkin_confirmation`  
**Category:** UTILITY

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

**Variables:**
- {{1}} = Hotel Name
- {{2}} = Guest Name
- {{3}} = Room Number
- {{4}} = Check-in Date
- {{5}} = Check-out Date
- {{6}} = Guest Site Link (e.g., https://yourdomain.com/guest/abc123?room=3)

---

## Template 5: Check-out Reminder

**Name:** `checkout_reminder`  
**Category:** UTILITY

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

**Variables:**
- {{1}} = Guest Name
- {{2}} = Check-out Date
- {{3}} = Room Number
- {{4}} = Guest Site Link (e.g., https://yourdomain.com/guest/abc123?room=3)

---

## Template 6: Service Request Confirmation

**Name:** `service_request_confirmation`  
**Category:** UTILITY

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

**Variables:**
- {{1}} = Guest Name
- {{2}} = Service Type
- {{3}} = Room Number
- {{4}} = Date
- {{5}} = Time

---

## How to Submit

1. Go to: https://console.twilio.com/us1/develop/sms/content-manager
2. Click **Create New Template**
3. For each template above:
   - Copy the **Name** and **Content**
   - Select **Category: UTILITY**
   - Select **Language: English** (or your language)
   - Paste the content
   - Twilio will auto-detect variables `{{1}}`, `{{2}}`, etc.
   - Click **Submit**
4. Wait 24-48 hours for approval
5. Once approved, copy the **Content SID** (starts with `HX`)
6. Add to `.env.local`:

```env
TWILIO_WHATSAPP_TEMPLATE_ORDER_CONFIRMATION=HX...
TWILIO_WHATSAPP_TEMPLATE_ORDER_READY=HX...
TWILIO_WHATSAPP_TEMPLATE_ORDER_DELIVERED=HX...
TWILIO_WHATSAPP_TEMPLATE_CHECKIN=HX...
TWILIO_WHATSAPP_TEMPLATE_CHECKOUT_REMINDER=HX...
TWILIO_WHATSAPP_TEMPLATE_SERVICE_REQUEST=HX...
```

## Tips

- ✅ Submit all templates at once (they review in parallel)
- ✅ Use exact variable format: `{{1}}`, `{{2}}`, etc. (numbered sequentially)
- ✅ Keep emojis minimal (some may be rejected)
- ✅ Category must be **UTILITY** for transactional messages
- ✅ Templates are reviewed by WhatsApp, not Twilio (takes time)

