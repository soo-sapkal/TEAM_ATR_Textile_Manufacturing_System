-- ==============================================================================
-- DYNAMIC ROLE-BASED ACCESS CONTROL (RBAC) & USERS MERGE
-- Paste this script into your Supabase SQL Editor and click 'Run'.
-- ==============================================================================

-- 1. CREATE NEW TABLES FOR DYNAMIC ROLES & PERMISSIONS
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
-- 2. SEED DEFAULT ROLES & PERMISSIONS
-- ==============================================================================

INSERT INTO public.roles (name, description) VALUES
  ('OWNER', 'Full factory access'),
  ('SUPERVISOR', 'Factory operations manager'),
  ('MACHINE_OPERATOR', 'Handles daily machine tasks'),
  ('QUALITY_INSPECTOR', 'QC and inspections'),
  ('DISPATCH_OFFICER', 'Manages outgoing shipments'),
  ('BUYER', 'External client purchasing portal')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (action, description) VALUES
  ('portal.read', 'Can view buyer dashboard'),
  ('orders.read', 'Can read orders'),
  ('orders.create', 'Can create orders'),
  ('inventory.read', 'Can view raw materials'),
  ('production.read', 'Can view production status'),
  ('machines.operate', 'Can start/stop machines'),
  ('quality.inspect', 'Can perform QC checks'),
  ('dispatch.confirm', 'Can send shipments')
ON CONFLICT (action) DO NOTHING;

-- Map Buyer Permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'BUYER' AND p.action IN ('portal.read', 'orders.read', 'orders.create')
ON CONFLICT DO NOTHING;

-- Map Owner Permissions (Gets Everything)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'OWNER'
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 3. MERGE PROFILES INTO USERS TABLE
-- ==============================================================================

-- A. Ensure public.users exists and add missing columns from profiles
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT -- old text role, will be replaced
);

-- B. Add profile columns to the users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS skill TEXT CHECK (skill IN ('SPINNING', 'WEAVING', 'DYEING', 'ALL')),
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS landing TEXT DEFAULT '/dashboard',
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- C. Migrate data from profiles to users (Assuming emails match)
UPDATE public.users u
SET 
  skill = p.skill,
  phone = p.phone,
  landing = p.landing
FROM public.profiles p
WHERE u.email = p.email;

-- D. Migrate text roles to the new dynamic role_id
UPDATE public.users u
SET role_id = r.id
FROM public.roles r
WHERE u.role = r.name;

-- E. Clean up any orphaned records before re-linking foreign keys
DELETE FROM public.leave_requests WHERE profile_id NOT IN (SELECT id FROM public.users);
DELETE FROM public.salaries WHERE profile_id NOT IN (SELECT id FROM public.users);

-- Re-link foreign keys that pointed to profiles
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_profile_id_fkey;
ALTER TABLE public.leave_requests ADD CONSTRAINT leave_requests_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.salaries DROP CONSTRAINT IF EXISTS salaries_profile_id_fkey;
ALTER TABLE public.salaries ADD CONSTRAINT salaries_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- F. Delete the redundant profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==============================================================================
-- 4. UPDATE EXISTING RLS POLICIES
-- ==============================================================================

DROP POLICY IF EXISTS "Dynamic: Can view orders based on permissions" ON public.orders;
DROP POLICY IF EXISTS "Dynamic: Can view machines" ON public.machines;

-- Policy: View orders based on dynamic permissions and users table
CREATE POLICY "Dynamic: Can view orders based on permissions"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON u.role_id = rp.role_id
    JOIN public.permissions perm ON rp.permission_id = perm.id
    WHERE u.id = auth.uid() AND perm.action = 'orders.read'
  )
  AND (
    (SELECT role FROM public.users WHERE id = auth.uid()) != 'BUYER' 
    OR buyer_id = auth.uid()::text
  )
);

-- Policy: View machines
CREATE POLICY "Dynamic: Can view machines"
ON public.machines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON u.role_id = rp.role_id
    JOIN public.permissions perm ON rp.permission_id = perm.id
    WHERE u.id = auth.uid() AND perm.action IN ('machines.operate', 'production.read')
  )
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Anyone can view permissions" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Anyone can view role_permissions" ON public.role_permissions FOR SELECT USING (true);
