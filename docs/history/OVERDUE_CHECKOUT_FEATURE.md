# Overdue Checkout Feature

## Problem
Guests were being automatically removed from rooms when the checkout date passed, even though the room was still marked as "occupied". This caused confusion as staff couldn't see guest information or perform manual checkout.

## Solution
Implemented manual checkout control with overdue indicators:

### 1. Removed Automatic Filtering ✅
- **File:** `lib/database/room-validation.ts`
- **Change:** Removed `check_out_date >= today` filter from `getActiveBookingForRoom()`
- **Result:** Bookings remain active until staff manually checks out the guest

**Before:**
```typescript
.gte('check_out_date', today) // Auto-filtered past dates
```

**After:**
```typescript
// NOTE: We DO NOT filter by checkout date anymore
// Staff has full control over checkout process
```

### 2. Updated Booking Query ✅
- **File:** `lib/database/bookings.ts`
- **Change:** Removed date filter from `getActiveBookingByRoomId()`
- **Result:** Active bookings stay active regardless of date

### 3. Added Date Utilities ✅
- **File:** `lib/utils/date-utils.ts` (NEW)
- **Functions:**
  - `isCheckoutOverdue()` - Check if date is in the past
  - `getDaysOverdue()` - Calculate days past checkout
  - `isCheckoutToday()` - Check if checkout is today
  - `isCheckInToday()` - Check if check-in is today

### 4. Added Visual Danger Indicator ✅
- **File:** `app/rooms/page.tsx`
- **Feature:** Overdue checkouts show:
  - Red text for checkout date
  - Warning badge: "⚠️ Xd overdue"
  - Red background with border

**Example Display:**
```
Check-Out: 11/15/2025  ⚠️ 3d overdue
           ↑ Red text   ↑ Red badge
```

### 5. Added Overdue Filter ✅
- **File:** `app/rooms/page.tsx`
- **Feature:** "Overdue Checkouts" smart filter button
- **Location:** Quick Filters section
- **Color:** Red (bg-red-600)

## Features

### Manual Checkout Control
- Staff must explicitly check out guests
- No automatic removal based on date
- Full visibility of guest information even after checkout date

### Overdue Detection
- Automatically detects when checkout date has passed
- Shows clear visual indicators in the table
- Displays number of days overdue

### Smart Filtering
- **Overdue Checkouts**: Show only rooms with past checkout dates
- **Checking Out Today**: Show today's scheduled checkouts
- **Checked In Today**: Show today's check-ins
- **Occupied Rooms**: Show all occupied rooms
- **Pending Orders**: Show rooms with unpaid orders

## User Workflow

### Normal Checkout
1. Guest checkout date arrives
2. Staff sees room in "Checking Out Today" filter
3. Staff performs checkout via "Check Out" button
4. Room becomes available

### Overdue Checkout
1. Checkout date passes
2. Room shows in "Overdue Checkouts" filter
3. Checkout date displays in red with "⚠️ Xd overdue" badge
4. Staff can still see guest info and perform checkout
5. Staff manually checks out guest when ready

## Benefits

✅ **Full Staff Control**: No automatic actions, staff decides when to checkout
✅ **Clear Visibility**: Overdue rooms are immediately obvious with red indicators
✅ **Better Tracking**: Know exactly how many days a guest has overstayed
✅ **No Data Loss**: Guest information remains visible even after date passes
✅ **Easy Filtering**: Quickly find all overdue checkouts with one click

## Implementation Files

- `lib/database/room-validation.ts` - Removed auto-filter
- `lib/database/bookings.ts` - Removed auto-filter
- `lib/utils/date-utils.ts` - Date utility functions
- `app/rooms/page.tsx` - UI updates for filter and indicators

## Testing

### Test Overdue Detection
1. Create a booking with checkout date in the past
2. Navigate to Rooms page
3. Verify:
   - ✅ Guest information still visible
   - ✅ Checkout date shows in red
   - ✅ "X d overdue" badge appears
   - ✅ Room appears in "Overdue Checkouts" filter

### Test Manual Checkout
1. Find an overdue room
2. Click "Check Out" button
3. Verify:
   - ✅ Checkout modal appears
   - ✅ Guest can be checked out normally
   - ✅ Room becomes available after checkout

## Technical Details

### Date Comparison
- Uses `Date.setHours(0, 0, 0, 0)` for accurate day-only comparison
- Handles different timezones correctly
- Consistent across all date utilities

### Performance
- Date checks are performed client-side
- No additional database queries
- Minimal performance impact

### Database
- No schema changes required
- Uses existing `bookings.check_out_date` field
- Backwards compatible with existing data

## Future Enhancements

Possible improvements:
- Email/SMS notifications for overdue checkouts
- Automatic late checkout fees
- Dashboard widget showing overdue count
- Checkout reminder notifications (day before)
- Grace period configuration (allow X hours after checkout time)


