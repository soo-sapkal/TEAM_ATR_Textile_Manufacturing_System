-- Supabase Migration: 20261011000000_create_invoices.sql
-- Project: TEAM ATR Textile Manufacturing System (Loom Ledger)

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

-- RLS setup
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read all invoices" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Allow anon read all invoice line items" ON public.invoice_line_items FOR ALL USING (true);
