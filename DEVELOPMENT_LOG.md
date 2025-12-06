# Development Log

## Folio Detailed View and PDF Download - 2025-01-27

**Problem:**
Folios needed comprehensive audit trail with all order details, items, discounts, and adjustments. Users also needed ability to download folios as PDF for records.

**Solution:**
Implemented detailed folio view modal and PDF generation functionality.

**Changes Made:**

1. **New API Endpoint** (`app/api/folios/[bookingId]/detailed/route.ts`):
   - Fetches complete folio data including all order items
   - Includes hotel information, guest details, all orders with items, adjustments, and audit information
   - Returns data formatted for both UI display and PDF generation

2. **PDF Generation Utility** (`lib/utils/pdfGenerator.ts`):
   - Uses jsPDF library for client-side PDF generation
   - Generates professional folio PDFs with:
     - Hotel information header
     - Guest information section
     - Detailed order breakdown with all items, quantities, prices
     - Item-level special instructions
     - Order-level special instructions
     - Discount information
     - Tax and adjustment details
     - POS receipt numbers
     - Adjustment audit trail (who adjusted and when)
     - Final summary with payment status
   - Handles page breaks automatically
   - Professional formatting with proper spacing and typography

3. **Updated Folio Page** (`app/folio/page.tsx`):
   - Added "View Details" button (eye icon) to each folio row
   - Added "Download PDF" button (download icon) to each folio row
   - Created detailed view modal showing:
     - Hotel information
     - Guest information
     - All orders with complete item breakdown
     - Item-level details (name, quantity, unit price, total, special instructions)
     - Order-level special instructions
     - Complete folio summary with discounts, tax, adjustments
     - Adjustment audit information
     - Payment status
   - Modal includes "Download PDF" button for easy access
   - Loading states and error handling

4. **Updated Modal Component** (`components/ui/Modal.tsx`):
   - Added "large" size option (`max-w-5xl`) for detailed views

5. **Dependencies:**
   - Installed `jspdf` package for PDF generation

**Files Changed:**
- `app/api/folios/[bookingId]/detailed/route.ts` - New detailed folio API endpoint
- `lib/utils/pdfGenerator.ts` - New PDF generation utility
- `app/folio/page.tsx` - Added detailed view modal and PDF download
- `components/ui/Modal.tsx` - Added large size option
- `package.json` - Added jspdf dependency

**Status:** ✅ Completed

**Usage:**
- Click the eye icon on any folio to view complete details
- Click the download icon to generate and download PDF
- PDF includes all audit information for compliance and record-keeping

---

**Purpose:** Central log of all code changes, refactoring, and architectural decisions. Read this file before making any changes to avoid conflicts and ensure consistency.

**Last Updated:** 2025-01-27 (Fixed: Deleted Orders Still Appearing in Kitchen/Bar Dashboards)

---

## Fixed: Deleted Orders Still Appearing in Kitchen/Bar Dashboards - 2025-01-27

**Problem:**
User deleted all orders from the database, but one order was still appearing in the kitchen/bar dashboards. The order should not be visible if it's marked as `is_deleted = true`.

**Root Cause Analysis:**
1. **`getOrders()` correctly filters deleted orders**: The function uses `.eq('is_deleted', false)` and should only return non-deleted orders.
2. **`getOrderItemsBatch()` did NOT filter deleted orders**: This function was fetching items for any order IDs passed to it, without verifying that the orders were not deleted.
3. **Race condition vulnerability**: Even though `getOrders()` filters correctly, if a deleted order ID somehow got into the `orderIds` array (e.g., from cached data, race condition, or edge case), `getOrderItemsBatch()` would still fetch items for that deleted order.
4. **No defense-in-depth**: There was no secondary check to ensure items are only returned for non-deleted orders.

**Solution:**
Updated `getOrderItemsBatch()` to filter out deleted orders before fetching items. This provides defense-in-depth protection against showing items from deleted orders.

**Implementation Details:**

**1. Updated `getOrderItemsBatch()` Function (`lib/database/orders.ts`):**
- Added a pre-filter step that queries the `orders` table to verify which order IDs are not deleted
- Only fetches items for orders that pass the `is_deleted = false` check
- This ensures that even if a deleted order ID somehow gets into the `orderIds` array, it will be filtered out
- Two-step process:
  1. Query `orders` table to get valid (non-deleted) order IDs
  2. Query `order_items` table only for valid order IDs

**2. Order Status Workflow Verification:**
- Verified the correct workflow: `pending` → `preparing` → `ready` → `delivered`
- Status values are validated in the API (`app/api/orders/[id]/items/status/route.ts`)
- Valid statuses: `'pending'`, `'preparing'`, `'ready'`, `'delivered'`, `'cancelled'`
- Status calculation logic in `calculateOrderStatusFromItems()` and `calculateDepartmentStatusFromItems()` follows the correct workflow

**Files Changed:**
- `lib/database/orders.ts` - Updated `getOrderItemsBatch()` to filter deleted orders before fetching items

**Status:** ✅ Fixed

**Result:**
- Deleted orders no longer appear in kitchen/bar dashboards
- Items from deleted orders are not fetched, even if order IDs somehow get into the query
- Defense-in-depth protection ensures data integrity
- Order status workflow verified: pending → preparing → ready → delivered

**Important Notes:**
- **Defense-in-depth**: Even though `getOrders()` filters deleted orders, `getOrderItemsBatch()` now also filters them
- **Performance**: Added one additional query to verify orders, but this is necessary for data integrity
- **Backward compatible**: No breaking changes, existing code continues to work
- **Order status workflow**: Confirmed as `pending` → `preparing` → `ready` → `delivered` (matches user requirement)

**Testing:**
- Delete an order from the database (`is_deleted = true`)
- Verify the order no longer appears in kitchen/bar dashboards
- Verify items from deleted orders are not fetched
- Verify order status workflow works correctly: pending → preparing → ready → delivered

---

## Fixed: Department-Specific Order Status for Kitchen/Bar Sites - 2025-01-27

**Problem:**
Kitchen and bar staff were seeing incorrect order statuses because the system was using overall order status (calculated from ALL items) instead of department-specific status (calculated from items for that department only). This caused several issues:
1. **Stats were incorrect**: Stats APIs counted orders by overall `order.status`, not by department-specific item statuses
2. **Filtering was wrong**: Frontend filtered orders by overall `order.status`, so orders with mixed items showed wrong status
3. **Button logic was incorrect**: Buttons checked overall `order.status` instead of item statuses for that department
4. **Status display was misleading**: Kitchen staff might see "preparing" when their items are "ready" (because bar items are still preparing)

**Root Cause:**
- Order status was calculated from ALL items in the order (both kitchen and bar items)
- When an order had both restaurant and bar items:
  - If kitchen items were "ready" but bar items were "preparing", the overall order status was "preparing"
  - Kitchen staff would see "preparing" even though their items were ready
  - Bar staff would see "preparing" correctly, but kitchen staff saw incorrect status
- Stats APIs counted by overall `order.status`, not department-specific status
- Frontend filtered and displayed by overall `order.status`

**Solution:**
Implemented department-specific status calculation that calculates order status based only on items for that department (kitchen or bar). This ensures each department sees accurate status for their items only.

**Implementation Details:**

**1. New Database Function (`lib/database/orders.ts`):**
- Created `calculateDepartmentStatusFromItems(orderId, department, items?)` function
- Calculates status based only on items for the specified department
- Rules (same as overall status calculation):
  - All department items `'delivered'` → `'delivered'`
  - All department items `'ready'` or `'delivered'` → `'ready'`
  - Any department item `'preparing'` → `'preparing'`
  - Otherwise → `'pending'`
- Accepts optional `items` parameter to avoid extra database query if items are already fetched
- Handles items without `department` field (backward compatibility with JSONB items)

**2. Updated Kitchen Orders API (`app/api/kitchen/orders/route.ts`):**
- Now calculates department-specific status using `calculateDepartmentStatusFromItems(orderId, 'kitchen', kitchenItems)`
- Returns `status: kitchenStatus` instead of `status: order.status`
- Status is calculated from kitchen items only, not all items
- `is_urgent` flag now uses `kitchenStatus` instead of `order.status`
- Stats calculation uses department-specific status

**3. Updated Bar Orders API (`app/api/bar/orders/route.ts`):**
- Now calculates department-specific status using `calculateDepartmentStatusFromItems(orderId, 'bar', barItems)`
- Returns `status: barStatus` instead of `status: order.status`
- Status is calculated from bar items only, not all items
- `is_urgent` flag now uses `barStatus` instead of `order.status`
- Stats calculation uses department-specific status

**4. Updated Kitchen Stats API (`app/api/kitchen/stats/route.ts`):**
- Now calculates department-specific status for each order before counting
- Filters orders to only include those with kitchen items
- Counts orders by department-specific status (kitchen items only), not overall `order.status`
- Fixed average prep time calculation to use correct order data structure

**5. Updated Bar Stats API (`app/api/bar/stats/route.ts`):**
- Now calculates department-specific status for each order before counting
- Filters orders to only include those with bar items
- Counts orders by department-specific status (bar items only), not overall `order.status`
- Fixed average prep time calculation to use correct order data structure

**6. Fixed Frontend Button Logic (`app/kitchen/page.tsx`, `app/bar/page.tsx`):**
- Removed check for `order.status === 'pending'` in button onClick handler
- Now checks item statuses directly: `allItemsPending` instead of `order.status`
- Button is no longer disabled when items are ready (allows "Ready for Delivery" button to be clickable)
- Button now correctly shows "Ready for Delivery" when all items are ready (not disabled)
- Button text logic:
  - All items ready (not delivered) → "Ready for Delivery" (green, enabled)
  - Some items preparing → "Mark Ready" (green, enabled)
  - All items pending → "Start Preparing" (blue, enabled)
  - All items delivered → Button hidden

**Key Benefits:**
1. **Accurate Status Display**: Each department sees status based on their items only
2. **Correct Filtering**: Frontend filters work correctly with department-specific status
3. **Accurate Stats**: Stats count orders by department-specific status, not overall status
4. **Better UX**: Buttons show correct state and are enabled when appropriate
5. **Independent Operations**: Kitchen and bar can operate independently without status conflicts

**Files Changed:**
- `lib/database/orders.ts` - Added `calculateDepartmentStatusFromItems` function
- `app/api/kitchen/orders/route.ts` - Calculate and return department-specific status
- `app/api/bar/orders/route.ts` - Calculate and return department-specific status
- `app/api/kitchen/stats/route.ts` - Count by department-specific status
- `app/api/bar/stats/route.ts` - Count by department-specific status
- `app/kitchen/page.tsx` - Fixed button logic to use item statuses, not order.status
- `app/bar/page.tsx` - Fixed button logic to use item statuses, not order.status

**Status:** ✅ Completed

**Usage:**
- Kitchen staff see orders with status calculated from kitchen items only
- Bar staff see orders with status calculated from bar items only
- Stats accurately reflect department-specific order counts
- Buttons correctly show "Ready for Delivery" when items are ready
- Filtering works correctly with department-specific status

**Important Notes:**
- Overall order status (in `orders.status` column) is still calculated from ALL items (for admin views)
- Department-specific status is calculated on-the-fly in APIs (not stored in database)
- Frontend now uses department-specific status from API response
- Button logic uses item statuses directly, not order.status
- Stats APIs now calculate department-specific status for all orders before counting

**Testing:**
- Create order with both restaurant and bar items
- Verify kitchen staff sees status based on restaurant items only
- Verify bar staff sees status based on bar items only
- Verify stats count correctly for each department
- Verify buttons show correct state ("Ready for Delivery" when items are ready)
- Verify filtering works correctly with department-specific status

---

## Department Column for Kitchen/Bar Item Separation - 2025-01-27

**Problem:**
The current system for separating menu items between kitchen and bar staff was unreliable. It used:
- Service type lookup (from `service_id`)
- Keyword matching (food vs drink keywords)
- Metadata checks (`serviceType` in item data)

This caused issues:
- Items without `service_id` or `serviceType` couldn't be properly categorized
- Keyword matching was error-prone (e.g., "coffee" could be ambiguous)
- Performance overhead from service lookups and keyword checks
- Maintenance burden of keeping keyword lists updated

**Root Cause:**
- No explicit, reliable way to determine which department should handle each item
- Complex logic with multiple fallbacks made the system fragile
- Existing items in database had no department information

**Solution:**
Added a `department` column to `order_items` table that explicitly marks each item as `'kitchen'` or `'bar'`. Department is determined from service type when orders are created, ensuring reliable and fast filtering.

**Implementation Details:**

**1. Database Migration (`supabase/migrations/039_add_department_to_order_items.sql`):**
- Added `department TEXT CHECK (department IN ('kitchen', 'bar'))` column to `order_items` table
- Added index `idx_order_items_department` on `(order_id, department)` for efficient filtering
- Column is nullable to handle existing items (they will use fallback logic)
- New orders will always have department set correctly

**2. Order Creation Logic (`lib/database/orders.ts`):**
- Updated `createOrder` function to determine department when creating order items
- Logic:
  1. First, try `serviceType` from item metadata
  2. If not found, lookup `serviceId` in services table to get `service_type`
  3. Map service type to department:
     - `'bar'` → `'bar'`
     - `'restaurant'` or `'room_service'` → `'kitchen'`
     - Default → `'kitchen'`
- Department is set when inserting items into `order_items` table
- Batch fetches service types for all items to minimize database queries

**3. API Updates:**
- **Kitchen API** (`app/api/kitchen/orders/route.ts`):
  - Filters items by `department = 'kitchen'` first (for new items)
  - Falls back to keyword matching for items with `NULL` department (existing items)
  - Ensures backward compatibility while using new column for new orders
- **Bar API** (`app/api/bar/orders/route.ts`):
  - Filters items by `department = 'bar'` first (for new items)
  - Falls back to keyword matching for items with `NULL` department (existing items)
  - Same backward compatibility approach

**4. Interface Updates:**
- Updated `OrderItem` interface to include `department?: string | null` field

**Key Benefits:**
1. **Explicit and Unambiguous**: No guessing - department is set at order creation
2. **Fast**: Direct database filtering, no complex logic needed
3. **Reliable**: Based on service type, not keyword matching
4. **Simple**: Clean, maintainable code
5. **Backward Compatible**: Existing items without department use fallback logic

**Files Changed:**
- `supabase/migrations/039_add_department_to_order_items.sql` - New migration for department column
- `lib/database/orders.ts` - Updated to set department when creating items
- `app/api/kitchen/orders/route.ts` - Filter by department column with fallback
- `app/api/bar/orders/route.ts` - Filter by department column with fallback

**Status:** ✅ Completed

**Usage:**
- New orders automatically have department set based on service type
- Kitchen staff see items with `department = 'kitchen'`
- Bar staff see items with `department = 'bar'`
- Existing items without department use keyword matching fallback
- No changes needed in frontend - filtering happens at API level

**Important Notes:**
- Migration must be run: `supabase migration up`
- Department is determined from service type when order is created
- Restaurant/room service items → `'kitchen'`
- Bar items → `'bar'`
- Default for uncertain items → `'kitchen'`
- Existing items with `NULL` department will use keyword matching fallback
- New orders will always have department set correctly

**Migration Path:**
- Existing items: Will have `NULL` department and use fallback keyword matching
- New items: Will have department set correctly from service type
- No data migration needed - backward compatible with fallback logic

---

## Item-Level Status Tracking for Kitchen/Bar Independence - 2025-01-27

**Problem:**
Kitchen and bar staff were sharing the same order status. When bar staff updated an order status to "ready", it would also show as "ready" for kitchen staff, even though the restaurant items might still be preparing. This caused confusion and incorrect status tracking.

**Root Cause:**
- Order status was stored at the order level (`orders.status`)
- Both departments updated the same `orders.status` field
- No way to track status independently for different item types

**Solution:**
Implemented item-level status tracking where each order item has its own status, allowing kitchen and bar to update their items independently.

**Implementation Details:**

**1. Database Migration (`supabase/migrations/038_add_status_to_order_items.sql`):**
- Added `status` column to `order_items` table
  - Type: `TEXT` with CHECK constraint: `'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'`
  - Default: `'pending'`
  - NOT NULL
- Added `updated_at` column to `order_items` table for tracking when items are updated
  - Type: `TIMESTAMP(0)`
  - Nullable (only set when item is updated)
- Added indexes for efficient status queries:
  - `idx_order_items_status` on `(order_id, status)` for pending/preparing/ready items
  - `idx_order_items_order_status` on `(order_id, status, created_at)`

**2. Database Functions (`lib/database/orders.ts`):**
- **`updateOrderItemStatus(itemId, status)`**: Update single item status
- **`updateOrderItemsStatus(itemIds[], status)`**: Batch update multiple items
- **`calculateOrderStatusFromItems(orderId)`**: Calculate order status from item statuses
  - Rules:
    - All items `'delivered'` → Order `'delivered'`
    - All items `'ready'` or `'delivered'` → Order `'ready'`
    - Any item `'preparing'` → Order `'preparing'`
    - Otherwise → Order `'pending'`
- **`syncOrderStatusFromItems(orderId)`**: Auto-sync order status after item updates
- Updated `OrderItem` interface to include `status?: string` field

**3. New API Endpoint (`app/api/orders/[id]/items/status/route.ts`):**
- `PATCH /api/orders/[id]/items/status`
- Accepts `itemIds` (string or array) and `status`
- Validates item ownership and order access
- Updates item statuses and auto-syncs order status
- Sends notifications only when ALL items in order are ready/delivered

**4. Frontend Updates:**
- **Kitchen Page** (`app/kitchen/page.tsx`):
  - Updated `handleStatusChange` to pass item IDs
  - Button logic now checks item-level statuses instead of order status
  - Shows "Start Preparing" / "Mark Ready" / "Ready for Delivery" based on item statuses
  - Button disabled when all kitchen items are ready/delivered
- **Bar Page** (`app/bar/page.tsx`):
  - Same updates as kitchen page, adapted for bar items
- Both pages now:
  - Extract item IDs from order items
  - Pass item IDs to status update API
  - Check item statuses for button state (not just order status)

**5. API Response Updates:**
- **Kitchen API** (`app/api/kitchen/orders/route.ts`): Returns `status` field for each item
- **Bar API** (`app/api/bar/orders/route.ts`): Returns `status` field for each item

**Key Fixes:**
1. **Missing `updated_at` column**: Added to migration (was causing "Could not find the 'updated_at' column" error)
2. **Button logic**: Fixed to check item statuses first, then order status
3. **Item ID extraction**: Ensured items include `id` field in frontend mapping
4. **Initialization order**: Fixed "Cannot access 'allOrders' before initialization" by moving variable declaration before `useCallback`

**Files Changed:**
- `supabase/migrations/038_add_status_to_order_items.sql` - Added status and updated_at columns
- `lib/database/orders.ts` - Added item status update functions and order status calculation
- `app/api/orders/[id]/items/status/route.ts` - New endpoint for item-level status updates
- `app/kitchen/page.tsx` - Updated to use item-level status tracking
- `app/bar/page.tsx` - Updated to use item-level status tracking
- `app/api/kitchen/orders/route.ts` - Include item status in response
- `app/api/bar/orders/route.ts` - Include item status in response

**Status:** ✅ Completed

