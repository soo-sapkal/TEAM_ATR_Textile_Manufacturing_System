-- Supabase Migration: 20261010000000_initial_schema.sql
-- Project: TEAM ATR Textile Manufacturing System (Loom Ledger)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles & Employee Management
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

-- 2. Raw Material Yarn & Inventory
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

-- 3. Machines & Operations
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

-- 4. Customer Orders
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

-- 5. Production Operations
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

-- 6. Fabric Rolls (QR Code Identifiers)
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
  defect TEXT
);

-- 7. Quality Inspections & Rework
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

-- 8. Dispatch & Logistics
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
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- 9. History Events
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

CREATE TABLE IF NOT EXISTS public.yarn_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('RECEIPT', 'RESERVATION', 'ISSUE', 'HOLD', 'ADJUSTMENT', 'REVERSAL')),
  batch_id TEXT NOT NULL,
  batch_code TEXT NOT NULL REFERENCES public.yarn_batches(code) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit TEXT NOT NULL,
  reference TEXT NOT NULL,
  actor TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yarn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yarn_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rework_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_events ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon key in demo/dev mode
CREATE POLICY "Allow anon read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow anon read all orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow anon read all machines" ON public.machines FOR ALL USING (true);
CREATE POLICY "Allow anon read all operations" ON public.operations FOR ALL USING (true);
CREATE POLICY "Allow anon read all rolls" ON public.fabric_rolls FOR ALL USING (true);
CREATE POLICY "Allow anon read all shipments" ON public.shipments FOR ALL USING (true);
CREATE POLICY "Allow anon read all yarn" ON public.yarn_items FOR ALL USING (true);
CREATE POLICY "Allow anon read all batches" ON public.yarn_batches FOR ALL USING (true);
