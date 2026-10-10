const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xaqbisnaetgsjiortzgi:sohamsapkal@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  const categories = ['SPINNING', 'WEAVING', 'DYEING'];
  
  for (const stage of categories) {
    for (let i = 1; i <= 5; i++) {
      const id = crypto.randomUUID();
      const code = `OP-DEMO-${stage.substring(0,4)}-${i}`;
      const order_code = `ORD-2026-001`;
      const plan_code = `PLN-DEMO-${i}`;
      
      let unit = 'KG';
      if (stage === 'WEAVING' || stage === 'DYEING') unit = 'M';
      
      await pool.query(`
        INSERT INTO operations 
        (id, code, order_code, plan_code, stage, status, target, unit, operators, good, waste, reject)
        VALUES ($1, $2, $3, $4, $5, 'PLANNED', $6, $7, $8, 0, 0, 0)
      `, [id, code, order_code, plan_code, stage, '1000', unit, []]);
      
      console.log(`Inserted ${code}`);
    }
  }
  
  await pool.end();
}

run().catch(console.error);
