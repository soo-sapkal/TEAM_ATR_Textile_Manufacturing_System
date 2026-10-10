-- ==============================================================================
-- LOOM LEDGER - SEED DATA FOR LOCAL POSTGRESQL
-- ==============================================================================

-- 1. Roles & Permissions
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
  ('dispatch.confirm', 'Can send shipments'),
  ('finance.read', 'Can view invoices and financial reports')
ON CONFLICT (action) DO NOTHING;

-- Map Buyer Permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'BUYER' AND p.action IN ('portal.read', 'orders.read', 'orders.create')
ON CONFLICT DO NOTHING;

-- Map Owner Permissions (All)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'OWNER'
ON CONFLICT DO NOTHING;

-- Map Supervisor Permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM public.roles r, public.permissions p
WHERE r.name = 'SUPERVISOR' AND p.action IN ('portal.read', 'orders.read', 'orders.create', 'inventory.read', 'production.read', 'machines.operate', 'quality.inspect', 'dispatch.confirm', 'finance.read')
ON CONFLICT DO NOTHING;

-- 2. Users (Password: 'demo' / 'password123', hashed with bcrypt $2a$10$wT8Kz54V1jO3bK4b4xY0yeUj34qgE2yP1mG4NlW9Qn9p1a8a2nK2a -> demo)
-- Default bcrypt hash for 'password123': $2a$10$6Wq6wKjYV8m/wUvU8r2VleQ1N8ZzFv5Tz5kUjWw/eB2ZqjW1M9yXG
INSERT INTO public.users (id, email, password_hash, name, role, skill, phone, landing, role_id)
SELECT 
  '11111111-1111-1111-1111-111111111111', 
  'owner@everest.demo', 
  '$2a$10$6Wq6wKjYV8m/wUvU8r2VleQ1N8ZzFv5Tz5kUjWw/eB2ZqjW1M9yXG', 
  'Nisha Menon (Owner)', 
  'OWNER', 
  'ALL', 
  '+91 98765 00001', 
  '/dashboard',
  id
FROM public.roles WHERE name = 'OWNER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, password_hash, name, role, skill, phone, landing, role_id)
SELECT 
  '22222222-2222-2222-2222-222222222222', 
  'supervisor@everest.demo', 
  '$2a$10$6Wq6wKjYV8m/wUvU8r2VleQ1N8ZzFv5Tz5kUjWw/eB2ZqjW1M9yXG', 
  'Arun Mehta (Factory Supervisor)', 
  'SUPERVISOR', 
  'ALL', 
  '+91 98765 00002', 
  '/dashboard',
  id
FROM public.roles WHERE name = 'SUPERVISOR'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, password_hash, name, role, skill, phone, landing, role_id)
SELECT 
  '33333333-3333-3333-3333-333333333333', 
  'operator.spinning@everest.demo', 
  '$2a$10$6Wq6wKjYV8m/wUvU8r2VleQ1N8ZzFv5Tz5kUjWw/eB2ZqjW1M9yXG', 
  'Ravi Kumar (Spinning Operator)', 
  'MACHINE_OPERATOR', 
  'SPINNING', 
  '+91 98765 00003', 
  '/my-work',
  id
FROM public.roles WHERE name = 'MACHINE_OPERATOR'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, password_hash, name, role, skill, phone, landing, role_id)
SELECT 
  '66666666-6666-6666-6666-666666666666', 
  'inspector@everest.demo', 
  '$2a$10$6Wq6wKjYV8m/wUvU8r2VleQ1N8ZzFv5Tz5kUjWw/eB2ZqjW1M9yXG', 
  'Priya Iyer (Quality Inspector)', 
  'QUALITY_INSPECTOR', 
  'ALL', 
  '+91 98765 00006', 
  '/quality',
  id
FROM public.roles WHERE name = 'QUALITY_INSPECTOR'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, password_hash, name, role, skill, phone, landing, role_id)
SELECT 
  '77777777-7777-7777-7777-777777777777', 
  'dispatch@everest.demo', 
  '$2a$10$6Wq6wKjYV8m/wUvU8r2VleQ1N8ZzFv5Tz5kUjWw/eB2ZqjW1M9yXG', 
  'Sameer Khan (Dispatch Officer)', 
  'DISPATCH_OFFICER', 
  'ALL', 
  '+91 98765 00007', 
  '/dispatch',
  id
FROM public.roles WHERE name = 'DISPATCH_OFFICER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, email, password_hash, name, role, skill, phone, landing, role_id)
SELECT 
  '88888888-8888-8888-8888-888888888888', 
  'buyer@everest.demo', 
  '$2a$10$6Wq6wKjYV8m/wUvU8r2VleQ1N8ZzFv5Tz5kUjWw/eB2ZqjW1M9yXG', 
  'Anita Textiles (Buyer)', 
  'BUYER', 
  'ALL', 
  '+91 98765 00008', 
  '/portal',
  id
