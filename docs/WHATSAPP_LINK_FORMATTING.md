# WhatsApp Link Formatting Options

WhatsApp automatically converts URLs to clickable links, but you have several options to make them cleaner:

## Option 1: URL Shortener (Recommended) ⭐

Use a URL shortener service to create short, clean links.

### Services:
- **Bit.ly** (free, reliable): https://bit.ly
- **TinyURL** (free): https://tinyurl.com
- **Rebrandly** (custom domains): https://rebrandly.com

### Implementation:
1. When generating the message, shorten the URL first:
   ```typescript
   const fullUrl = `https://yourdomain.com/guest/${hotelId}?room=${roomNumber}`
   const shortUrl = await shortenUrl(fullUrl) // e.g., "bit.ly/abc123"
   ```

2. Use the short URL in the template:
   ```
   Access our guest services:
   👉 bit.ly/abc123
   ```

### Benefits:
- ✅ Clean, short links
- ✅ Professional appearance
- ✅ Can track clicks (analytics)
- ✅ Easy to read

### Example Template:
```
Access our guest services and order room service:
👉 {{6}}
```
Where `{{6}}` = `bit.ly/abc123` (shortened URL)

---

## Option 2: Descriptive Text with URL (Simple)

Put descriptive text and let WhatsApp auto-link the URL.

### Template Format:
```
Access our guest services and order room service:
👉 Click here: {{6}}
```

Or even simpler:
```
Access our guest services:
{{6}}
```

WhatsApp will automatically:
- Make the URL clickable
- Show a link preview (if enabled)
- Display the full URL (but it's clickable)

### Benefits:
- ✅ No additional service needed
- ✅ Works immediately
- ✅ WhatsApp handles linking automatically

### Drawback:
- ❌ Full URL is visible (but clickable)

---

## Option 3: Custom Short Domain

Set up a custom short domain for your hotel.

### Example:
- Full URL: `https://yourdomain.com/guest/abc123?room=3`
- Short URL: `https://yourhotel.com/room3` or `https://stay.yourhotel.com/3`

### Implementation:
1. Set up a subdomain or short domain
2. Create redirects: `/room3` → `/guest/{hotelId}?room=3`
3. Use the short URL in messages

### Benefits:
- ✅ Branded, professional
- ✅ Easy to remember
- ✅ Shorter than full URL

### Drawback:
- ❌ Requires domain setup and redirect configuration

---

## Option 4: Just Show Text (No URL Visible)

Show only descriptive text, but include the URL in a way that's less visible.

### Template Format:
```
Access our guest services and order room service.
Tap the link below:
{{6}}
```

Or use emoji to make it more prominent:
```
Access our guest services:
🔗 {{6}}
```

### Benefits:
- ✅ Cleaner message
- ✅ URL is still clickable
- ✅ No additional services needed

---

## Recommended Approach

**For Production:** Use **Option 1 (URL Shortener)** with Bit.ly:
- Clean, professional appearance
- Can track engagement
- Easy to implement
- Free tier available

**For Quick Implementation:** Use **Option 2 (Descriptive Text)**:
- No setup required
- Works immediately
- WhatsApp auto-links URLs

---

## Implementation Notes

### URL Shortener Integration

You'll need to:
1. Choose a URL shortener service
2. Get API credentials
3. Create a utility function to shorten URLs
4. Use it when generating WhatsApp messages

### Example Code Structure:
```typescript
// lib/utils/url-shortener.ts
export async function shortenUrl(longUrl: string): Promise<string> {
  // Call Bit.ly API or other service
  // Return short URL
}

// When sending WhatsApp message:
const fullUrl = `${baseUrl}/guest/${hotelId}?room=${roomNumber}`
const shortUrl = await shortenUrl(fullUrl)
// Use shortUrl in template variable
```

### Environment Variables:
```env
# URL Shortener (optional)
BITLY_API_KEY=your_bitly_api_key
BITLY_ACCESS_TOKEN=your_bitly_access_token
```

---

## Template Examples

### With Short URL:
```
Access our guest services:
👉 bit.ly/abc123
```

### With Descriptive Text:
```
Access our guest services:
👉 Click here: https://yourdomain.com/guest/abc123?room=3
```

### With Emoji:
```
🔗 Access guest services: {{6}}
```

---

## WhatsApp Behavior

- **Automatic Linking:** WhatsApp automatically makes URLs clickable
- **Link Previews:** WhatsApp shows preview cards for URLs (if enabled)
- **No Markdown:** WhatsApp doesn't support markdown formatting
- **Plain Text:** URLs appear as plain text but are clickable

Choose the option that best fits your needs!

