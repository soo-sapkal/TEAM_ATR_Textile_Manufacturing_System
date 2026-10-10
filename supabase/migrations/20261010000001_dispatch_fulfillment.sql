-- Migration: Dispatch Officer Pre-Dispatch QC and Logistics Fulfillment Enhancements
-- Adds dispatch QC fields to fabric_rolls and comprehensive transport details to shipments

ALTER TABLE public.fabric_rolls
  ADD COLUMN IF NOT EXISTS dispatch_qc_passed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dispatch_qc_notes TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_qc_by TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_qc_at TIMESTAMPTZ;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS license_plate TEXT,
  ADD COLUMN IF NOT EXISTS transport_agency TEXT,
  ADD COLUMN IF NOT EXISTS eway_bill_number TEXT;
