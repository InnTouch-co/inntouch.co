# Phase 3 Setup: Order Creation with Validation

## Step 1: Run Database Migration

You need to run the migration to create the orders table:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the migration file: `supabase/migrations/024_create_orders_table.sql`

Or run it via Supabase CLI:
```bash
supabase migration up
```

## Step 2: Test Order Creation

### Test 1: Valid Order (Room 1 with active booking)

```bash
curl -X POST "http://localhost:3000/api/guest/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "5ec63c95-2a5e-4662-a271-fd04a183fb20",
    "room_number": "1",
    "guest_name": "John Doe",
    "items": [
      {
        "menuItem": {
          "id": "item1",
          "name": "Burger",
          "price": 12.00
        },
        "quantity": 2
      },
      {
        "menuItem": {
          "id": "item2",
          "name": "Fries",
          "price": 5.00
        },
        "quantity": 1
      }
    ],
    "total": 29.00,
    "order_type": "room_service_order",
    "special_instructions": "No onions please"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "order": {
    "id": "...",
    "order_number": "ORD-2024-000001",
    "status": "pending",
    "total_amount": 29.00,
    "created_at": "..."
  }
}
```

### Test 2: Invalid Order (Room 2 - no active booking)

```bash
curl -X POST "http://localhost:3000/api/guest/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "5ec63c95-2a5e-4662-a271-fd04a183fb20",
    "room_number": "2",
    "guest_name": "Jane Smith",
    "items": [...],
    "total": 29.00
  }'
```

**Expected Response:**
```json
{
  "error": "Room is not currently checked in",
  "validation_details": {
    "room": {...},
    "booking": null
  }
}
```

### Test 3: Invalid Order (Room 4 - maintenance)

```bash
curl -X POST "http://localhost:3000/api/guest/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "5ec63c95-2a5e-4662-a271-fd04a183fb20",
    "room_number": "4",
    "guest_name": "Test Guest",
    "items": [...],
    "total": 29.00
  }'
```

**Expected Response:**
```json
{
  "error": "Room is in maintenance and unavailable",
  "validation_details": {
    "room": {...},
    "booking": null
  }
}
```

### Test 4: Invalid Order (Wrong guest name)

```bash
curl -X POST "http://localhost:3000/api/guest/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "hotel_id": "5ec63c95-2a5e-4662-a271-fd04a183fb20",
    "room_number": "1",
    "guest_name": "Wrong Name",
    "items": [...],
    "total": 29.00
  }'
```

**Expected Response:**
```json
{
  "error": "Guest name does not match booking",
  "validation_details": {
    "room": {...},
    "booking": {...}
  }
}
```

## What Gets Created

1. **Order in orders table** with:
   - Unique order number (ORD-YYYY-XXXXXX)
   - All order details
   - Linked to room and booking
   - Items stored as JSONB

2. **Order items in order_items table** (normalized)

3. **Validation ensures**:
   - Room exists
   - Room has active booking
   - Checkout time hasn't passed
   - Guest name matches (if provided)

## Next Steps

After testing, we'll move to Phase 4: Guest WhatsApp Order Confirmations!

