# Guests Table Implementation

## ✅ What Was Created

### 1. Database Migration (`026_create_guests_table.sql`)
- **Creates `guests` table** with:
  - Basic info: name, email, phone
  - Preferences (JSONB) for future use
  - Loyalty points for future loyalty program
  - Visit tracking: first_visit_date, last_visit_date, total_visits, total_spent
  - Notes field for staff comments

- **Adds `guest_id` columns** to:
  - `bookings` table
  - `orders` table
  - `service_requests` table

- **Creates indexes** for performance

- **Creates `find_or_create_guest()` function**:
  - Finds existing guest by email or phone
  - Creates new guest if not found
  - Updates visit count and dates automatically

### 2. Database Functions (`lib/database/guests.ts`)
- `findOrCreateGuest()` - Find or create guest
- `getGuestById()` - Get guest by ID
- `getGuests()` - Get all guests for a hotel (with search)
- `updateGuest()` - Update guest information
- `getGuestHistory()` - Get all bookings, orders, and service requests for a guest

### 3. Updated Check-In API
- Now automatically finds/creates guest when checking in
- Links booking to guest record
- Tracks guest visits automatically

## 🚀 Next Steps

### 1. Run the Migration
```bash
# Apply migration 026_create_guests_table.sql to your database
```

**Important**: This migration:
- Creates new `guests` table
- Adds `guest_id` columns to existing tables (nullable, so won't break existing data)
- Creates indexes for performance

### 2. Benefits You Get

**Immediate Benefits:**
- ✅ Guest data is centralized
- ✅ No duplicate guest records
- ✅ Automatic guest matching (by email/phone)

**Future Benefits:**
- 📊 Guest history tracking
- 👥 Identify repeat guests
- 🎁 Loyalty program foundation
- 📝 Guest preferences storage
- 💰 Track total spending per guest

### 3. How It Works

**When Guest Checks In:**
1. Staff enters guest info (name, email, phone)
2. System calls `find_or_create_guest()`
3. Function checks if guest exists (by email or phone)
4. If exists: Updates visit count and dates
5. If new: Creates guest record
6. Booking is linked to guest via `guest_id`

**Guest History:**
- All bookings linked to guest
- All orders linked to guest
- All service requests linked to guest
- Can see complete guest history

### 4. Future Enhancements

**You Can Now:**
- Build guest profile pages
- Show guest order history
- Implement loyalty programs
- Track guest preferences
- Send personalized offers
- Analyze repeat guest patterns

## 📝 Notes

- **Backward Compatible**: Existing bookings/orders still have guest_name/email/phone fields
- **Gradual Migration**: Old data still works, new data uses guest_id
- **Optional**: You can keep guest_name/email/phone in bookings/orders for historical data
- **Flexible**: Can search guests by name, email, or phone

## 🔄 Migration Strategy

**For Existing Data:**
- New check-ins automatically create guest records
- Existing bookings/orders remain unchanged
- Can optionally migrate old data later if needed

**For New Data:**
- All new check-ins create/find guest
- All new orders can link to guest (via booking)
- Guest history builds automatically

