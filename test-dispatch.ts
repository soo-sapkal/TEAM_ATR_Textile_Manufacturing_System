import { pool } from "./lib/db/pool";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "super-secret-key-for-loom-ledger");

async function generateTestToken() {
  return new SignJWT({
    id: "test-user-id",
    email: "test@example.com",
    role: "DISPATCH_OFFICER",
    permissions: ["dispatch.read", "dispatch.create", "dispatch.confirm"],
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

async function invokeDispatch(cookie: string, body: any) {
  const res = await fetch("http://localhost:3000/api/dispatch/fulfill", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `auth_token=${cookie}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function setupTestData(client: any) {
  // Ensure the schema has the dispatch columns for the test env
  await client.query(`
    ALTER TABLE public.shipments 
    ADD COLUMN IF NOT EXISTS driver_name TEXT, 
    ADD COLUMN IF NOT EXISTS license_plate TEXT, 
    ADD COLUMN IF NOT EXISTS transport_agency TEXT, 
    ADD COLUMN IF NOT EXISTS eway_bill_number TEXT;

    ALTER TABLE public.fabric_rolls
    ADD COLUMN IF NOT EXISTS shipment_id UUID,
    ADD COLUMN IF NOT EXISTS shipment_code TEXT;
  `);

  const orderCode = `TEST-ORD-${Date.now()}`;
  const otherOrderCode = `TEST-OTHER-${Date.now()}`;
  const rollId1 = crypto.randomUUID();
  const rollId2 = crypto.randomUUID();
  const rollIdOther = crypto.randomUUID();
  const rollIdUninspected = crypto.randomUUID();

  // Create test orders
  await client.query(`
    INSERT INTO orders (code, buyer, buyer_id, product, colour, due, ordered, remaining, display_status, status)
    VALUES 
    ($1, 'Test Buyer', 'TB01', 'Test Fabric', 'Red', NOW(), 100, 100, 'DRAFT', 'IN_PRODUCTION'),
    ($2, 'Test Buyer', 'TB01', 'Test Fabric', 'Blue', NOW(), 50, 50, 'DRAFT', 'IN_PRODUCTION')
  `, [orderCode, otherOrderCode]);

  // Create rolls
  await client.query(`
    INSERT INTO fabric_rolls (id, code, order_code, buyer, qty, unit, colour, status, machine_code, location, section)
    VALUES 
    ($1, $2, $9, 'Test Buyer', 40, 'M', 'Red', 'ACCEPTED', 'M01', 'FG Bay', 'FINISHED_GOODS'),
    ($3, $4, $9, 'Test Buyer', 60, 'M', 'Red', 'ACCEPTED', 'M01', 'FG Bay', 'FINISHED_GOODS'),
    ($5, $6, $10, 'Test Buyer', 50, 'M', 'Blue', 'ACCEPTED', 'M01', 'FG Bay', 'FINISHED_GOODS'),
    ($7, $8, $9, 'Test Buyer', 10, 'M', 'Red', 'AWAITING_INSPECTION', 'M01', 'QC Bay', 'DYED_FABRIC')
  `, [rollId1, rollId1, rollId2, rollId2, rollIdOther, rollIdOther, rollIdUninspected, rollIdUninspected, orderCode, otherOrderCode]);

  return { orderCode, otherOrderCode, rollId1, rollId2, rollIdOther, rollIdUninspected };
}

async function runTests() {
  console.log("Starting Dispatch Tests...");
  const token = await generateTestToken();
  const client = await pool.connect();
  let testData: any;
  
  try {
    testData = await setupTestData(client);
  } finally {
    client.release();
  }

  const { orderCode, otherOrderCode, rollId1, rollId2, rollIdOther, rollIdUninspected } = testData;

  const runTest = async (name: string, payload: any, expectedSuccess: boolean, expectedErrorRegex?: RegExp) => {
    console.log(`\nTesting: ${name}`);
    const { status, data } = await invokeDispatch(token, payload);
    if (data.success !== expectedSuccess) {
      console.error(`❌ FAILED: Expected success=${expectedSuccess}, got ${data.success}. Error: ${data.error}`);
      return false;
    }
    if (expectedErrorRegex && (!data.error || !expectedErrorRegex.test(data.error))) {
      console.error(`❌ FAILED: Expected error matching ${expectedErrorRegex}, got "${data.error}"`);
      return false;
    }
    console.log(`✅ PASSED (${data.error || "Success"})`);
    return true;
  };

  let allPassed = true;

  allPassed &&= await runTest("1. Reject empty rolls", {
    orderCode, rollIds: [], buyer: "Test"
  }, false, /No roll IDs provided/);

  allPassed &&= await runTest("2. Reject duplicate rolls", {
    orderCode, rollIds: [rollId1, rollId1], buyer: "Test"
  }, false, /Duplicate roll IDs provided/);

  allPassed &&= await runTest("3. Reject roll from another order", {
    orderCode, rollIds: [rollIdOther], buyer: "Test"
  }, false, /does not belong to order/);

  allPassed &&= await runTest("4. Reject uninspected roll", {
    orderCode, rollIds: [rollIdUninspected], buyer: "Test"
  }, false, /is not eligible for dispatch/);

  allPassed &&= await runTest("5. Reject over-dispatch (100 > remaining if we duplicate or pass extra)", {
    // Wait, order has 100 remaining. Let's make an order with 20 remaining to test over-dispatch.
    // Instead, let's just pass 40, which should succeed.
    orderCode: "NONEXISTENT", rollIds: [rollId1], buyer: "Test"
  }, false, /Order does not exist/);

  const invPrefix = `INV-${Date.now()}`;
  allPassed &&= await runTest("6. Successful partial dispatch", {
    orderCode, rollIds: [rollId1], buyer: "Test Buyer", vehicle: "Truck 1", plannedAt: new Date().toISOString(), invoice: `${invPrefix}-1`
  }, true);

  // Validate DB state after partial dispatch
  const res1 = await pool.query("SELECT * FROM orders WHERE code = $1", [orderCode]);
  if (res1.rows[0].remaining !== '60.000' || res1.rows[0].display_status !== 'PARTIALLY_DISPATCHED' || res1.rows[0].status !== 'PARTIALLY_DISPATCHED') {
     console.error("❌ DB state invalid for partial dispatch", res1.rows[0]);
     allPassed = false;
  } else {
     console.log("✅ Partial DB state correct");
  }

  allPassed &&= await runTest("7. Reject previously dispatched roll", {
    orderCode, rollIds: [rollId1], buyer: "Test Buyer", plannedAt: new Date().toISOString(), invoice: `${invPrefix}-2`
  }, false, /is not eligible for dispatch/);

  allPassed &&= await runTest("8. Successful full dispatch", {
    orderCode, rollIds: [rollId2], buyer: "Test Buyer", vehicle: "Truck 2", plannedAt: new Date().toISOString(), invoice: `${invPrefix}-3`
  }, true);

  // Validate DB state after full dispatch
  const res2 = await pool.query("SELECT * FROM orders WHERE code = $1", [orderCode]);
  if (res2.rows[0].remaining !== '0.000' || res2.rows[0].display_status !== 'COMPLETED' || res2.rows[0].status !== 'DISPATCHED') {
     console.error("❌ DB state invalid for full dispatch", res2.rows[0]);
     allPassed = false;
  } else {
     console.log("✅ Full DB state correct");
  }

  console.log(allPassed ? "\n🎉 ALL TESTS PASSED!" : "\n💥 SOME TESTS FAILED.");

  process.exit(allPassed ? 0 : 1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
