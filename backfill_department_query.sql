-- Direct SQL query to update department for the provided order items
-- Run this query directly in your database

-- Update bar items (drinks) by ID
UPDATE order_items
SET department = 'bar'
WHERE id IN (
  '01043552-65d0-4ef5-8bd0-9067b99afdc9',  -- Mojito
  '3f9528bd-067d-4cdd-a306-e065b893fc9b',  -- Mojito
  '5918c2ae-931c-4299-b843-fd7518fc68b0',  -- Mojito
  '5a384563-120d-4be2-90fc-4a4d8d740c59',  -- Mojito
  '74c3a2cd-726e-40fa-be5e-d0aaf3b1b823',  -- Mojito
  'a4bb4f8a-c19e-4f02-9fd0-2dfadeb74413',  -- Mojito
  'e65846ad-a83b-437d-b66f-2f4561df7b00',  -- Mojito
  'fd37d440-11ac-4a00-924b-012834598253',  -- Mojito
  '96264e18-1156-4bb0-a0d6-3ce35f9310b1',  -- Iced Coffee
  '7a164a4a-e591-4470-bd82-6aae30e177db',  -- Fresh Lemonade
  '8bbb4498-51d2-4d0e-b4fc-1fc246c024a3',  -- Fresh Lemonade
  'b365187b-f598-4860-95af-5102161865fc'   -- Berry Smoothie
);

-- Update kitchen items (food) by ID
UPDATE order_items
SET department = 'kitchen'
WHERE id IN (
  '01d0f5ca-c105-434b-958e-e18acb6b7199',  -- Test Fries
  '077e1804-95a7-44b9-b78b-92008467ed99',  -- Test Burger
  '09221451-68d8-42df-877e-d41c894df170',  -- Test Fries
  '0adc9459-40a4-41a1-bd3b-527bb4fae0eb',  -- Beef Steak
  '14dcf972-93e2-46d4-b1d1-acc29cd93405',  -- Grilled Chicken
  '15877ac2-54dc-4cd5-841c-f9585ab2677d',  -- Grilled Salmon
  '15a692d1-b733-431d-ae4d-ff22bce015ad',  -- Grilled Chicken
  '15b79178-653a-4cf1-b554-eccebfedd0ea',  -- Grilled Salmon
  '15ce5d58-e2a2-4560-955c-2a0dde1a386a',  -- Test Burger
  '1994aeb0-9732-4149-98f2-7a1f66016be1',  -- Test Burger
  '2131cf93-2b8d-4be4-a027-207fc6c02590',  -- Beef Steak
  '2584405b-3527-4c78-ab98-c789d9cbac73',  -- Sweet Potato Fries
  '26169c5e-e58e-48d8-8f41-23a3c8875401',  -- Stuffed Bell Peppers
  '2f0cfad4-eaf4-4d05-9a7d-b54345e3270e',  -- Test Burger
  '35aeddcf-561f-47fd-8ec8-53c84b6c530c',  -- Beef Steak
  '458fbcab-6102-4d1e-b1d2-374ab41ae715',  -- Grilled Chicken
  '45d2f104-6e7e-43fb-a8c8-90a8885cc59c',  -- Stuffed Bell Peppers
  '49dfc214-7431-414d-9ee3-84b30446a6d3',  -- Fruit Salad
  '50ae8f3b-3405-4b72-8936-51c854772e60',  -- Grilled Chicken
  '5d669548-f436-4ac8-8827-302fc63b18d6',  -- Beef Steak
  '64182971-cce4-467e-9243-e50a898b6e2b',  -- Beef Steak
  '6ec544a7-8110-43d0-8190-39b695ab82ce',  -- Grilled Salmon
  '70aae40a-0d10-496a-9913-a0f7a687632f',  -- Test Burger
  '764a6c03-380f-4bff-8d7c-a800f25c3861',  -- Test Burger
  '77537993-5a40-40ac-90d2-ba294ee383f2',  -- Grilled Chicken
  '7a9950cf-c70f-4ef6-ac0f-f0d028304879',  -- Test Burger
  '7b9fdc10-3567-4599-ba52-6e25a851d28e',  -- Grilled Chicken
  '7fe815b7-4a87-488c-a29d-f0fdb205e127',  -- Fruit Salad
  '813b7ad4-9b7d-4e87-9468-a47d26eaa35d',  -- Test Item
  '9462d542-75ed-4eff-ad62-c480829849b3',  -- Beef Steak
  '9988ceb1-273e-49f7-a458-6a8fa51bf9c4',  -- Beef Steak
  'a0dadbc0-efff-4643-8072-da8c6be259d6',  -- Beef Steak
  'a149ac96-db42-4992-9047-13d141bbde06',  -- Grilled Salmon
  'aedb6338-9892-4073-86ae-57d7bbc230ab',  -- Test
  'af345b61-fa58-4472-9c75-ae637885450e',  -- Grilled Salmon
  'b1b261cf-9588-41c1-b0a7-8c6f4dc4a893',  -- Fruit Salad
  'b1e18a25-3cd1-42f4-98a4-f1dbe250c1de',  -- Test Burger
  'b394e4b9-1009-440b-8a91-f4437e82c1f4',  -- Grilled Chicken
  'b47909b4-b948-4491-8f86-d6e7201bd395',  -- Test Burger
  'b47b82f5-dd1c-4e01-b1b0-dd92fdd86d84',  -- Chocolate Lava Cake
  'bc191ba6-8fd6-4d8a-8de4-1278a441f95d',  -- Grilled Salmon
  'c0ed596f-0006-4af4-86ba-ccc1bce0f9fc',  -- Grilled Salmon
  'c2041add-b99e-48c9-b3d8-09dc3340e53b',  -- Test Burger
  'c8f8fb24-3abc-4281-9716-8b341ce7e374',  -- Avocado Toast
  'daf05f31-54b2-4536-b2f1-cde482db9b72',  -- Mashed Potatoes
  'e395bf55-e211-42b9-a88e-f6219da17e8f',  -- Beef Steak
  'e57a3cba-e02c-47c5-9b03-60889ff32b2e',  -- Grilled Chicken
  'e8b8e4d4-04f4-46ef-b58a-c510ad6278c7',  -- Test Burger
  'f2182140-df22-4c0f-81d6-8996078f8aa6',  -- Chocolate Lava Cake
  'f3bfa4d3-7868-4ca4-863f-a4213d40c127',  -- Mashed Potatoes
  'fc19b935-1dde-46d0-9f04-6fea22abc244',  -- Classic Cheesecake
  'ff1bd143-f8fd-4dfc-99cb-078beac5e615'   -- Mashed Potatoes
);

-- Note: Iced Coffee is correctly set to 'bar' in the first UPDATE statement

