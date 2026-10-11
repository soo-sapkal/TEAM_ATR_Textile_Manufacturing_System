-- Migration: 20261011000002_bom_driven_allocations.sql
-- BOM-driven raw material selection and persistent allocation

-- 1. Add product_id to orders table with foreign key to products.id
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

-- 2. Backfill existing orders where an unambiguous unique match exists in products
UPDATE public.orders o
SET product_id = p.id
FROM public.products p
WHERE (o.product = p.name OR o.product = p.code)
  AND (
    SELECT COUNT(*) FROM public.products p2 
    WHERE (o.product = p2.name OR o.product = p2.code)
  ) = 1
  AND o.product_id IS NULL;

-- 3. Create operation_material_allocations table to track batch-level raw material reservations
CREATE TABLE IF NOT EXISTS public.operation_material_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  order_code TEXT NOT NULL,
  batch_id UUID NOT NULL REFERENCES public.yarn_batches(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  allocated_qty NUMERIC(12,3) NOT NULL,
  consumed_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'KG',
  status TEXT NOT NULL DEFAULT 'RESERVED' CHECK (status IN ('RESERVED', 'CONSUMED', 'RELEASED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_op_alloc_op_id ON public.operation_material_allocations(operation_id);
CREATE INDEX IF NOT EXISTS idx_op_alloc_batch_id ON public.operation_material_allocations(batch_id);
CREATE INDEX IF NOT EXISTS idx_op_alloc_order_code ON public.operation_material_allocations(order_code);
CREATE INDEX IF NOT EXISTS idx_op_alloc_status ON public.operation_material_allocations(status);

-- Enable RLS and add policy
ALTER TABLE public.operation_material_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read all allocations" ON public.operation_material_allocations FOR ALL USING (true);
