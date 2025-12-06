# Testing Cookie Consent and Data Requests

This guide explains how to test the cookie consent and data request features.

## Prerequisites

1. **Run the database migration** (if not already done):
   ```bash
   cd inntouch-co
   # Go to Supabase Dashboard > SQL Editor
   # Run: supabase/migrations/031_create_consent_tables.sql
   ```

2. **Ensure you have:**
   - A hotel created in the system
   - A room checked in with guest information
   - Super admin access to view the admin pages

---

## Part 1: Testing Cookie Consent

### Step 1: Access Guest Site

1. Open the guest site with a valid room number:
   ```
   http://localhost:3000/guest/{hotelId}?room={roomNumber}
   ```
   Example: `http://localhost:3000/guest/5ec63c95-2a5e-4662-a271-fd04a183fb20?room=1`

2. You should see the **Cookie Consent Banner** at the bottom of the page.

### Step 2: Accept Cookies

1. Click **"Accept All"** on the cookie banner
2. Check the browser console (F12) for:
   - `Cookie consent saved successfully` message
   - No error messages

### Step 3: Verify in Database

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard > Table Editor
2. Open the `cookie_consents` table
3. You should see a new record with:
   - `hotel_id`: Your hotel ID
   - `session_id`: A unique session ID
   - `consent_given`: `true`
   - `essential_cookies`: `true`
   - `analytics_cookies`, `marketing_cookies`, `functional_cookies`: Based on your selection

**Option B: Via Admin Panel**
1. Log in as **super admin**
2. Navigate to **Cookie Consents** in the sidebar
3. Select your hotel from the dropdown
4. You should see the consent record with:
   - Status: "Given" (green badge)
   - User Type: "Guest (Session)"
   - Preferences: Shows which cookie types were accepted
   - Date: Current date/time
   - IP Address: Your IP address

### Step 4: Test Custom Cookie Preferences

1. Clear browser localStorage:
   ```javascript
   localStorage.removeItem('cookie_consent_given')
   localStorage.removeItem('cookie_preferences')
   ```
2. Refresh the page
3. Click **"Customize"** on the cookie banner
4. Toggle different cookie types (Analytics, Marketing, Functional)
5. Click **"Save Preferences"**
6. Verify in admin panel that preferences are saved correctly

### Step 5: Test Cookie Consent History

1. In Supabase Dashboard, check the `consent_history` table
2. You should see records logged for each consent change
3. Each record includes:
   - `action`: "granted" or "revoked"
   - `category`: "analytics", "marketing", or "functional"
   - `previous_value` and `new_value`

---

## Part 2: Testing Data Requests

### Step 1: Access Privacy Settings

1. From the guest site, navigate to:
   ```
   http://localhost:3000/guest/{hotelId}/privacy-settings?room={roomNumber}
   ```
   Or click the link in the footer: "Privacy Settings"

2. You should see the Privacy Settings page with:
   - Download My Data button
   - Request Data Deletion button
   - Cookie Preferences button
   - Legal Documents links

### Step 2: Test Data Access Request (Download)

1. Click **"Download"** button under "Download My Data"
2. A JSON file should download automatically
3. Open the downloaded file - it should contain:
   ```json
   {
     "personal_information": {
       "name": "Guest Name",
       "email": "guest@example.com",
       "phone": "+1234567890",
       "room_number": "1",
       "check_in_date": "2025-01-01",
       "check_out_date": "2025-01-02"
     },
     "bookings": [...],
     "orders": [...],
     "service_requests": [...],
     "exported_at": "2025-01-01T12:00:00.000Z"
   }
   ```

### Step 3: Test Data Deletion Request

1. Click **"Delete"** button under "Request Data Deletion"
2. Confirm the deletion request in the popup
3. You should see a success toast: "Deletion request submitted. We will process it within 30 days."

### Step 4: Verify Deletion Request in Admin Panel

1. Log in as **super admin**
2. Navigate to **Data Requests** in the sidebar
3. Select your hotel from the dropdown
4. You should see the deletion request with:
   - Type: "deletion"
   - Status: "pending" (yellow badge)
   - Requested: Current date
   - Verified: "⚠ Unverified" (yellow)

