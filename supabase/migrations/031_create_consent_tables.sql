-- Create tables for legal compliance: cookie consents, data consents, and consent history

-- Cookie Consents Table
CREATE TABLE IF NOT EXISTS cookie_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT, -- For guests who aren't logged in
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- Consent categories
  essential_cookies BOOLEAN DEFAULT TRUE NOT NULL, -- Always true, required
  analytics_cookies BOOLEAN DEFAULT FALSE NOT NULL,
  marketing_cookies BOOLEAN DEFAULT FALSE NOT NULL,
  functional_cookies BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Consent status
  consent_given BOOLEAN DEFAULT FALSE NOT NULL,
  consent_date TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  
  -- User info (for guests)
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- Indexes for cookie_consents
CREATE INDEX IF NOT EXISTS idx_cookie_consents_user_id ON cookie_consents(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cookie_consents_session_id ON cookie_consents(session_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cookie_consents_hotel_id ON cookie_consents(hotel_id) WHERE is_deleted = FALSE;

-- Data Consents Table (for GDPR compliance)
CREATE TABLE IF NOT EXISTS data_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE, -- For guests who aren't users
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- Consent types
  data_processing BOOLEAN DEFAULT FALSE NOT NULL, -- Required for processing orders
  marketing_communications BOOLEAN DEFAULT FALSE NOT NULL,
  whatsapp_notifications BOOLEAN DEFAULT FALSE NOT NULL,
  email_notifications BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Consent details
  consent_given BOOLEAN DEFAULT FALSE NOT NULL,
  consent_date TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  consent_method TEXT, -- 'checkout', 'checkin', 'manual', 'api'
  
  -- Legal basis (GDPR)
  legal_basis TEXT, -- 'consent', 'contract', 'legitimate_interest'
  
  -- User info
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- Indexes for data_consents
CREATE INDEX IF NOT EXISTS idx_data_consents_user_id ON data_consents(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_data_consents_guest_id ON data_consents(guest_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_data_consents_hotel_id ON data_consents(hotel_id) WHERE is_deleted = FALSE;

-- Consent History Table (audit trail)
CREATE TABLE IF NOT EXISTS consent_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- Consent type
  consent_type TEXT NOT NULL, -- 'cookie', 'data_processing', 'marketing', 'whatsapp', 'email'
  
  -- Action
  action TEXT NOT NULL, -- 'granted', 'revoked', 'updated'
  
  -- Previous and new values
  previous_value BOOLEAN,
  new_value BOOLEAN,
  
  -- Details
  details JSONB, -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP(0) DEFAULT NOW() NOT NULL
);

-- Indexes for consent_history
CREATE INDEX IF NOT EXISTS idx_consent_history_user_id ON consent_history(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_guest_id ON consent_history(guest_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_hotel_id ON consent_history(hotel_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_created_at ON consent_history(created_at DESC);

-- Data Requests Table (for GDPR data subject rights)
CREATE TABLE IF NOT EXISTS data_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- Request type
  request_type TEXT NOT NULL, -- 'access', 'deletion', 'portability', 'rectification'
  
  -- Request details
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'in_progress', 'completed', 'rejected'
  requested_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP(0),
  
  -- Request details
  description TEXT,
  requested_by UUID REFERENCES users(id), -- Admin who created the request
  processed_by UUID REFERENCES users(id), -- Admin who processed it
  
  -- Response
  response_data JSONB, -- For access/portability requests
  rejection_reason TEXT, -- If rejected
  
  -- Verification
  verification_token TEXT, -- For guest-initiated requests
  verified BOOLEAN DEFAULT FALSE NOT NULL,
  
  created_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- Indexes for data_requests
CREATE INDEX IF NOT EXISTS idx_data_requests_user_id ON data_requests(user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_data_requests_guest_id ON data_requests(guest_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_data_requests_hotel_id ON data_requests(hotel_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_data_requests_status ON data_requests(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_data_requests_verification_token ON data_requests(verification_token) WHERE is_deleted = FALSE;

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_cookie_consents_updated_at
  BEFORE UPDATE ON cookie_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_consents_updated_at
  BEFORE UPDATE ON data_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_requests_updated_at
  BEFORE UPDATE ON data_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


