-- ==============================================================================
-- LOOM LEDGER - CONSOLIDATED LOCAL POSTGRESQL SCHEMA
-- Designed for standalone local PostgreSQL instances (No Supabase dependency)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ROLES & PERMISSIONS (DYNAMIC RBAC)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ==============================================================================
-- 2. USERS & PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  skill TEXT CHECK (skill IN ('SPINNING', 'WEAVING', 'DYEING', 'ALL')),
  phone TEXT,
  landing TEXT DEFAULT '/dashboard',
  role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('BUYER', 'MACHINE_OPERATOR', 'SUPERVISOR', 'OWNER', 'DISPATCH_OFFICER', 'QUALITY_INSPECTOR')),
  skill TEXT CHECK (skill IN ('SPINNING', 'WEAVING', 'DYEING', 'ALL')),
  phone TEXT,
  landing TEXT DEFAULT '/dashboard',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  effective_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. RAW MATERIAL YARN & INVENTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.yarn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  colour TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('KG', 'M', 'PCS')),
  on_hand NUMERIC(12,3) NOT NULL DEFAULT 0,
  reserved NUMERIC(12,3) NOT NULL DEFAULT 0,
  available NUMERIC(12,3) NOT NULL DEFAULT 0,
  held NUMERIC(12,3) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(12,3) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.yarn_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  item_code TEXT NOT NULL REFERENCES public.yarn_items(code) ON DELETE CASCADE,
  supplier TEXT NOT NULL,
  supplier_lot TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  on_hand NUMERIC(12,3) NOT NULL DEFAULT 0,
  reserved NUMERIC(12,3) NOT NULL DEFAULT 0,
  available NUMERIC(12,3) NOT NULL DEFAULT 0,
  held NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('KG', 'M', 'PCS')),
  unit_cost NUMERIC(10,4),
  location TEXT NOT NULL,
  section TEXT DEFAULT 'RAW_YARN' CHECK (section IN ('RAW_YARN', 'SPUN_YARN', 'WOVEN_FABRIC', 'DYED_FABRIC', 'QUARANTINE', 'FINISHED_GOODS')),
  status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'QUARANTINED', 'CLOSED')),
  order_code TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.yarn_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('RECEIPT', 'RESERVATION', 'ISSUE', 'HOLD', 'ADJUSTMENT', 'REVERSAL')),
  batch_id TEXT,
  batch_code TEXT,
  item_code TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit TEXT NOT NULL,
  reference TEXT NOT NULL,
  actor TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. PRODUCTS & BILL OF MATERIALS (BOM)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bill_of_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  yarn_item_id UUID NOT NULL REFERENCES public.yarn_items(id) ON DELETE RESTRICT,
  quantity_required DECIMAL(10,3) NOT NULL,
  unit VARCHAR(10) NOT NULL DEFAULT 'KG',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, yarn_item_id)
);

-- ==============================================================================
-- 5. MACHINES & OPERATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('SPINNING', 'WEAVING', 'DYEING')),
  location TEXT NOT NULL,
  status TEXT DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'RUNNING', 'SETUP', 'MAINTENANCE', 'BREAKDOWN', 'OFFLINE')),
  avg_capacity_per_hour NUMERIC(10,2) DEFAULT 100,
  cost_per_hour NUMERIC(10,2) DEFAULT 0,
  today_good NUMERIC(12,3) DEFAULT 0,
  unit TEXT DEFAULT 'M' CHECK (unit IN ('KG', 'M', 'PCS')),
  downtime_minutes INT DEFAULT 0,
  order_code TEXT,
  operation_id TEXT,
  next_maintenance TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.machine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  machine_id TEXT NOT NULL,
  machine_code TEXT NOT NULL REFERENCES public.machines(code) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('BREAKDOWN', 'MAINTENANCE', 'DOWNTIME', 'RECOVERY')),
  status TEXT DEFAULT 'CLOSED' CHECK (status IN ('OPEN', 'CLOSED')),
  category TEXT,
  reason TEXT NOT NULL,
  duration_minutes INT DEFAULT 0,
  actor TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ==============================================================================
