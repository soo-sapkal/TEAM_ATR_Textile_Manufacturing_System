const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres' });
pool.query("UPDATE operations SET operators = '[]'::jsonb WHERE jsonb_typeof(operators) = 'object'").then(res => { console.log(res.rowCount); pool.end(); }).catch(e => console.error(e));
