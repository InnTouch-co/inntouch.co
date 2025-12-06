-- Create folio_adjustments table for tracking tax amounts and final amounts from POS
CREATE TABLE IF NOT EXISTS folio_adjustments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Amounts
  subtotal_amount NUMERIC(20, 6) NOT NULL,
  tax_amount NUMERIC(20, 6) NOT NULL,
  final_amount NUMERIC(20, 6) NOT NULL,
  
  -- Additional information
  pos_receipt_number TEXT,
  notes TEXT,
  
  -- Audit trail
  adjusted_by UUID NOT NULL REFERENCES users(id),
  adjusted_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP(0) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(0),
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_folio_adjustments_booking_id ON folio_adjustments(booking_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_folio_adjustments_adjusted_by ON folio_adjustments(adjusted_by) WHERE is_deleted = FALSE;

-- Add comment
COMMENT ON TABLE folio_adjustments IS 'Tracks tax amounts and final amounts from POS for audit purposes when marking folios as paid';