-- 6. CUSTOMER ORDERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  buyer TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  product TEXT NOT NULL,
  colour TEXT NOT NULL,
  due TIMESTAMPTZ NOT NULL,
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'IN_PRODUCTION', 'QUALITY_HOLD', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'CANCELLED')),
  display_status TEXT DEFAULT 'DRAFT',
  stage TEXT CHECK (stage IN ('SPINNING', 'WEAVING', 'DYEING')),
  unit TEXT DEFAULT 'M' CHECK (unit IN ('KG', 'M', 'PCS')),
  ordered NUMERIC(12,3) NOT NULL DEFAULT 0,
  planned NUMERIC(12,3) NOT NULL DEFAULT 0,
  produced NUMERIC(12,3) NOT NULL DEFAULT 0,
  accepted NUMERIC(12,3) NOT NULL DEFAULT 0,
  available NUMERIC(12,3) NOT NULL DEFAULT 0,
  reserved NUMERIC(12,3) NOT NULL DEFAULT 0,
  dispatched NUMERIC(12,3) NOT NULL DEFAULT 0,
  remaining NUMERIC(12,3) NOT NULL DEFAULT 0,
  at_risk BOOLEAN DEFAULT FALSE,
  material_shortage BOOLEAN DEFAULT FALSE,
  has_quality_hold BOOLEAN DEFAULT FALSE,
  currency TEXT DEFAULT 'INR',
  revenue NUMERIC(12,2) DEFAULT 0,
  recorded_cost NUMERIC(12,2) DEFAULT 0,
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  order_code TEXT NOT NULL REFERENCES public.orders(code) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('SPINNING', 'WEAVING', 'DYEING')),
  status TEXT DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED')),
  machine_code TEXT REFERENCES public.machines(code) ON DELETE SET NULL,
  shift TEXT,
  good NUMERIC(12,3) DEFAULT 0,
  waste NUMERIC(12,3) DEFAULT 0,
  reject NUMERIC(12,3) DEFAULT 0,
  target NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('KG', 'M', 'PCS')),
  operators JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.output_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  operation_id TEXT NOT NULL,
  operation_code TEXT NOT NULL REFERENCES public.operations(code) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('GOOD', 'WASTE', 'REJECT')),
  quantity NUMERIC(12,3) NOT NULL,
  unit TEXT NOT NULL,
  actor TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  roll_codes JSONB DEFAULT '[]'::jsonb
);

-- ==============================================================================
-- 7. FABRIC ROLLS & QUALITY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fabric_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  order_code TEXT NOT NULL REFERENCES public.orders(code) ON DELETE CASCADE,
  buyer TEXT NOT NULL,
  qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('KG', 'M', 'PCS')),
  colour TEXT NOT NULL,
  dye_lot TEXT DEFAULT 'DL-PENDING-QC',
  status TEXT DEFAULT 'AWAITING_INSPECTION' CHECK (status IN ('AWAITING_INSPECTION', 'REINSPECTION_REQUIRED', 'REWORK_REQUIRED', 'REWORK_IN_PROGRESS', 'QUARANTINED', 'REJECTED', 'ACCEPTED', 'RESERVED', 'DISPATCHED')),
  machine_code TEXT NOT NULL,
  location TEXT NOT NULL,
  section TEXT DEFAULT 'DYED_FABRIC' CHECK (section IN ('RAW_YARN', 'SPUN_YARN', 'WOVEN_FABRIC', 'DYED_FABRIC', 'QUARANTINE', 'FINISHED_GOODS')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  prior_failure BOOLEAN DEFAULT FALSE,
  defect TEXT,
  dispatch_qc_passed BOOLEAN DEFAULT FALSE,
  dispatch_qc_notes TEXT,
  dispatch_qc_by TEXT,
  dispatch_qc_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  roll_id TEXT NOT NULL,
  roll_code TEXT NOT NULL REFERENCES public.fabric_rolls(code) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK (result IN ('PASS', 'REWORK', 'REJECT', 'QUARANTINE')),
  defect TEXT,
  reason TEXT NOT NULL,
  location TEXT,
  evidence_count INT DEFAULT 0,
  actor TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rework_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  roll_id TEXT NOT NULL,
  roll_code TEXT NOT NULL REFERENCES public.fabric_rolls(code) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('STARTED', 'COMPLETED')),
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. DISPATCH & LOGISTICS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  order_code TEXT NOT NULL REFERENCES public.orders(code) ON DELETE CASCADE,
  roll_ids JSONB DEFAULT '[]'::jsonb,
  buyer TEXT NOT NULL,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'DISPATCHED', 'CANCELLED', 'REVERSED')),
  rolls INT DEFAULT 0,
  qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('KG', 'M', 'PCS')),
  vehicle TEXT NOT NULL,
  planned_at TIMESTAMPTZ NOT NULL,
  invoice TEXT,
  amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  driver_name TEXT,
  license_plate TEXT,
  transport_agency TEXT,
  eway_bill_number TEXT
);

CREATE TABLE IF NOT EXISTS public.dispatch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  shipment_id TEXT NOT NULL,
  shipment_code TEXT NOT NULL REFERENCES public.shipments(code) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('DRAFT_CREATED', 'CONFIRMED')),
  order_code TEXT NOT NULL,
  roll_ids JSONB DEFAULT '[]'::jsonb,
  quantity NUMERIC(12,3) NOT NULL,
  unit TEXT NOT NULL,
  actor TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  invoice_reference TEXT
);

-- ==============================================================================
-- 9. INVOICES, BILLS & PAYMENTS (FINANCE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  order_code TEXT NOT NULL REFERENCES public.orders(code) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_cgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_sgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit TEXT NOT NULL,
  unit_rate NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  reference_no TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.supplier_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  reference_batch_id TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.supplier_bills(id) ON DELETE CASCADE,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  reference_no TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
