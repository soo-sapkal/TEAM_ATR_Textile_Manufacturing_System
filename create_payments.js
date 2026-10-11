const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres' });
const sql = `
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  reference_no TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read all payments" ON public.payments FOR ALL USING (true);
`;
pool.query(sql).then(() => {
  console.log('Payments table created');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
