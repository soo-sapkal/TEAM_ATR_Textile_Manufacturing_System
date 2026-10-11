const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres' });
pool.query("SELECT code, operators FROM operations WHERE code LIKE 'OP-DEMO-%'").then(res => { console.log(typeof res.rows[0].operators, res.rows[0].operators, Array.isArray(res.rows[0].operators)); pool.end(); }).catch(e => console.error(e));