FROM public.roles WHERE name = 'BUYER'
ON CONFLICT (email) DO NOTHING;

-- 3. Profiles
INSERT INTO public.profiles (id, email, full_name, role, skill, phone, landing) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@everest.demo', 'Nisha Menon (Owner)', 'OWNER', 'ALL', '+91 98765 00001', '/dashboard'),
  ('22222222-2222-2222-2222-222222222222', 'supervisor@everest.demo', 'Arun Mehta (Factory Supervisor)', 'SUPERVISOR', 'ALL', '+91 98765 00002', '/dashboard'),
  ('33333333-3333-3333-3333-333333333333', 'operator.spinning@everest.demo', 'Ravi Kumar (Spinning Operator)', 'MACHINE_OPERATOR', 'SPINNING', '+91 98765 00003', '/my-work'),
  ('44444444-4444-4444-4444-444444444444', 'operator.weaving@everest.demo', 'Suresh Patel (Weaving Operator)', 'MACHINE_OPERATOR', 'WEAVING', '+91 98765 00004', '/my-work'),
  ('55555555-5555-5555-5555-555555555555', 'operator.dyeing@everest.demo', 'Kavita Rao (Dyeing Operator)', 'MACHINE_OPERATOR', 'DYEING', '+91 98765 00005', '/my-work'),
  ('66666666-6666-6666-6666-666666666666', 'inspector@everest.demo', 'Priya Iyer (Quality Inspector)', 'QUALITY_INSPECTOR', 'ALL', '+91 98765 00006', '/quality'),
  ('77777777-7777-7777-7777-777777777777', 'dispatch@everest.demo', 'Sameer Khan (Dispatch Officer)', 'DISPATCH_OFFICER', 'ALL', '+91 98765 00007', '/dispatch'),
  ('88888888-8888-8888-8888-888888888888', 'buyer@everest.demo', 'Anita Textiles (Buyer)', 'BUYER', 'ALL', '+91 98765 00008', '/portal')
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name;

-- 4. Yarn Raw Material Items
INSERT INTO public.yarn_items (code, description, colour, unit, on_hand, reserved, available, held, reorder_level) VALUES
  ('YRN-COT-40S', 'Combed Cotton Yarn 40s', 'RAW_WHITE', 'KG', 12500.000, 3200.000, 8800.000, 500.000, 2000.000),
  ('YRN-POLY-150D', 'Polyester Filament 150D', 'BRIGHT_WHITE', 'KG', 8400.000, 1500.000, 6900.000, 0.000, 1500.000),
  ('YRN-LINEN-60S', 'Organic Linen Yarn 60s', 'NATURAL', 'KG', 3100.000, 800.000, 2300.000, 0.000, 800.000)
ON CONFLICT (code) DO NOTHING;

-- 5. Yarn Batches
INSERT INTO public.yarn_batches (code, item_code, supplier, supplier_lot, received_at, on_hand, reserved, available, held, unit, unit_cost, location, section, status) VALUES
  ('YB-2026-01', 'YRN-COT-40S', 'Vardhman Textiles', 'LOT-9921', NOW() - INTERVAL '10 days', 5000.000, 2000.000, 3000.000, 0.000, 'KG', 240.50, 'Aisle A-01 · Rack 2', 'RAW_YARN', 'AVAILABLE'),
  ('YB-2026-02', 'YRN-COT-40S', 'Vardhman Textiles', 'LOT-9922', NOW() - INTERVAL '5 days', 7500.000, 1200.000, 5800.000, 500.000, 'KG', 242.00, 'Aisle A-02 · Rack 1', 'RAW_YARN', 'AVAILABLE'),
  ('YB-2026-03', 'YRN-POLY-150D', 'Reliance Industries', 'REL-4410', NOW() - INTERVAL '3 days', 8400.000, 1500.000, 6900.000, 0.000, 'KG', 185.00, 'Aisle B-01 · Rack 4', 'RAW_YARN', 'AVAILABLE')
ON CONFLICT (code) DO NOTHING;

