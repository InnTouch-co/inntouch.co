# Twilio Setup Guide

## Step 1: Add Environment Variables

Add these to your `.env.local` file (create it if it doesn't exist):

```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# WhatsApp Configuration (Sandbox)
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# SMS Configuration
TWILIO_PHONE_NUMBER=+18553681652

# Webhook Secret (for later - you can generate a random string)
TWILIO_WEBHOOK_SECRET=your_random_secret_here
```

## Step 2: Set Up WhatsApp Sandbox

1. Go to Twilio Console: https://console.twilio.com
2. Navigate to: **Messaging** → **Try it out** → **Send a WhatsApp message**
3. You'll see a sandbox number and a join code
4. Send the join code to the sandbox number from your WhatsApp
   - Example: Send "join [code]" to `+1 415 523 8886`
5. Once joined, you can send test messages!

## Step 3: Test the Connection

### Test 1: Verify Twilio Connection

```bash
curl http://localhost:3000/api/messaging/test
```

Expected response:
```json
{
  "success": true,
  "message": "Twilio connection verified",
  "account": {
    "accountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "friendlyName": "..."
  }
}
```

### Test 2: Send WhatsApp Message

```bash
curl -X POST "http://localhost:3000/api/messaging/test" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "message": "Hello from Twilio!",
    "type": "whatsapp"
  }'
```

Replace `+1234567890` with your phone number (include country code, e.g., +1 for US).

### Test 3: Send SMS Message

```bash
curl -X POST "http://localhost:3000/api/messaging/test" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "message": "Hello from Twilio SMS!",
    "type": "sms"
  }'
```

## Step 4: Check Your Phone

- WhatsApp message should arrive on WhatsApp
- SMS message should arrive as a regular text

## Troubleshooting

### Error: "Twilio credentials are missing"
- Make sure `.env.local` file exists
- Check that environment variables are set correctly
- Restart your dev server after adding env variables

### Error: "Phone number is not in E.164 format"
- Use format: `+1234567890` (include country code)
- No spaces or dashes
- Example: `+14155551234` for US

### WhatsApp message not received
- Make sure you've joined the sandbox (sent join code)
- Check that phone number includes country code
- Verify sandbox number is correct in `.env.local`

### SMS not working
- Verify `TWILIO_PHONE_NUMBER` is set correctly
- Check that phone number is verified in Twilio (for trial accounts)
- Trial accounts can only send to verified numbers

## Next Steps

Once testing works:
1. ✅ Phase 1 Complete - Twilio is set up and working
2. Move to Phase 2 - Room Validation System
3. Then Phase 3 - Order Creation with Validation

