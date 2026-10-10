-- ==============================================================================
-- DYNAMIC RBAC - DISPATCH MODULE
-- Run this script in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on the tables we want to protect.
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabric_rolls ENABLE ROW LEVEL SECURITY;

-- Remove any old anon policies to ensure strict RBAC is enforced
DROP POLICY IF EXISTS "Allow anon read all shipments" ON public.shipments;
DROP POLICY IF EXISTS "Allow anon read all rolls" ON public.fabric_rolls;
DROP POLICY IF EXISTS "Allow anon read all dispatch_events" ON public.dispatch_events;

-- ==============================================================================
-- 2. POLICIES FOR DISPATCH READ ACCESS
-- ==============================================================================

-- Policy: Users can ONLY view Shipments if their role has 'dispatch.read' OR 'portal.read'
CREATE POLICY "Dynamic: Can view shipments"
ON public.shipments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON u.role_id = rp.role_id
    JOIN public.permissions perm ON rp.permission_id = perm.id
    WHERE u.id = auth.uid() AND perm.action IN ('dispatch.read', 'portal.read')
  )
);

-- Policy: Users can ONLY view Dispatch Events if their role has 'dispatch.read'
CREATE POLICY "Dynamic: Can view dispatch events"
ON public.dispatch_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON u.role_id = rp.role_id
    JOIN public.permissions perm ON rp.permission_id = perm.id
    WHERE u.id = auth.uid() AND perm.action = 'dispatch.read'
  )
);

-- Policy: Users can view Fabric Rolls if they have dispatch, production, or quality read access
CREATE POLICY "Dynamic: Can view fabric rolls"
ON public.fabric_rolls
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON u.role_id = rp.role_id
    JOIN public.permissions perm ON rp.permission_id = perm.id
    WHERE u.id = auth.uid() AND perm.action IN ('dispatch.read', 'production.read', 'quality.read')
  )
);

-- ==============================================================================
-- 3. POLICIES FOR DISPATCH MUTATIONS (CREATE/UPDATE)
-- ==============================================================================

-- Policy: Users can create new Shipments ONLY if they have 'dispatch.create'
CREATE POLICY "Dynamic: Can create shipments"
ON public.shipments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON u.role_id = rp.role_id
    JOIN public.permissions perm ON rp.permission_id = perm.id
    WHERE u.id = auth.uid() AND perm.action = 'dispatch.create'
  )
);

-- Policy: Users can update Shipments ONLY if they have 'dispatch.create' or 'dispatch.confirm'
CREATE POLICY "Dynamic: Can update shipments"
ON public.shipments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON u.role_id = rp.role_id
    JOIN public.permissions perm ON rp.permission_id = perm.id
    WHERE u.id = auth.uid() AND perm.action IN ('dispatch.create', 'dispatch.confirm')
  )
);

-- Policy: Users can create dispatch events ONLY if they have 'dispatch.confirm'
CREATE POLICY "Dynamic: Can create dispatch events"
ON public.dispatch_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON u.role_id = rp.role_id
    JOIN public.permissions perm ON rp.permission_id = perm.id
    WHERE u.id = auth.uid() AND perm.action = 'dispatch.confirm'
  )
);