### Step 5: Process Data Request (Admin)

1. Click **"View"** button on the data request
2. Review the request details in the modal
3. Click **"Mark as Completed"** or **"Reject"**
4. The status should update in the table

### Step 6: Test Data Export (Admin)

1. For an "access" type request, click **"Export"** button
2. A JSON file should download with all guest data
3. Verify the exported data matches the guest's information

---

## Part 3: Testing Edge Cases

### Test 1: Cookie Consent Without Hotel ID

1. Clear cookies and localStorage
2. Access a page without `hotelId` in the URL
3. Cookie consent should still save to localStorage
4. Check console - should show "Failed to save consent to database" (expected)

### Test 2: Data Request Without Active Booking

1. Try to access privacy settings with a room that's not checked in
2. Should show error: "No active booking found for this room"

### Test 3: Multiple Cookie Consents

1. Accept cookies multiple times from the same session
2. Check database - should update the existing record, not create duplicates
3. Check `consent_history` - should log each change

### Test 4: Super Admin Access Control

1. Log in as **hotel admin** (not super admin)
2. Try to access `/admin/cookie-consents` - should redirect to home
3. Try to access `/admin/data-requests` - should redirect to home
4. API calls should return 403 Forbidden

---

## Part 4: API Testing (Optional)

### Test Cookie Consent API

```bash
# POST - Save cookie consent
curl -X POST "http://localhost:3000/api/consent/cookies" \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "5ec63c95-2a5e-4662-a271-fd04a183fb20",
    "session_id": "test-session-123",
    "essential_cookies": true,
    "analytics_cookies": true,
    "marketing_cookies": false,
    "functional_cookies": true,
    "consent_given": true
  }'

# GET - Retrieve cookie consent
curl "http://localhost:3000/api/consent/cookies?hotel_id=5ec63c95-2a5e-4662-a271-fd04a183fb20&session_id=test-session-123"
```

### Test Data Request API

```bash
# GET - Download guest data
curl "http://localhost:3000/api/guest/data-request?hotel_id=5ec63c95-2a5e-4662-a271-fd04a183fb20&room_number=1&type=access" \
  -o my-data.json

# POST - Create deletion request
curl -X POST "http://localhost:3000/api/guest/data-request" \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "5ec63c95-2a5e-4662-a271-fd04a183fb20",
    "room_number": "1",
    "request_type": "deletion",
    "description": "Test deletion request"
  }'
```

---

## Troubleshooting

### Cookie Consent Not Saving

1. **Check database migration**: Ensure `031_create_consent_tables.sql` has been run
2. **Check browser console**: Look for error messages
3. **Check Network tab**: Verify `/api/consent/cookies` request returns 200
4. **Check middleware**: Ensure `/api/consent` is in `publicRoutes`

### Data Request Not Working

1. **Check room status**: Room must be checked in with an active booking
2. **Check API response**: Look for error messages in Network tab
3. **Verify hotel_id and room_number**: Both must be valid

### Admin Panel Not Showing Data

1. **Check user role**: Must be logged in as `super_admin`
2. **Check hotel selection**: Must select a hotel from dropdown
3. **Check API response**: Look for 403 Forbidden errors

---

## Expected Database State

After testing, you should have:

1. **`cookie_consents` table**:
   - At least one record per test session
   - `consent_given = true`
   - Proper `hotel_id` and `session_id`

2. **`consent_history` table**:
   - Records for each consent change
   - Proper `action` and `category` values

3. **`data_requests` table**:
   - At least one deletion request
   - `status = 'pending'` or `'completed'`
   - Proper `hotel_id` and `guest_id`

---

## Success Criteria

✅ Cookie banner appears on guest site  
✅ Accepting cookies saves to database  
✅ Cookie consents visible in admin panel (super admin only)  
✅ Data download works from privacy settings  
✅ Deletion request creates record in database  
✅ Data requests visible in admin panel (super admin only)  
✅ Admin can process/export data requests  
✅ Non-super admins cannot access these pages  