-- 6. Machines
INSERT INTO public.machines (code, name, stage, location, status, avg_capacity_per_hour, cost_per_hour, today_good, unit) VALUES
  ('SPIN-01', 'Rieter Ring Frame #1', 'SPINNING', 'Hall A · Spinning Wing', 'RUNNING', 150.00, 450.00, 1200.000, 'KG'),
  ('SPIN-02', 'Rieter Ring Frame #2', 'SPINNING', 'Hall A · Spinning Wing', 'IDLE', 150.00, 450.00, 0.000, 'KG'),
  ('WEAV-01', 'Picanol OmniPlus Airjet #1', 'WEAVING', 'Hall B · Weaving Shed', 'RUNNING', 120.00, 600.00, 850.000, 'M'),
  ('WEAV-02', 'Picanol OmniPlus Airjet #2', 'WEAVING', 'Hall B · Weaving Shed', 'MAINTENANCE', 120.00, 600.00, 0.000, 'M'),
  ('DYE-01', 'Fong High Temp Dye Vat #1', 'DYEING', 'Hall C · Dye House', 'RUNNING', 200.00, 850.00, 1500.000, 'M'),
  ('DYE-02', 'Fong High Temp Dye Vat #2', 'DYEING', 'Hall C · Dye House', 'IDLE', 200.00, 850.00, 0.000, 'M')
ON CONFLICT (code) DO NOTHING;

-- 7. Orders
INSERT INTO public.orders (code, buyer, buyer_id, product, colour, due, priority, status, display_status, stage, unit, ordered, planned, produced, accepted, available, reserved, dispatched, remaining, currency, revenue) VALUES
  ('ORD-2026-001', 'Anita Textiles', '88888888-8888-8888-8888-888888888888', '100% Cotton Poplin 40s', 'NAVY_BLUE', NOW() + INTERVAL '14 days', 'HIGH', 'IN_PRODUCTION', 'IN_PRODUCTION', 'DYEING', 'M', 10000.000, 10000.000, 6500.000, 6000.000, 4000.000, 2000.000, 0.000, 3500.000, 'INR', 1250000.00),
  ('ORD-2026-002', 'FabIndia Export', 'buyer-02', 'Organic Poly-Cotton Twill', 'OLIVE_GREEN', NOW() + INTERVAL '21 days', 'NORMAL', 'APPROVED', 'APPROVED', 'WEAVING', 'M', 5000.000, 5000.000, 1200.000, 1000.000, 1000.000, 0.000, 0.000, 3800.000, 'INR', 680000.00)
ON CONFLICT (code) DO NOTHING;

-- 8. Operations
INSERT INTO public.operations (code, order_code, plan_code, stage, status, machine_code, shift, target, good, waste, reject, unit) VALUES
  ('OP-001-SPIN', 'ORD-2026-001', 'PLN-001', 'SPINNING', 'COMPLETED', 'SPIN-01', 'SHIFT_A', 10000.000, 10000.000, 120.000, 50.000, 'KG'),
  ('OP-001-WEAV', 'ORD-2026-001', 'PLN-001', 'WEAVING', 'COMPLETED', 'WEAV-01', 'SHIFT_B', 10000.000, 9800.000, 150.000, 50.000, 'M'),
  ('OP-001-DYE', 'ORD-2026-001', 'PLN-001', 'DYEING', 'IN_PROGRESS', 'DYE-01', 'SHIFT_A', 10000.000, 6500.000, 100.000, 200.000, 'M')
ON CONFLICT (code) DO NOTHING;

-- 9. Fabric Rolls
INSERT INTO public.fabric_rolls (code, order_code, buyer, qty, unit, colour, dye_lot, status, machine_code, location, section) VALUES
  ('ROLL-2026-101', 'ORD-2026-001', 'Anita Textiles', 1000.000, 'M', 'NAVY_BLUE', 'DL-NAVY-01', 'ACCEPTED', 'DYE-01', 'Finished Goods Bay 3', 'FINISHED_GOODS'),
  ('ROLL-2026-102', 'ORD-2026-001', 'Anita Textiles', 1000.000, 'M', 'NAVY_BLUE', 'DL-NAVY-01', 'ACCEPTED', 'DYE-01', 'Finished Goods Bay 3', 'FINISHED_GOODS'),
  ('ROLL-2026-103', 'ORD-2026-001', 'Anita Textiles', 1000.000, 'M', 'NAVY_BLUE', 'DL-NAVY-01', 'RESERVED', 'DYE-01', 'Loading Bay · Reserved', 'FINISHED_GOODS'),
  ('ROLL-2026-104', 'ORD-2026-001', 'Anita Textiles', 1000.000, 'M', 'NAVY_BLUE', 'DL-NAVY-01', 'RESERVED', 'DYE-01', 'Loading Bay · Reserved', 'FINISHED_GOODS'),
  ('ROLL-2026-105', 'ORD-2026-001', 'Anita Textiles', 1200.000, 'M', 'NAVY_BLUE', 'DL-NAVY-02', 'AWAITING_INSPECTION', 'DYE-01', 'Dyeing Discharge Rack 1', 'DYED_FABRIC')
ON CONFLICT (code) DO NOTHING;

