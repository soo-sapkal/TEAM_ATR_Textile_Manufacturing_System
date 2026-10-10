-- ==============================================================================
-- ROLE-BASED ACCESS CONTROL (RBAC) - BUYER ROLE
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on the tables we want to protect.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. POLICIES FOR THE BUYER ROLE
-- ==============================================================================

-- Policy: Buyers can ONLY view Orders where they are the assigned buyer.
CREATE POLICY "Buyer can view own orders"
ON public.orders
FOR SELECT
USING (
  auth.uid()::text = buyer_id
);

-- Policy: Buyers can ONLY view Shipments linked to their own orders.
CREATE POLICY "Buyer can view own shipments"
ON public.shipments
FOR SELECT
USING (
  order_code IN (
    SELECT code FROM public.orders WHERE buyer_id = auth.uid()::text
  )
);

-- ==============================================================================
-- 3. POLICIES FOR STAFF ROLES (Supervisors, Owners, Dispatch, etc.)
-- ==============================================================================

-- Policy: Staff (Supervisors, Owners, Dispatch) can view ALL orders.
CREATE POLICY "Staff can view all orders"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPERVISOR', 'OWNER', 'DISPATCH_OFFICER', 'QUALITY_INSPECTOR')
  )
);

-- Policy: Staff can view ALL shipments.
CREATE POLICY "Staff can view all shipments"
ON public.shipments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPERVISOR', 'OWNER', 'DISPATCH_OFFICER', 'QUALITY_INSPECTOR')
  )
);

-- ==============================================================================
-- 4. HARD BLOCKING RESTRICTED TABLES
-- ==============================================================================

-- Policy: Only Factory Staff can view Machines (Buyers are physically blocked)
CREATE POLICY "Only staff can view machines"
ON public.machines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPERVISOR', 'OWNER', 'MACHINE_OPERATOR')
  )
);

-- Policy: Only Factory Staff can view Factory Operations/Tasks (Buyers are blocked)
CREATE POLICY "Only staff can view operations"
ON public.operations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPERVISOR', 'OWNER', 'MACHINE_OPERATOR')
  )
);

-- Policy: Only Staff can view Fabric Rolls (Buyers are blocked)
CREATE POLICY "Only staff can view fabric rolls"
ON public.fabric_rolls
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPERVISOR', 'OWNER', 'QUALITY_INSPECTOR', 'DISPATCH_OFFICER')
  )
);

-- ==============================================================================
-- 5. PUBLIC / SHARED CATALOG TABLES
-- ==============================================================================

-- Policy: Everyone (including Buyers) can view the Products Catalog to place orders
CREATE POLICY "Anyone can view products"
ON public.products
FOR SELECT
USING (
  true
);