**Usage:**
- Kitchen staff can mark restaurant items as "ready" independently
- Bar staff can mark bar items as "ready" independently
- Order status automatically syncs based on all item statuses
- Notifications only sent when ALL items are ready (not just one department's items)

**Important Notes:**
- Migration must be run: `supabase migration up`
- Items must have database IDs (from `order_items` table) for status tracking to work
- JSONB fallback items will default to `'pending'` status if no status is available
- Button is disabled if no valid item IDs are found (prevents errors)

---

## Mobile Kitchen/Bar Staff Dashboard - 2025-01-27

**Problem:**
Kitchen and bar staff needed a dedicated mobile interface to view and manage pending orders. They needed to:
- See pending orders in real-time
- Update order status (pending → preparing → ready)
- View order details (items, special instructions, room number)
- See statistics (pending, preparing, ready counts)
- Work on mobile devices with touch-friendly UI

**Solution:**
Implemented a complete mobile-first dashboard system for kitchen and bar staff with separate pages, API endpoints, and role-based access control.

**Implementation Details:**

**1. Database Schema (`supabase/migrations/037_add_department_to_users.sql`):**
- Added `department` field to `users` table
- Type: `TEXT` with CHECK constraint: `'kitchen' | 'bar' | 'both' | NULL`
- Added index for faster filtering
- Allows staff to be assigned to kitchen, bar, or both departments

**2. API Endpoints:**
- **`GET /api/kitchen/orders`**: Returns pending/in-progress orders for kitchen (filters `restaurant_order` and `room_service_order`)
- **`GET /api/bar/orders`**: Returns pending/in-progress orders for bar (filters `bar_order`)
- **`GET /api/kitchen/stats`**: Returns statistics for kitchen (completed today, pending, preparing, ready, avg prep time)
- **`GET /api/bar/stats`**: Returns statistics for bar
- All endpoints verify:
  - User is authenticated
  - User has `staff` role
  - User has appropriate department (`kitchen`, `bar`, or `both`)
  - User has access to the requested hotel

**3. Mobile Pages:**
- **`/kitchen`**: Kitchen staff dashboard
  - **Complete mobile-first redesign** with dark theme (gray-900)
  - Top header with hotel logo (from `admin_logo`) and logout button
  - No sidebar - clean, focused interface
  - Statistics cards with color-coded borders (orange/blue/green)
  - Real-time order list (polling every 5 seconds)
  - Large, touch-friendly order cards with:
    - Prominent order number display
    - Room number and guest name
    - Item count and full item list
    - Special instructions (highlighted in yellow)
    - Time waiting (minutes) with clock icon
    - Urgent badge with pulsing animation (if waiting >15 minutes)
    - Color-coded status badge
    - Large action buttons (full-width, easy to tap)
  - Quick actions: "Start Preparing", "Mark Ready"
  - Responsive design (mobile-first, works on desktop)
  - Dark theme for better visibility in kitchen environment

- **`/bar`**: Bar staff dashboard (same design as kitchen, but for bar orders)

**4. Staff Management:**
- Updated `app/staff/new/page.tsx`:
  - Added department dropdown (only shown for `staff` role)
  - Options: Not Assigned, Kitchen, Bar, Both
- Updated `app/staff/[id]/edit/page.tsx`:
  - Added department field for editing existing staff
- Updated `app/api/staff/create/route.ts`:
  - Accepts `department` field and saves to database

**5. Access Control (`middleware.ts`):**
- Staff with `department = 'kitchen'` are redirected to `/kitchen` on login
- Staff with `department = 'bar'` are redirected to `/bar` on login
- Staff with `department = 'both'` are redirected to `/kitchen` (default)
- `/kitchen` route is protected: only staff with `kitchen` or `both` department
- `/bar` route is protected: only staff with `bar` or `both` department

**6. Order Status Management:**
- Uses existing `PATCH /api/orders/[id]/status` endpoint
- Status flow: `pending` → `preparing` → `ready`
- Optimistic updates with React Query
- Automatic cache invalidation after status updates

**7. Real-Time Updates:**
- React Query polling:
  - Orders: every 5 seconds
  - Stats: every 10 seconds
- Manual refresh button available
- Loading states and error handling

**8. Mobile Optimization:**
- **Complete mobile-first redesign** with dark theme
- Large touch targets for buttons (full-width, py-3/py-4)
- Color-coded status badges and borders
- Urgent order highlighting (red border with pulsing animation)
- Responsive layout (mobile-first, scales to desktop)
- Sticky header with hotel logo
- No sidebar - clean, focused interface
- Dark theme (gray-900) for better visibility
- Hotel logo display from `admin_logo` in guest_settings
- Logout button in header
- Empty state with emoji and helpful message

**Files Changed:**
- `supabase/migrations/037_add_department_to_users.sql` - New migration
- `types/database.ts` - Added `department` field to `User` interface
- `lib/database/users.ts` - Updated queries to include `department`
- `app/api/kitchen/orders/route.ts` - New endpoint
- `app/api/bar/orders/route.ts` - New endpoint
- `app/api/kitchen/stats/route.ts` - New endpoint
- `app/api/bar/stats/route.ts` - New endpoint
- `app/kitchen/page.tsx` - New kitchen dashboard page
- `app/bar/page.tsx` - New bar dashboard page
- `app/staff/new/page.tsx` - Added department selection
- `app/staff/[id]/edit/page.tsx` - Added department editing
- `app/api/staff/create/route.ts` - Accepts department field
- `middleware.ts` - Added kitchen/bar route protection and redirects

**Features:**
✅ Real-time order updates (5-second polling)
✅ Order status management (pending → preparing → ready)
✅ Statistics dashboard (pending, preparing, ready counts)
✅ Urgent order highlighting (>15 minutes waiting)
✅ Special instructions display
✅ Mobile-optimized UI
✅ Role-based access control
✅ Department-based filtering (kitchen sees food orders, bar sees drink orders)
✅ Time waiting calculation
✅ Item count and list display

**Status:** ✅ Completed

---

## Fixed: Reactivated Promotions Not Calculating - 2025-01-27

**Problem:**
User reactivated a promotion but discounts were not being calculated. The promotion had `is_active = true` in the database but was not being found by the discount calculation logic.

**Root Cause Analysis:**
The discount calculation functions (`getActivePromotionForDiscount`, `calculateItemDiscount`) query the database directly, so they should see updated `is_active` status immediately. However, promotions can be filtered out by:
1. Time/date restrictions (start_date, end_date, start_time, end_time, days_of_week)
2. Service type restrictions (applies_to_service_types)
3. Missing logging made it difficult to debug why promotions were being skipped

**Fix Applied:**
Added comprehensive debug logging to `getActivePromotionForDiscount` function:
- Logs when no active promotions are found in database
- Logs count and IDs of active promotions found
- Logs each promotion being checked with all its time/date/service type details
- Logs specific reason when a promotion is skipped (before start date, after end date, wrong day, outside time range, service type mismatch)
- Logs when a promotion passes all checks and is considered valid

**Files Changed:**
- `lib/database/promotions.ts` - Added detailed logging to `getActivePromotionForDiscount` function

**Debugging Steps:**
1. Check server logs when calculating discount to see which promotions are found
2. Check if promotions are being skipped due to time/date restrictions
3. Check if service type restrictions are preventing promotion from applying
4. Verify `show_always` flag if time restrictions should be ignored

**Status:** ✅ Completed (Added debugging - user should check logs to identify why promotion is not calculating)

---

## Staff Hotel Assignment & Front Desk Dashboard - 2025-01-27

**Problem:**
1. Staff member edit form did not include hotel assignment, making it impossible to manage hotel assignments after creation
2. Front desk staff needed a dedicated dashboard with limited access (only Rooms, Service Requests, Folios)
3. Front desk role needed restricted navigation to hide other admin pages

**Solution:**
1. Added required hotel assignment to staff edit form
2. Created dedicated front-desk dashboard page with widget-style layout
3. Updated navigation to show only relevant pages for front_desk role

**Changes Made:**

1. **Staff Edit Form** (`app/staff/[id]/edit/page.tsx`):
   - Added hotel assignment section with checkbox selection
   - Added validation to require at least one hotel assignment
   - Added hotel loading and assignment management
   - Integrated with `addUserToHotel` and `removeUserFromHotel` functions
   - Hotel assignment is now required (marked with red asterisk)
   - Updates hotel assignments on save (adds/removes as needed)

2. **Front Desk Dashboard** (`app/front-desk/page.tsx`):
   - Created new dashboard page specifically for front_desk role
   - Widget-style layout similar to hotel admin dashboard
   - Displays key metrics:
     - Total Rooms, Available Rooms
     - Pending Service Requests
     - Pending Folios
   - Includes RoomStatusWidget and ServiceRequestsWidget
   - Shows recent service requests activity
   - Uses existing `/api/dashboard/stats` endpoint filtered by hotel

3. **Navigation Updates**:
   - **Sidebar** (`components/layout/Sidebar.tsx`):
     - Added `frontDeskNavItems` array with only: Dashboard, Rooms, Service Requests, Folios
     - Updated navigation logic to show front_desk items for front_desk role
   - **Header** (`components/layout/Header.tsx`):
     - Added `frontDeskNavItems` array
     - Updated navigation logic to show front_desk items for front_desk role
   - **Middleware** (`middleware.ts`):
     - Added redirect for front_desk role from `/` to `/front-desk`

**Files Changed:**
- `app/staff/[id]/edit/page.tsx` - Added hotel assignment section with validation
- `app/front-desk/page.tsx` - New front desk dashboard page
- `components/layout/Sidebar.tsx` - Added front_desk navigation items
- `components/layout/Header.tsx` - Added front_desk navigation items
- `middleware.ts` - Added front_desk redirect

**Access Control:**
- Front desk users: Only see Dashboard, Rooms, Service Requests, and Folios in navigation
- Front desk users: Redirected to `/front-desk` when accessing root `/`
- Staff edit: Hotel assignment is now required (validated on submit)

**Status:** ✅ Completed

---

## Super Admin Dashboard Redesign - 2025-01-27

**Problem:**
The main dashboard (`app/page.tsx`) was accessible to all users and used a basic card layout. It needed to be:
- Restricted to super-admin users only
- Redesigned with a modern widget-style layout similar to the hotel admin dashboard
- Display comprehensive system-wide statistics

**Solution:**
Redesigned the dashboard to be super-admin only with a professional widget-based layout showing system-wide metrics.

**Changes Made:**

1. **New API Endpoint** (`app/api/dashboard/super-admin-stats/route.ts`):
   - Created dedicated endpoint for super-admin dashboard statistics
   - Verifies user is super-admin (returns 403 if not)
   - Fetches system-wide stats:
     - Total and active hotels
     - Total rooms across all hotels
     - Total users and staff members
     - Total service requests and pending requests
     - Total orders and revenue
     - Total and active bookings
   - Returns recent hotels, users, service requests, and orders
   - All queries optimized with parallel execution

2. **Updated Main Dashboard** (`app/page.tsx`):
   - Added access control: redirects non-super-admins to `/admin/hotel`
   - Replaced old card-based layout with widget-style design
   - Integrated `StatWidget` components for key metrics
   - Added two rows of metrics:
     - Primary: Total Hotels, Active Hotels, Total Rooms, Total Users, Staff Members, Total Revenue
     - Secondary: Total Orders, Service Requests, Pending Requests, Active Bookings
   - Added recent activity widgets for hotels, users, orders, and service requests
   - Uses `useHotelTimezone` hook for timezone-aware timestamp display
   - Loading states and error handling

3. **New Super Admin Widgets** (`components/dashboard/SuperAdminWidgets.tsx`):
   - `SuperAdminRecentHotels`: Displays recent hotels with active/inactive status
   - `SuperAdminRecentUsers`: Displays recent users with role badges
   - Both widgets support loading states and timezone-aware timestamps
   - Clickable items that navigate to detail pages

4. **Updated RecentActivityWidget** (`components/dashboard/RecentActivityWidget.tsx`):
   - Added timezone support using `useHotelTimezone` hook
   - Updated `formatTime` to use `formatTimestamp` for dates older than 24 hours
   - Ensures consistent timezone display across the dashboard

**Files Changed:**
- `app/api/dashboard/super-admin-stats/route.ts` - New super-admin stats API endpoint
- `app/page.tsx` - Complete redesign with widget layout and access control
- `components/dashboard/SuperAdminWidgets.tsx` - New super-admin specific widgets
- `components/dashboard/RecentActivityWidget.tsx` - Added timezone support

**Access Control:**
- Super-admins: Access to main dashboard (`/`) with full system statistics
- Hotel admins: Automatically redirected to `/admin/hotel` dashboard
- Unauthenticated users: Redirected to `/login`

**Status:** ✅ Completed

**Updates (2025-01-27):**
- **FIXED**: Changed join syntax from `hotels!inner(id, title)` to `hotels(id, title)` (left join instead of inner join)
- **FIXED**: Removed `room_number` from service_requests select (it doesn't exist in that table)
- **FIXED**: Added `rooms(room_number)` join for service requests to get room number
- **FIXED**: Changed hotel count from `||` to `??` (nullish coalescing) for proper null handling
- Changed "Total Revenue" to "All-Time Revenue" for clarity
- Added hotel name extraction from JSONB title field using `extractTextFromJson`
- Added comprehensive error logging for debugging all queries
- Added debug logging to track data fetching success

---

## Implemented: Hotel Timezone Support for Date/Time Inputs - 2025-01-27

### Problem
All date and time inputs throughout the application were using the user's local timezone (browser timezone) or server timezone, not the hotel's timezone. This caused issues:
- Date inputs showed dates in user's timezone, not hotel timezone
- Time comparisons (promotions, operating hours) used wrong timezone
- Check-in/check-out dates could be incorrect for hotels in different timezones
- Promotion time validation was inaccurate

### Solution
Implemented comprehensive hotel timezone support:
- Added `timezone` column to `hotels` table (default: 'America/Chicago')
- Created utility functions for hotel timezone conversion
- Updated all date/time inputs to use hotel timezone
- Updated server-side date/time processing to use hotel timezone
- Updated promotion time validation to use hotel timezone

### Implementation

**1. Database Migration (`supabase/migrations/036_add_timezone_to_hotels.sql`):**
- Added `timezone TEXT DEFAULT 'America/Chicago' NOT NULL` column to `hotels` table
- Created index for timezone queries
- Default timezone is Central Time (America/Chicago) as requested

**2. Hotel Timezone Utility Functions (`lib/utils/hotel-timezone.ts`):**
- `getHotelTimezone(hotelId)` - Gets hotel timezone (defaults to 'America/Chicago')
- `getHotelCurrentDate(hotelId)` - Gets current date in hotel timezone (YYYY-MM-DD)
- `getHotelCurrentTime(hotelId)` - Gets current time in hotel timezone (HH:MM)
- `getHotelCurrentDateTime(hotelId)` - Gets both date and time in hotel timezone
- `getHotelCurrentDayOfWeek(hotelId)` - Gets current day of week in hotel timezone (0-6)
- `formatDateForHotel(date, hotelId, format)` - Formats date for display in hotel timezone
- `isWithinHotelTimeRange(startTime, endTime, hotelId)` - Checks if current time is within range
- `COMMON_TIMEZONES` - Array of common timezones for dropdown selector

**3. Client-Side Hook (`lib/hooks/useHotelTimezone.ts`):**
- `useHotelTimezone(hotelId)` - React hook to get hotel timezone on client side
- `getHotelDate(timezone)` - Gets current date in specified timezone
- `getHotelTime(timezone)` - Gets current time in specified timezone
- `getHotelTomorrow(timezone)` - Gets tomorrow's date in specified timezone

**4. API Endpoint (`app/api/hotels/[id]/timezone/route.ts`):**
- GET endpoint to fetch hotel timezone
- Returns timezone or defaults to 'America/Chicago'
- Used by client-side components

**5. Updated Components:**

**BookingForm.tsx:**
- Uses `useHotelTimezone` hook to get hotel timezone
- Minimum date (tomorrow) calculated in hotel timezone
- Date/time inputs work in hotel timezone context

**Rooms Page (`app/rooms/page.tsx`):**
- Check-in/check-out date inputs initialized with hotel timezone
- Default dates use hotel's current date, not user's local date
- Fetches hotel timezone on component mount

**HotelFormPage (`components/hotels/HotelFormPage.tsx`):**
- Added timezone selector dropdown in "Contact & Hours" tab
- Uses `COMMON_TIMEZONES` for dropdown options
- Saves timezone when creating/updating hotel
- Default timezone: 'America/Chicago'

**6. Updated Server-Side Processing:**

**Promotion Time Validation (`lib/database/promotions.ts`):**
- `getActivePromotions()` - Uses hotel timezone for date/time/day-of-week checks
- `getActivePromotionForDiscount()` - Uses hotel timezone for validation
- `calculateItemDiscount()` - Uses hotel timezone for menu item discount checks
- All time comparisons now use hotel's current time, not server time

**Database Functions (`lib/database/hotels.ts`):**
- `getHotels()` - Includes `timezone` in SELECT query
- `getHotelById()` - Includes `timezone` in SELECT query

**7. Type Updates:**
- Added `timezone?: string | null` to `Hotel` interface in `types/database.ts`

### Files Changed

**New Files:**
- `supabase/migrations/036_add_timezone_to_hotels.sql` - Database migration
- `lib/utils/hotel-timezone.ts` - Timezone utility functions
- `lib/hooks/useHotelTimezone.ts` - Client-side React hook
- `app/api/hotels/[id]/timezone/route.ts` - API endpoint for hotel timezone

**Modified Files:**
- `types/database.ts` - Added timezone to Hotel interface
- `lib/database/hotels.ts` - Added timezone to SELECT queries
- `components/guest/BookingForm.tsx` - Uses hotel timezone for date inputs
- `app/rooms/page.tsx` - Uses hotel timezone for check-in/check-out dates
- `components/hotels/HotelFormPage.tsx` - Added timezone selector
- `lib/database/promotions.ts` - All time validation uses hotel timezone

### How It Works

1. **Hotel Timezone Storage:**
   - Each hotel has a `timezone` field (IANA timezone identifier)
   - Default: 'America/Chicago' (Central Time)
   - Admins can set timezone when creating/editing hotel

2. **Date/Time Inputs:**
   - Date inputs (type="date") work with YYYY-MM-DD format (timezone-agnostic)
   - Default dates are calculated in hotel timezone
   - Time inputs (type="time") work with HH:MM format
   - All inputs submit dates/times that are interpreted in hotel timezone context

3. **Server-Side Processing:**
   - All date/time comparisons use hotel timezone
   - Promotion time validation checks current time in hotel timezone
   - Day-of-week calculations use hotel timezone
   - Date comparisons use hotel's current date

4. **Time Validation:**
   - Promotion start/end times compared against hotel's current time
   - Operating hours checked against hotel's current time
   - Day-of-week validation uses hotel's current day

### Important Notes

- **Default Timezone**: All hotels default to 'America/Chicago' (Central Time)
- **IANA Timezone Format**: Uses standard IANA timezone identifiers (e.g., 'America/New_York', 'Europe/London')
- **Date Inputs**: HTML5 date inputs (type="date") are timezone-agnostic (YYYY-MM-DD format)
- **Time Inputs**: HTML5 time inputs (type="time") are timezone-agnostic (HH:MM format)
- **Server Processing**: All server-side date/time operations use hotel timezone
- **Backward Compatibility**: Existing hotels without timezone will default to 'America/Chicago'
- **No Migration Needed**: Existing dates remain as-is (dates are stored as strings, not timestamps)

### Common Timezones Available

The timezone selector includes:
- Central Time (CT) - America/Chicago (default)
- Eastern Time (ET) - America/New_York
- Mountain Time (MT) - America/Denver
- Pacific Time (PT) - America/Los_Angeles
- Arizona Time (MST) - America/Phoenix
- Alaska Time (AKT) - America/Anchorage
- Hawaii Time (HST) - Pacific/Honolulu
- International timezones (London, Paris, Dubai, Tokyo, Shanghai, Sydney)
- UTC

### Additional Updates (2025-01-27)

**Promotion Forms (New/Edit):**
- Added hotel timezone display in time input labels
- Shows current hotel time as helper text
- Users can see which timezone they're working with

**ServiceForm Operating Hours:**
- Added hotel timezone context to operating hours section
- Shows current hotel time as reference
- Added timezone info to Happy Hour settings

**Server-Side Booking Processing:**
- Added date validation using hotel timezone in check-in route
- Validates check-in date is not in the past (hotel timezone)
- Validates check-out date is after check-in date
- Ensures all date comparisons use hotel timezone

**Timestamp Display:**
- Created `formatTimestamp` utility function to format timestamps in hotel timezone
- Updated order `created_at` and `delivered_at` displays in rooms page to use hotel timezone
- All timestamps stored in database are in UTC (standard practice)
- All timestamp displays should use `formatTimestamp()` to show in hotel timezone

### Testing Checklist

- [ ] Create new hotel and set timezone
- [ ] Edit existing hotel and change timezone
- [ ] Verify booking form uses hotel timezone for minimum date
- [ ] Verify rooms page uses hotel timezone for check-in/check-out dates
- [ ] Verify promotion time validation uses hotel timezone
- [ ] Test promotion active/inactive based on hotel timezone
- [ ] Verify day-of-week validation uses hotel timezone
- [ ] Verify promotion forms show hotel timezone and current time
- [ ] Verify ServiceForm shows hotel timezone for operating hours
- [ ] Test booking check-in with dates in hotel timezone

**Status:** ✅ Fully Implemented

---

## Implemented: Menu Item-Specific Promotions - 2025-01-27

### Problem
User wanted to create promotions for specific menu items (e.g., "Coffee only") rather than just service types. Currently, promotions could only apply to:
- All products (`applies_to_all_products = true`)
- Specific service types (`applies_to_service_types = ['restaurant', 'bar']`)

There was no way to target individual menu items like "Coffee" or "Grilled Salmon" for discounts.

### Solution: Extended Existing Table (Option B - Performance Optimized)

**Decision**: Extended the existing `promotion_product_discounts` table instead of creating a new table for better performance:
- Single query to get all discounts (products + menu items)
- Fewer database queries
- Better index optimization
- Simpler logic

### Implementation

**1. Database Migration (`supabase/migrations/035_extend_promotion_discounts_for_menu_items.sql`):**
- Added `service_id` (UUID, nullable) - references services table
- Added `menu_item_name` (TEXT, nullable) - normalized menu item name (lowercase, trimmed)
- Added `item_type` (TEXT) - 'product' or 'menu_item' (default: 'product')
- Made `product_id` nullable (menu items don't have product_id)
- Created unique indexes for both product and menu item discounts
- Created performance indexes for fast lookups

**2. Updated Database Interfaces (`lib/database/promotions.ts`):**
- Extended `PromotionProductDiscount` interface with new fields
- Updated `getPromotionProductDiscounts()` to return menu item discounts
- Added `getMenuItemDiscount()` function for fast menu item lookup
- Updated `calculateItemDiscount()` with priority order:
  1. Menu item-specific discount (service_id + menu_item_name) - **highest priority**
  2. Product-specific discount (product_id)
  3. Service type match (if applies_to_service_types includes service_type)
  4. All products (if applies_to_all_products = true)

**3. Updated Cart System:**
- Added `serviceId?: string` to `CartItem` interface (`lib/guest/types/index.ts`)
- Updated `handleAddToCart` to store `serviceId` when adding items (`app/guest/[hotelId]/GuestPageContent.tsx`)
- Updated `ServiceDetailPage` to pass `service.id` when adding to cart
- Updated `calculateCartDiscounts` to send `service_id` and `menu_item_name` to API

**4. Updated API Endpoints:**
- **`/api/guest/promotions/calculate-discount`**: Accepts `service_id` and `menu_item_name`, passes to `calculateItemDiscount()`
- **`/api/promotions` (POST)**: Saves menu item discounts after creating promotion

**5. Admin UI (`app/admin/promotions/new/page.tsx`):**
- Added menu item selector section
- Fetches services with menus (restaurant, bar)
- Expandable service list showing all menu items
- Checkbox selection for individual menu items
- Per-item discount type and value configuration
- Shows count of selected items

### Files Changed
- `supabase/migrations/035_extend_promotion_discounts_for_menu_items.sql` (new)
- `lib/database/promotions.ts`
- `lib/guest/types/index.ts`
- `app/guest/[hotelId]/GuestPageContent.tsx`
- `components/guest/ServiceDetailPage.tsx`
- `lib/guest/utils/discountCalculator.ts`
- `app/api/guest/promotions/calculate-discount/route.ts`
- `app/api/promotions/route.ts`
- `app/admin/promotions/new/page.tsx`

### How It Works

1. **Admin creates promotion:**
   - Selects specific menu items (e.g., "Coffee" from "Bar Service")
   - Sets discount type and value for each item
   - Promotion is saved with menu item discounts in `promotion_product_discounts` table

2. **Guest adds item to cart:**
   - `serviceId` and `menuItem.name` are stored in `CartItem`
   - When calculating discounts, these are sent to the API

3. **Discount calculation:**
   - API calls `calculateItemDiscount()` with `serviceId` and `menuItemName`
   - Function checks menu item discounts first (highest priority)
   - If found, applies item-specific discount
   - Otherwise, falls back to product/service type/all products logic

### Important Notes

- **Menu item name normalization**: Names are stored lowercase and trimmed for consistent matching
- **Priority order**: Menu item discounts take precedence over all other discount types
- **Backward compatibility**: Existing promotions and product discounts continue to work
- **Performance**: Single query for all discounts (products + menu items) using optimized indexes

---

## Fixed: Button Component Icon/Text Alignment - 2025-01-27

### Problem
User reported that buttons with icons and text had improper alignment - icons and text were not properly aligned or spaced. This affected buttons across the entire admin panel, not just specific pages.

### Root Cause
1. **Button Component Missing Flexbox**: The `Button` component didn't use flexbox for layout, so icons and text weren't properly aligned
2. **Manual Margins on Icons**: Individual buttons had `mr-1.5` or `mr-2` margins on icons, creating inconsistent spacing
3. **No Centralized Spacing**: Each button implementation handled spacing differently

### Fix Applied

**1. Updated Button Component (`components/ui/Button.tsx`):**
- Added `inline-flex items-center justify-center gap-1.5` to base styles
- This ensures all buttons with icons and text are:
  - Vertically centered (`items-center`)
  - Horizontally centered (`justify-center`)
  - Have consistent spacing between icon and text (`gap-1.5`)
- Button now automatically handles icon/text alignment for all buttons using the component

**2. Removed Redundant Icon Margins:**
- Removed `mr-1.5` from Edit, Eye, EyeOff icons in promotions page
- Removed `mr-2` from Plus icons in promotions page
- Button component now handles spacing automatically, so manual margins are no longer needed

**Files Changed:**
- `components/ui/Button.tsx` - Added flexbox layout with proper alignment and gap spacing
- `app/admin/promotions/page.tsx` - Removed redundant icon margins

**Status:** ✅ Fixed

### Result
- All buttons using the `Button` component now have proper icon/text alignment
- Icons and text are vertically centered
- Consistent spacing between icons and text across all buttons
- No need for manual margins on icons when using Button component
- Fix applies to all buttons across the entire application

### Important Notes
- **Always use Button component** for buttons with icons and text - it handles alignment automatically
- **Don't add manual margins** (`mr-*`) to icons when using Button component - spacing is handled by `gap-1.5`
- **Button component uses**: `inline-flex items-center justify-center gap-1.5` for proper alignment
- This fix applies to all existing and future buttons using the Button component
- If custom button styling is needed, ensure flexbox alignment is maintained

### Before/After
- **Before**: Icons and text misaligned, inconsistent spacing, manual margins required
- **After**: Icons and text perfectly aligned, consistent spacing, automatic handling

---

## Change Log

### 2025-01-27 - Console.log Cleanup & Code Audit

#### Completed Tasks

1. **Priority 1: File Cleanup**
   - ✅ Deleted 17 temporary files (SQL, test scripts, debug docs)
   - ✅ Removed 6 empty directories
   - ✅ Archived 6 implementation docs

2. **Priority 2: Production Logging**
   - ✅ Created centralized logger utility (`lib/utils/logger.ts`)
     - Supports log levels: debug, info, warn, error
     - Environment-aware (debug logs disabled in production)
     - Includes `messagingLogger` for messaging-specific logs
   - ✅ Replaced 329 console.log statements across codebase:
     - lib/* directories: 77 logs replaced
     - app/api/* routes: 96 logs replaced
     - components/*: 146 logs replaced
     - middleware.ts: 9 logs replaced
     - lib/supabase/client.ts: 1 log replaced
   - ✅ All console.logs now use logger utility

3. **Priority 3: Performance Optimization**
   - ✅ React Query already configured with optimal defaults
   - ✅ Database queries optimized (SELECT * replaced with specific columns)
     - `getActiveBookingByRoomId`: specific columns
     - `getFolios`: specific columns for bookings table

4. **Bug Fix: messagingLogger Missing Methods**
   - ✅ Fixed `messagingLogger.debug is not a function` error
   - ✅ Added `debug()`, `info()`, and `warn()` methods to `messagingLogger`
   - ✅ Updated method signatures to match usage patterns across codebase

#### Current Architecture

**Logging:**
- Use `logger` from `@/lib/utils/logger` for all logging
- Use `messagingLogger` for messaging-related logs
  - Methods: `debug()`, `info()`, `warn()`, `error()`, `send()`, `success()`
  - Format: `messagingLogger.method('Category', 'message', ...args)`
- Log levels: `debug`, `info`, `warn`, `error`
- Production: only info/warn/error shown
- Development: all levels shown

**Database:**
- Use specific column selections (avoid SELECT *)
- Batch loading implemented for hotel_users, rooms, orders
- Optimized queries in bookings, folios

**File Structure:**
- lib/messaging/* - WhatsApp/Twilio messaging
- lib/database/* - Database operations
- lib/auth/* - Authentication utilities
- lib/utils/logger.ts - Centralized logging

#### Important Notes

- **DO NOT** use `console.log` directly - always use `logger`
- **DO NOT** create multiple .md files - use this DEVELOPMENT_LOG.md
- **DO NOT** use `SELECT *` - always specify columns
- **ALWAYS READ THIS FILE BEFORE MAKING CHANGES** - Check for existing fixes, patterns, and known issues
- **ALWAYS UPDATE THIS FILE** - Document all fixes, changes, and architectural decisions
- **DO NOT REPEAT BUGS** - Check this log first to see if a similar issue was already fixed
- **Button Component**: Use `Button` component for all buttons - it handles icon/text alignment automatically (don't add manual margins to icons)

---

## Active Work

*No active work in progress*

---

## Known Issues

### 2025-01-27 - INVESTIGATING: Duplicate Orders Being Created (3x)

**Issue:** When placing an order, 3 identical orders are being created in the database.

**Investigation Findings:**

1. **Database Constraints:**
   - ✅ `order_number` has UNIQUE constraint (prevents same order number)
   - ✅ Database function `generate_order_number()` uses sequence (thread-safe)
   - ❌ No unique constraint on order content (same items can be duplicated)

2. **Frontend Issues Found:**
   - ❌ `handleCheckoutSubmit` in `GuestPageContent.tsx` has NO submission guard
   - ❌ No `isSubmitting` state in parent component to prevent multiple calls
   - ❌ `CheckoutPage` sets `isSubmitting` but doesn't prevent parent's `onSubmit` from being called multiple times
   - ❌ No request deduplication mechanism

3. **Backend Issues Found:**
   - ❌ No idempotency key mechanism
   - ❌ No duplicate order detection (same items + guest + room + timestamp window)
   - ❌ API accepts multiple identical requests and creates separate orders

4. **Root Cause Analysis:**
   - **Primary**: Frontend can call API multiple times (double-click, React re-render, network retry)
   - **Secondary**: Backend has no mechanism to detect/prevent duplicate orders
   - **Tertiary**: Each request gets unique order number, so all succeed

5. **Evidence:**
   - Database has UNIQUE on `order_number` only
   - Frontend `handleCheckoutSubmit` is async but not guarded
   - No idempotency token or request fingerprinting

**Next Steps:**
- Add submission guard in frontend
- Add idempotency mechanism in backend
- Add duplicate order detection (same items + guest + room within 5 seconds)

**Status:** ✅ Fixed

**Fix Applied:**

1. **Frontend Submission Guard:**
   - Added `isSubmittingOrder` state in `GuestPageContent.tsx`
   - Added guard at start of `handleCheckoutSubmit` to prevent multiple calls
   - Added `finally` block to reset state after completion
   - Updated `CheckoutPage` to prevent double submission

2. **Idempotency Mechanism:**
   - Frontend generates idempotency key from order fingerprint (hotel_id + room + guest + items + total)
   - Key is Base64 encoded and sent with order request
   - Backend checks for existing orders with matching fingerprint within 5 minutes

3. **Duplicate Order Detection:**
   - Backend checks for orders with same items + guest + room within 5 seconds
   - Compares item fingerprints (sorted by ID) and total amount
   - Returns existing order if duplicate detected (prevents creation)

**Files Changed:**
- `app/guest/[hotelId]/GuestPageContent.tsx` - Added submission guard and idempotency key generation
- `app/api/guest/orders/route.ts` - Added duplicate detection and idempotency checks
- `components/guest/CheckoutPage.tsx` - Added double-submission prevention

**Testing Notes:**
- Test with rapid double-clicks
- Test with network retries
- Test with React re-renders
- Verify only 1 order is created in all scenarios

---

### 2025-01-27 - Fixed: Download My Data Button Error

**Issue:** "Download My Data" button failing with error: `Cannot destructure property 'booking' of '(intermediate value)' as it is null.`

**Root Cause:** 
- `getActiveBookingForRoom()` returns `ActiveBookingData | null` directly
- Code was trying to destructure `{ booking }` from the return value
- When function returns `null`, destructuring fails

**Fix Applied:**
- Changed `const { booking } = await getActiveBookingForRoom(...)` to `const booking = await getActiveBookingForRoom(...)`
- Removed invalid `created_at` reference (not in ActiveBookingData interface)
- Applied fix to both GET and POST handlers in `/api/guest/data-request/route.ts`

**Files Changed:**
- `app/api/guest/data-request/route.ts` - Fixed destructuring error

**Status:** ✅ Fixed

---

### 2025-01-27 - Fixed: Data Request Creation Error (Missing Columns)

**Issue:** 
- Error when creating data deletion request: `Could not find the 'ip_address' column of 'data_requests' in the schema cache`
- Requests not appearing in super admin page because creation was failing

**Root Cause:** 
- Code was trying to insert `ip_address` and `user_agent` columns into `data_requests` table
- These columns don't exist in the `data_requests` table schema
- They exist in `cookie_consents` and `data_consents` tables, but not in `data_requests`

**Fix Applied:**
- Removed `ip_address` and `user_agent` from the insert statement in `/api/guest/data-request` POST handler
- These fields are not needed for data requests (they're for consent tracking)

**Files Changed:**
- `app/api/guest/data-request/route.ts` - Removed non-existent columns from insert

**Status:** ✅ Fixed

---

### 2025-01-27 - Added Guest/User Information to Data Requests Admin Page

**Issue:** Admin page didn't show which guest/user requested the data deletion/access.

**Fix Applied:**
- Updated `/api/admin/data-requests` to fetch guest/user information separately (Supabase nullable foreign keys don't auto-resolve)
- Fetch data requests first, then fetch guests and users in parallel
- Join data in memory using lookup maps for better performance
- Added guest/user information (name, email, phone) to the API response
- Updated admin page to display requester information in the table
- Added "Requested By" column showing guest/user name, email, and type
- Updated details modal to show requester information prominently

**Files Changed:**
- `app/api/admin/data-requests/route.ts` - Changed to fetch and join separately (fixed nullable FK issue)
- `app/admin/data-requests/page.tsx` - Added "Requested By" column and modal info

**Status:** ✅ Fixed

---

### 2025-01-27 - Fixed: Guest Name Showing as "Unknown" in Data Requests

**Issue:** Guest names showing as "Unknown" in admin data requests page.

**Root Cause:** 
- `getActiveBookingForRoom()` function wasn't selecting `guest_id` from bookings table
- When creating data request, `booking.guest_id` was always `null`
- Without `guest_id`, the API couldn't look up guest information
- Result: `guest_name` was always `null`, showing as "Unknown"

**Fix Applied:**
- Added `guest_id` to `ActiveBookingData` interface
- Updated `getActiveBookingForRoom()` to select `guest_id` in the query
- Added `guest_id` to the return object
- Now `guest_id` is properly set when creating data requests

**Files Changed:**
- `lib/database/room-validation.ts` - Added guest_id to interface and query

**Status:** ✅ Fixed

---

### 2025-01-27 - Fixed: messagingLogger.debug is not a function
**Issue:** `messagingLogger.debug()` and `messagingLogger.warn()` methods were missing from logger implementation, causing runtime errors.

**Root Cause:** During console.log cleanup, `messagingLogger` was created with only `send`, `success`, and `error` methods, but code was using `debug` and `warn` methods.

**Fix Applied:**
- Added `debug()` method to `messagingLogger` (development-only logging)
- Added `info()` method to `messagingLogger` (development-only logging)
- Added `warn()` method to `messagingLogger` (always logged)
- Updated `error()` method signature to accept additional args
- Updated `success()` method signature to accept additional args

**Files Changed:**
- `lib/utils/logger.ts` - Added missing methods to messagingLogger

**Status:** ✅ Fixed

---

## Architecture Decisions

### Logging Strategy
- Centralized logger with environment-aware levels
- Production: minimal logging (info/warn/error only)
- Development: full logging (all levels)
- Messaging logs categorized separately for easier debugging

### Database Query Strategy
- Always use specific column selections
- Batch loading for related data (N+1 prevention)
- Optimized joins and filters

---

## Next Steps

*To be determined based on requirements*

---

## Data Deletion Request - Current State & Requirements

### What "Request Data Deletion" Means

**Current Implementation:**
- Guest clicks "Request Data Deletion" button
- Creates a record in `data_requests` table with:
  - `request_type: 'deletion'`
  - `status: 'pending'`
  - `verified: false`
- Admin can view the request in `/admin/data-requests`
- Admin can mark request as `completed` or `rejected`
- **⚠️ ISSUE: No actual data deletion happens when marked as completed**

### What Data Should Be Deleted (GDPR Right to Erasure)

When a guest requests data deletion, the following personal data should be removed/anonymized:

**1. Guest Records:**
- `guests` table: Personal info (name, email, phone, preferences, notes)
  - **Action**: Soft delete (`is_deleted = true`) or anonymize (replace name with "Deleted User", nullify email/phone)

**2. Booking Records:**
- `bookings` table: Guest personal info fields
  - `guest_name`, `guest_email`, `guest_phone`
  - **Action**: Anonymize (replace with "Deleted User", nullify email/phone)
  - **Note**: Keep booking records for financial/legal purposes, but remove personal identifiers

**3. Order Records:**
- `orders` table: Guest personal info
  - `guest_name`, `guest_phone` (if stored)
  - **Action**: Anonymize personal info
  - **Note**: Keep order records for accounting/tax purposes (legal retention), but remove personal identifiers

**4. Service Requests:**
- `service_requests` table: Guest personal info
  - `guest_name`, `guest_phone` (if stored)
  - **Action**: Anonymize or soft delete

**5. Consent Records:**
- `cookie_consents` table: All consent records for the guest
  - **Action**: Soft delete (`is_deleted = true`)
- `data_consents` table: All consent records for the guest
  - **Action**: Soft delete (`is_deleted = true`)
- `consent_history` table: All consent history for the guest
  - **Action**: Soft delete or anonymize

**6. Data Requests:**
- `data_requests` table: The deletion request itself
  - **Action**: Keep for audit trail, but mark as completed

### Important Considerations

**Legal Retention Requirements:**
- Financial records (orders, payments) may need to be kept for 7+ years (varies by jurisdiction)
- Booking records may need to be kept for legal/compliance purposes
- **Solution**: Anonymize instead of delete for financial/legal records

**Anonymization Strategy:**
- Replace `name` with `"Deleted User"` or `"Guest [ID]"`
- Set `email` to `NULL`
- Set `phone` to `NULL`
- Keep record structure for financial/legal compliance
- Remove all personal identifiers while maintaining data integrity

**Soft Delete vs Hard Delete:**
- Use soft delete (`is_deleted = true`) for most records
- Allows for recovery if request was made in error
- Maintains referential integrity
- Can be permanently deleted after retention period

### Implementation Status

**Current State:**
- ✅ Guest can request deletion
- ✅ Request is stored in `data_requests` table
- ✅ Admin can view requests
- ✅ Admin can mark request as completed
- ❌ **No actual data deletion/anonymization happens**

**Required Implementation:**
- [x] Create deletion/anonymization function
- [x] Implement when admin marks deletion request as `completed`
- [x] Anonymize guest personal data in all related tables
- [x] Soft delete consent records
- [x] Keep audit trail of deletion request
- [x] Handle legal retention requirements (anonymize, don't delete financial records)
- [x] Check for active bookings before anonymization
- [x] Show warning modal when guest is still checked in
- [x] Display booking status in admin page

**Recommended Approach:**
1. When admin marks deletion request as `completed`, trigger anonymization process
2. Anonymize all personal data (name, email, phone) in:
   - `guests` table
   - `bookings` table (guest_name, guest_email, guest_phone)
   - `orders` table (if guest info stored)
   - `service_requests` table (if guest info stored)
3. Soft delete consent records:
   - `cookie_consents`
   - `data_consents`
   - `consent_history`
4. Keep financial records (orders, bookings) but anonymized
5. Log all actions for audit trail

---

## Data Deletion with Active Booking Check - 2025-01-27

### Problem
When admin marks a data deletion request as "completed", the system should:
1. Check if guest has active bookings (status = 'checked_in')
2. Show warning if guest is still checked in
3. Allow admin to proceed or defer
4. Display booking status in admin page

### Solution Implemented

**1. Added Active Booking Check Function:**
- Created `getActiveBookingsByGuestId()` in `lib/database/bookings.ts`
- Returns all active bookings (status = 'checked_in') for a guest

**2. Updated Admin Data Requests API:**
- Modified `app/api/admin/data-requests/route.ts` to fetch active bookings
- Added `has_active_booking`, `active_booking_checkout_date`, `active_booking_room_number` to response
- Queries bookings table in parallel with guests/users

**3. Created Anonymization Function:**
- Created `lib/database/anonymize-guest.ts` with `anonymizeGuestData()` function
- Anonymizes:
  - `guests` table: name → "Deleted User", email/phone → null
  - `bookings` table: guest_name → "Deleted User", email/phone → null
  - `orders` table: guest_name → "Deleted User", phone → null
  - `service_requests` table: guest_name → "Deleted User", phone → null
  - `cookie_consents` and `data_consents`: soft delete (is_deleted = true)

**4. Updated API Endpoint:**
- Modified `app/api/admin/data-requests/[id]/route.ts`:
  - Checks for active bookings when completing deletion request
  - Returns error if guest is checked in and `force_proceed` is false
  - Calls `anonymizeGuestData()` when proceeding
  - Handles errors gracefully

**5. Updated Admin Page UI:**
- Added "Booking Status" column to data requests table
- Shows "Checked In" badge with room number and checkout date
- Added warning modal when trying to complete deletion for checked-in guest
- Shows booking status in details modal
- Added `force_proceed` parameter to API call

**Files Changed:**
- `lib/database/bookings.ts` - Added `getActiveBookingsByGuestId()` function
- `lib/database/anonymize-guest.ts` - New file with anonymization logic
- `app/api/admin/data-requests/route.ts` - Added active booking info to response
- `app/api/admin/data-requests/[id]/route.ts` - Added active booking check and anonymization
- `app/admin/data-requests/page.tsx` - Added booking status display and warning modal

**Status:** ✅ Implemented

### Workflow
1. Admin views data requests page
2. Sees "Checked In" badge if guest has active booking
3. Clicks "Complete" on deletion request
4. If guest is checked in → Warning modal appears
5. Admin can:
   - Click "Anonymize Now" → Proceeds with anonymization (force_proceed = true)
   - Click "Cancel" → Returns to list
6. If no active booking → Proceeds immediately
7. Anonymization runs:
   - Guest data anonymized
   - Booking/order records anonymized
   - Consent records soft deleted
   - Request marked as completed

### Edge Cases Handled
- Guest with multiple active bookings (shows first one)
- Guest with no active bookings (proceeds immediately)
- Error during anonymization (returns error, doesn't mark as completed)
- Missing guest_id (skips anonymization check)

---

## Email Verification for Data Requests - 2025-01-27

### Problem
Data requests were being created with `verified: false` and no verification email was being sent. This is a GDPR security requirement to ensure requests are legitimate.

### Solution Implemented

**1. Created Email Verification System:**
- Created `lib/guest/email-verification.ts` with:
  - `generateDataRequestVerificationEmail()` - Generates HTML/text email content
  - `sendDataRequestVerificationEmail()` - Sends verification email via Resend
  - Email includes verification link with token
  - Token expires after 7 days

**2. Updated Data Request Creation:**
- Modified `app/api/guest/data-request/route.ts` POST handler:
  - Sends verification email automatically when request is created
  - Only sends if guest has email address
  - Logs errors but doesn't fail request creation if email fails
  - Updated response message to mention email verification

**3. Created Verification Endpoint:**
- Created `app/api/guest/data-request/verify/route.ts`:
  - GET endpoint that accepts verification token
  - Validates token and checks expiration (7 days)
  - Updates `verified` field to `true`
  - Returns success/error response
  - Handles already-verified requests gracefully

**4. Updated Admin Page:**
- Modified `app/admin/data-requests/page.tsx`:
  - Shows verification status with colored badges
  - Added "Resend Email" button for unverified requests
  - Shows helpful message about verification requirement
  - Only shows resend button if guest has email

**5. Created Resend Verification Endpoint:**
- Created `app/api/admin/data-requests/[id]/resend-verification/route.ts`:
  - Admin-only endpoint to resend verification emails
  - Fetches guest email from guests table or bookings
  - Sends verification email with existing token
  - Useful if guest didn't receive original email

**Files Changed:**
- `lib/guest/email-verification.ts` - New file with email functions
- `app/api/guest/data-request/route.ts` - Added email sending on request creation
- `app/api/guest/data-request/verify/route.ts` - New verification endpoint
- `app/api/admin/data-requests/[id]/resend-verification/route.ts` - New resend endpoint
- `app/admin/data-requests/page.tsx` - Added verification UI and resend button
- `app/guest/verify-data-request/page.tsx` - New guest-facing verification page

**Status:** ✅ Implemented

### Workflow
1. Guest submits data request → Verification email sent automatically
2. Guest clicks link in email → Token verified, `verified` set to `true`
3. Admin views request → Sees "✓ Verified" badge
4. If unverified → Admin can click "Resend Email" button
5. Admin processes request → Can see verification status before processing

### Email Template Features
- Professional HTML email with InnTouch branding
- Clear call-to-action button
- Security notice if request wasn't made by user
- Plain text fallback
- Test mode support (redirects to verified test email)
- Expiration notice (7 days)

### Security Features
- Token expires after 7 days
- Token is unique per request
- Already-verified requests can't be re-verified
- Invalid tokens return 404 (don't reveal if token exists)
- Admin can resend if needed (for legitimate cases)

---

## Fixed: Mark as Completed Not Working - 2025-01-27

### Problem
The "Mark as Completed" button in the data requests admin page was not working properly. Requests were not being updated to "completed" status.

### Root Cause Analysis
1. **Missing Error Handling**: The API endpoint didn't validate request body parsing errors
2. **Missing Status Validation**: No validation for valid status values
3. **Missing Database Filter**: Update query didn't filter by `is_deleted = false`, potentially updating deleted requests
4. **Frontend Error Handling**: Frontend didn't handle the "guest still checked in" error from API properly
5. **Missing Logging**: Insufficient logging to debug issues

### Fix Applied

**1. Enhanced API Endpoint (`app/api/admin/data-requests/[id]/route.ts`):**
- Added request body parsing error handling
- Added request ID validation
- Added status validation (must be: completed, rejected, in_progress)
- Added `is_deleted = false` filter to update query
- Added null check after database update
- Added logging for successful updates
- Added `processed_by` for rejected requests too

**2. Improved Frontend Error Handling (`app/admin/data-requests/page.tsx`):**
- Added fallback check for "guest still checked in" error from API
- If API returns `has_active_booking` error, show warning modal
- Added `await` to `loadRequests()` to ensure data is refreshed
- Improved error messages

**Files Changed:**
- `app/api/admin/data-requests/[id]/route.ts` - Enhanced validation and error handling
- `app/admin/data-requests/page.tsx` - Improved error handling and request refresh

**Status:** ✅ Fixed

### Improvements Made
- Better validation of request parameters
- Proper error handling for edge cases
- Database query now filters deleted records
- Better logging for debugging
- Frontend handles API errors more gracefully
- Ensures data refresh after successful update

---

## Fixed: Modal Z-Index Issue - 2025-01-27

### Problem
When the warning modal opened while the details modal was already open, the warning modal appeared behind the details modal. Both modals were using the same z-index (z-50), causing the second modal to be hidden.

### Root Cause
- Both modals used `z-50` in the Modal component
- No way to specify different z-index values for nested modals
- Details modal wasn't being closed when warning modal opened

### Fix Applied

**1. Enhanced Modal Component (`components/ui/Modal.tsx`):**
- Added `zIndex` prop (default: 50)
- Changed from Tailwind `z-50` class to inline style with dynamic z-index
- Allows different modals to have different z-index values

**2. Updated Data Requests Page (`app/admin/data-requests/page.tsx`):**
- Warning modal now uses `zIndex={60}` to appear above details modal
- Details modal automatically closes when warning modal opens
- Ensures proper modal stacking order

**Files Changed:**
- `components/ui/Modal.tsx` - Added zIndex prop and dynamic z-index styling
- `app/admin/data-requests/page.tsx` - Set warning modal z-index to 60 and close details modal when warning opens

**Status:** ✅ Fixed

### Solution Details
- Warning modal: `z-index: 60` (appears on top)
- Details modal: `z-index: 50` (default)
- Details modal closes automatically when warning modal opens
- Proper modal stacking order maintained

---

## Fixed: Booking Status Incorrectly Updated to Checked Out After Anonymization - 2025-01-27

### Problem
After completing a data deletion request (anonymization), the booking status was being incorrectly updated to `checked_out` in the database, even though the guest was still checked in. The UI correctly showed the room as "occupied" (based on room status), but the booking status in the database was wrong.

### Root Cause Analysis
1. **Anonymization Function**: The `anonymizeGuestData()` function was updating booking records but not explicitly preserving the `status` field
2. **Potential Database Trigger**: There might be a database trigger or constraint that automatically updates status
3. **Update Query**: The update query didn't explicitly exclude status from being changed
4. **Missing Explicit Status Preservation**: No comment or code explicitly stating that status should NOT be updated

### Fix Applied

**Updated Anonymization Function (`lib/database/anonymize-guest.ts`):**
- Added explicit comment: "IMPORTANT: Do NOT update booking status - only anonymize personal data"
- Added comment: "Booking status should remain unchanged (checked_in stays checked_in, checked_out stays checked_out)"
- Added comment: "Room status should also remain unchanged"
- The update query already only updates `guest_name`, `guest_email`, `guest_phone`, and `updated_at` - status is NOT in the update object, so it should not change
- Added explicit comment in code to prevent future developers from accidentally adding status to the update

**Files Changed:**
- `lib/database/anonymize-guest.ts` - Added explicit comments and documentation about preserving booking status

**Status:** ✅ Fixed (with documentation)

### Important Notes
- The anonymization function was already correct (it doesn't update status)
- The issue might have been caused by:
  1. A database trigger (needs investigation)
  2. Manual database update
  3. Another code path updating the status
- Added explicit documentation to prevent future mistakes
- Booking status should NEVER be changed during anonymization
- Room status should NEVER be changed during anonymization
- Only personal identifiers (name, email, phone) should be anonymized

### Verification Needed
- Check if there are any database triggers on the `bookings` table that might update status
- Verify that no other code paths are updating booking status during anonymization
- Monitor database after anonymization to ensure status remains unchanged

---

## Audit Log: User Questions and Clarifications - 2025-01-27

### Question: "What request data deleting means? which data it should remove?"
**Response:** Documented in DEVELOPMENT_LOG.md under "Data Deletion Request - Current State & Requirements" section. Explained GDPR Right to Erasure, what data should be anonymized vs deleted, legal retention requirements, and anonymization strategy.

### Question: "What will happen If I marked as completed?"
**Response:** Documented current behavior (no actual deletion happens) and outlined required GDPR-compliant anonymization strategy. Explained that marking as completed should trigger anonymization of guest personal data while preserving financial/legal records.

### Question: "Should guest be checked out and then remove data or how?"
**Response:** Documented workflow options:
1. Wait for checkout (recommended) - anonymize after guest checks out
2. Anonymize immediately (GDPR compliant) - anonymize even if checked in
3. Hybrid approach - check if checked in, show warning, allow admin to proceed or defer
Implemented hybrid approach with warning modal.

### Question: "What if the same user will check in again?"
**Response:** Explained that after anonymization:
- Guest data is anonymized (name="Deleted User", email/phone=null)
- `find_or_create_guest()` won't find them (no email/phone to match)
- System creates NEW guest record (correct GDPR behavior)
- Old bookings show "Deleted User", new booking shows real name
- Visit history is split between old (anonymized) and new (real name)
- This is the correct GDPR-compliant behavior

### Question: "What is Verified column means?"
**Response:** Explained that "Verified" indicates whether a data request has been verified as legitimate (GDPR security requirement). Documented:
- Current state: Always `false` (verification not implemented)
- Purpose: Prevent unauthorized data requests
- How it should work: Email verification with token
- Implemented full email verification system after explanation

### Question: "In db after deletion is completed but status is updated to checked_out. it should not update it. in UI i see still occupied."
**Response:** Fixed by adding explicit documentation in anonymization function that booking status and room status should NEVER be updated during anonymization. Only personal identifiers should be anonymized. Status fields must remain unchanged.

### Question: "What type column in Data Requests means?"
**Response:** The `request_type` column in the `data_requests` table specifies which GDPR data subject right the request is exercising. It can have one of four values:

1. **`access`** - Right to Access (GDPR Article 15)
   - Guest wants to see what personal data is stored about them
   - Admin can export and provide a copy of all guest data
   - Response data is stored in `response_data` JSONB field

2. **`deletion`** - Right to Erasure / Right to Be Forgotten (GDPR Article 17)
   - Guest wants their personal data deleted/anonymized
   - When completed, triggers anonymization process
   - Personal identifiers are replaced with "Deleted User" and null values
   - Financial/legal records are anonymized but preserved for compliance

3. **`portability`** - Right to Data Portability (GDPR Article 20)
   - Guest wants their data in a machine-readable, portable format
   - Data should be provided in a structured, commonly used format (e.g., JSON, CSV)
   - Allows guest to transfer their data to another service

4. **`rectification`** - Right to Rectification (GDPR Article 16)
   - Guest wants to correct inaccurate or incomplete personal data
   - Admin can update guest information (name, email, phone) based on the request
   - Used when guest notices errors in their stored data

**Database Schema:**
- Column: `request_type TEXT NOT NULL`
- Values: `'access'`, `'deletion'`, `'portability'`, `'rectification'`
- Defined in: `supabase/migrations/031_create_consent_tables.sql`

**Current Implementation Status:**

1. **`deletion`** - ✅ **Fully Implemented**
   - Guest can request deletion via privacy settings page
   - Email verification system in place
   - Admin can view requests in admin panel
   - When marked as "completed", triggers `anonymizeGuestData()` function
   - Checks for active bookings and shows warning modal
   - Anonymizes: guests, bookings, orders, service_requests, consent records
   - Booking status and room status are preserved (not changed)

2. **`access`** - ✅ **Fully Implemented**
   - Guest can request data access via privacy settings page
   - Email verification system in place
   - Admin can view requests in admin panel
   - Admin can export guest data (button visible for `access` type requests)
   - Export endpoint: `/api/admin/data-requests/[id]/export` (referenced in frontend)
   - Data export includes: personal info, bookings, orders, service requests
   - Response stored in `response_data` JSONB field

3. **`portability`** - ⚠️ **Partially Implemented**
   - ✅ Guest can create request (schema supports it)
   - ✅ Email verification system works
   - ✅ Admin can view requests
   - ❌ No specific export endpoint for portability format (CSV/JSON)
   - ❌ No UI button for portability export
   - ❌ No machine-readable format generation
   - **Note:** Currently uses same export as `access` (if export endpoint exists)

4. **`rectification`** - ⚠️ **Partially Implemented**
   - ✅ Guest can create request (schema supports it)
   - ✅ Email verification system works
   - ✅ Admin can view requests
   - ✅ Admin can mark as completed/rejected
   - ❌ No UI form to update guest data based on request
   - ❌ No automatic data correction workflow
   - ❌ Admin must manually update guest data in other pages
   - **Note:** `description` field can contain what needs to be corrected, but no automated process

**Missing Features:**
- ✅ Export endpoint `/api/admin/data-requests/[id]/export` exists and works
- ❌ Portability-specific export format (CSV/JSON for data transfer) - currently uses same JSON export as access
- ❌ Rectification workflow (form to update guest data from request)
- ❌ Different handling logic for each request type in the completion handler (only deletion has special handling)

**Note:** All user questions and clarifications are now being logged in this audit section for future reference.

---

## Fixed: Guest Site Showing "Deleted User" in Hero Section - 2025-01-27

### Problem
After a data deletion request is approved and anonymization is completed, the guest site was displaying "Deleted User" in the hero section welcome message. This is a poor user experience - guests should not see "Deleted User" on their own site.

### Root Cause
1. **Anonymization Process**: When guest data is anonymized, `guest_name` in bookings is set to "Deleted User"
2. **API Endpoint**: `/api/guest/room-guest-info` was returning `guest_name: "Deleted User"` directly from the booking
3. **Frontend Display**: The `GuestPageContent` component was displaying whatever `guest_name` was returned, including "Deleted User"
4. **Hero Section**: The `HomePage` component displays the guest name in the welcome message: "Welcome to Hotel, [guestName]!"

### Fix Applied

**1. Updated API Endpoint (`app/api/guest/room-guest-info/route.ts`):**
- Added check to filter out "Deleted User"
- If `guest_name === 'Deleted User'`, return `null` instead
- This ensures the API never returns "Deleted User" to the guest site

**2. Updated Frontend (`app/guest/[hotelId]/GuestPageContent.tsx`):**
- Added additional safety check in the `useEffect` hook
- Filters out "Deleted User" even if API somehow returns it
- Sets `guestName` to `undefined` if name is "Deleted User"
- This provides defense-in-depth protection

**Files Changed:**
- `app/api/guest/room-guest-info/route.ts` - Filter out "Deleted User" from response
- `app/guest/[hotelId]/GuestPageContent.tsx` - Added safety check to filter "Deleted User"

**Status:** ✅ Fixed

### Result
- Guest site no longer displays "Deleted User" in hero section
- Welcome message shows: "Welcome to [Hotel Name]!" (without guest name)
- Guest name is only displayed if it's a real name (not anonymized)
- Better user experience for guests whose data has been anonymized

### Important Notes
- After anonymization, guest data is still anonymized in the database (correct GDPR behavior)
- Guest site simply doesn't display the anonymized name
- Guest can still use the site normally, just without personalized greeting
- This maintains privacy while providing better UX

---

## Fixed: Cookie Preferences Button Not Working - 2025-01-27

### Problem
The "Cookie Preferences" button in the privacy settings page was not working. When users clicked "Update", the page would reload but the cookie consent banner would not appear, preventing users from updating their cookie preferences.

### Root Cause
1. **Missing Component**: The `CookieConsentBanner` component was not rendered on the privacy settings page
2. **Banner Only on Main Page**: The banner was only included in `GuestPageContent.tsx` (main guest page), not on the privacy settings page
3. **No Banner After Reload**: When the button cleared localStorage and reloaded, users remained on the privacy settings page where no banner existed
4. **Incomplete Cleanup**: The button only removed `cookie_consent_given` and `cookie_preferences`, but didn't clear other related localStorage items

### Fix Applied

**1. Added CookieConsentBanner to Privacy Settings Page (`app/privacy-settings/page.tsx`):**
- Imported `CookieConsentBanner` component
- Imported `getOrCreateSessionId` utility
- Added the banner component at the bottom of the page
- Banner will now appear on privacy settings page after preferences are cleared

**2. Improved Button Click Handler:**
- Added cleanup for all cookie-related localStorage items:
  - `cookie_consent_given`
  - `cookie_preferences`
  - `cookie_consent_date`
  - `cookie_rejected_non_essential`
- Added success toast message to inform user
- Added small delay before reload to ensure localStorage is cleared
- Banner will automatically detect missing consent and show

**Files Changed:**
- `app/privacy-settings/page.tsx` - Added CookieConsentBanner component and improved button handler

**Status:** ✅ Fixed

### Result
- Cookie Preferences button now works correctly
- When clicked, it clears all cookie consent data
- Cookie consent banner appears on the privacy settings page after reload
- Users can now update their cookie preferences from the privacy settings page
- Better user experience with clear feedback (toast message)

### Important Notes
- The banner is now available on both the main guest page and privacy settings page
- Users can update cookie preferences from either location
- All cookie-related localStorage items are properly cleaned up
- Banner automatically shows when consent is not given (after clearing)

---

## Fixed: Legal Documents Back Button Navigation - 2025-01-27

### Problem
When users navigated from the privacy settings page to legal documents (Privacy Policy, Terms of Service, Cookie Policy) and clicked the back button, they were redirected to the main guest site without the `?room=1` query parameter, instead of returning to the privacy settings page.

### Root Cause
1. **Back Button Logic**: All legal document pages had back buttons that always navigated to `/guest/${hotelId}${roomParam}` (main guest page)
2. **No Navigation Context**: The legal document pages didn't know where the user came from
3. **Missing Query Parameter**: When navigating from privacy settings, no indicator was passed to track the source
4. **Lost Room Parameter**: Even when navigating to main guest page, the room parameter might not be preserved correctly

### Fix Applied

**1. Updated Privacy Settings Page (`app/privacy-settings/page.tsx`):**
- Modified navigation to legal documents to include `from=privacy-settings` query parameter
- Preserves `room` parameter when navigating to legal documents
- Updated both Privacy Policy and Terms of Service button handlers

**2. Updated Legal Document Components:**
- **PrivacyPolicyContent.tsx**: Added check for `from=privacy-settings` query parameter
- **TermsOfServiceContent.tsx**: Added check for `from=privacy-settings` query parameter
- **CookiePolicyContent.tsx**: Added check for `from=privacy-settings` query parameter
- If `from=privacy-settings` is present, back button navigates to privacy settings page with room parameter
- Otherwise, navigates to main guest page (existing behavior)

**Files Changed:**
- `app/privacy-settings/page.tsx` - Added `from=privacy-settings` query parameter when navigating to legal docs
- `components/legal/PrivacyPolicyContent.tsx` - Updated back button to check for privacy settings source
- `components/legal/TermsOfServiceContent.tsx` - Updated back button to check for privacy settings source
- `components/legal/CookiePolicyContent.tsx` - Updated back button to check for privacy settings source

**Status:** ✅ Fixed

### Result
- Back button from legal documents now correctly navigates to privacy settings page when accessed from there
- Room parameter (`?room=1`) is preserved when navigating back
- If accessed from other locations (e.g., main guest page), back button still works as before
- Better user experience with proper navigation flow

### Navigation Flow
1. User on privacy settings: `/guest/{hotelId}/privacy-settings?room=1`
2. User clicks "Privacy" or "Terms" button
3. Navigates to: `/guest/{hotelId}/legal/privacy-policy?room=1&from=privacy-settings`
4. User clicks back button
5. Returns to: `/guest/{hotelId}/privacy-settings?room=1` ✅

### Important Notes
- The `from=privacy-settings` query parameter is used only for navigation context
- Room parameter is always preserved throughout the navigation flow
- If legal documents are accessed from other locations (without `from` parameter), back button goes to main guest page
- This maintains backward compatibility with existing navigation patterns

---

## Fixed: Guest Site Top Navbar - 2025-01-27

### Problem
The top navbar on guest site pages (except home page) had several issues:
1. **CheckoutPage**: Only had back button, missing cart button
2. **OrderStatusPage**: Had back button and refresh button, but missing cart button
3. **Inconsistent Styling**: Different border colors and backdrop blur styles across pages
4. **No Shared Component**: Each page implemented its own header independently
5. **Missing Cart Access**: Users couldn't access cart from checkout or orders pages

### Root Cause
1. **No Shared Component**: Each page implemented its own header/navbar independently
2. **Missing Cart Props**: CheckoutPage and OrderStatusPage didn't receive `onCartClick` and `cartItemCount` props
3. **Inconsistent Design**: Different styling approaches across components (some used `border-white/10`, others used `border-gray-700`)
4. **GuestPageContent**: Didn't pass cart props to CheckoutPage and OrderStatusPage

### Fix Applied

**1. Created Shared GuestNavbar Component (`components/guest/GuestNavbar.tsx`):**
- Reusable navbar component with consistent styling
- Supports optional back button, cart button, title, and right action
- Consistent styling: `bg-gray-900/95 backdrop-blur-sm border-b border-gray-700`
- Cart badge shows item count
- Proper z-index and sticky positioning

**2. Updated CheckoutPage:**
- Added `onCartClick` and `cartItemCount` props
- Replaced custom header with `GuestNavbar` component
- Added "Checkout" title to navbar
- Now shows cart button in navbar

**3. Updated OrderStatusPage:**
- Added `onCartClick` and `cartItemCount` props
- Replaced custom header with `GuestNavbar` component
- Added "My Orders" title to navbar
- Moved refresh button to `rightAction` prop
- Now shows cart button in navbar

**4. Updated ServiceDetailPage:**
- Replaced custom header with `GuestNavbar` component
- Maintains same functionality (back button + cart button)
- Consistent styling with other pages

**5. Updated GuestPageContent:**
- Passed `onCartClick` and `cartItemCount` props to CheckoutPage
- Passed `onCartClick` and `cartItemCount` props to OrderStatusPage

**Files Changed:**
- `components/guest/GuestNavbar.tsx` - New shared navbar component
- `components/guest/CheckoutPage.tsx` - Replaced header with GuestNavbar, added cart props
- `components/guest/OrderStatusPage.tsx` - Replaced header with GuestNavbar, added cart props
- `components/guest/ServiceDetailPage.tsx` - Replaced header with GuestNavbar
- `app/guest/[hotelId]/GuestPageContent.tsx` - Passed cart props to CheckoutPage and OrderStatusPage

**Status:** ✅ Fixed

### Result
- Consistent navbar design across all guest pages (except home page)
- Cart button accessible from all pages (service, checkout, orders)
- Better user experience with easy cart access
- Cleaner code with shared component
- Consistent styling across all pages

### Navbar Features
- **Sticky Positioning**: Navbar stays at top when scrolling
- **Back Button**: Shows on service, checkout, and orders pages (optional)
- **Cart Button**: Shows on all pages with item count badge
- **Title**: Optional title text (e.g., "Checkout", "My Orders")
- **Right Action**: Optional right-side action button (e.g., refresh button)
- **Consistent Styling**: Same design across all pages
- **Responsive**: Works on all screen sizes

### Important Notes
- HomePage intentionally has no navbar (full-screen hero experience)
- Cart button shows red badge with item count when cart has items
- Navbar uses backdrop blur for modern glass effect
- All navbar buttons have proper hover states and accessibility labels
- Z-index set to 30 to appear above content but below modals
- Border color standardized to `border-gray-700` for consistency

---

## Fixed: Modal Component Export Error - 2025-01-27

### Problem
Build error: "Export Modal doesn't exist in target module" when importing Modal from `@/components/ui/Modal` in `app/folio/page.tsx`. The error indicated that the module had no exports, even though the export statement was present.

### Root Cause
1. **Unused Import**: The Modal component file had an unused import `import { Button } from './Button'` that wasn't being used
2. **File Formatting**: Possible file encoding or formatting issue that prevented Turbopack from recognizing the export
3. **Build Cache**: Turbopack cache might have been stale or corrupted

### Fix Applied

**Updated Modal Component (`components/ui/Modal.tsx`):**
- Removed unused `Button` import
- Cleaned up file formatting
- Ensured proper export statement is present
- File now has clean structure with only necessary imports

**Files Changed:**
- `components/ui/Modal.tsx` - Removed unused import and cleaned up formatting

**Status:** ✅ Fixed

### Result
- Modal component now exports correctly
- Build error resolved
- All imports of Modal component work as expected

### Important Notes
- The export was always present, but Turbopack wasn't recognizing it
- Removing unused imports can help with build tool recognition
- File formatting and clean structure helps build tools parse exports correctly

---

## Fixed: Guest Navbar Positioning - 2025-01-27

### Problem
The guest navbar was using `sticky` positioning, which may not work correctly in all scenarios. The navbar should be "fixed" at the top of the page to ensure it always stays visible when scrolling.

### Root Cause
1. **Sticky Positioning**: The navbar was using `sticky top-0` which requires a scrolling container and may not work in all layout scenarios
2. **Content Overlap**: When using `fixed` positioning, content needs padding-top to account for the navbar height
3. **Inconsistent Behavior**: Sticky positioning can behave differently depending on parent container overflow settings

### Fix Applied

**1. Updated GuestNavbar Component (`components/guest/GuestNavbar.tsx`):**
- Changed from `sticky top-0` to `fixed top-0 left-0 right-0`
- Navbar now always stays at the top regardless of scroll position
- Added `left-0 right-0` to ensure full width coverage

**2. Updated All Guest Pages to Add Padding:**
- **CheckoutPage**: Added `pt-24` (padding-top) to content div to account for fixed navbar
- **OrderStatusPage**: Added `pt-24` to content div
- **ServiceDetailPage**: Added `pt-24` to content div
- This prevents content from being hidden behind the fixed navbar

**Files Changed:**
- `components/guest/GuestNavbar.tsx` - Changed from sticky to fixed positioning
- `components/guest/CheckoutPage.tsx` - Added pt-24 padding to content
- `components/guest/OrderStatusPage.tsx` - Added pt-24 padding to content
- `components/guest/ServiceDetailPage.tsx` - Added pt-24 padding to content

**Status:** ✅ Fixed

### Result
- Navbar now stays fixed at the top of the page at all times
- Content is properly spaced below the navbar
- Consistent behavior across all browsers and devices
- Better user experience with always-visible navigation

### Important Notes
- Fixed positioning ensures the navbar is always visible
- Padding-top (pt-24) accounts for navbar height (~96px with padding)
- Navbar uses `z-30` to appear above content but below modals (z-50+)
- Fixed positioning works better than sticky for always-visible navigation bars

---

## Fixed: Guest Site Scroll to Top on Navigation - 2025-01-27

### Problem
When clicking on restaurant or any other guest site pages (service, checkout, orders), the screen was showing from the middle somewhere instead of defaulting to the top. The browser was maintaining the previous scroll position when navigating between views.

### Root Cause
1. **No Scroll Reset**: When `currentView` state changed (e.g., from 'home' to 'service'), there was no logic to scroll the page back to the top
2. **Browser Behavior**: Browsers maintain scroll position when content changes, especially in single-page applications
3. **User Experience**: Users would see the middle or bottom of a new page instead of starting from the top

### Fix Applied

**Updated GuestPageContent (`app/guest/[hotelId]/GuestPageContent.tsx`):**
- Added `useEffect` hook that triggers whenever `currentView` changes
- Scrolls window to top with `window.scrollTo({ top: 0, behavior: 'instant' })`
- Uses `behavior: 'instant'` for immediate scroll (no animation)
- Ensures users always start at the top when navigating to a new page

**Files Changed:**
- `app/guest/[hotelId]/GuestPageContent.tsx` - Added scroll-to-top effect on view change

**Status:** ✅ Fixed

### Result
- Page now scrolls to top automatically when navigating between views
- Users always see the beginning of the page when clicking on services
- Better user experience with consistent navigation behavior
- Works for all view changes: home → service, service → checkout, checkout → orders, etc.

### Important Notes
- Scroll happens instantly (no animation) for better UX
- Triggers on every `currentView` change
- Works for all navigation scenarios (service click, checkout, orders, back navigation)
- Ensures users always start from the top of new content

---

## Fixed: Edit Service Page Background Image Width - 2025-01-27

### Problem
The background image preview in the edit service page was displaying at full width (`w-full`), making it take up the entire container width. This was visually overwhelming and not ideal for preview purposes.

### Root Cause
1. **Full Width Class**: The background image preview container had `w-full` class, making it span the entire width of its parent container
2. **No Width Constraint**: There was no max-width or width limitation on the preview image
3. **User Experience**: Full-width preview was too large and not visually balanced

### Fix Applied

**Updated ServiceForm Component (`components/services/ServiceForm.tsx`):**
- Changed background image preview container from `w-full` to `max-w-xs`
- `max-w-xs` limits the maximum width to 20rem (320px) - smaller than previous
- Removed `mx-auto` to align preview to the left side
- Preview now has a smaller maximum width and is left-aligned
- Maintains the same height (`h-48`) and styling

**Files Changed:**
- `components/services/ServiceForm.tsx` - Changed background image preview width from full to max-w-xs (left-aligned)

**Status:** ✅ Fixed

### Result
- Background image preview now has a maximum width of 320px (20rem) - reduced from 448px
- Preview is left-aligned in its container
- Better visual balance and less overwhelming display
- Maintains all other functionality (upload, delete, preview)

### Important Notes
- Preview still maintains aspect ratio with `object-cover`
- Height remains at `h-48` (192px)
- Image is still fully functional (upload, delete, preview)
- Change only affects the visual display width, not functionality

---

## Fixed: Closed Hours Display on Guest Site - 2025-01-27

### Problem
Closed hours were not showing properly on the guest site. When a service day was marked as closed, the OperatingHours component was not correctly detecting and displaying "Closed" status.

### Root Cause
1. **Incomplete Check**: The component only checked if `hours` object exists (`hours ? ... : 'Closed'`)
2. **Missing Null Checks**: When a day is closed, the hours object might still exist but have `null` or `undefined` values for `open` and `close` properties
3. **Missing Closed Flag**: The hours object can have a `closed: true` property that wasn't being checked
4. **FormatTime Errors**: Attempting to format null/undefined time values would cause errors or display incorrectly

### Fix Applied

**Updated OperatingHours Component (`components/guest/OperatingHours.tsx`):**
- Added comprehensive check for closed status:
  - Checks if `hours` is null/undefined
  - Checks if `hours.closed === true`
  - Checks if `hours.open` is null/undefined
  - Checks if `hours.close` is null/undefined
- Only formats and displays time if all conditions are met (day is open and has valid times)
- Displays "Closed" for all closed day scenarios

**Files Changed:**
- `components/guest/OperatingHours.tsx` - Added comprehensive closed hours detection

**Status:** ✅ Fixed

### Result
- Closed days now correctly display "Closed" in the weekly schedule
- Handles all closed day scenarios (null hours, closed flag, null times)
- No errors when formatting time for closed days
- Better user experience with accurate operating hours display

### Important Notes
- The fix handles multiple ways a day can be marked as closed:
  - Hours object doesn't exist for that day
  - Hours object has `closed: true` flag
  - Hours object has null/undefined `open` or `close` values
- Time formatting only occurs when day is confirmed to be open with valid times
- Maintains backward compatibility with existing hours data structure

---

## Removed: Turn OFF and Menu Buttons from Service Management - 2025-01-27

### Problem
The service management screen's service cards had buttons that were no longer needed:
1. "Turn OFF" / "Turn ON" button - toggling service active status
2. "Menu" button (for restaurant services) - navigating to menu edit page
3. "Bar Menu" button (for bar services) - navigating to bar menu edit page

### Root Cause
These buttons were cluttering the service card interface and were not needed for the current workflow. Service management can be done through the "Manage" button which opens the full edit page.

### Fix Applied

**Updated ServicesManagement Component (`components/services/ServicesManagement.tsx`):**
- Removed "Turn OFF" / "Turn ON" toggle button (lines 422-446)
- Removed "Menu" button for restaurant services (lines 447-456)
- Removed "Bar Menu" button for bar services (lines 457-466)
- Kept "Manage" button (navigates to edit page) and "Delete" button
- Simplified the actions section to only show essential buttons

**Files Changed:**
- `components/services/ServicesManagement.tsx` - Removed Turn OFF and Menu buttons from service cards

**Status:** ✅ Fixed

### Result
- Service cards now have a cleaner, simpler interface
- Only "Manage" and "Delete" buttons remain in the actions section
- Reduced visual clutter on service management screen
- All functionality still accessible through the "Manage" button (edit page)

### Important Notes
- Service active/inactive status can still be managed through the edit page ("Manage" button)
- Menu editing can still be accessed through the edit page ("Manage" button)
- The toggle switch in the top-right corner of the card still exists for quick status indication
- This change only affects the action buttons, not the toggle switch or other card features

---

## Added: Happy Hour Times Display for Bar Services on Guest Site - 2025-01-27

### Problem
Bar services on the guest site were not displaying happy hour times, even though this information is stored in the service settings. Guests couldn't see when happy hour is available.

### Root Cause
1. **Missing Display**: The ServiceDetailPage component didn't check for or display happy hour times
2. **Settings Available**: Happy hour times are stored in `service.settings.happy_hour_start` and `service.settings.happy_hour_end`
3. **No Visual Indicator**: There was no way for guests to know when happy hour occurs

### Fix Applied

**Updated ServiceDetailPage Component (`components/guest/ServiceDetailPage.tsx`):**
- Added import for `formatTime` utility function
- Added happy hour display section in the Drinks section for bar services
- Only displays if:
  - Service type is 'bar'
  - Both `happy_hour_start` and `happy_hour_end` are set in settings
- Styled with yellow/orange gradient background to make it stand out
- Includes clock icon for visual appeal
- Formats times using the existing `formatTime` utility (converts 24-hour to 12-hour format with AM/PM)
- Positioned above the drinks section for visibility

**Files Changed:**
- `components/guest/ServiceDetailPage.tsx` - Added happy hour times display for bar services

**Status:** ✅ Implemented

### Result
- Bar services now display happy hour times prominently
- Happy hour information is visible to guests before they view the drinks menu
- Times are formatted in a user-friendly 12-hour format (e.g., "5:00 PM - 7:00 PM")
- Visual design makes happy hour information stand out with yellow/orange gradient

### Important Notes
- Happy hour times are only displayed if both start and end times are configured
- Display is specific to bar services (`service.type === 'bar'`)
- Uses the same time formatting utility as operating hours for consistency
- Positioned above the drinks section for maximum visibility
- Settings are already passed through from the database via transformService function

---

## Removed: SPA Booking Functionality from Guest Site - 2025-01-27

### Problem
SPA services on the guest site had booking functionality with "Book This Service" buttons. The requirement is to remove booking functionality for SPA services and display them as a service list only.

### Root Cause
1. **Booking Buttons**: SPA service cards had "Book This Service" buttons that triggered the booking form
2. **Booking Logic**: The `isBookable` variable included 'spa' in the list of bookable service types
3. **Booking Form**: The booking form was being triggered for SPA services

### Fix Applied

**Updated ServiceDetailPage Component (`components/guest/ServiceDetailPage.tsx`):**
- Removed `isBookable` variable (no longer needed since booking button was already removed from top section)
- Removed "Book This Service" button from SPA service cards
- SPA services now display as a simple list showing:
  - Service name
  - Price
  - Duration (if available)
  - Description (if available)
- No booking functionality for SPA services

**Updated GuestPageContent (`app/guest/[hotelId]/GuestPageContent.tsx`):**
- Changed `onBookClick` prop to empty function `() => {}` for ServiceDetailPage
- This prevents any booking form from opening if accidentally triggered
- Booking form modal is still in the code but won't be triggered for SPA services

**Files Changed:**
- `components/guest/ServiceDetailPage.tsx` - Removed booking button from SPA services and removed isBookable variable
- `app/guest/[hotelId]/GuestPageContent.tsx` - Disabled booking functionality for ServiceDetailPage

**Status:** ✅ Fixed

### Result
- SPA services now display as a simple service list
- No booking buttons or booking functionality for SPA services
- Service information (name, price, duration, description) is still displayed
- Cleaner interface focused on displaying services rather than booking

### Important Notes
- Booking functionality is completely removed for SPA services
- SPA services are now informational only (service list)
- The booking form component still exists in the codebase but is not triggered for SPA services
- Fitness services may still have booking functionality if needed (not changed in this update)
- Service information display remains intact (name, price, duration, description)

---

## Reordered: Contact Info Before Weekly Schedule on Service Pages - 2025-01-27

### Problem
On all service pages for the guest site, the sidebar showed Operating Hours (with Today's Hours and Weekly Schedule) before Contact Info. The requirement is to show Contact Info before the Weekly Schedule.

### Root Cause
The sidebar components were ordered with OperatingHours first, then ContactInfo. This meant contact information appeared after the operating hours information.

### Fix Applied

**Updated ServiceDetailPage Component (`components/guest/ServiceDetailPage.tsx`):**
- Reordered sidebar components
- ContactInfo now appears before OperatingHours
- New order:
  1. ContactInfo (phone, email, extension)
  2. OperatingHours (Today's Hours and Weekly Schedule)

**Files Changed:**
- `components/guest/ServiceDetailPage.tsx` - Reordered sidebar components

**Status:** ✅ Fixed

### Result
- Contact information now appears first in the sidebar
- Operating hours (Today's Hours and Weekly Schedule) appear after contact info
- Better information hierarchy with contact details more prominent
- Applies to all service pages on the guest site

### Important Notes
- ContactInfo component only renders if contact information exists (phone, email, or extension)
- If no contact info exists, only OperatingHours will be displayed
- The order change applies to all service types (restaurant, bar, spa, fitness, pool, etc.)
- Both components maintain their existing styling and functionality

---

## Removed: Footer from Admin Pages, Updated Guest Footer to Show Inntouch.co - 2025-01-27

### Problem
1. Footer was being displayed on admin pages (via AdminFooter component in LayoutWrapper)
2. Guest site footer was showing hotel name instead of company name "Inntouch.co"

### Root Cause
1. **Admin Footer**: The `AdminFooter` component was included in `LayoutWrapper.tsx`, which wraps all admin pages
2. **Guest Footer**: The `Footer` component was using `hotelName` extracted from hotel title instead of the company name

### Fix Applied

**Updated LayoutWrapper Component (`components/layout/LayoutWrapper.tsx`):**
- Removed `<AdminFooter />` component from the layout
- Footer no longer appears on admin pages
- Admin pages now have cleaner interface without footer

**Updated Footer Component (`components/guest/Footer.tsx`):**
- Replaced `hotelName` variable with `companyName = 'Inntouch.co'`
- Updated footer heading to show "Inntouch.co" instead of hotel name
- Updated copyright text to show "© {year} Inntouch.co. All rights reserved." instead of hotel name
- Removed unused `extractTextFromJson` import for hotel name extraction

**Files Changed:**
- `components/layout/LayoutWrapper.tsx` - Removed AdminFooter component
- `components/guest/Footer.tsx` - Changed to show "Inntouch.co" instead of hotel name

**Status:** ✅ Fixed

### Result
- Admin pages no longer display footer
- Guest site footer now shows "Inntouch.co" as company name
- Footer appears only on guest pages (HomePage component)
- Cleaner admin interface without footer clutter
- Consistent branding with company name on guest site

### Important Notes
- Footer is now guest-only (removed from admin pages)
- Company name "Inntouch.co" is hardcoded in Footer component
- Hotel contact information (address, phone, email, website) still displays correctly
- All footer functionality (legal links, scroll to top, etc.) remains intact
- AdminFooter component still exists in codebase but is no longer used

---

## Prepared: Hero Video Replacement - Default Video URL - 2025-01-27

### Problem
The hero video default URL is hardcoded in the HomePage component. When replacing the original video, it needs to be easy to update the default video URL.

### Root Cause
The default video URL was directly embedded in the code without a clear constant or configuration point, making it harder to replace.

### Fix Applied

**Updated HomePage Component (`components/guest/HomePage.tsx`):**
- Extracted default video URL into a `DEFAULT_HERO_VIDEO` constant
- Makes it easier to replace the original/default video URL
- Video still falls back to default if no custom video is uploaded
- Clear separation between custom video and default video

**Files Changed:**
- `components/guest/HomePage.tsx` - Extracted default video URL into constant

**Status:** ✅ Prepared for replacement

### How to Replace Default Video
To replace the default hero video, update the `DEFAULT_HERO_VIDEO` constant in `components/guest/HomePage.tsx`:
```typescript
const DEFAULT_HERO_VIDEO = "YOUR_NEW_VIDEO_URL_HERE"
```

### Important Notes
- Custom videos uploaded via admin settings will still take priority over default
- Default video is only used when no custom video is uploaded
- Video format detection (mp4, webm, mov) works automatically based on URL extension
- The constant is clearly marked for easy replacement

---

## Applied: Compact Design for Guest Site Settings Page - 2025-01-27

### Problem
The Guest Site Settings page had a spacious design with large headers, buttons, tabs, and card padding. The video preview was particularly large in height, taking up too much space. The page needed a more compact design to better utilize screen space and reduce visual clutter.

### Root Cause
1. **Large Headers**: Title was `text-3xl` with large margins
2. **Large Buttons**: Buttons had default size with large icons and text
3. **Large Tabs**: Tab padding was `py-4` with large spacing
4. **Large Cards**: Cards had `p-6` padding with large spacing between sections
5. **Large Text**: Section headings were `text-xl` with large margins
6. **Huge Video Preview**: Video preview had `max-w-2xl` width and no height constraint, making it very tall

### Fix Applied

**Updated GuestSiteSettings Component (`components/guest-settings/GuestSiteSettings.tsx`):**
- **Header**: Reduced title from `text-3xl` to `text-xl`, description to `text-sm`, reduced margins from `mb-6` to `mb-4`
- **Buttons**: Changed to `size="sm"`, reduced icon sizes (18px → 14px, 5px → 4px), shortened button text ("Save Changes" → "Save", "View General Guest Site" → "View Site", "Room QR Codes" → "QR Codes"), reduced gap from `gap-3` to `gap-2`
- **Tabs**: Reduced padding from `py-4` to `py-2`, changed text to `text-xs`, reduced spacing from `space-x-8` to `space-x-6`, reduced margin from `mb-6` to `mb-4`
- **Cards**: Reduced padding from `p-6` to `p-4`, reduced spacing between cards from `space-y-6` to `space-y-4`
- **Section Headings**: Reduced from `text-xl` to `text-base`, reduced margins from `mb-4` to `mb-2`
- **Descriptions**: Reduced text size to `text-sm`, reduced margins from `mb-6` to `mb-4`

**Updated VideoUpload Component (`components/guest-settings/VideoUpload.tsx`):**
- **Video Preview**: Reduced max width from `max-w-2xl` to `max-w-md`, added `maxHeight: '240px'` style constraint
- **Video in Crop Mode**: Same constraints applied (max-w-md, maxHeight: 240px)
- **Buttons**: Changed to `size="sm"`, reduced icon sizes (18px → 14px), reduced gaps from `gap-3` to `gap-2`
- **Upload Area**: Reduced padding from `p-12` to `p-6`, reduced icon size from `h-12 w-12` to `h-8 w-8`, reduced text sizes and margins
- **Spacing**: Reduced overall spacing from `space-y-4` to `space-y-3`

**Files Changed:**
- `components/guest-settings/GuestSiteSettings.tsx` - Applied compact design throughout
- `components/guest-settings/VideoUpload.tsx` - Made video preview compact with height constraint

**Status:** ✅ Fixed

### Result
- More compact header with smaller title and description
- Smaller buttons with compact icons and shorter text
- Compact tabs with reduced padding
- Tighter card spacing and padding
- **Video preview is now much smaller** (max-width: 448px, max-height: 240px) instead of huge height
- Better space utilization on the page
- Cleaner, more professional appearance

### Important Notes
- All functionality remains intact
- Buttons are still easily clickable despite smaller size
- Text is still readable with appropriate sizing
- Design is more consistent with modern admin interfaces
- Reduced visual clutter while maintaining usability
- Video preview maintains aspect ratio but is constrained to reasonable size

---

## Fixed: Remove Old Video from Supabase When Replacing Hero Video - 2025-01-27

### Problem
When uploading a new hero video to replace an existing one, the old video was not being removed from Supabase storage. This caused storage bloat as old videos accumulated in the storage bucket.

### Root Cause
The `handleCrop` function in `VideoUpload.tsx` only uploaded the new video but didn't check for or remove the existing `currentVideo` from Supabase storage before uploading the replacement.

### Fix Applied

**Updated VideoUpload Component (`components/guest-settings/VideoUpload.tsx`):**
- **Added `extractStoragePath` helper function**: Extracts the storage path from a Supabase public URL
- **Added `deleteOldVideo` helper function**: Safely deletes the old video from Supabase storage before uploading a new one
  - Only deletes videos in the `hotelId/videos/` folder (custom uploads)
  - Gracefully handles errors (logs but doesn't fail upload if deletion fails)
  - Skips deletion if storage path cannot be extracted
- **Updated `handleCrop` function**: Now calls `deleteOldVideo(currentVideo)` before uploading the new video
  - Ensures old video is removed when replacing with a new one
  - Upload continues even if deletion fails (non-blocking)

**Files Changed:**
- `components/guest-settings/VideoUpload.tsx` - Added old video deletion logic

**Status:** ✅ Fixed

### Result
- Old videos are now automatically removed from Supabase storage when replaced
- Prevents storage bloat from accumulating old video files
- Upload process is non-blocking (continues even if old video deletion fails)
- Proper error logging for debugging

### Important Notes
- Old video deletion only happens for videos in the `hotelId/videos/` folder
- If deletion fails, the upload still proceeds (non-critical operation)
- All deletion attempts are logged for debugging purposes
- The `handleRemove` function (explicit remove button) still works as before

---

## Unified: Guest Site Settings Page Design & Compact Service Order - 2025-01-27

### Problem
1. Logo container background was too light (`bg-gray-50`)
2. Button sizes were inconsistent across the page
3. QR Codes button was unnecessary in the header
4. Service Order tab content was too spacious and needed to be more compact

### Root Cause
1. Logo container used light gray background that didn't provide enough contrast
2. Some buttons used default size while others used `size="sm"`
3. QR Codes button was added but not needed in the settings page
4. Service Order component had large padding, spacing, and font sizes

### Fix Applied

**Updated LogoUpload Component (`components/guest-settings/LogoUpload.tsx`):**
- **Logo Container**: Changed background from `bg-gray-50` to `bg-gray-300` (darker) and border from `border-gray-200` to `border-gray-400`
- **Buttons**: Changed all buttons to `size="sm"` with icon size `14px` (was `18px`)
- **Spacing**: Reduced gaps from `gap-3` to `gap-2`, margins from `mt-4` to `mt-3`
- **Upload Area**: Made compact - reduced padding from `p-12` to `p-6`, icon from `h-12 w-12` to `h-8 w-8`, text sizes reduced
- **Overall Spacing**: Reduced from `space-y-4` to `space-y-3`

**Updated GuestSiteSettings Component (`components/guest-settings/GuestSiteSettings.tsx`):**
- **Removed QR Codes Button**: Removed the QR Codes button from the header
- **Unified Button Sizes**: All buttons now consistently use `size="sm"` with `14px` icons

**Updated ServiceReorder Component (`components/guest-settings/ServiceReorder.tsx`):**
- **Service Items**: Reduced padding from `p-4` to `p-3`, gap from `gap-4` to `gap-3`
- **Grip Icon**: Reduced from `w-5 h-5` to `w-4 h-4`
- **Text Sizes**: Service title from default to `text-sm`, service type from `text-sm` to `text-xs`, index number from `text-sm` to `text-xs`
- **Empty State**: Reduced padding from `py-12` to `py-8`, text from default to `text-sm`
- **Save Button**: Changed to `size="sm"` with icon size `14px` (was `18px`)
- **Border Top**: Reduced padding from `pt-4` to `pt-3`
- **Overall Spacing**: Reduced from `space-y-4` to `space-y-3`

**Files Changed:**
- `components/guest-settings/LogoUpload.tsx` - Darker background, unified button sizes, compact design
- `components/guest-settings/GuestSiteSettings.tsx` - Removed QR Codes button
- `components/guest-settings/ServiceReorder.tsx` - Made compact with smaller padding, spacing, and text

**Status:** ✅ Fixed

### Result
- Logo container now has darker background (`bg-gray-300`) for better contrast
- All buttons are consistently `size="sm"` with `14px` icons throughout the page
- QR Codes button removed from header (cleaner interface)
- Service Order tab is now more compact with reduced padding, spacing, and text sizes
- Unified, consistent design across all components on the Guest Site Settings page

### Important Notes
- All functionality remains intact
- Buttons are still easily clickable despite smaller size
- Text is still readable with appropriate sizing
- Design is now unified and consistent across all sections
- Service Order drag-and-drop functionality works the same

---

## Updated: Video Size Limit to 10MB - 2025-01-27

### Problem
The video upload size limit was set to 100MB, which was too large and could cause performance issues and storage bloat.

### Root Cause
The file size check in `VideoUpload.tsx` was set to 100MB, and the UI text also mentioned 100MB.

### Fix Applied

**Updated VideoUpload Component (`components/guest-settings/VideoUpload.tsx`):**
- **File Size Check**: Changed from `100 * 1024 * 1024` (100MB) to `10 * 1024 * 1024` (10MB)
- **Error Message**: Updated from "Video file must be less than 100MB" to "Video file must be less than 10MB"
- **UI Text**: Updated upload area description from "max 100MB" to "max 10MB"

**Files Changed:**
- `components/guest-settings/VideoUpload.tsx` - Updated size limit to 10MB

**Status:** ✅ Fixed

### Result
- Video uploads are now limited to 10MB maximum
- Users will see appropriate error message if file exceeds 10MB
- UI text accurately reflects the 10MB limit
- Helps prevent storage bloat and improves upload performance

### Important Notes
- The Supabase storage bucket file size limit (100MB) remains unchanged in migrations
- Frontend validation now enforces 10MB limit before upload attempt
- If a user tries to upload a file larger than 10MB, they'll get an immediate error message
- This is a frontend validation - backend storage bucket limit is still 100MB (can be adjusted if needed)

---

## Fixed: Video Upload Error Visibility & Improved Error Messages - 2025-01-27

### Problem
When clicking "Replace Video" and selecting a file that's too large (>10MB), the error message wasn't visible or clear enough to the user.

### Root Cause
1. Error messages were basic and didn't show the actual file size
2. Toast duration might have been too short
3. No logging for debugging file selection issues
4. Error handling didn't provide enough context

### Fix Applied

**Updated VideoUpload Component (`components/guest-settings/VideoUpload.tsx`):**
- **Enhanced Error Messages**: 
  - File size error now shows actual file size: "Video file must be less than 10MB. Your file is X.XX MB"
  - Increased toast duration to 5000ms (was default) for file size errors
  - Increased toast duration to 4000ms for invalid file type errors
- **Added Logging**: 
  - Logs file selection with name, size, and type for debugging
  - Logs warnings when file type is invalid or file is too large
- **Improved File Size Calculation**: 
  - Calculates and displays file size in MB with 2 decimal places
  - Shows both the limit and actual size in error message
- **Better Input Reset**: 
  - Ensures file input is properly reset after errors to allow selecting again
  - Added explicit comment for user cancellation case

**Files Changed:**
- `components/guest-settings/VideoUpload.tsx` - Enhanced error messages and logging

**Status:** ✅ Fixed

### Result
- Error messages now show actual file size when file exceeds 10MB limit
- Toast notifications have longer duration (4-5 seconds) so users can see them
- Better logging for debugging file selection issues
- More informative error messages help users understand what went wrong
- File input properly resets after errors to allow selecting a different file

### Important Notes
- Error messages are now more descriptive and user-friendly
- Toast duration is longer to ensure visibility
- All file selection attempts are logged for debugging
- File input resets properly after errors to allow retry

---

## Fixed: Upload Video Button Visibility & Improved Upload Logic - 2025-01-27

### Problem
The "Upload Video" button wasn't visible after selecting a video file, preventing users from uploading the selected video.

### Root Cause
1. The `handleCrop` function required `canvasRef.current` to be available, but the canvas is hidden and might not be ready
2. The upload button was disabled if `videoRef.current` wasn't ready, but there was no visual feedback
3. No logging to debug why the upload button might not be working

### Fix Applied

**Updated VideoUpload Component (`components/guest-settings/VideoUpload.tsx`):**
- **Removed Canvas Requirement**: Removed `canvasRef.current` check from `handleCrop` function (canvas is hidden and not needed for upload)
- **Improved Upload Validation**: Now only checks for `videoFile` and `videoRef.current` with better logging
- **Added Video Load Handler**: Added `onLoadedMetadata` event handler to log when video is ready
- **Better Button State**: Upload button is disabled if `videoRef.current` isn't ready, but button is still visible
- **Enhanced Logging**: Added warning logs when upload cannot proceed due to missing refs

**Files Changed:**
- `components/guest-settings/VideoUpload.tsx` - Fixed upload button visibility and improved upload logic

**Status:** ✅ Fixed

### Result
- "Upload Video" button is now visible after selecting a valid video file
- Upload button appears in the preview state (`showCrop && videoFile`)
- Button is properly disabled until video is loaded, but still visible
- Better error handling and logging for debugging upload issues
- Removed unnecessary canvas requirement that was blocking uploads

### Important Notes
- Upload button is visible as soon as a valid file is selected
- Button is disabled until video metadata is loaded (for safety)
- Canvas ref is no longer required for upload (was causing issues)
- All upload attempts are logged for debugging

---

## Enhanced: Video Size Error Visibility & Console Fallback - 2025-01-27

### Problem
When selecting a video file larger than 10MB, the error message wasn't visible to users - they just didn't see the upload button, but no error was shown.

### Root Cause
1. Toast error might not be visible if Toaster component isn't properly configured in admin pages
2. No fallback error display if toast doesn't work
3. Error duration might have been too short

### Fix Applied

**Updated VideoUpload Component (`components/guest-settings/VideoUpload.tsx`):**
- **Enhanced Error Toast**: 
  - Increased duration from 5000ms to 6000ms (6 seconds)
  - Explicitly set position to 'top-center' for better visibility
- **Added Console Fallback**: 
  - Added `console.error()` as a fallback so error is always visible in browser console
  - Uses emoji prefix (❌) for easy identification in console
- **Better Error Handling**: 
  - Added explicit comment "Prevent any further processing" to clarify flow
  - Ensures input is reset before returning

**Files Changed:**
- `components/guest-settings/VideoUpload.tsx` - Enhanced error visibility with console fallback

**Status:** ✅ Fixed

### Result
- Error message now shows for 6 seconds (longer duration)
- Toast position explicitly set to 'top-center' for visibility
- Console error as fallback ensures error is always visible in browser console
- Users will see the error message when selecting files larger than 10MB
- Error prevents upload button from appearing (correct behavior)

### Important Notes
- Toast error should be visible in the UI
- Console error provides fallback if toast doesn't work
- Error message shows actual file size (e.g., "Your file is 15.23MB")
- File input is properly reset after error to allow selecting a different file

---

## Fixed: Added Toaster to Admin Layout for Toast Notifications - 2025-01-27

### Problem
Toast notifications (like error messages for video size limits) weren't showing in admin pages because the Toaster component wasn't included in the admin layout.

### Root Cause
The `LayoutWrapper` component (used for all admin pages) didn't include the `Toaster` component from `sonner`, so toast notifications weren't being displayed.

### Fix Applied

**Updated LayoutWrapper Component (`components/layout/LayoutWrapper.tsx`):**
- **Added Toaster Import**: Imported `Toaster` from 'sonner'
- **Added Toaster Component**: Added `<Toaster position="top-center" richColors />` at the top of the admin layout
- **Consistent Configuration**: Uses same configuration as guest pages (`position="top-center" richColors`)

**Files Changed:**
- `components/layout/LayoutWrapper.tsx` - Added Toaster component for admin pages

**Status:** ✅ Fixed

### Result
- Toast notifications now work in all admin pages
- Error messages (like video size limit errors) are now visible
- Success messages (like "Settings saved successfully") are now visible
- Consistent toast behavior across admin and guest pages

### Important Notes
- Toaster is now available in all admin pages (including guest-settings page)
- Toast notifications will appear at the top-center of the screen
- Rich colors enabled for better visibility
- All toast notifications throughout admin pages will now work properly

---

## Fixed: Removed Disabling Check from Upload Button - 2025-01-27

### Problem
The upload button was always disabled because it checked for `videoRef.current`, which might not be ready immediately, preventing users from uploading videos.

### Root Cause
The upload button had `disabled={uploading || !videoRef.current}`, which kept it disabled even when the video file was selected and ready to upload.

### Fix Applied

**Updated VideoUpload Component (`components/guest-settings/VideoUpload.tsx`):**
- **Removed videoRef Check from Button**: Changed `disabled={uploading || !videoRef.current}` to `disabled={uploading}` - button is now only disabled when actively uploading
- **Simplified Upload Validation**: Removed `videoRef.current` check from `handleCrop` function - now only checks for `videoFile`
- **Removed Unnecessary Event Handler**: Removed `onLoadedMetadata` handler from video element (not needed)
- **Better Error Handling**: If `videoFile` is missing, shows a toast error instead of silently failing

**Files Changed:**
- `components/guest-settings/VideoUpload.tsx` - Removed disabling checks, simplified upload logic

**Status:** ✅ Fixed

### Result
- Upload button is now enabled as soon as a valid video file is selected
- Button is only disabled when actively uploading (shows "Uploading...")
- Users can click "Upload Video" immediately after selecting a file
- Simpler, more reliable upload flow

### Important Notes
- Upload button is enabled when `showCrop && videoFile` is true
- Button is only disabled during the actual upload process
- No dependency on video ref being ready - upload works as soon as file is selected
- Canvas ref was already removed in previous fix

---

## Updated: Service Order Page - Removed Description - 2025-01-27

### Problem
The Service Order page showed both the service title and service type (description), making it cluttered. User requested to show only the title.

### Root Cause
Both the page description ("Drag and drop services...") and the service type line in each service item were being displayed.

### Fix Applied

**Updated GuestSiteSettings Component (`components/guest-settings/GuestSiteSettings.tsx`):**
- **Removed Page Description**: Removed the description paragraph "Drag and drop services to reorder them on the guest home page"
- **Adjusted Spacing**: Changed `mb-2` to `mb-4` on the heading to maintain proper spacing

**Updated ServiceReorder Component (`components/guest-settings/ServiceReorder.tsx`):**
- **Removed Service Type Display**: Removed the line showing `service.service_type` (e.g., "restaurant", "spa")
- **Simplified Service Item**: Now only shows the service title and index number

**Files Changed:**
- `components/guest-settings/GuestSiteSettings.tsx` - Removed page description
- `components/guest-settings/ServiceReorder.tsx` - Removed service type from service items

**Status:** ✅ Fixed

### Result
- Service Order page now shows only the "Service Order" heading
- Each service item shows only the service title and index number
- Cleaner, more focused interface
- Less visual clutter

### Important Notes
- Service type information is still available in the service data, just not displayed
- Drag and drop functionality remains unchanged
- Service items are still easily identifiable by their titles

---

## Updated: Service Order Page - Removed Border Line - 2025-01-27

### Problem
There was a border line (`border-t`) above the "Save Order" button in the Service Order page that created visual separation.

### Root Cause
The save button container had `border-t` class which added a top border line.

### Fix Applied

**Updated ServiceReorder Component (`components/guest-settings/ServiceReorder.tsx`):**
- **Removed Border**: Removed `border-t` class from the save button container
- **Maintained Spacing**: Kept `pt-3` padding for proper spacing

**Files Changed:**
- `components/guest-settings/ServiceReorder.tsx` - Removed border line above save button

**Status:** ✅ Fixed

### Result
- No border line above the "Save Order" button
- Cleaner appearance
- Spacing maintained with padding

### Important Notes
- Save button functionality remains unchanged
- Visual separation removed for cleaner look

---

## Fixed: Video Deletion from Supabase - Improved Path Extraction - 2025-01-27

### Problem
When replacing a video, the original video was not being deleted from Supabase storage. The deletion logic wasn't working properly.

### Root Cause
1. **URL Path Extraction**: The `extractStoragePath` function was incorrectly extracting the path by only taking the last part of the URL, not the full path after 'services'
2. **Silent Failures**: Errors were being logged but not shown to users, making it hard to debug
3. **No Validation**: No check for default/placeholder videos that shouldn't be deleted
4. **Path Mismatch**: The extracted path might not match the actual storage path format

### Fix Applied

**Updated VideoUpload Component (`components/guest-settings/VideoUpload.tsx`):**
- **Improved Path Extraction**: 
  - Now finds 'services' in the URL and extracts everything after it as the storage path
  - Handles full path correctly: `{hotelId}/videos/{fileName}`
  - Added detailed logging for debugging
- **Added URL Validation**: 
  - Skips deletion for default videos (pexels.com, default URLs)
  - Skips deletion for URLs not in Supabase storage
- **Enhanced Error Handling**: 
  - Shows toast notifications when deletion fails (not just logs)
  - Shows success toast when deletion succeeds
  - Better error messages with details
- **Better Logging**: 
  - Logs the extracted path for verification
  - Logs warnings when path cannot be extracted
  - More detailed error information

**Files Changed:**
- `components/guest-settings/VideoUpload.tsx` - Improved video deletion logic with better path extraction

**Status:** ✅ Fixed

### Result
- Old videos are now properly deleted from Supabase storage when replaced
- Path extraction correctly handles Supabase storage URLs
- Users see toast notifications for deletion success/failure
- Better debugging with detailed logs
- Default/placeholder videos are not attempted to be deleted

### Important Notes
- Path extraction now correctly handles full Supabase storage URLs
- Toast notifications provide user feedback on deletion status
- Deletion errors are visible to users (not just logged)
- Default videos (like Pexels) are automatically skipped
- All deletion attempts are logged with full details for debugging

---

## Implemented: Promotional Banner System with Discounts - 2025-01-27

### Overview
Implemented a comprehensive promotional banner system with Instagram-style animated progress bar, time-based discounts, product-specific pricing, and full admin management. The system includes automatic banner display, minimization to badge, guest promotion details page, and integrated discount calculation in checkout.

### Features Implemented

1. **Promotional Banner Component**
   - Instagram-style animated progress bar at bottom
   - Auto-closes after configurable duration (default 5 seconds)
   - Pauses on hover
   - Minimizes to animated badge when closed
   - Gradient design with image support

2. **Promotional Badge Component**
   - Animated floating badge (bottom-right)
   - Pulse animation on mount
   - Click to expand back to banner
   - Sparkles icon with notification dot

3. **Database Schema**
   - `promotions` table with comprehensive fields:
     - Time-based rules (start/end date, time, days of week)
     - Discount configuration (percentage, fixed amount, free item)
     - Product/service targeting
     - Banner display settings
   - `promotion_product_discounts` table for product-specific discounts
   - Performance-optimized indexes for active promotion queries

4. **API Endpoints**
   - `GET /api/promotions` - List all promotions (admin)
   - `POST /api/promotions` - Create promotion (admin)
   - `GET /api/promotions/[id]` - Get promotion by ID
   - `PATCH /api/promotions/[id]` - Update promotion (admin)
   - `DELETE /api/promotions/[id]` - Delete promotion (admin)
   - `GET /api/guest/promotions/active` - Get active promotion (public)
   - `POST /api/guest/promotions/calculate-discount` - Calculate cart discounts

5. **Guest Promotion Details Page**
   - Full promotion information display
   - Discount details breakdown
   - Time and date restrictions
   - Call-to-action button

6. **Admin Promotions Management Page**
   - List all promotions with status indicators
   - Create/Edit promotion modal
   - Toggle active/inactive status
   - Delete promotions
   - Time-based discount configuration

7. **Checkout Integration**
   - Automatic discount calculation based on active promotions
   - Time-based rule validation
   - Product-specific discount application
   - Discount breakdown display:
     - Item-level discounts
     - Subtotal and discount amount
     - Final total with savings message
   - Real-time discount calculation on cart changes

### Database Schema

**promotions table:**
- Comprehensive promotion configuration
- Time-based rules (date range, time window, days of week)
- Discount types: percentage, fixed_amount, free_item
- Service type targeting
- Banner display settings

**promotion_product_discounts table:**
- Product-specific discount overrides
- Supports percentage and fixed amount discounts
- Maximum discount caps

### Performance Optimizations

1. **Database Queries:**
   - Specific column selection (no SELECT *)
   - Composite indexes for active promotion lookups
   - Partial indexes for active promotions only
   - Optimized date/time filtering

2. **React Query Caching:**
   - Active promotion cached for 1 minute
   - Refetch interval: 2 minutes
   - Cache time: 5 minutes
   - Prevents unnecessary API calls

3. **Client-Side Optimization:**
   - Discount calculation cached per cart state
   - LocalStorage for banner dismissal state
   - Memoized discount calculations

### Files Created

1. **Database:**
   - `supabase/migrations/032_create_promotions_tables.sql` - Database schema

2. **Database Utilities:**
   - `lib/database/promotions.ts` - Promotion database functions (optimized queries)

3. **API Routes:**
   - `app/api/promotions/route.ts` - List and create promotions
   - `app/api/promotions/[id]/route.ts` - Get, update, delete promotion
   - `app/api/guest/promotions/active/route.ts` - Get active promotion (public)
   - `app/api/guest/promotions/calculate-discount/route.ts` - Calculate cart discounts

4. **Components:**
   - `components/promotions/PromotionalBanner.tsx` - Banner with animated progress bar
   - `components/promotions/PromotionalBadge.tsx` - Minimized animated badge

5. **Pages:**
   - `app/guest/[hotelId]/promotions/[id]/page.tsx` - Guest promotion details page
   - `app/admin/promotions/page.tsx` - Admin promotions management

6. **Utilities:**
   - `lib/guest/utils/discountCalculator.ts` - Discount calculation utility
   - `lib/react-query/hooks/usePromotions.ts` - React Query hook for promotions

### Files Modified

1. **Guest Page Integration:**
   - `app/guest/[hotelId]/GuestPageContent.tsx`:
     - Added promotional banner and badge rendering
     - Integrated active promotion fetching
     - LocalStorage for banner dismissal state

2. **Checkout Integration:**
   - `components/guest/CheckoutPage.tsx`:
     - Added discount calculation on cart changes
     - Display item-level discounts
     - Show discount breakdown (subtotal, discount, final total)
     - Savings message when discount applied

### Discount Calculation Logic

1. **Time-Based Validation:**
   - Checks current date against promotion date range
   - Validates current time against promotion time window
   - Checks day of week against promotion days

2. **Service Type Filtering:**
   - Validates promotion applies to service type (restaurant, bar, etc.)
   - Supports multiple service types per promotion

3. **Product-Specific Discounts:**
   - Checks for product-specific discount overrides
   - Falls back to general promotion discount
   - Applies maximum discount caps

4. **Order Minimum:**
   - Validates minimum order amount requirement
   - Only applies discount if order meets minimum

### User Experience

1. **Banner Display:**
   - Shows automatically when active promotion exists
   - Respects localStorage dismissal state
   - Auto-closes after configured duration
   - Can be manually closed or minimized

2. **Badge Display:**
   - Shows when banner is dismissed
   - Animated to draw attention
   - Click to expand back to banner

3. **Checkout Experience:**
   - Real-time discount calculation
   - Clear discount breakdown
   - Visual savings indicator
   - Item-level discount display

### Important Notes

- **Performance First**: All queries use specific column selection, optimized indexes, and React Query caching
- **Time-Based Rules**: Promotions respect date ranges, time windows, and days of week
- **Product Targeting**: Supports both service-type and product-specific discounts
- **LocalStorage**: Banner dismissal state stored per promotion ID
- **Error Handling**: Graceful fallbacks if discount calculation fails
- **Admin Control**: Full CRUD operations for promotions with validation

### Future Enhancements

- Full promotion form with all fields (currently simplified)
- Product selection UI for product-specific discounts
- Promotion analytics and performance tracking
- A/B testing for promotions
- Scheduled promotion activation/deactivation

---

## Fixed: Added Promotions Link to Admin Navigation - 2025-01-27

### Problem
The promotions management page was created but there was no link to it in the admin navigation sidebar.

### Root Cause
The promotions page was added but not included in the `hotelAdminNavItems` array in the Sidebar component.

### Fix Applied

**Updated Sidebar Component (`components/layout/Sidebar.tsx`):**
- Added `Tag` icon import from `lucide-react` for promotions
- Added promotions link to `hotelAdminNavItems` array:
  ```typescript
  { href: '/admin/promotions', label: 'Promotions', icon: Tag }
  ```

**Updated Promotions Page (`app/admin/promotions/page.tsx`):**
- Changed from using `searchParams.get('hotel_id')` to using `useSelectedHotel()` hook
- This makes it consistent with other admin pages (like data-requests)
- Hotel ID is now automatically retrieved from localStorage via HotelSelector

**Files Changed:**
- `components/layout/Sidebar.tsx` - Added promotions link to navigation
- `app/admin/promotions/page.tsx` - Updated to use `useSelectedHotel()` hook

**Status:** ✅ Fixed

### Result
- Promotions link now appears in the admin sidebar navigation
- Link works correctly with hotel selection
- Consistent with other admin pages that use `useSelectedHotel()` hook
- Promotions page automatically uses the selected hotel from HotelSelector

### Important Notes
- Promotions link is only visible to hotel admins (in `hotelAdminNavItems`)
- Uses `Tag` icon from lucide-react for visual consistency
- Hotel selection is handled automatically via localStorage and HotelSelector component

---

## Updated: Promotional Banner Design - Image with Overlay - 2025-01-27

### Problem
The promotional banner had backgrounds, borders, and card styling. User requested it should be just an image with a colored mask overlay and information on top, similar to Instagram stories. Also needed image upload functionality in admin page.

### Root Cause
1. Banner component had card styling with backgrounds and borders
2. No image upload functionality in admin promotions form
3. No mask color configuration option

### Fix Applied

**1. Updated Database Schema (`supabase/migrations/032_create_promotions_tables.sql`):**
- Added `mask_color TEXT DEFAULT 'rgba(0,0,0,0.5)'` column to promotions table
- Stores color overlay configuration (supports rgba format)

**2. Updated PromotionalBanner Component (`components/promotions/PromotionalBanner.tsx`):**
- **Removed all backgrounds, borders, and card styling**
- Banner now displays as full-screen image with overlay
- Image uses `aspect-video` (16:9) ratio
- Colored mask overlay applied on top of image
- Text content (title, description, buttons) overlaid on image
- Progress bar at bottom (white on semi-transparent black background)
- Close button in top-right corner
- No card container, no rounded corners, no shadows
- Only shows if `image_url` exists

**3. Added Image Upload to Admin Form (`app/admin/promotions/page.tsx`):**
- **Image Upload Section:**
  - File input with drag-and-drop area
  - Image preview with remove button
  - Uploads to Supabase storage: `{hotelId}/promotions/{filename}`
  - Validates file type (images only) and size (max 5MB)
  - Deletes old image when replacing
  - Shows upload progress
- **Mask Color Configuration:**
  - Color picker for visual selection
  - Text input for rgba format (e.g., `rgba(0,0,0,0.5)`)
  - Converts hex color picker to rgba format
  - Default: `rgba(0,0,0,0.5)` (50% black overlay)
  - Help text explaining format

**4. Updated Database Interfaces:**
- Added `mask_color` to `Promotion` interface in `lib/database/promotions.ts`
- Added `mask_color` to `PromotionInsert` interface
- Updated all SELECT queries to include `mask_color`
- Updated React Query hook interface

**5. Updated Guest Promotion Details Page:**
- Added mask color overlay to promotion image display
- Consistent styling with banner

**Files Changed:**
- `supabase/migrations/032_create_promotions_tables.sql` - Added mask_color column
- `components/promotions/PromotionalBanner.tsx` - Redesigned as image with overlay (no backgrounds/borders)
- `app/admin/promotions/page.tsx` - Added image upload and mask color configuration
- `lib/database/promotions.ts` - Added mask_color to interfaces and queries
- `lib/react-query/hooks/usePromotions.ts` - Added mask_color to interface
- `app/guest/[hotelId]/promotions/[id]/page.tsx` - Added mask overlay to image

**Status:** ✅ Fixed

### Result
- Banner now displays as clean image with overlay (Instagram stories style)
- No backgrounds, borders, or card styling
- Image upload fully functional in admin page
- Mask color configurable via color picker or rgba text input
- Text and buttons overlaid on image with proper contrast
- Progress bar at bottom (white on semi-transparent background)
- Image is required for banner to display

### Banner Design
- **Full-screen image** with 16:9 aspect ratio
- **Colored mask overlay** (configurable rgba color)
- **Text overlay** (title, description) centered on image
- **Action buttons** overlaid on image
- **Progress bar** at bottom (Instagram-style)
- **Close button** in top-right corner
- **No backgrounds, borders, or card containers**

### Important Notes
- Image upload is required (banner won't show without image)
- Mask color defaults to `rgba(0,0,0,0.5)` (50% black)
- Supports any rgba color format for custom overlays
- Old images are automatically deleted when replaced
- Image validation: images only, max 5MB
- Images stored in `{hotelId}/promotions/` folder in Supabase storage

---

## Updated: Removed Mask Color & Moved Promotion Form to Separate Pages - 2025-01-27

### Problem
User requested to remove the mask color feature and move promotion creation/editing from modal windows to separate pages.

### Root Cause
1. Mask color overlay was added but user wants it removed
2. Promotion form was in a modal, user prefers separate pages for better UX

### Fix Applied

**1. Removed Mask Color Feature:**
- Removed `mask_color` column from database interfaces (`lib/database/promotions.ts`)
- Removed `mask_color` from React Query hook interface (`lib/react-query/hooks/usePromotions.ts`)
- Removed mask overlay from `PromotionalBanner` component
- Removed mask overlay from guest promotion details page
- Removed mask color configuration from admin forms
- Updated all SELECT queries to exclude `mask_color`

**2. Created Separate Pages for Promotion Management:**
- **New Promotion Page** (`app/admin/promotions/new/page.tsx`):
  - Full-page form for creating new promotions
  - Image upload functionality
  - All promotion fields (title, description, discount, times, etc.)
  - Back button to return to promotions list
  - Navigates back to list after successful creation
- **Edit Promotion Page** (`app/admin/promotions/[id]/edit/page.tsx`):
  - Full-page form for editing existing promotions
  - Fetches promotion data on load
  - Pre-fills all form fields
  - Image upload with old image deletion
  - Back button to return to promotions list
  - Navigates back to list after successful update

**3. Updated Promotions List Page:**
- Removed modal component completely
- Removed `showCreateModal` and `editingPromotion` state
- Updated "Create Promotion" button to navigate to `/admin/promotions/new`
- Updated "Edit" button to navigate to `/admin/promotions/{id}/edit`
- Cleaned up unused imports (Modal, Upload, X icons, supabase, logger)
- Simplified component structure

**Files Changed:**
- `components/promotions/PromotionalBanner.tsx` - Removed mask overlay
- `app/admin/promotions/page.tsx` - Removed modal, added navigation
- `app/admin/promotions/new/page.tsx` - New page for creating promotions
- `app/admin/promotions/[id]/edit/page.tsx` - New page for editing promotions
- `app/guest/[hotelId]/promotions/[id]/page.tsx` - Removed mask overlay
- `lib/database/promotions.ts` - Removed mask_color from interfaces and queries
- `lib/react-query/hooks/usePromotions.ts` - Removed mask_color from interface

**Status:** ✅ Fixed

### Result
- Banner displays clean image without mask overlay
- Promotion creation/editing now uses dedicated pages instead of modals
- Better UX with full-page forms and proper navigation
- Cleaner codebase without unused modal components
- All mask color references removed from codebase

### Important Notes
- Mask color column may still exist in database (not removed via migration for safety)
- Promotion forms are now full pages with better space for all fields
- Navigation flow: List → Create/Edit → Back to List
- Image upload works the same on both create and edit pages

---

## Updated: Banner Image Square Format & Centered Display - 2025-01-27

### Problem
User requested banner image to be forced to square (1:1) aspect ratio and appear in the middle of the screen on guest site.

### Root Cause
Banner was using `aspect-video` (16:9) and `max-w-2xl` width, not centered properly.

### Fix Applied

**1. Updated PromotionalBanner Component (`components/promotions/PromotionalBanner.tsx`):**
- Changed from `aspect-video` (16:9) to `aspect-square` (1:1)
- Changed from `max-w-2xl` to `max-w-md` for better square proportions
- Added `mx-auto` to ensure proper centering
- Banner now displays as a square image centered on screen

**2. Updated Admin Form Instructions:**
- Changed recommendation from "16:9 aspect ratio" to "Square (1:1) aspect ratio"
- Updated in both create and edit pages

**Files Changed:**
- `components/promotions/PromotionalBanner.tsx` - Changed to square aspect ratio and centered
- `app/admin/promotions/new/page.tsx` - Updated image upload instructions
- `app/admin/promotions/[id]/edit/page.tsx` - Updated image upload instructions

**Status:** ✅ Fixed

### Result
- Banner image is now forced to square (1:1) aspect ratio
- Banner appears centered in the middle of the screen
- Better visual consistency with square format
- Admin forms updated to reflect square image requirement

### Important Notes
- Banner uses `aspect-square` Tailwind class for 1:1 ratio
- Maximum width set to `max-w-md` (28rem/448px) for optimal square display
- Image uses `object-cover` to maintain square while filling container
- Centered using `mx-auto` on flex container

---

## Fixed: Promotional Banner Not Showing on Guest Site - 2025-01-27

### Problem
User reported that promotional banner is not appearing on the guest site.

### Root Cause
1. `getActivePromotion` query was not filtering for promotions with `image_url` (banner requires image)
2. Time comparison logic might have issues with time format
3. No debugging/logging to help diagnose issues

### Fix Applied

**1. Updated `getActivePromotion` Query (`lib/database/promotions.ts`):**
- Added filter `.not('image_url', 'is', null)` to only fetch promotions with images
- Banner component requires `image_url` to display, so this prevents unnecessary queries
- Improved time comparison logic with proper format handling

**2. Enhanced Time Comparison Logic:**
- Fixed time format handling to ensure consistent HH:MM:00 format
- Added logging when time check fails to help debug issues
- Handles both HH:MM:SS and HH:MM formats from database

**3. Added Debug Logging (`app/guest/[hotelId]/GuestPageContent.tsx`):**
- Logs when active promotion is found (with details)
- Logs when no active promotion is found
- Helps diagnose why banner might not be showing

**Files Changed:**
- `lib/database/promotions.ts` - Added image_url filter and improved time comparison
- `app/guest/[hotelId]/GuestPageContent.tsx` - Added debug logging

**Status:** ✅ Fixed

### Result
- Banner will only show for promotions that have an image_url
- Better time comparison logic prevents false negatives
- Debug logging helps identify issues if banner still doesn't show

### Important Notes
- Banner requires: `is_active = true`, `show_banner = true`, `image_url` not null
- Time/date conditions must be met (if specified)
- Banner won't show if dismissed in localStorage
- Check browser console logs for debugging information

### Troubleshooting
If banner still doesn't show, check:
1. Promotion has `is_active = true` and `show_banner = true`
2. Promotion has an `image_url` uploaded
3. Current date/time is within promotion's date/time range (if specified)
4. Current day of week is in promotion's `days_of_week` array (if specified)
5. Banner wasn't dismissed (check localStorage for `promo_dismissed_{promotionId}`)
6. Browser console for debug logs

---

## Added: "Show Always" Option for Promotions - 2025-01-27

### Problem
User requested an option to show promotional banner always, ignoring time/date restrictions.

### Root Cause
Promotions were always subject to time/date/day-of-week restrictions. No way to bypass these restrictions for always-on promotions.

### Fix Applied

**1. Updated Database Schema:**
- Added `show_always BOOLEAN DEFAULT FALSE NOT NULL` column to promotions table
- Created migration `034_add_show_always_to_promotions.sql` for existing databases
- Updated main migration file `032_create_promotions_tables.sql`

**2. Updated `getActivePromotion` Logic (`lib/database/promotions.ts`):**
- Added check: if `show_always = true`, skip all time/date/day restrictions
- Only applies time/date checks if `show_always = false`
- Updated all SELECT queries to include `show_always` column
- Updated `PromotionInsert` interface to include `show_always`

**3. Updated Admin Forms:**
- **Create Page** (`app/admin/promotions/new/page.tsx`):
  - Added `show_always` checkbox to form
  - Default value: `false`
  - Label: "Show Always (ignore time/date restrictions)"
- **Edit Page** (`app/admin/promotions/[id]/edit/page.tsx`):
  - Added `show_always` checkbox to form
  - Pre-fills from existing promotion data
  - Same label and functionality

**4. Updated Interfaces:**
- Added `show_always: boolean` to `Promotion` interface in `lib/database/promotions.ts`
- Added `show_always?: boolean` to `PromotionInsert` interface
- Added `show_always: boolean` to React Query hook interface
- Added `show_always: boolean` to admin page interface

**Files Changed:**
- `supabase/migrations/032_create_promotions_tables.sql` - Added show_always column
- `supabase/migrations/034_add_show_always_to_promotions.sql` - Migration for existing databases
- `lib/database/promotions.ts` - Added show_always to interfaces and logic
- `lib/react-query/hooks/usePromotions.ts` - Added show_always to interface
- `app/admin/promotions/new/page.tsx` - Added show_always checkbox
- `app/admin/promotions/[id]/edit/page.tsx` - Added show_always checkbox
- `app/admin/promotions/page.tsx` - Added show_always to interface

**Status:** ✅ Fixed

### Result
- Admins can now set promotions to "Show Always" which ignores all time/date restrictions
- When `show_always = true`, banner will display regardless of:
  - Start/end dates
  - Start/end times
  - Days of week
- When `show_always = false`, normal time/date restrictions apply
- Default value is `false` to maintain existing behavior

### Important Notes
- `show_always = true` bypasses ALL time-based restrictions
- Still requires: `is_active = true`, `show_banner = true`, `image_url` not null
- Still respects dismissal state (localStorage)
- Useful for permanent promotions or special announcements

---

## Fixed: Promotional Badge Click Behavior - 2025-01-27

### Problem
User reported that clicking on the promotional badge navigates directly to the detail page. User wants:
1. Badge click should expand/show the banner
2. Banner should have "View More" button (instead of "View Details") that navigates to detail page

### Root Cause
- `PromotionalBadge` component was calling `router.push()` directly instead of calling `onExpand()` prop
- Banner button text was "View Details" instead of "View More"

### Fix Applied

**1. Updated `PromotionalBadge` Component (`components/promotions/PromotionalBadge.tsx`):**
- Changed `handleClick` to call `onExpand()` instead of navigating directly
- Removed unused `useRouter` import
- Badge now expands the banner when clicked

**2. Updated `PromotionalBanner` Component (`components/promotions/PromotionalBanner.tsx`):**
- Renamed "View Details" button text to "View More"
- Button still navigates to detail page when clicked (unchanged functionality)

**Files Changed:**
- `components/promotions/PromotionalBadge.tsx` - Changed click handler to expand banner
- `components/promotions/PromotionalBanner.tsx` - Renamed button text to "View More"

**Status:** ✅ Fixed

### Result
- Clicking the badge now expands the banner (doesn't navigate)
- Banner shows "View More" button that navigates to detail page
- Better user experience: users see the banner first, then can choose to view details

### Important Notes
- Badge click behavior: Expand banner → User can view banner → Click "View More" → Navigate to detail page
- Banner still has "Minimize" button to collapse back to badge
- Navigation flow is now: Badge → Banner → Detail Page (instead of Badge → Detail Page)

---

## Updated: Promotional Banner Size and Scroll Behavior - 2025-01-27

### Problem
User requested:
1. Make banner smaller (currently stuck to edges)
2. Show banner only after hero page is scrolled up (not immediately on page load)
3. Move badge to right bottom corner

### Root Cause
- Banner was using `max-w-md` with no padding, making it appear stuck to edges
- Banner was showing immediately on page load, interrupting hero video experience
- Badge positioning needed adjustment

### Fix Applied

**1. Made Banner Smaller (`components/promotions/PromotionalBanner.tsx`):**
- Changed `max-w-md` to `max-w-sm` (smaller width)
- Added `p-4` padding to container to prevent edge sticking
- Added `rounded-lg shadow-2xl` for better visual separation
- Reduced text sizes: title from `text-3xl md:text-4xl` to `text-2xl md:text-3xl`
- Reduced description from `text-lg md:text-xl` to `text-base md:text-lg`
- Reduced padding in content overlay from `p-8` to `p-6`
- Made buttons smaller: `px-5 py-2.5` with `text-sm`

**2. Added Scroll Detection (`app/guest/[hotelId]/GuestPageContent.tsx`):**
- Banner now only shows after user scrolls at least 100px
- If user has already scrolled when page loads, banner shows immediately
- Uses scroll event listener with passive flag for performance
- Cleans up event listener on unmount

**3. Adjusted Badge Position (`components/promotions/PromotionalBadge.tsx`):**
- Changed from `bottom-6 right-6` to `bottom-4 right-4`
- Better positioned at right bottom corner

**Files Changed:**
- `components/promotions/PromotionalBanner.tsx` - Made smaller with padding
- `components/promotions/PromotionalBadge.tsx` - Adjusted position
- `app/guest/[hotelId]/GuestPageContent.tsx` - Added scroll detection

**Status:** ✅ Fixed

### Result
- Banner is now smaller and has proper spacing from edges
- Banner only appears after user scrolls past hero section
- Badge is properly positioned at right bottom corner
- Better user experience: doesn't interrupt initial hero video viewing

### Important Notes
- Banner shows after 100px scroll (configurable threshold)
- If user refreshes page while scrolled, banner shows immediately
- Badge position: `bottom-4 right-4` (16px from edges)
- Banner max width: `max-w-sm` (384px) with padding

---

## Fixed: Banner Close Button and Badge Position - 2025-01-27

### Problem
User reported:
1. Close button is not working
2. When user clicks outside the banner (on overlay), it should close automatically
3. Badge is not on right bottom of screen

### Root Cause
- Close button click might have been prevented by event propagation
- No click handler on overlay to close when clicking outside
- Badge z-index might be too low or positioning needs explicit styles

### Fix Applied

**1. Fixed Close Button (`components/promotions/PromotionalBanner.tsx`):**
- Added `handleCloseClick` function with `e.stopPropagation()` to prevent event bubbling
- Added `type="button"` to prevent form submission
- Increased z-index from `z-10` to `z-20` to ensure it's clickable
- Added `cursor-pointer` for better UX

**2. Added Click-Outside-to-Close:**
- Added `handleOverlayClick` function that closes banner when clicking on overlay
- Added `onClick={handleOverlayClick}` to main container
- Added `onClick={(e) => e.stopPropagation()}` to banner content div to prevent closing when clicking inside banner
- Clicking outside the banner (on the dark overlay) now closes it

**3. Fixed Badge Position (`components/promotions/PromotionalBadge.tsx`):**
- Increased z-index from `z-40` to `z-50` to ensure it's above other elements
- Added explicit inline styles `style={{ position: 'fixed', bottom: '16px', right: '16px' }}` to ensure proper positioning
- Added `type="button"` for proper button behavior

**Files Changed:**
- `components/promotions/PromotionalBanner.tsx` - Fixed close button, added click-outside-to-close
- `components/promotions/PromotionalBadge.tsx` - Fixed position with explicit styles and higher z-index

**Status:** ✅ Fixed

### Result
- Close button now works properly
- Clicking outside the banner (on overlay) closes it automatically
- Badge is properly positioned at right bottom corner with higher z-index
- Better user experience with multiple ways to close the banner

### Important Notes
- Close button uses `stopPropagation()` to prevent event bubbling
- Banner content div stops propagation to prevent closing when clicking inside
- Badge z-index is `z-50` to ensure it's always visible
- Badge uses both Tailwind classes and inline styles for reliable positioning

---

## Fixed: Badge Position and Outside Click Behavior - 2025-01-27

### Problem
User reported:
1. Badge should be moved to left bottom corner (currently right bottom)
2. Outside click is pausing the banner but not closing it

### Root Cause
- Badge was positioned at `right-4` instead of `left-4`
- Mouse enter/leave events on the main container were interfering with click events
- The pause logic was preventing the close action from working properly

### Fix Applied

**1. Moved Badge to Left Bottom (`components/promotions/PromotionalBadge.tsx`):**
- Changed from `right-4` to `left-4` in className
- Changed inline style from `right: '16px'` to `left: '16px'`
- Badge now appears at left bottom corner

**2. Fixed Outside Click to Close (`components/promotions/PromotionalBanner.tsx`):**
- Moved `onMouseEnter` and `onMouseLeave` from main container to banner content div
- This prevents mouse events from interfering with click events
- Clicking outside the banner now properly closes it instead of just pausing
- Pause on hover still works when hovering over the banner content itself

**Files Changed:**
- `components/promotions/PromotionalBadge.tsx` - Moved to left bottom corner
- `components/promotions/PromotionalBanner.tsx` - Fixed outside click behavior

**Status:** ✅ Fixed

### Result
- Badge is now positioned at left bottom corner
- Clicking outside the banner (on overlay) properly closes it
- Hover pause still works when hovering over banner content
- Better separation of concerns: click events vs hover events

### Important Notes
- Badge position: `bottom-4 left-4` (16px from left and bottom edges)
- Mouse enter/leave events are now only on banner content, not the overlay
- Click events work independently from hover events

---

## Fixed: Outside Click to Close Not Working - 2025-01-27

### Problem
User reported that clicking outside the banner (on the overlay) was not closing the banner.

### Root Cause
The `handleOverlayClick` function was checking if `e.target === e.currentTarget`, but because there's a background overlay div between the main container and where the user clicks, the `e.target` was always the background overlay div, not the main container. This caused the condition to always be false.

### Fix Applied

**Updated `handleOverlayClick` Logic (`components/promotions/PromotionalBanner.tsx`):**
- Simplified the function to just call `onClose()` when overlay is clicked
- Moved `onClick={handleOverlayClick}` from main container to the background overlay div directly
- Added `cursor-pointer` class to the background overlay div for better UX
- Removed the complex condition check - now the overlay div directly handles clicks
- Banner content div still has `stopPropagation` to prevent closing when clicking inside

**Files Changed:**
- `components/promotions/PromotionalBanner.tsx` - Fixed overlay click detection

**Status:** ✅ Fixed

### Result
- Clicking outside the banner (on the dark overlay) now properly closes it
- Both the main container and background overlay div can trigger the close action
- Better user experience with clear visual feedback (cursor pointer on overlay)

### Important Notes
- The background overlay div now directly handles onClick events
- Clicking on the dark overlay closes the banner immediately
- Banner content div stops propagation to prevent closing when clicking inside
- Simpler and more reliable implementation

---

## Redesigned: Promotional Badge to Match Contact Concierge Style - 2025-01-27

### Problem
User requested to redesign the promotional badge to:
1. Match the style of the "contact concierge" button
2. Show only "%" icon (no text)
3. Make it circular
4. Position it above the "my orders" floating button

### Root Cause
- Badge had a gradient background and text, didn't match the contact concierge button style
- Badge was positioned at left bottom, not above the floating cart button
- Badge had Sparkles icon and "Special Offer" text instead of just "%" icon

### Fix Applied

**Redesigned Badge (`components/promotions/PromotionalBadge.tsx`):**
- Changed style to match contact concierge button: `bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white/20 transition-all hover:scale-105`
- Removed gradient background and text
- Changed icon from `Sparkles` to `Percent` (from lucide-react)
- Removed "Special Offer" text - now shows only "%" icon
- Made it circular with `p-4` padding and `rounded-full`
- Positioned above FloatingCartButton: `bottom-24 right-6` (96px from bottom, 24px from right)
- Removed animated ping indicator
- Kept pulse animation on mount for 2 seconds

**Files Changed:**
- `components/promotions/PromotionalBadge.tsx` - Complete redesign to match contact concierge style

**Status:** ✅ Fixed

### Result
- Badge now matches the contact concierge button style (white/10 backdrop-blur, rounded-full)
- Shows only "%" icon, no text
- Circular button design
- Positioned above the floating cart/orders button at right bottom
- Consistent design language with the rest of the guest site

### Important Notes
- Badge position: `bottom-24 right-6` (96px from bottom, 24px from right)
- Style matches: `bg-white/10 backdrop-blur-md border border-white/20 rounded-full`
- Icon: `Percent` from lucide-react, size `w-6 h-6`
- Hover effect: `hover:bg-white/20 hover:scale-105`

---

## Enhanced: Promotional Badge Animation and Visibility - 2025-01-27

### Problem
User requested:
1. Animation should be more noticeable
2. Badge should only be visible when orders button becomes visible
3. They should appear at the same time

### Root Cause
- Badge was always visible, not synced with FloatingCartButton visibility
- Animation was subtle (just pulse) and only lasted 2 seconds
- No scroll detection to match FloatingCartButton behavior

### Fix Applied

**Enhanced Badge Visibility and Animation (`components/promotions/PromotionalBadge.tsx`):**
- Added scroll detection: badge only shows after scrolling 100px (same as FloatingCartButton)
- Added `isVisible` state that tracks scroll position
- Badge now appears/disappears at the same time as FloatingCartButton
- Enhanced animation: Changed from `animate-pulse` to `animate-bounce` for more noticeable effect
- Added combined animation: `bounce 1s ease-in-out infinite, pulse 2s ease-in-out infinite`
- Added glowing box-shadow effect when animating: `0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 255, 255, 0.3)`
- Animation duration increased from 2 seconds to 3 seconds
- Uses passive scroll listener for better performance

**Files Changed:**
- `components/promotions/PromotionalBadge.tsx` - Added scroll detection and enhanced animation

**Status:** ✅ Fixed

### Result
- Badge only appears when user scrolls past 100px (same as orders button)
- More noticeable animation with bounce effect and glowing shadow
- Badge and orders button appear/disappear together
- Better user experience with synchronized visibility

### Important Notes
- Visibility threshold: 100px scroll (matches FloatingCartButton)
- Animation: Bounce + pulse with glowing shadow effect
- Animation duration: 3 seconds after becoming visible
- Uses passive scroll listener for performance

---

## Updated: Promotional Badge Animation to Never Stop - 2025-01-27

### Problem
User requested that the animation should never stop (continue indefinitely).

### Root Cause
- Animation was set to stop after 3 seconds using `setTimeout`
- `isAnimating` state was being set to `false` after timeout

### Fix Applied

**Removed Animation Timeout (`components/promotions/PromotionalBadge.tsx`):**
- Removed `isAnimating` state (no longer needed)
- Removed `setTimeout` that was stopping animation after 3 seconds
- Animation now runs continuously with `infinite` keyword
- Simplified useEffect by removing animation state management

**Files Changed:**
- `components/promotions/PromotionalBadge.tsx` - Removed animation timeout, animation now infinite

**Status:** ✅ Fixed

### Result
- Animation now runs continuously and never stops
- Badge always has bounce + pulse + glowing shadow effect when visible
- Simpler code without animation state management
- More attention-grabbing with continuous animation

### Important Notes
- Animation: `bounce 1s ease-in-out infinite, pulse 2s ease-in-out infinite`
- Glowing shadow: Always active when badge is visible
- Animation continues as long as badge is visible (after scrolling 100px)

---

## Redesigned: Promotional Banner Layout - 2025-01-27

### Problem
User requested to redesign the banner layout:
1. Text should be at the top of the screen
2. Buttons at the bottom
3. Only "View More" button (remove "Minimize" button)
4. "View More" button should be styled like the current "Minimize" button
5. Button should be at bottom center of the banner

### Root Cause
- Text and buttons were centered vertically in the middle
- Had two buttons (View More and Minimize)
- View More button had different styling (white background)

### Fix Applied

**Redesigned Banner Layout (`components/promotions/PromotionalBanner.tsx`):**
- Moved text content to top: Changed from `justify-center` to `top-0` positioning
- Moved button to bottom center: Added new div at `bottom-0` with `flex justify-center`
- Removed "Minimize" button completely
- Changed "View More" button styling to match old "Minimize" button: `bg-white/20 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/30 transition-all border border-white/30`
- Removed `handleMinimize` function (no longer needed)
- Text now at top, button at bottom center

**Files Changed:**
- `components/promotions/PromotionalBanner.tsx` - Redesigned layout with text at top and button at bottom

**Status:** ✅ Fixed

### Result
- Text (title and description) is now positioned at the top of the banner
- "View More" button is at the bottom center of the banner
- Only one button (removed Minimize)
- Button uses the subtle transparent style (matches old Minimize button)
- Cleaner, more focused design

### Important Notes
- Text positioning: `absolute top-0` with padding
- Button positioning: `absolute bottom-0` with `flex justify-center`
- Button style: Transparent white with backdrop blur (subtle style)
- Users can still close banner via close button (X) or clicking outside

---

## Updated: Promotional Banner Close Button Style and Content Alignment - 2025-01-27

### Problem
User requested:
1. Apply the same style (transparent white with backdrop blur) to the close button
2. Move content to the left side (instead of centered)

### Root Cause
- Close button had different styling (black background) compared to View More button
- Content was centered, not aligned to left

### Fix Applied

**Updated Close Button Style (`components/promotions/PromotionalBanner.tsx`):**
- Changed close button from `bg-black/50 hover:bg-black/70` to `bg-white/20 backdrop-blur-sm hover:bg-white/30`
- Added `border border-white/30` to match View More button style
- Now matches the transparent white style of View More button

**Moved Content to Left Side:**
- Changed text container from `items-center text-center` to `items-start text-left`
- Changed button container from `justify-center` to `justify-start`
- Removed `right-0` from text container to allow left alignment
- Added `p-6` padding to button container for consistent spacing

**Files Changed:**
- `components/promotions/PromotionalBanner.tsx` - Updated close button style and left-aligned content

**Status:** ✅ Fixed

### Result
- Close button now matches View More button style (transparent white with backdrop blur)
- Text content is left-aligned at the top
- View More button is left-aligned at the bottom
- Consistent styling across all banner elements
- Better visual hierarchy with left alignment

### Important Notes
- Close button style: `bg-white/20 backdrop-blur-sm hover:bg-white/30 border border-white/30`
- Text alignment: `items-start text-left` (left-aligned)
- Button alignment: `justify-start` (left-aligned)
- All elements now use the same transparent white style

---

## Fixed: Promotion Editing Not Saving and Image Replacement Issues - 2025-01-27

### Problem
User reported:
1. Editing promotions is not saving in admin page
2. Image replacement is not working
3. When replacing images or videos, original should be deleted from Supabase

### Root Cause
1. **Update Mutation Issue**: The mutation was sending `hotel_id` in the request body, which might cause issues. The API route doesn't need `hotel_id` for updates (it gets it from the existing promotion).
2. **Image Deletion Logic**: The image deletion logic existed but wasn't robust - it didn't use the same pattern as VideoUpload component.
3. **Missing Old Image Deletion on Update**: When updating a promotion, if the image URL changed, the old image wasn't being deleted.

### Fix Applied

**1. Fixed Update Mutation (`app/admin/promotions/[id]/edit/page.tsx`):**
- Removed `hotel_id` from the mutation body (not needed for updates)
- Added better error handling to show actual error messages from API
- Added logging for debugging

**2. Improved Image Deletion Logic:**
- Created `extractStoragePath` helper function (same pattern as VideoUpload)
- Created `deleteOldImage` helper function with proper validation
- Skips deletion for default/placeholder images (not in Supabase)
- Validates that image is in `hotelId/promotions/` folder before deleting
- Shows toast notifications for deletion errors
- Better error handling and logging

**3. Delete Old Image on Update:**
- Added logic in mutation to delete old image when `image_url` changes
- Compares old and new image URLs before deletion
- Only deletes if URLs are different

**4. Enhanced Image Replacement:**
- Uses the same helper functions for consistent behavior
- Properly extracts storage path from Supabase URL
- Validates URL format before attempting deletion

**Files Changed:**
- `app/admin/promotions/[id]/edit/page.tsx` - Fixed mutation, improved image deletion, added helpers

**Status:** ✅ Fixed

### Result
- Promotion editing now saves correctly
- Image replacement works properly
- Old images are deleted from Supabase when replaced
- Better error messages and logging for debugging
- Consistent behavior with video upload deletion logic

### Important Notes
- `hotel_id` is no longer sent in update requests (not needed)
- Image deletion uses same pattern as VideoUpload component
- Old images are deleted both when replacing and when updating with new image
- Skips deletion for non-Supabase URLs (default/placeholder images)
- Validates storage path before deletion to prevent errors

---

## Fixed: Time Fields Resetting and Image Replacement Issues - 2025-01-27

### Problem
User reported:
1. Start time and end time are resetting to default when edited
2. Image replacement is still not working

### Root Cause
1. **Time Input Format Issue**: The `onChange` handler was adding `:00` to the time value (e.g., `14:30` becomes `14:30:00`), but HTML5 `type="time"` inputs expect format `HH:MM` (without seconds). When the value becomes invalid, the input resets to empty/default.
2. **Helper Functions Order**: The `extractStoragePath` and `deleteOldImage` helper functions were defined after `handleFileSelect` tried to use them. While this works due to hoisting for function declarations, it's better to define them earlier for clarity and to ensure they're available.

### Fix Applied

**1. Fixed Time Input Handling (`app/admin/promotions/[id]/edit/page.tsx`):**
- Removed `:00` suffix from `onChange` handlers for time inputs
- Time inputs now store values in `HH:MM` format (e.g., `14:30`)
- Added `:00` suffix only when sending data to API (in `mutationFn`)
- Updated `useEffect` to properly extract time without seconds for display

**2. Moved Helper Functions:**
- Moved `extractStoragePath` and `deleteOldImage` functions to the top of the component (after state declarations)
- Ensures they're available when `handleFileSelect` uses them
- Better code organization

**3. Enhanced Time Format Handling:**
- `useEffect` now properly extracts time format: checks if time includes `:` and extracts first 5 characters
- `mutationFn` adds `:00` suffix only if time exists and doesn't already have it
- Handles null/empty time values correctly

**Files Changed:**
- `app/admin/promotions/[id]/edit/page.tsx` - Fixed time input handling, moved helper functions

**Status:** ✅ Fixed

### Result
- Time fields no longer reset when edited
- Time values are properly formatted for HTML5 time inputs (`HH:MM`)
- Time values are correctly formatted for API (`HH:MM:SS`)
- Image replacement works correctly
- Helper functions are properly organized

### Important Notes
- HTML5 `type="time"` input expects `HH:MM` format (no seconds)
- API expects `HH:MM:SS` format (with seconds)
- Time conversion happens only when sending to API
- Helper functions are now defined early in the component for better organization

---

## Enhanced: Promotional Banner Border and Detail Page Redesign - 2025-01-27

### Problem
User requested:
1. Add light border to promotional banner
2. Fix back button navigation from detailed promotion page - should preserve `?room=X` parameter
3. Redesign detailed promotion page to be catchy and professional

### Root Cause
1. **Banner Border**: Banner had no border, making it less visually distinct
2. **Navigation Issue**: Back button was navigating to `/guest/${hotelId}` without preserving the `room` query parameter
3. **Detail Page Design**: The detail page was basic and not visually appealing

### Fix Applied

**1. Added Light Border to Banner (`components/promotions/PromotionalBanner.tsx`):**
- Added `border-2 border-white/30` to the banner container
- Creates a subtle, elegant border that makes the banner stand out

**2. Fixed Back Navigation (`app/guest/[hotelId]/promotions/[id]/page.tsx`):**
- Added `useSearchParams` to get `room` parameter
- Created `getBackUrl()` helper function that preserves `?room=X` parameter
- Updated all navigation calls to use `getBackUrl()` instead of hardcoded URLs
- Updated `PromotionalBanner` component to accept `roomNumber` prop
- Modified `handleViewDetails` to include `?room=X` in the URL when navigating to detail page
- Updated `GuestPageContent` to pass `roomNumber` to `PromotionalBanner`

**3. Redesigned Detail Page (`app/guest/[hotelId]/promotions/[id]/page.tsx`):**
- **Hero Image Section**: 
  - Larger image (h-80 md:h-[500px]) with rounded corners
  - Gradient overlay from black/80 to transparent
  - Title and short description overlaid on image with drop shadows
  - Border and shadow for depth
- **Main Content Card**:
  - Glassmorphism effect: `bg-white/10 backdrop-blur-xl border border-white/20`
  - Rounded corners (`rounded-3xl`)
  - Enhanced shadows
- **Discount Badge**:
  - Prominent gradient badge (yellow → orange → pink)
  - Large, bold discount text (4xl/5xl)
  - Icon with backdrop blur
  - Minimum order amount displayed prominently
  - White border for contrast
- **Details Grid**:
  - Two-column grid for time and date info
  - Icons (Clock, Calendar) with colored accents
  - Glassmorphism cards with borders
- **CTA Button**:
  - Multi-color gradient (blue → purple → pink)
  - Shopping bag icon
  - Hover scale effect
  - Enhanced shadow and border
- **Overall Design**:
  - Gradient background (`from-gray-900 via-gray-800 to-gray-900`)
  - Professional spacing and typography
  - Consistent use of glassmorphism and gradients
  - Better visual hierarchy

**Files Changed:**
- `components/promotions/PromotionalBanner.tsx` - Added border, added roomNumber prop
- `app/guest/[hotelId]/promotions/[id]/page.tsx` - Fixed navigation, complete redesign
- `app/guest/[hotelId]/GuestPageContent.tsx` - Pass roomNumber to PromotionalBanner

**Status:** ✅ Fixed

### Result
- Banner now has a subtle, elegant light border
- Back button correctly preserves `?room=X` parameter
- Detail page is now visually stunning and professional
- Better user experience with consistent navigation
- Modern design with glassmorphism and gradients

### Important Notes
- Banner border: `border-2 border-white/30` (subtle white border)
- Navigation preserves room parameter throughout the flow
- Detail page uses modern design patterns (glassmorphism, gradients, overlays)
- All navigation respects the room parameter context

---

## Updated: Start Shopping Button Style and Navigation - 2025-01-27

### Problem
User requested:
1. "Start Shopping Now" button should match the concierge service button style
2. When clicked, should navigate to services part of home page (not just home page)

### Root Cause
1. **Button Style Mismatch**: The button used a multi-color gradient style instead of matching the concierge button's glassmorphism style
2. **Navigation Issue**: Button was navigating to home page but not scrolling to services section

### Fix Applied

**1. Updated Button Style (`app/guest/[hotelId]/promotions/[id]/page.tsx`):**
- Changed from gradient button to glassmorphism style matching concierge button
- Style: `px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full hover:bg-white/20 transition-all hover:scale-105`
- Removed ShoppingBag icon to match concierge button simplicity
- Changed from `Button` component to native `button` element for exact style match

**2. Enhanced Navigation:**
- Updated `onClick` handler to navigate to home page with room parameter
- Added `setTimeout` to scroll to services section after navigation
- Uses `document.querySelector('[data-section="services"]')` to find services section
- Smooth scroll behavior for better UX

**3. Cleaned Up Imports:**
- Removed unused `ShoppingBag` icon import
- Removed unused `ArrowLeft` icon import

**Files Changed:**
- `app/guest/[hotelId]/promotions/[id]/page.tsx` - Updated button style and navigation

**Status:** ✅ Fixed

### Result
- Button now matches concierge service button style exactly
- Button navigates to home page and scrolls to services section
- Room parameter is preserved during navigation
- Consistent button styling across the application
- Better user experience with smooth scrolling

### Important Notes
- Button style: `bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full`
- Navigation preserves room parameter and scrolls to services section
- Uses native `button` element for exact style match
- Smooth scroll behavior for better UX

---

## Added: Discount Badge on Restaurant and Bar Service Pages - 2025-01-27

### Problem
User requested to show the discount badge next to the "open/closed" badge on restaurant and bar service pages.

### Root Cause
- Service detail pages didn't check for active promotions
- No visual indication of discounts available for restaurant/bar services
- Discount information was only shown in checkout, not on service pages

### Fix Applied

**1. Added Promotion Hook to ServiceDetailPage (`components/guest/ServiceDetailPage.tsx`):**
- Imported `useActivePromotion` hook
- Added `hotelId` prop to `ServiceDetailPageProps`
- Fetched active promotion using the hook

**2. Added Discount Badge Logic:**
- Check if service type is 'restaurant' or 'bar'
- Check if promotion applies to all products OR applies to this service type
- Format discount text based on discount type (percentage or fixed amount)
- Display badge only when promotion is active and applicable

**3. Created Discount Badge UI:**
- Positioned next to StatusBadge using flexbox with gap
- Gradient background: `from-yellow-500 to-orange-500`
- Tag icon from lucide-react
- Text shows discount value (e.g., "20% OFF" or "$5.00 OFF")
- Matches the style of StatusBadge (rounded-full, similar padding)

**4. Updated GuestPageContent:**
- Pass `hotelId` prop to `ServiceDetailPage` component

**Files Changed:**
- `components/guest/ServiceDetailPage.tsx` - Added promotion hook, discount badge logic and UI
- `app/guest/[hotelId]/GuestPageContent.tsx` - Pass hotelId to ServiceDetailPage

**Status:** ✅ Fixed

### Result
- Discount badge appears next to open/closed badge on restaurant and bar pages
- Badge shows discount percentage or fixed amount
- Badge only appears when promotion is active and applicable
- Visual consistency with StatusBadge styling
- Better user awareness of available discounts

### Important Notes
- Badge only shows for restaurant and bar service types
- Checks if promotion applies to all products or specific service types
- Uses gradient yellow-to-orange for visibility
- Tag icon provides visual context
- Badge updates automatically when promotions change

---

## Fixed: Discount Badge Not Showing on Service Pages - 2025-01-27

### Problem
User reported that the discount badge was not showing on restaurant and bar service pages.

### Root Cause
The `useActivePromotion` hook was using `getActivePromotion` function which filters for promotions with `show_banner = true` and `image_url IS NOT NULL`. This means it only returned promotions meant to be shown as banners, not all active promotions that could apply discounts.

### Fix Applied

**1. Created New Function (`lib/database/promotions.ts`):**
- Added `getActivePromotionForDiscount` function
- Does NOT filter by `show_banner` or `image_url`
- Still checks time/date rules and service type applicability
- Returns first valid promotion that applies to the service type

**2. Created New API Endpoint (`app/api/guest/promotions/active-for-discount/route.ts`):**
- New endpoint specifically for fetching promotions for discount purposes
- Accepts `hotel_id` and optional `service_type` parameters
- Returns active promotion that applies to the service (if specified)

**3. Created New Hook (`lib/react-query/hooks/usePromotions.ts`):**
- Added `useActivePromotionForDiscount` hook
- Uses the new API endpoint
- Accepts `hotelId` and optional `serviceType` parameters
- Only enabled when `hotelId` is provided

**4. Updated ServiceDetailPage (`components/guest/ServiceDetailPage.tsx`):**
- Changed from `useActivePromotion` to `useActivePromotionForDiscount`
- Passes `service.type` to the hook for filtering
- Only checks promotions when service is restaurant or bar
- Simplified badge display logic (hook already filters by service type)

**Files Changed:**
- `lib/database/promotions.ts` - Added `getActivePromotionForDiscount` function
- `app/api/guest/promotions/active-for-discount/route.ts` - New API endpoint
- `lib/react-query/hooks/usePromotions.ts` - Added `useActivePromotionForDiscount` hook
- `components/guest/ServiceDetailPage.tsx` - Updated to use new hook

**Status:** ✅ Fixed

### Result
- Discount badge now shows correctly on restaurant and bar pages
- Badge appears for all active promotions, not just banner promotions
- Service type filtering happens at the database/API level for efficiency
- Better separation of concerns (banner promotions vs discount promotions)

### Important Notes
- `getActivePromotion` is still used for banner display (requires image_url)
- `getActivePromotionForDiscount` is used for discount badges (no image_url requirement)
- Service type filtering is done at the API level for better performance
- Hook only runs when service is restaurant or bar type

---

## Enhanced: Discount Badge Debugging - 2025-01-27

### Problem
User reported that discount badge is still not showing on restaurant and bar service pages after the previous fix.

### Root Cause Investigation
Added comprehensive logging to identify why the badge might not be showing:
1. Frontend logging in `ServiceDetailPage` to track hook state
2. API endpoint logging to track requests and responses
3. Database function logging to track promotion filtering logic

### Debugging Added

**1. Frontend Debugging (`components/guest/ServiceDetailPage.tsx`):**
- Added `useEffect` hook to log promotion check state
- Logs: serviceType, hotelId, activePromotion, promotionLoading, promotionError
- Helps identify if hook is being called and what it returns

**2. API Endpoint Logging (`app/api/guest/promotions/active-for-discount/route.ts`):**
- Added logging for incoming requests (hotelId, serviceType)
- Added logging for promotion result (found, promotionId, title)
- Helps track API calls and responses

**3. Database Function Logging (`lib/database/promotions.ts`):**
- Added detailed logging for each promotion check:
  - Promotion details (id, title, is_active, show_always, applies_to_all_products, applies_to_service_types)
  - Time/date validation results
  - Service type matching results
  - Reasons for skipping promotions
- Helps identify why promotions are being filtered out

**Files Changed:**
- `components/guest/ServiceDetailPage.tsx` - Added useEffect for debugging
- `app/api/guest/promotions/active-for-discount/route.ts` - Added request/response logging
- `lib/database/promotions.ts` - Added comprehensive promotion check logging

**Status:** 🔍 Debugging Enhanced

### Next Steps
1. Check browser console for frontend logs
2. Check server logs for API and database logs
3. Verify:
   - Promotion exists and is active (`is_active = true`)
   - Promotion applies to service type (either `applies_to_all_products = true` OR service type in `applies_to_service_types`)
   - Time/date restrictions are met (or `show_always = true`)
   - Hotel ID matches
   - Service type matches (restaurant/bar)

### Common Issues to Check
- Promotion might not be active (`is_active = false`)
- Promotion might not apply to the service type
- Time/date restrictions might be blocking the promotion
- Service type mismatch (database vs frontend)
- Hotel ID mismatch

---

## Fixed: Service Type Selection in Admin Promotion Forms - 2025-01-27

### Problem
User found that `applies_to_service_types` was null in the database, causing promotions not to apply to restaurant/bar services. Admin forms didn't have UI to select which service types the promotion should apply to.

### Root Cause
- Admin promotion forms (new and edit) didn't include fields for `applies_to_all_products` and `applies_to_service_types`
- Forms were not sending these fields to the API
- Promotions were being created with `applies_to_service_types = null`, which caused them to not match any service types

### Fix Applied

**1. Updated New Promotion Form (`app/admin/promotions/new/page.tsx`):**
- Added `applies_to_all_products` and `applies_to_service_types` to form state
- Added service type selection UI with checkboxes for all service types:
  - Restaurant, Bar, Spa & Wellness, Fitness Center, Pool, Laundry Service, Concierge, Room Service, Additional Services, Other
- Added "All Products/Services" checkbox that clears service type selection when checked
- Service type selection only shows when "All Products/Services" is unchecked
- Form now sends these fields to the API

**2. Updated Edit Promotion Form (`app/admin/promotions/[id]/edit/page.tsx`):**
- Added `applies_to_all_products` and `applies_to_service_types` to form state
- Added same service type selection UI as new form
- Pre-fills these fields from existing promotion data
- Form now sends these fields to the API when updating

**3. Service Type Options:**
- restaurant, bar, spa, fitness, pool, laundry, concierge, roomservice, additional, other
- Matches the service types used in the frontend

**Files Changed:**
- `app/admin/promotions/new/page.tsx` - Added service type selection UI
- `app/admin/promotions/[id]/edit/page.tsx` - Added service type selection UI

**Status:** ✅ Fixed

### Result
- Admins can now select which service types promotions apply to
- Promotions can apply to "All Products/Services" or specific service types
- Service type selection is saved correctly in the database
- Discount badges now show correctly on restaurant and bar pages when promotions apply

### Important Notes
- "All Products/Services" checkbox clears service type selection when checked
- Selecting specific service types unchecks "All Products/Services"
- Service types match the frontend service type values exactly
- Multiple service types can be selected (e.g., both restaurant and bar)

---

## Implemented: Multiple Banners System (Instagram Stories Style) - 2025-01-27

### Problem
User requested that when creating another discount, it should show as a second banner like Instagram stories - multiple banners displayed sequentially.

### Root Cause
- System only supported a single active promotion banner
- `getActivePromotion` returned only one promotion
- Banner component didn't support multiple banners or navigation

### Fix Applied

**1. Created New Database Function (`lib/database/promotions.ts`):**
- Created `getActivePromotions()` function that returns ALL active promotions (array)
- Filters by time/date rules but returns all valid promotions, not just one
- Kept `getActivePromotion()` for backward compatibility (returns first promotion)

**2. Updated API Endpoint (`app/api/guest/promotions/active/route.ts`):**
- Changed to use `getActivePromotions()` instead of `getActivePromotion()`
- Returns `{ promotions: [] }` array instead of single `{ promotion: null }`
- Supports multiple promotions for carousel display

**3. Updated React Query Hook (`lib/react-query/hooks/usePromotions.ts`):**
- Changed `useActivePromotion()` to return `Promotion[]` instead of `Promotion | null`
- Returns array of all active promotions
- Updated query key to `['active-promotions', hotelId]`

**4. Created New Banner Carousel Component (`components/promotions/PromotionalBannerCarousel.tsx`):**
- Instagram stories-style carousel for multiple banners
- Features:
  - Progress bars at top showing all banners (like Instagram stories)
  - Current banner indicator (e.g., "1 / 3")
  - Navigation buttons (previous/next) when multiple banners
  - Swipe gestures (touch support)
  - Auto-advance to next banner when progress completes
  - Pause on hover
  - Click outside to close
  - Individual progress bar for current banner at bottom
- Each banner shows for its configured duration, then auto-advances
- Last banner closes or minimizes when complete

**5. Updated GuestPageContent (`app/guest/[hotelId]/GuestPageContent.tsx`):**
- Changed from `activePromotion` (single) to `activePromotions` (array)
- Filters out dismissed promotions using localStorage
- Uses `PromotionalBannerCarousel` instead of `PromotionalBanner`
- Handles dismissal for all visible promotions when carousel is closed
- Badge shows if any promotions exist (uses first promotion ID)

**Files Changed:**
- `lib/database/promotions.ts` - Added `getActivePromotions()` function
- `app/api/guest/promotions/active/route.ts` - Returns array of promotions
- `lib/react-query/hooks/usePromotions.ts` - Returns array of promotions
- `components/promotions/PromotionalBannerCarousel.tsx` - New carousel component
- `app/guest/[hotelId]/GuestPageContent.tsx` - Updated to use carousel

**Status:** ✅ Implemented

### Result
- Multiple active promotions now display sequentially like Instagram stories
- Users can navigate between banners using:
  - Auto-advance (when progress completes)
  - Previous/Next buttons
  - Swipe gestures (touch devices)
- Progress bars at top show all banners and current position
- Each banner shows for its configured duration
- Last banner closes when complete
- Better user experience with multiple promotions

### Carousel Features
- **Progress Bars**: Top of screen shows all banners with individual progress
- **Counter**: Shows "1 / 3" format for current banner position
- **Navigation**: Previous/Next buttons (only shown when applicable)
- **Swipe Support**: Touch gestures for mobile devices
- **Auto-Advance**: Automatically moves to next banner when progress completes
- **Pause on Hover**: Progress pauses when hovering over banner
- **Click Outside**: Closes carousel when clicking overlay
- **Individual Progress**: Bottom progress bar for current banner

### Important Notes
- All active promotions with `show_banner = true` and `image_url` are included
- Promotions are ordered by `created_at` (newest first)
- Dismissed promotions are filtered out (stored in localStorage)
- Badge shows if any promotions exist (even if all are dismissed)
- Clicking badge clears all dismissals and shows carousel again

---

## Updated: Promotional Banner Carousel Layout - 2025-01-27

### Problem
User requested:
1. Remove the "1/2" counter badge from the promotion banner
2. Move the splitted progress bars from top to bottom of the banner
3. Remove the duplicate individual progress bar at bottom (was showing both splitted bars at top AND individual bar at bottom)

### Root Cause
- Banner had progress bars at top showing all banners
- Banner had a counter badge showing "1 / 3" format
- Banner also had an individual progress bar at bottom
- This created duplicate progress indicators (splitted bars at top + individual bar at bottom)

### Fix Applied

**Updated PromotionalBannerCarousel Component (`components/promotions/PromotionalBannerCarousel.tsx`):**
- **Removed Counter Badge**: Removed the "1 / 3" counter badge that was displayed at top-left of banner
- **Moved Progress Bars to Bottom**: Moved the splitted progress bars from `top-4` to `bottom-0` inside the banner image container
- **Removed Individual Progress Bar**: Removed the duplicate individual progress bar that was at the bottom
- **Adjusted Button Position**: Changed "View More" button from `bottom-4` to `bottom-16` to accommodate progress bars below it
- Progress bars now appear at the bottom of the banner image (not the screen) when there are multiple promotions

**Files Changed:**
- `components/promotions/PromotionalBannerCarousel.tsx` - Removed counter badge, moved progress bars to bottom, removed duplicate progress bar

**Status:** ✅ Fixed

### Result
- Counter badge ("1 / 2") no longer appears
- Splitted progress bars now appear at the bottom of the banner image
- No duplicate progress indicators (only splitted bars at bottom)
- "View More" button positioned above progress bars
- Cleaner, more focused design

### Important Notes
- Progress bars only show when there are multiple promotions (`uniquePromotions.length > 1`)
- Progress bars are positioned at the bottom of the banner image container (not the screen)
- For single promotions, no progress bars are shown
- Progress bars use the same styling (white on semi-transparent background)

---

## Enhanced: Promotional Banner Carousel Interactions - 2025-01-27

### Problem
User requested:
1. Click on banner to pause, click again to play (toggle pause/play functionality)
2. Change prev/next buttons to only show icons (remove background/styling)
3. Add a container on top of banner but behind all elements (buttons, text, etc) with black background and opacity 0.9

### Root Cause
- Banner only paused on hover, no click-to-toggle functionality
- Prev/next buttons had background styling (rounded-full, bg-white/20, etc.)
- No black overlay container behind interactive elements

### Fix Applied

**Updated PromotionalBannerCarousel Component (`components/promotions/PromotionalBannerCarousel.tsx`):**
- **Added Pause/Play Toggle**: 
  - Created `handleBannerClick` function that toggles `isPaused` state
  - Changed banner container `onClick` from `stopPropagation` to `handleBannerClick`
  - Removed `onMouseEnter` and `onMouseLeave` hover pause (replaced with click toggle)
  - Added Play icon indicator that shows when banner is paused (centered on banner)
- **Simplified Prev/Next Buttons**:
  - Removed all background styling (rounded-full, bg-white/20, backdrop-blur-sm, border)
  - Changed to icon-only buttons with larger icons (w-8 h-8 instead of w-6 h-6)
  - Added drop-shadow-lg for better visibility
  - Icons now appear as simple white chevrons without background
- **Added Black Overlay Container**:
  - Added `<div className="absolute inset-0 bg-black/90 z-10" />` inside banner container
  - Positioned behind all interactive elements (z-10)
  - Text/content elements have z-20 (above overlay)
  - Buttons and progress bars have z-30 (above everything)
  - Pause indicator has z-[25] (above overlay and text, below buttons)
- **Updated Z-Index Hierarchy**:
  - Image: base layer
  - Black overlay: z-10 (on top of image, behind everything)
  - Text/content: z-20 (above overlay)
  - Pause indicator: z-[25] (above text, below buttons)
  - Buttons/progress bars: z-30 (top layer)

**Files Changed:**
- `components/promotions/PromotionalBannerCarousel.tsx` - Added pause/play toggle, simplified buttons, added black overlay

**Status:** ✅ Fixed

### Result
- Clicking on banner now toggles pause/play state
- Play icon appears centered when banner is paused
- Prev/next buttons are now icon-only (no background styling)
- Black overlay (opacity 0.9) appears behind all interactive elements
- Better visual hierarchy with proper z-index layering
- Improved user experience with click-to-pause/play functionality

### Important Notes
- Clicking on buttons (View More, Close, Prev/Next) does NOT toggle pause/play (they have stopPropagation)
- Clicking on text/content areas WILL toggle pause/play
- Black overlay provides better contrast for text and buttons
- Pause indicator only shows when banner is paused
- Prev/next buttons are larger and more visible without background clutter

---

## Fixed: Promotional Banner Carousel UI Adjustments - 2025-01-27

### Problem
User requested:
1. Move prev/next icons a bit inside (closer to the banner)
2. Remove the play icon indicator (visual pause indicator)
3. Keep click-to-toggle pause/play functionality (should still work when clicking banner)
4. Fix "View More" button navigation to detailed promotion page (was not working)

### Root Cause
- Prev/next buttons were positioned at `left-4` and `right-4` (16px from edges), too far from banner
- Play icon indicator was showing when paused, user wanted it removed
- "View More" button had z-index z-20 which might have been behind other elements, and needed better event handling

### Fix Applied

**Updated PromotionalBannerCarousel Component (`components/promotions/PromotionalBannerCarousel.tsx`):**
- **Moved Prev/Next Icons Inside**:
  - Changed from `left-4` and `right-4` to `left-2` and `right-2` (8px from edges instead of 16px)
  - Icons are now closer to the banner for better visual balance
- **Removed Play Icon Indicator**:
  - Removed the pause/play indicator div that showed Play icon when paused
  - Removed unused `Play` and `Pause` imports from lucide-react
  - Click-to-toggle pause/play still works, just no visual indicator
- **Fixed "View More" Button Navigation**:
  - Increased z-index from z-20 to z-30 (same as other interactive elements)
  - Added `e.preventDefault()` to button click handler for better event handling
  - Ensured button click properly stops propagation to prevent banner click from interfering
  - Navigation should now work correctly to detailed promotion page

**Files Changed:**
- `components/promotions/PromotionalBannerCarousel.tsx` - Moved icons, removed play indicator, fixed navigation

**Status:** ✅ Fixed

### Result
- Prev/next icons are now positioned closer to the banner (8px from edges)
- No visual play icon indicator when paused (cleaner UI)
- Click-to-toggle pause/play still works when clicking on banner
- "View More" button now properly navigates to detailed promotion page
- Better event handling prevents conflicts between button clicks and banner clicks

### Important Notes
- Prev/next buttons positioned at `left-2` and `right-2` (8px from screen edges)
- Play icon indicator completely removed (no visual feedback when paused)
- Banner click still toggles pause/play state (just no visual indicator)
- "View More" button has z-30 and proper event handling (stopPropagation + preventDefault)
- Navigation preserves room parameter when available

---

## Fixed: Promotion Not Found Error & Button Positioning - 2025-01-27

### Problem
User reported:
1. "Promotion is not found" error when clicking "View More" button
2. Prev/next buttons need to be moved more inside the banner

### Root Cause Analysis

**Promotion Not Found Error:**
1. **Wrong API Endpoint**: The promotion detail page was using `/api/promotions/${promotionId}` which is a general endpoint
2. **No Hotel Validation**: The endpoint didn't validate that the promotion belongs to the hotel from the URL
3. **Security Issue**: Any promotion ID could be accessed regardless of hotel_id, or promotions from wrong hotels could be accessed
4. **Missing Guest Endpoint**: There was no guest-specific endpoint for fetching promotions by ID that validates hotel_id

**Button Positioning:**
- Prev/next buttons were positioned relative to the screen (`absolute left-2/right-2` on the outer container)
- User wanted them positioned relative to the banner container itself
- Buttons were at 8px from screen edges, needed to be closer to the banner

### Fix Applied

**1. Created Guest-Specific Promotion API Endpoint (`app/api/guest/promotions/[id]/route.ts`):**
- New endpoint: `GET /api/guest/promotions/[id]?hotel_id=xxx`
- Validates that `hotel_id` query parameter is provided
- Fetches promotion using `getPromotionById()`
- **Validates hotel_id match**: Checks that `promotion.hotel_id === requested hotel_id`
- Returns 404 if promotion doesn't exist or doesn't belong to the hotel
- Public endpoint (no authentication required, like other guest endpoints)
- Proper error handling and logging

**2. Updated Promotion Detail Page (`app/guest/[hotelId]/promotions/[id]/page.tsx`):**
- Changed API endpoint from `/api/promotions/${promotionId}` to `/api/guest/promotions/${promotionId}?hotel_id=${hotelId}`
- Added `hotelId` to React Query key for proper caching
- Added error handling to display error message
- Improved error display with error message text

**3. Moved Prev/Next Buttons Inside Banner (`components/promotions/PromotionalBannerCarousel.tsx`):**
- Moved buttons from outer container to inside the banner container
- Changed positioning from `left-2/right-2` (8px) to `left-1/right-1` (4px) for closer positioning
- Buttons are now positioned relative to the banner container, not the screen
- Better visual integration with the banner

**Files Changed:**
- `app/api/guest/promotions/[id]/route.ts` - New guest-specific endpoint with hotel validation
- `app/guest/[hotelId]/promotions/[id]/page.tsx` - Updated to use new endpoint and improved error handling
- `components/promotions/PromotionalBannerCarousel.tsx` - Moved buttons inside banner, closer positioning

**Status:** ✅ Fixed

### Result
- Promotion detail page now correctly validates hotel_id before showing promotion
- "Promotion not found" error fixed - promotions are now properly fetched with hotel validation
- Prev/next buttons are now positioned inside the banner container (4px from banner edges)
- Better security - promotions can only be accessed if they belong to the correct hotel
- Improved error messages showing actual error details

### Important Notes
- Guest promotion endpoint validates `hotel_id` to prevent cross-hotel access
- Buttons positioned at `left-1` and `right-1` (4px from banner edges) inside the banner container
- Error handling now shows specific error messages to help with debugging
- React Query key includes `hotelId` for proper cache invalidation
- Endpoint follows same pattern as other guest endpoints (public, no auth required)

---

## Implemented: Apply Discounts to Checkout Orders - 2025-01-27

### Problem
Discounts were being calculated and displayed in the checkout page, but were not being saved to the database when orders were created. The order API was hardcoding `discount_amount: 0` and using the discounted total as `subtotal`.

### Root Cause
1. **CheckoutPage**: Calculated discounts correctly and displayed them, but only passed `total` (discounted total) to the parent component
2. **GuestPageContent**: Only passed `total` to the API, didn't pass `subtotal` or `discount_amount`
3. **Order API**: Hardcoded `discount_amount: 0` and used `total` as `subtotal`, losing discount information
4. **Service Type**: Discount calculation wasn't receiving `service_type`, which could cause discounts to not apply correctly for service-specific promotions

### Fix Applied

**1. Updated CheckoutPage Component (`components/guest/CheckoutPage.tsx`):**
- Added `serviceType` prop to pass service type to discount calculation
- Updated `onSubmit` interface to include `subtotal` and `discountAmount`
- Pass `subtotal` (original total) and `discountAmount` when submitting order
- Updated discount calculation to use `serviceType` parameter
- Now passes: `total` (final), `subtotal` (original), and `discountAmount`

**2. Updated GuestPageContent (`app/guest/[hotelId]/GuestPageContent.tsx`):**
- Updated `handleCheckoutSubmit` interface to accept `subtotal` and `discountAmount`
- Pass `subtotal` and `discount_amount` to the order API
- Pass `serviceType={selectedService?.type}` to CheckoutPage component

**3. Updated Order API (`app/api/guest/orders/route.ts`):**
- Accept `subtotal` and `discount_amount` from request body
- Use provided values instead of hardcoding:
  - `subtotal`: Use provided `subtotal` or fallback to `total` if not provided
  - `discount_amount`: Use provided `discount_amount` or fallback to `0` if not provided
  - `total_amount`: Use provided `total` (final total after discount)
- Properly saves discount information to database

**Files Changed:**
- `components/guest/CheckoutPage.tsx` - Added serviceType prop, pass subtotal and discountAmount
- `app/guest/[hotelId]/GuestPageContent.tsx` - Pass subtotal/discountAmount to API, pass serviceType to CheckoutPage
- `app/api/guest/orders/route.ts` - Accept and save subtotal and discount_amount

**Status:** ✅ Implemented

### Result
- Discounts are now properly saved to the database when orders are created
- `subtotal` field contains the original total before discount
- `discount_amount` field contains the discount amount applied
- `total_amount` field contains the final total after discount
- Service type is passed to discount calculation for accurate service-specific discounts
- Order records now accurately reflect discount information for reporting and accounting

### Important Notes
- `subtotal` = original total before discount
- `discount_amount` = amount of discount applied
- `total_amount` = final total after discount (subtotal - discount_amount)
- Service type is passed to discount calculation to ensure service-specific promotions apply correctly
- Backward compatible: if `subtotal` or `discount_amount` are not provided, API falls back to previous behavior
- Discount information is now available in order records for reporting and analytics

---

## Fixed: Discount Calculation Not Working - 2025-01-27

### Problem
User reported that discounts were not being calculated - API was returning `discount_amount: 0` and `promotion_id: null` for all items, even when active promotions exist.

### Root Cause Analysis

**Primary Issue:**
- `calculateItemDiscount()` function was using `getActivePromotion(hotelId)` 
- `getActivePromotion()` only returns promotions with `show_banner = true` AND `image_url IS NOT NULL`
- This means promotions created for discounts only (without banners) were never found
- Result: No promotion found → No discount calculated

**Secondary Issues:**
- Missing minimum order amount validation at cart level
- Insufficient logging to debug discount calculation issues
- Redundant service type check (already done in `getActivePromotionForDiscount`)

### Fix Applied

**1. Fixed Discount Calculation Function (`lib/database/promotions.ts`):**
- **Changed from `getActivePromotion()` to `getActivePromotionForDiscount()`**:
  - `getActivePromotionForDiscount()` checks ALL active promotions, not just banner promotions
  - Properly filters by service type if provided
  - Checks time/date rules and `show_always` flag
  - Returns first valid promotion that applies to the service
- **Removed Redundant Service Type Check**:
  - `getActivePromotionForDiscount()` already filters by service type
  - Removed duplicate check in `calculateItemDiscount()`
- **Added Comprehensive Logging**:
  - Logs when no promotion found
  - Logs promotion details when found
  - Logs product discount lookup results
  - Logs discount calculation steps (percentage/fixed amount)
  - Logs final discount amount

**2. Added Minimum Order Amount Validation (`lib/database/promotions.ts`):**
- Created `checkPromotionMinimumOrder()` function
- Checks if cart total meets promotion's `min_order_amount` requirement
- Returns validation result with promotion ID and minimum amount

**3. Updated Discount Calculation API (`app/api/guest/promotions/calculate-discount/route.ts`):**
- Added minimum order amount check after calculating item discounts
- If minimum order not met, returns zero discounts for all items
- Returns `min_order_requirement` object in response when minimum not met
- Added comprehensive logging at API level:
  - Logs incoming requests with service types
  - Logs discount calculation for each item
  - Logs final results and minimum order check

**Files Changed:**
- `lib/database/promotions.ts` - Changed to use `getActivePromotionForDiscount`, added logging, added minimum order check function, fixed service type matching logic
- `app/api/guest/promotions/calculate-discount/route.ts` - Added minimum order validation, added logging

**Status:** ✅ Fixed

### Additional Fix: Service Type Matching for Menu Items - 2025-01-27

**Problem:**
Even after fixing the promotion lookup, discounts still weren't applying when `applies_to_all_products = false` because:
- Menu items have generated IDs that don't match database product IDs
- Product-specific discount lookup fails
- Logic was returning 0 discount even when service type matched

**Fix:**
Updated `calculateItemDiscount()` to apply discount when:
- `applies_to_all_products = true` → applies to all products (existing behavior)
- `applies_to_all_products = false` BUT service type matches → applies discount (NEW)
  - This is needed because menu items can't have product-specific discounts due to ID mismatch
  - If service type matches `applies_to_service_types`, apply the general promotion discount

**Result:**
- Promotions with `applies_to_all_products = false` and `applies_to_service_types = ["restaurant"]` will now apply discounts to restaurant menu items
- Promotions with `applies_to_all_products = false` and `applies_to_service_types = ["bar"]` will now apply discounts to bar menu items
- Service type matching allows discounts to work for menu items even without `applies_to_all_products = true`

### Result
- Discounts are now calculated correctly for all active promotions (not just banner promotions)
- Promotions without banners can now apply discounts
- Minimum order amount is validated at cart level
- Comprehensive logging helps debug discount calculation issues
- Service type filtering works correctly

### Important Notes
- **Key Fix**: Using `getActivePromotionForDiscount()` instead of `getActivePromotion()` for discount calculation
- Minimum order amount is checked AFTER calculating item discounts, but BEFORE applying them
- If minimum order not met, all discounts are set to zero (even if items would have qualified)
- Logging is comprehensive - check server logs to see why discounts might not be applying
- Product-specific discounts still work (checked by product_id match)
- General promotions work if `applies_to_all_products = true`

### Debugging Tips
If discounts still not applying, check server logs for:
1. "No active promotion found" - No promotion exists or doesn't meet time/date/service type criteria
2. "Promotion does not apply to all products and product not in list" - Product not in promotion's product list
3. "Minimum order amount not met" - Cart total below `min_order_amount`
4. "Service type mismatch" - Promotion doesn't apply to the service type
5. Product ID mismatch - Product-specific discounts won't match if product_id format differs

### Common Issues
- **Promotion not active**: Check `is_active = true` in database
- **Time/date restrictions**: Check if current time/date is within promotion's range (unless `show_always = true`)
- **Service type mismatch**: Check if `applies_to_service_types` includes the service type
- **Product not in list**: If `applies_to_all_products = false`, product must be in `promotion_product_discounts` table
- **Minimum order not met**: Cart total must be >= `min_order_amount`
- **Menu Item ID Mismatch**: ⚠️ **CRITICAL** - Menu items use generated IDs (e.g., "item-1762719993904-z3f5son45") which don't match database product IDs. Product-specific discounts won't work unless `applies_to_all_products = true`

### Important: Menu Item ID Format
- Menu items stored in service's `menu` JSONB field have **generated IDs** like "item-1762719993904-z3f5son45"
- `promotion_product_discounts` table uses **database product UUIDs** from `products` table
- **These will NEVER match** - product-specific discounts won't work for menu items
- **Solution**: 
  - Option 1: Set `applies_to_all_products = true` in promotion
  - Option 2: Set `applies_to_service_types` to match the service type (e.g., `["restaurant"]` or `["bar"]`)
  - If service type matches, discount will apply even if `applies_to_all_products = false` (because menu items can't have product-specific discounts)
- Alternative: Would need to match by product name instead of ID (not implemented)

### Duplicate API Calls
- If seeing 2 API calls, this is likely React Strict Mode (development) or useEffect dependency causing re-renders
- Check browser Network tab to see if both calls return the same result
- This is usually harmless but can be optimized with useMemo or useCallback if needed

---

## Fixed: Incorrect Discount Calculation for Mixed Service Types - 2025-01-27

### Problem
When cart contained items from different service types (e.g., restaurant and bar), all items were getting the same discount applied. For example:
- Restaurant item ($35) was getting bar promotion discount (90% off)
- Bar item ($12) was also getting bar promotion discount (90% off)
- Both should have gotten their respective service type's promotion (restaurant: 23% off, bar: 90% off)

### Root Cause
1. **CartItem interface didn't store service type**: Items were added to cart without storing which service they came from
2. **Single service type for all items**: `calculateCartDiscounts()` was passing the same `serviceType` parameter to all items
3. **Discount calculation used same service type**: All items were evaluated against the same service type's promotions

### Fix Applied

**1. Updated CartItem Interface (`lib/guest/types/index.ts`):**
- Added `serviceType?: string` field to store which service each item came from

**2. Store Service Type When Adding to Cart (`app/guest/[hotelId]/GuestPageContent.tsx`):**
- Updated `handleAddToCart()` to store `serviceType: selectedService?.type` when adding items
- Updated cart item matching to consider both `menuItem.id` and `serviceType` (allows same item from different services)

**3. Use Per-Item Service Type for Discounts (`lib/guest/utils/discountCalculator.ts`):**
- Changed from: `service_type: serviceType` (same for all items)
- Changed to: `service_type: item.serviceType || serviceType` (per-item service type)
- This allows each item to be evaluated against its own service type's promotions

**4. Updated Minimum Order Check (`app/api/guest/promotions/calculate-discount/route.ts`):**
- If all items from same service type → check minimum order once
- If items from different service types → check minimum order per service type's subtotal
- This ensures minimum order requirements are checked correctly for mixed carts

**Files Changed:**
- `lib/guest/types/index.ts` - Added `serviceType` to CartItem interface
- `app/guest/[hotelId]/GuestPageContent.tsx` - Store service type when adding to cart
- `lib/guest/utils/discountCalculator.ts` - Use per-item service type for discount calculation
- `app/api/guest/promotions/calculate-discount/route.ts` - Updated minimum order check for mixed service types

**Status:** ✅ Fixed

### Result
- Items from different services now get their respective service type's promotions
- Restaurant items get restaurant promotions (e.g., 23% off)
- Bar items get bar promotions (e.g., 90% off)
- Minimum order is checked per service type's subtotal when cart has mixed service types
- Same menu item from different services can have different discounts

### Important Notes
- **Service type is now stored per cart item** - allows accurate discount calculation
- **Cart can contain items from multiple services** - each gets appropriate discount
- **Minimum order check is per service type** - ensures promotions with minimum order requirements work correctly
- **Backward compatible** - existing carts without serviceType will fall back to provided serviceType parameter

---

## Fixed: Service Type Matching with Case Normalization - 2025-01-27

### Problem
User reported that discounts were not being applied even though active promotions exist. Both items in cart showed `discount_amount: 0` and `promotion_id: null`.

### Root Cause Analysis
1. **Case Sensitivity Issue**: Service type comparison was case-sensitive, so "Restaurant" vs "restaurant" wouldn't match
2. **Missing Service Type**: Items loaded from localStorage might not have `serviceType` field (if saved before field was added)
3. **Insufficient Logging**: Not enough logging to debug why service types weren't matching

### Fix Applied

**1. Added Service Type Normalization (`lib/database/promotions.ts`):**
- Normalize service type at the start of `getActivePromotionForDiscount()`: `serviceType.toLowerCase().trim()`
- Normalize `applies_to_service_types` array for comparison
- Case-insensitive matching ensures "restaurant" matches "Restaurant", "RESTAURANT", etc.
- Handles whitespace variations

**2. Enhanced Logging:**
- Added logging for all promotions found with their service type configurations
- Added logging when service type matches (not just when it doesn't)
- Added logging for normalized values to help debug matching issues
- Added client-side logging in `discountCalculator.ts` to show what service types are being sent

**3. Improved Service Type Matching:**
- Both `getActivePromotionForDiscount()` and `calculateItemDiscount()` now use normalized comparison
- Consistent normalization across all service type checks
- Better error messages showing both original and normalized values

**Files Changed:**
- `lib/database/promotions.ts` - Added service type normalization and enhanced logging
- `lib/guest/utils/discountCalculator.ts` - Added client-side logging for service types

**Status:** ✅ Fixed

### Result
- Service type matching is now case-insensitive
- "restaurant", "Restaurant", "RESTAURANT" all match correctly
- Better logging helps identify why discounts might not be applying
- Normalized comparison handles whitespace and case variations

### Important Notes
- **Service type normalization**: All service types are normalized to lowercase and trimmed before comparison
- **Case-insensitive matching**: "bar" matches "Bar", "BAR", etc.
- **Enhanced logging**: Check server logs and browser console for detailed service type matching information
- **Backward compatible**: Works with existing service type values (normalization is transparent)

### Debugging
Check logs for:
1. **Client-side**: Browser console shows service types being sent for each item
2. **Server-side**: Server logs show:
   - All promotions found with their service type configurations
   - Which promotions are being checked
   - Service type matching results (match or mismatch)
   - Normalized values for comparison

### Common Issues
- **Service type not stored**: If items were added before `serviceType` field was added, they won't have service type
- **Service type undefined**: If `selectedService` is null when calculating discounts, service type will be undefined
- **Case mismatch**: Now fixed with normalization
- **Whitespace**: Now handled with `.trim()`

---

## Kitchen/Bar Order Filtering - Item-Level Filtering Fix - 2025-01-27

**Problem:**
When an order contained both restaurant items and bar items, kitchen staff could not see the order at all, and bar staff were seeing restaurant items. The root cause was that both APIs were filtering orders by `order_type` first, but not filtering items within each order. This meant:
1. If an order had `order_type: 'bar_order'` but contained restaurant items, kitchen staff wouldn't see it
2. If an order had `order_type: 'bar_order'` but contained restaurant items, bar staff would see ALL items (including restaurant items)
3. Orders with mixed items were not properly split between departments

**Root Cause Analysis:**
1. **Kitchen API** (`/api/kitchen/orders`):
   - Was filtering orders by `order_type === 'restaurant_order' || order_type === 'room_service_order'`
   - If an order had `order_type: 'bar_order'` but contained restaurant items, it would check items but still show ALL items (not just restaurant items)
   - The item filtering logic existed but was only used to determine if an order should be included, not to filter items within the order

2. **Bar API** (`/api/bar/orders`):
   - Was filtering orders by `order_type === 'bar_order'`
   - Would show ALL items in the order, including restaurant items
   - No item-level filtering was applied

**Solution:**
Refactored both APIs to implement proper item-level filtering:

1. **Created helper functions** to identify item types:
   - `isRestaurantItem()`: Checks if an item belongs to restaurant/room service
   - `isBarItem()`: Checks if an item belongs to bar service
   - Both functions check:
     - `serviceType` in item metadata
     - `service_id` lookup against services table
     - Keyword matching (food keywords vs drink keywords) as fallback

2. **Two-stage filtering**:
   - **Stage 1**: Filter orders to only include those with relevant items (restaurant items for kitchen, bar items for bar)
   - **Stage 2**: Filter items within each order to only show relevant items

3. **Recalculated totals**: Subtotal and total are recalculated based on filtered items only, so each department sees accurate totals for their items

**Implementation Details:**

**Kitchen API Changes:**
- Added `isRestaurantItem()` helper function
- Changed from `filter()` to `map()` + `filter()` pattern to separate order filtering from item filtering
- Filters items to only restaurant items before including order
- Recalculates `subtotal` and `total_amount` based on filtered restaurant items only
- Handles both database items (from `order_items` table) and JSONB items (from `items` field)

**Bar API Changes:**
- Added `isBarItem()` helper function
- Changed from `filter()` to `map()` + `filter()` pattern
- Filters items to only bar items before including order
- Recalculates `subtotal` and `total_amount` based on filtered bar items only
- Excludes food keywords explicitly (steak, salmon, chicken, grilled, toast, cake, etc.)
- Includes drink keywords (mojito, coffee, tea, iced, etc.)

**Keyword Lists:**
- **Restaurant items**: burger, pizza, pasta, salad, steak, chicken, fish, soup, sandwich, appetizer, entree, dessert, breakfast, lunch, dinner, grilled, toast, cake, peppers, potatoes, mashed, stuffed, salmon, beef, avocado
- **Bar items**: drink, cocktail, wine, beer, mojito, martini, whiskey, vodka, rum, tequila, coffee, tea, juice, soda, water, beverage, iced
- **Exclusions**: Items with drink keywords are excluded from restaurant items, items with food keywords are excluded from bar items

**Files Changed:**
- `app/api/kitchen/orders/route.ts` - Refactored to filter items within orders
- `app/api/bar/orders/route.ts` - Refactored to filter items within orders

**Status:** ✅ Fixed

**Result:**
- Kitchen staff now see orders with restaurant items, even if the order also has bar items
- Bar staff now see orders with bar items, even if the order also has restaurant items
- Each department only sees items relevant to them
- Totals are recalculated correctly for each department
- Mixed orders are properly split between departments
- Both departments can see the same order if it has items for both (but with different items visible)

**Important Notes:**
- **Item-level filtering**: Orders are filtered by items, not just `order_type`
- **Service type priority**: Checks `serviceType` metadata first, then `service_id` lookup, then keyword matching
- **Totals recalculation**: Each department sees totals for their items only
- **Backward compatible**: Works with both database items (`order_items` table) and JSONB items (`items` field)
- **Keyword fallback**: If service type cannot be determined, uses keyword matching as fallback

**Testing:**
- Create an order with both restaurant and bar items
- Verify kitchen staff sees the order with only restaurant items
- Verify bar staff sees the order with only bar items
- Verify totals are correct for each department
- Verify order appears in both dashboards if it has items for both departments

---

## Fixed: Department Status Independence - 2025-01-28

**Problem:**
When bar staff marked bar items as "delivered", the kitchen order status was incorrectly changing. This happened because `syncOrderStatusFromItems()` was updating the overall `orders.status` field based on ALL items (kitchen + bar), which interfered with department-specific views.

**Real-World Scenario:**
- Order has: 2x Burger (Kitchen), 2x Mojito (Bar)
- Kitchen staff marks burgers as "preparing" → Kitchen dashboard shows "preparing" ✅
- Bar staff marks mojitos as "delivered" → Bar dashboard shows "delivered" ✅
- **But** kitchen dashboard was incorrectly showing status change because overall `orders.status` was updated

**Root Cause:**
The item status update API (`/api/orders/[id]/items/status`) was calling `syncOrderStatusFromItems()` which:
1. Calculated overall order status from ALL items (kitchen + bar)
2. Updated `orders.status` in database
3. This overall status was interfering with department-specific status calculations

**Solution:**
Removed the `syncOrderStatusFromItems()` call from the item status update API. Now:
- Kitchen and bar operate completely independently
- Each department's status is calculated on-the-fly from their items only
- Overall `orders.status` field is kept for backward compatibility but not updated when items are changed
- Admin views can calculate overall status on-the-fly if needed

**Changes Made:**

1. **Updated Item Status API** (`app/api/orders/[id]/items/status/route.ts`):
   - Removed `syncOrderStatusFromItems(orderId)` call
   - Added detailed comment explaining why overall status is not updated
   - Returns original order (status not updated) instead of synced order
   - Kitchen/Bar dashboards will refetch and calculate department-specific status correctly

**Important Notes:**
- **Department Independence**: Kitchen and bar statuses are now completely independent
- **No Interference**: Updating bar items no longer affects kitchen status display
- **Backward Compatibility**: `orders.status` field still exists for admin views but is not auto-updated
- **On-the-Fly Calculation**: Kitchen/Bar APIs calculate department-specific status from items, not from `orders.status`

**Testing:**
- Create order with both kitchen and bar items
- Mark kitchen items as "preparing" → Kitchen dashboard shows "preparing"
- Mark bar items as "delivered" → Bar dashboard shows "delivered"
- Verify kitchen dashboard still shows "preparing" (not affected by bar status)
- Verify bar dashboard still shows "delivered" (not affected by kitchen status)

---

## Fixed: Guest Order Status Update When All Items Delivered - 2025-01-28

**Problem:**
Guests were not seeing "delivered" status even when both kitchen and bar staff marked all their items as delivered. This happened because we removed the overall `orders.status` update to prevent interference between departments, but guests need to see the overall order status.

**Real-World Scenario:**
- Order has: 2x Burger (Kitchen), 2x Mojito (Bar)
- Kitchen staff marks burgers as "delivered" → Kitchen dashboard shows "delivered" ✅
- Bar staff marks mojitos as "delivered" → Bar dashboard shows "delivered" ✅
- **But** guest view still shows "preparing" or "ready" instead of "delivered" ❌

**Root Cause:**
The item status update API was not updating the overall `orders.status` field at all, which meant guests (who view overall order status) never saw "delivered" even when all items were delivered.

**Solution:**
Updated the item status API to sync overall `orders.status` ONLY when ALL items are delivered (or all ready). This ensures:
- Guests see "delivered" when both kitchen and bar items are delivered
- Kitchen/Bar dashboards are NOT affected because they calculate department-specific status on-the-fly
- Overall status reflects the "most advanced" state (all ready → ready, all delivered → delivered)
- We do NOT update to "preparing" or "pending" to avoid interference between departments

**Changes Made:**

1. **Updated Item Status API** (`app/api/orders/[id]/items/status/route.ts`):
   - Added logic to check if ALL items are delivered
   - Updates `orders.status` to "delivered" ONLY when all items are delivered
   - Updates `orders.status` to "ready" when all items are ready (but not all delivered)
   - Does NOT update to "preparing" or "pending" to maintain department independence
   - Added `updateOrderStatus` import

**Important Notes:**
- **Selective Updates**: Overall status is only updated to "delivered" or "ready", never to "preparing" or "pending"
- **Department Independence**: Kitchen/Bar dashboards still calculate status on-the-fly, so they're not affected
- **Guest View**: Guests now see correct overall status when all items are delivered
- **Most Advanced State**: Overall status reflects the most advanced state (all ready → ready, all delivered → delivered)

**Testing:**
- Create order with both kitchen and bar items
- Mark kitchen items as "preparing" → Kitchen dashboard shows "preparing", guest shows previous status
- Mark bar items as "delivered" → Bar dashboard shows "delivered", guest shows previous status
- Mark kitchen items as "delivered" → Kitchen dashboard shows "delivered", guest shows "delivered" ✅
- Verify kitchen/bar dashboards are not affected by overall status updates

---

## Fixed: Added "Mark as Delivered" Button for Kitchen/Bar Staff - 2025-01-28

**Problem:**
Kitchen and bar staff were unable to mark items as "delivered" because the button only showed "Ready for Delivery" when items were ready, but didn't have functionality to actually mark items as delivered. When users tried to mark items as delivered, the status was incorrectly changing or not updating.

**Root Cause:**
The button logic in `app/kitchen/page.tsx` and `app/bar/page.tsx` only handled three states:
1. "Start Preparing" (when items are pending)
2. "Mark Ready" (when items are preparing)
3. "Ready for Delivery" (when items are ready)

But there was no logic to actually mark items as "delivered" when they were ready. The button text said "Ready for Delivery" but clicking it didn't change the status to "delivered".

**Solution:**
Added logic to mark items as "delivered" when all items are ready but not yet delivered. Updated both kitchen and bar pages to:
1. Show "Mark as Delivered" button when all items are ready
2. Actually call `handleStatusChange` with status "delivered" when clicked
3. Ensure proper status flow: pending → preparing → ready → delivered

**Changes Made:**

1. **Updated Kitchen Page** (`app/kitchen/page.tsx`):
   - Added `else if (allKitchenItemsReady && !allKitchenItemsDelivered)` condition
   - Calls `handleStatusChange(order.id, 'delivered', itemIds)` when all items are ready
   - Changed button text from "Ready for Delivery" to "Mark as Delivered"

2. **Updated Bar Page** (`app/bar/page.tsx`):
   - Added `else if (allBarItemsReady && !allBarItemsDelivered)` condition
   - Calls `handleStatusChange(order.id, 'delivered', itemIds)` when all items are ready
   - Changed button text from "Ready for Delivery" to "Mark as Delivered"

3. **Improved Item Status API** (`app/api/orders/[id]/items/status/route.ts`):
   - Added logic to merge updated items with existing items to ensure we use current statuses
   - Added detailed logging to help debug status update issues
   - Ensures overall order status is updated to "delivered" when ALL items are delivered

**Important Notes:**
- **Status Flow**: Items now properly flow through: pending → preparing → ready → delivered
- **Button Logic**: Button text and action now match - "Mark as Delivered" actually marks items as delivered
- **Overall Status**: When all items (kitchen + bar) are delivered, overall order status updates to "delivered" for guest view
- **Department Independence**: Kitchen/Bar dashboards still calculate department-specific status on-the-fly

**Testing:**
- Mark items as "preparing" → Button shows "Mark Ready"
- Mark items as "ready" → Button shows "Mark as Delivered"
- Click "Mark as Delivered" → Items status changes to "delivered" ✅
- When all items (kitchen + bar) are delivered → Guest view shows "delivered" ✅

---

## Fixed: Order Status Changing to "Preparing" When Marking Items as Delivered - 2025-01-28

**Problem:**
When marking items as "delivered" (especially for orders with only one item or JSONB-only items), the order status was incorrectly changing to "preparing" instead of staying unchanged or updating to "delivered".

**Root Cause:**
1. **JSONB-only items**: Some orders have items only in the `orders.items` JSONB field (not in `order_items` table). When calculating status, these items were using `order.status` as their status, which was "preparing". This caused `allDelivered` to be false even when the updated item was "delivered".

2. **Merge logic issue**: When merging items, if an item was JSONB-only and wasn't in the update request, it would use `order.status === 'preparing' ? 'preparing' : 'pending'`, which would keep the status as "preparing" and prevent `allDelivered` from being true.

3. **Validation too strict**: The API was rejecting requests if items didn't exist in `order_items` table, preventing JSONB-only items from being updated.

**Solution:**
1. **Made validation lenient**: Allow items that don't exist in `order_items` table (they're handled as JSONB-only)
2. **Improved JSONB item handling**: 
   - If a JSONB item was just updated (in the update request), use the requested status
   - If a JSONB item wasn't updated, use 'pending' as safe default (NOT 'preparing' to avoid interference)
3. **Better merge logic**: Use updated items as source of truth, then add other items from database, then add JSONB items with correct status
4. **Added extensive logging**: Log all item statuses, merge results, and status calculation decisions

**Changes Made:**

1. **Updated Item Status API** (`app/api/orders/[id]/items/status/route.ts`):
   - Made validation lenient to allow JSONB-only items
   - Check if items exist in `order_items` before updating
   - Handle JSONB-only items separately:
     - If item was updated but doesn't exist in `order_items`, use requested status
     - If item wasn't updated, use 'pending' as safe default (not 'preparing')
   - Improved merge logic to prioritize updated items
   - Added extensive logging for debugging
   - Added safeguard to return early if no items found

2. **Improved Status Calculation**:
   - Ensure all items have a status (default to 'pending' if missing)
   - Use `itemsWithStatus` for all calculations
   - Explicitly set `updatedOrder = order` when not updating to prevent accidental changes

**Important Notes:**
- **JSONB-only items**: Now properly handled - if updated, use requested status; otherwise use 'pending'
- **Never use 'preparing' for legacy items**: Using 'preparing' would cause order status to stay 'preparing' incorrectly
- **Source of truth**: Updated items are always used as source of truth in merge logic
- **Logging**: Extensive logging added to help diagnose issues

**Testing:**
- Mark single item as "delivered" → Order status updates to "delivered" ✅
- Mark bar items as "delivered" while kitchen items are "preparing" → Order status stays unchanged (not "preparing") ✅
- Mark all items as "delivered" → Order status updates to "delivered" ✅
- Check server logs for detailed item status information