-- 10. Quality Inspections
INSERT INTO public.quality_inspections (code, roll_id, roll_code, result, defect, reason, location, actor) VALUES
  ('QC-2026-001', 'roll-101', 'ROLL-2026-101', 'PASS', NULL, 'Shade match verified against master standard delta E < 0.3', 'Finished Goods Bay 3', 'Priya Iyer (Inspector)'),
  ('QC-2026-002', 'roll-102', 'ROLL-2026-102', 'PASS', NULL, 'Physical strength and color fastness test passed', 'Finished Goods Bay 3', 'Priya Iyer (Inspector)')
ON CONFLICT (code) DO NOTHING;

-- 11. Shipments
INSERT INTO public.shipments (code, order_code, roll_ids, buyer, status, rolls, qty, unit, vehicle, planned_at, amount) VALUES
  ('SHP-2026-001', 'ORD-2026-001', '["ROLL-2026-103", "ROLL-2026-104"]'::jsonb, 'Anita Textiles', 'DRAFT', 2, 2000.000, 'M', 'MH-04-JK-8821', NOW() + INTERVAL '1 day', 250000.00)
ON CONFLICT (code) DO NOTHING;

-- 12. Products and BOMs
INSERT INTO public.products (id, code, name, description, category) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-012345678901', 'FAB-221', 'FAB-221 Indigo Twill', 'Premium indigo twill fabric', 'Twill'),
  ('b2c3d4e5-f6a7-4b5c-9d0e-123456789012', 'FAB-118', 'FAB-118 Cotton Sateen', 'Soft cotton sateen for luxury wear', 'Sateen'),
  ('c3d4e5f6-a7b8-4c5d-0e1f-234567890123', 'FAB-307', 'FAB-307 Linen Blend', 'Breathable linen-cotton blend', 'Linen'),
  ('d4e5f6a7-b8c9-4d5e-1f20-345678901234', '100% Cotton Poplin 40s', '100% Cotton Poplin 40s', 'Standard poplin for shirts', 'Poplin'),
  ('e5f6a7b8-c9d0-4e5f-2031-456789012345', 'Organic Poly-Cotton Twill', 'Organic Poly-Cotton Twill', 'Durable and organic blend', 'Twill')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.bill_of_materials (product_id, yarn_item_id, quantity_required, unit) 
SELECT p.id, y.id, 0.45, 'KG' FROM public.products p, public.yarn_items y WHERE p.code = 'FAB-221' AND y.code = 'YRN-COT-40S'
ON CONFLICT (product_id, yarn_item_id) DO NOTHING;

INSERT INTO public.bill_of_materials (product_id, yarn_item_id, quantity_required, unit)
SELECT p.id, y.id, 0.50, 'KG' FROM public.products p, public.yarn_items y WHERE p.code = 'FAB-118' AND y.code = 'YRN-COT-40S'
ON CONFLICT (product_id, yarn_item_id) DO NOTHING;

INSERT INTO public.bill_of_materials (product_id, yarn_item_id, quantity_required, unit)
SELECT p.id, y.id, 0.30, 'KG' FROM public.products p, public.yarn_items y WHERE p.code = 'FAB-307' AND y.code = 'YRN-LINEN-60S'
ON CONFLICT (product_id, yarn_item_id) DO NOTHING;

INSERT INTO public.bill_of_materials (product_id, yarn_item_id, quantity_required, unit)
SELECT p.id, y.id, 0.20, 'KG' FROM public.products p, public.yarn_items y WHERE p.code = 'FAB-307' AND y.code = 'YRN-COT-40S'
ON CONFLICT (product_id, yarn_item_id) DO NOTHING;

INSERT INTO public.bill_of_materials (product_id, yarn_item_id, quantity_required, unit)
SELECT p.id, y.id, 0.40, 'KG' FROM public.products p, public.yarn_items y WHERE p.code = '100% Cotton Poplin 40s' AND y.code = 'YRN-COT-40S'
ON CONFLICT (product_id, yarn_item_id) DO NOTHING;

INSERT INTO public.bill_of_materials (product_id, yarn_item_id, quantity_required, unit)
SELECT p.id, y.id, 0.25, 'KG' FROM public.products p, public.yarn_items y WHERE p.code = 'Organic Poly-Cotton Twill' AND y.code = 'YRN-COT-40S'
ON CONFLICT (product_id, yarn_item_id) DO NOTHING;

INSERT INTO public.bill_of_materials (product_id, yarn_item_id, quantity_required, unit)
SELECT p.id, y.id, 0.25, 'KG' FROM public.products p, public.yarn_items y WHERE p.code = 'Organic Poly-Cotton Twill' AND y.code = 'YRN-POLY-150D'
ON CONFLICT (product_id, yarn_item_id) DO NOTHING;
