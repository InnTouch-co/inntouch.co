# Phase 2 Testing: Room Validation System

## What We've Built

✅ Database queries for room validation
✅ Validation functions
✅ Validation API endpoint
✅ Type definitions

## Test the Validation API

### Test 1: Valid Room with Active Booking

```bash
curl "http://localhost:3000/api/guest/validate-room?room_number=205&hotel_id=YOUR_HOTEL_ID"
```

**Expected Response (if room is checked in):**
```json
{
  "valid": true,
  "reason": undefined,
  "room": {
    "id": "...",
    "hotel_id": "...",
    "room_number": "205",
    "status": "occupied"
  },
  "booking": {
    "id": "...",
    "guest_name": "John Smith",
    "check_in_date": "2024-01-15",
    "check_out_date": "2024-01-17",
    "status": "checked_in"
  }
}
```

### Test 2: Room Doesn't Exist

```bash
curl "http://localhost:3000/api/guest/validate-room?room_number=999&hotel_id=YOUR_HOTEL_ID"
```

**Expected Response:**
```json
{
  "valid": false,
  "reason": "Room not found",
  "room": null,
  "booking": null
}
```

### Test 3: Room Exists but No Active Booking

```bash
curl "http://localhost:3000/api/guest/validate-room?room_number=205&hotel_id=YOUR_HOTEL_ID"
```

**Expected Response (if room is not checked in):**
```json
{
  "valid": false,
  "reason": "Room is not currently checked in",
  "room": {
    "id": "...",
    "room_number": "205",
    "status": "available"
  },
  "booking": null
}
```

### Test 4: Room Checked Out

If checkout date is today and it's past 11:00 AM:

```bash
curl "http://localhost:3000/api/guest/validate-room?room_number=205&hotel_id=YOUR_HOTEL_ID"
```

**Expected Response:**
```json
{
  "valid": false,
  "reason": "Room has been checked out",
  "room": {...},
  "booking": {...}
}
```

### Test 5: Room in Maintenance

```bash
curl "http://localhost:3000/api/guest/validate-room?room_number=205&hotel_id=YOUR_HOTEL_ID"
```

**Expected Response:**
```json
{
  "valid": false,
  "reason": "Room is in maintenance and unavailable",
  "room": {
    "status": "maintenance"
  },
  "booking": null
}
```

### Test 6: With Guest Name Matching

```bash
curl "http://localhost:3000/api/guest/validate-room?room_number=205&hotel_id=YOUR_HOTEL_ID&guest_name=John%20Smith"
```

**Expected Response (if name matches):**
```json
{
  "valid": true,
  ...
}
```

**Expected Response (if name doesn't match):**
```json
{
  "valid": false,
  "reason": "Guest name does not match booking",
  ...
}
```

## Test Scenarios Checklist

- [ ] Valid room with active booking → `valid: true`
- [ ] Room doesn't exist → `valid: false, reason: "Room not found"`
- [ ] Room exists but no booking → `valid: false, reason: "Room is not currently checked in"`
- [ ] Room checked out → `valid: false, reason: "Room has been checked out"`
- [ ] Room in maintenance → `valid: false, reason: "Room is in maintenance and unavailable"`
- [ ] Guest name matches → `valid: true`
- [ ] Guest name doesn't match → `valid: false, reason: "Guest name does not match booking"`

## Next Steps

Once testing is complete, we'll move to Phase 3: Order Creation with Validation integrated.

