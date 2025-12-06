-- Backfill department column for existing order_items based on menu_item_name
-- This updates items that were created before the department column was added

-- Update bar items (drinks)
UPDATE order_items
SET department = 'bar'
WHERE department IS NULL
AND (
  -- Drink keywords
  LOWER(menu_item_name) LIKE '%mojito%'
  OR LOWER(menu_item_name) LIKE '%coffee%'
  OR LOWER(menu_item_name) LIKE '%lemonade%'
  OR LOWER(menu_item_name) LIKE '%smoothie%'
  OR LOWER(menu_item_name) LIKE '%drink%'
  OR LOWER(menu_item_name) LIKE '%cocktail%'
  OR LOWER(menu_item_name) LIKE '%wine%'
  OR LOWER(menu_item_name) LIKE '%beer%'
  OR LOWER(menu_item_name) LIKE '%martini%'
  OR LOWER(menu_item_name) LIKE '%whiskey%'
  OR LOWER(menu_item_name) LIKE '%vodka%'
  OR LOWER(menu_item_name) LIKE '%rum%'
  OR LOWER(menu_item_name) LIKE '%tequila%'
  OR LOWER(menu_item_name) LIKE '%tea%'
  OR LOWER(menu_item_name) LIKE '%juice%'
  OR LOWER(menu_item_name) LIKE '%soda%'
  OR LOWER(menu_item_name) LIKE '%water%'
  OR LOWER(menu_item_name) LIKE '%beverage%'
  OR LOWER(menu_item_name) LIKE '%iced%'
);

-- Update kitchen items (food)
-- This includes all items that are NOT bar items (food items)
UPDATE order_items
SET department = 'kitchen'
WHERE department IS NULL
AND (
  -- Food keywords
  LOWER(menu_item_name) LIKE '%burger%'
  OR LOWER(menu_item_name) LIKE '%pizza%'
  OR LOWER(menu_item_name) LIKE '%pasta%'
  OR LOWER(menu_item_name) LIKE '%salad%'
  OR LOWER(menu_item_name) LIKE '%steak%'
  OR LOWER(menu_item_name) LIKE '%chicken%'
  OR LOWER(menu_item_name) LIKE '%fish%'
  OR LOWER(menu_item_name) LIKE '%salmon%'
  OR LOWER(menu_item_name) LIKE '%soup%'
  OR LOWER(menu_item_name) LIKE '%sandwich%'
  OR LOWER(menu_item_name) LIKE '%appetizer%'
  OR LOWER(menu_item_name) LIKE '%entree%'
  OR LOWER(menu_item_name) LIKE '%dessert%'
  OR LOWER(menu_item_name) LIKE '%cake%'
  OR LOWER(menu_item_name) LIKE '%breakfast%'
  OR LOWER(menu_item_name) LIKE '%lunch%'
  OR LOWER(menu_item_name) LIKE '%dinner%'
  OR LOWER(menu_item_name) LIKE '%grilled%'
  OR LOWER(menu_item_name) LIKE '%toast%'
  OR LOWER(menu_item_name) LIKE '%peppers%'
  OR LOWER(menu_item_name) LIKE '%potatoes%'
  OR LOWER(menu_item_name) LIKE '%mashed%'
  OR LOWER(menu_item_name) LIKE '%stuffed%'
  OR LOWER(menu_item_name) LIKE '%beef%'
  OR LOWER(menu_item_name) LIKE '%avocado%'
  OR LOWER(menu_item_name) LIKE '%fries%'
  OR LOWER(menu_item_name) LIKE '%cheesecake%'
);

-- For any remaining items without department, default to 'kitchen'
UPDATE order_items
SET department = 'kitchen'
WHERE department IS NULL;


