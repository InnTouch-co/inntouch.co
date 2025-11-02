-- Insert sample US hotels with realistic data for visual testing
-- This migration adds multiple US hotels with valid addresses and names

INSERT INTO hotels (title, site, email, logo_path, address, phone, active, created_at, updated_at)
VALUES
  -- Luxury Hotels
  (
    '{"en": "Grand Plaza Hotel"}'::jsonb,
    'grand-plaza-hotel',
    'info@grandplaza.com',
    '/logos/grand-plaza-hotel.png',
    '1234 Main Street, New York, NY 10001, United States',
    '+1 (212) 555-0100',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Royal Garden Resort"}'::jsonb,
    'royal-garden-resort',
    'reservations@royalgarden.com',
    '/logos/royal-garden-resort.png',
    '456 Ocean Drive, Miami Beach, FL 33139, United States',
    '+1 (305) 555-0200',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Mountain View Lodge"}'::jsonb,
    'mountain-view-lodge',
    'stay@mountainview.com',
    '/logos/mountain-view-lodge.png',
    '789 Alpine Road, Aspen, CO 81611, United States',
    '+1 (970) 555-0300',
    true,
    now(),
    now()
  ),
  -- Boutique Hotels
  (
    '{"en": "Coastal Breeze Inn"}'::jsonb,
    'coastal-breeze-inn',
    'hello@coastalbreeze.com',
    '/logos/coastal-breeze-inn.png',
    '234 Beach Road, Santa Monica, CA 90405, United States',
    '+1 (310) 555-0400',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Historic Downtown Suites"}'::jsonb,
    'historic-downtown-suites',
    'book@historicdowntown.com',
    '/logos/historic-downtown-suites.png',
    '567 Market Street, San Francisco, CA 94103, United States',
    '+1 (415) 555-0500',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Desert Oasis Resort"}'::jsonb,
    'desert-oasis-resort',
    'info@desertoasis.com',
    '/logos/desert-oasis-resort.png',
    '890 Palm Canyon Drive, Palm Springs, CA 92262, United States',
    '+1 (760) 555-0600',
    true,
    now(),
    now()
  ),
  -- Business Hotels
  (
    '{"en": "Metropolitan Business Center"}'::jsonb,
    'metropolitan-business-center',
    'corporate@metrobusiness.com',
    '/logos/metropolitan-business-center.png',
    '321 Financial District, Chicago, IL 60602, United States',
    '+1 (312) 555-0700',
    true,
    now(),
    now()
  ),
  (
    '{"en": "City Lights Tower"}'::jsonb,
    'city-lights-tower',
    'reservations@citylights.com',
    '/logos/city-lights-tower.png',
    '654 Sunset Boulevard, Los Angeles, CA 90028, United States',
    '+1 (323) 555-0800',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Riverfront Conference Hotel"}'::jsonb,
    'riverfront-conference',
    'events@riverfront.com',
    '/logos/riverfront-conference.png',
    '987 Riverwalk Avenue, Boston, MA 02114, United States',
    '+1 (617) 555-0900',
    true,
    now(),
    now()
  ),
  -- Budget-Friendly Options
  (
    '{"en": "Express Inn Downtown"}'::jsonb,
    'express-inn-downtown',
    'book@expressinn.com',
    '/logos/express-inn-downtown.png',
    '111 Business Park Way, Atlanta, GA 30309, United States',
    '+1 (404) 555-1000',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Comfort Stay Airport"}'::jsonb,
    'comfort-stay-airport',
    'reservations@comfortstay.com',
    '/logos/comfort-stay-airport.png',
    '234 Airport Boulevard, Houston, TX 77019, United States',
    '+1 (713) 555-1100',
    true,
    now(),
    now()
  ),
  (
    '{"en": "City Center Budget Hotel"}'::jsonb,
    'city-center-budget',
    'info@citycenterbudget.com',
    '/logos/city-center-budget.png',
    '789 Downtown Plaza, Seattle, WA 98101, United States',
    '+1 (206) 555-1200',
    true,
    now(),
    now()
  ),
  -- Additional US Hotels
  (
    '{"en": "Las Vegas Strip Resort"}'::jsonb,
    'las-vegas-strip-resort',
    'stay@vegasstrip.com',
    '/logos/las-vegas-strip-resort.png',
    '1234 Las Vegas Boulevard, Las Vegas, NV 89101, United States',
    '+1 (702) 555-1300',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Denver Mountain Peak Hotel"}'::jsonb,
    'denver-mountain-peak',
    'info@denverpeak.com',
    '/logos/denver-mountain-peak.png',
    '567 Mile High Drive, Denver, CO 80202, United States',
    '+1 (303) 555-1400',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Nashville Music City Inn"}'::jsonb,
    'nashville-music-city',
    'book@musiccityinn.com',
    '/logos/nashville-music-city.png',
    '890 Broadway, Nashville, TN 37203, United States',
    '+1 (615) 555-1500',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Portland Rose Garden Hotel"}'::jsonb,
    'portland-rose-garden',
    'reservations@rosegarden.com',
    '/logos/portland-rose-garden.png',
    '234 Park Avenue, Portland, OR 97201, United States',
    '+1 (503) 555-1600',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Phoenix Desert View"}'::jsonb,
    'phoenix-desert-view',
    'info@phoenixdesert.com',
    '/logos/phoenix-desert-view.png',
    '456 Camelback Road, Phoenix, AZ 85016, United States',
    '+1 (602) 555-1700',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Orlando Theme Park Hotel"}'::jsonb,
    'orlando-theme-park',
    'stay@orlandotheme.com',
    '/logos/orlando-theme-park.png',
    '789 International Drive, Orlando, FL 32819, United States',
    '+1 (407) 555-1800',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Washington DC Capital Suites"}'::jsonb,
    'washington-capital-suites',
    'bookings@capitalsuites.com',
    '/logos/washington-capital-suites.png',
    '321 Pennsylvania Avenue, Washington, DC 20004, United States',
    '+1 (202) 555-1900',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Dallas Business Tower"}'::jsonb,
    'dallas-business-tower',
    'corporate@dallastower.com',
    '/logos/dallas-business-tower.png',
    '654 Commerce Street, Dallas, TX 75201, United States',
    '+1 (214) 555-2000',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Philadelphia Historic Inn"}'::jsonb,
    'philadelphia-historic-inn',
    'info@phillyinn.com',
    '/logos/philadelphia-historic-inn.png',
    '987 Independence Mall, Philadelphia, PA 19106, United States',
    '+1 (215) 555-2100',
    true,
    now(),
    now()
  ),
  (
    '{"en": "Miami Beachfront Resort"}'::jsonb,
    'miami-beachfront-resort',
    'reservations@miamibeach.com',
    '/logos/miami-beachfront-resort.png',
    '1234 Collins Avenue, Miami Beach, FL 33139, United States',
    '+1 (305) 555-2200',
    true,
    now(),
    now()
  )
ON CONFLICT (site) DO NOTHING;

-- Verify the insertions
SELECT 
  id,
  title->>'en' as name,
  site,
  email,
  logo_path,
  address,
  phone,
  active,
  created_at,
  updated_at
FROM hotels
WHERE site IN (
  'grand-plaza-hotel',
  'royal-garden-resort',
  'mountain-view-lodge',
  'coastal-breeze-inn',
  'historic-downtown-suites',
  'desert-oasis-resort',
  'metropolitan-business-center',
  'city-lights-tower',
  'riverfront-conference',
  'express-inn-downtown',
  'comfort-stay-airport',
  'city-center-budget',
  'las-vegas-strip-resort',
  'denver-mountain-peak',
  'nashville-music-city',
  'portland-rose-garden',
  'phoenix-desert-view',
  'orlando-theme-park',
  'washington-capital-suites',
  'dallas-business-tower',
  'philadelphia-historic-inn',
  'miami-beachfront-resort'
)
ORDER BY created_at DESC;

