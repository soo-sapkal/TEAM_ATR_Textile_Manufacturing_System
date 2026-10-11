import { pool } from "./lib/db/pool";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "super-secret-key-for-loom-ledger");

async function generateSupervisorToken() {
  return new SignJWT({
    id: "22222222-2222-2222-2222-222222222222",
    email: "supervisor@everest.demo",
    role: "SUPERVISOR",
    permissions: ["orders.read", "production.read", "production.plan", "production.assign", "production.record_output", "machines.operate"],
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

async function generateOperatorToken() {
  return new SignJWT({
    id: "33333333-3333-3333-3333-333333333333",
    email: "operator.spinning@everest.demo",
    role: "MACHINE_OPERATOR",
    permissions: ["production.read", "production.record_output", "machines.operate"],
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

async function apiAssign(token: string, body: any) {
  const res = await fetch("http://localhost:3000/api/production/assign-machine", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `auth_token=${token}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function apiRecordOutput(token: string, body: any) {
  const res = await fetch("http://localhost:3000/api/production/record-output", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `auth_token=${token}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function runTests() {
  const client = await pool.connect();
  const supervisorToken = await generateSupervisorToken();
  const operatorToken = await generateOperatorToken();

  const testOrderCode = `ORD-TEST-${Date.now()}`;
  const spinOpId = crypto.randomUUID();
  const weavOpId = crypto.randomUUID();
  const dyeOpId = crypto.randomUUID();

  console.log(`\n======================================================`);
  console.log(`RUNNING ACCEPTANCE TESTS FOR STAGE DEPENDENCY WORKFLOW`);
  console.log(`Test Order Code: ${testOrderCode}`);
  console.log(`======================================================\n`);

  try {
    // 0. Setup isolated test fixtures
    await client.query(
      `INSERT INTO orders (id, code, buyer, buyer_id, product, colour, due, priority, unit, ordered, remaining, status)
       VALUES ($1, $2, 'Test Buyer', 'buyer-test', '100% Cotton Poplin 40s', 'NAVY_BLUE', NOW() + INTERVAL '10 days', 'NORMAL', 'M', 1000, 1000, 'APPROVED')`,
      [crypto.randomUUID(), testOrderCode]
    );

    await client.query(
      `INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit)
       VALUES 
       ($1, 'OP-TEST-SPIN', $2, 'PLAN-TEST', 'SPINNING', 'PLANNED', 500, 'KG'),
       ($3, 'OP-TEST-WEAV', $2, 'PLAN-TEST', 'WEAVING', 'PLANNED', 500, 'M'),
       ($4, 'OP-TEST-DYE', $2, 'PLAN-TEST', 'DYEING', 'PLANNED', 500, 'M')`,
      [spinOpId, testOrderCode, weavOpId, dyeOpId]
    );

    // TEST 1: Operator skill validation - Mismatched skill must fail
    console.log("TEST 1: Assigning SPINNING to WEAVING operator (mismatched skill)...");
    const skillFailRes = await apiAssign(supervisorToken, {
      operationId: spinOpId,
      machineId: "SPIN-01",
      shift: "A · 06:00–14:00",
      date: "2026-10-15",
      operator: "Sharma Amit", // Sharma Amit has WEAVING skill
      actor: "Supervisor",
    });
    console.log(`Status: ${skillFailRes.status}, Error: "${skillFailRes.data.error}"`);
    if (skillFailRes.status === 400 && skillFailRes.data.error.includes("not qualified for stage 'SPINNING'")) {
      console.log("--> PASS: Mismatched operator skill rejected correctly.\n");
    } else {
      throw new Error("TEST 1 FAILED: Expected 400 skill validation failure");
    }

    // TEST 2: Stage Dependency - Weaving cannot be assigned before spinning produces spun yarn
    console.log("TEST 2: Attempting to assign WEAVING before any spun yarn exists...");
    const weavBlockedRes = await apiAssign(supervisorToken, {
      operationId: weavOpId,
      machineId: "WEAV-01",
      shift: "A · 06:00–14:00",
      date: "2026-10-15",
      operator: "Sharma Amit",
      actor: "Supervisor",
    });
    console.log(`Status: ${weavBlockedRes.status}, Error: "${weavBlockedRes.data.error}"`);
    if (weavBlockedRes.status === 400 && weavBlockedRes.data.error.includes("no spun yarn is available in spinning storage")) {
      console.log("--> PASS: Weaving assignment blocked due to missing upstream spun yarn.\n");
    } else {
      throw new Error("TEST 2 FAILED: Expected 400 missing spun yarn failure");
    }

    // TEST 3: Stage Dependency - Dyeing cannot be assigned before weaving produces woven fabric
    console.log("TEST 3: Attempting to assign DYEING before any woven fabric exists...");
    const dyeBlockedRes = await apiAssign(supervisorToken, {
      operationId: dyeOpId,
      machineId: "DYE-01",
      shift: "A · 06:00–14:00",
      date: "2026-10-15",
      operator: "Ajay Sharma",
      actor: "Supervisor",
    });
    console.log(`Status: ${dyeBlockedRes.status}, Error: "${dyeBlockedRes.data.error}"`);
    if (dyeBlockedRes.status === 400 && dyeBlockedRes.data.error.includes("no woven fabric is available in weaving storage")) {
      console.log("--> PASS: Dyeing assignment blocked due to missing upstream woven fabric.\n");
    } else {
      throw new Error("TEST 3 FAILED: Expected 400 missing woven fabric failure");
    }

    // TEST 4: Assigning qualified Spinning operator succeeds
    console.log("TEST 4: Assigning qualified operator to SPINNING...");
    const spinAssignRes = await apiAssign(supervisorToken, {
      operationId: spinOpId,
      machineId: "SPIN-01",
      shift: "A · 06:00–14:00",
      date: "2026-10-15",
      operator: "Amit Sharma", // Amit Sharma has SPINNING skill
      actor: "Supervisor",
    });
    console.log(`Status: ${spinAssignRes.status}, Success: ${spinAssignRes.data.success}`);
    if (spinAssignRes.status === 200 && spinAssignRes.data.success) {
      console.log("--> PASS: Qualified operator assigned to spinning successfully.\n");
    } else {
      throw new Error(`TEST 4 FAILED: ${spinAssignRes.data.error}`);
    }

    // TEST 5: Machine conflict validation - Cannot assign another task to SPIN-01 on same date & shift
    console.log("TEST 5: Conflicting machine assignment on same machine/date/shift...");
    const conflictOpId = crypto.randomUUID();
    await client.query(
      `INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit)
       VALUES ($1, 'OP-TEST-CONFLICT', $2, 'PLAN-TEST', 'SPINNING', 'PLANNED', 100, 'KG')`,
      [conflictOpId, testOrderCode]
    );
    const conflictRes = await apiAssign(supervisorToken, {
      operationId: conflictOpId,
      machineId: "SPIN-01",
      shift: "A · 06:00–14:00",
      date: "2026-10-15",
      operator: "Amit Sharma",
      actor: "Supervisor",
    });
    console.log(`Status: ${conflictRes.status}, Error: "${conflictRes.data.error}"`);
    if (conflictRes.status === 400 && conflictRes.data.error.includes("already booked")) {
      console.log("--> PASS: Conflicting machine assignment rejected.\n");
    } else {
      throw new Error("TEST 5 FAILED: Expected conflict rejection");
    }

    // TEST 6: Record output for spinning creates eligible SPUN_YARN
    console.log("TEST 6: Operator records 250 KG spinning output...");
    const recordSpinRes = await apiRecordOutput(operatorToken, {
      operationId: spinOpId,
      good: 250,
      waste: 5,
      reject: 2,
      actor: "Amit Sharma",
    });
    console.log(`Status: ${recordSpinRes.status}, Success: ${recordSpinRes.data.success}`);
    if (recordSpinRes.status === 200 && recordSpinRes.data.success) {
      console.log("--> PASS: Output recorded and spun yarn materialized in storage.\n");
    } else {
      throw new Error(`TEST 6 FAILED: ${recordSpinRes.data.error}`);
    }

    // Check database has the spun yarn
    const checkSpun = await client.query(
      "SELECT * FROM yarn_batches WHERE order_code = $1 AND section = 'SPUN_YARN'",
      [testOrderCode]
    );
    console.log(`Spun yarn in DB: ${checkSpun.rows.length} batch(es), available: ${checkSpun.rows[0]?.available} KG`);

    // TEST 7: Weaving cannot be assigned beyond available spun yarn (500 > 250)
    console.log("TEST 7: Attempting to assign WEAVING for 500 KG (exceeding available 250 KG)...");
    const overAssignRes = await apiAssign(supervisorToken, {
      operationId: weavOpId,
      machineId: "WEAV-01",
      shift: "B · 14:00–22:00",
      date: "2026-10-15",
      operator: "Sharma Amit",
      actor: "Supervisor",
      target: 500,
    });
    console.log(`Status: ${overAssignRes.status}, Error: "${overAssignRes.data.error}"`);
    if (overAssignRes.status === 400 && overAssignRes.data.error.includes("exceeds available spun yarn")) {
      console.log("--> PASS: Over-assignment beyond available upstream stock rejected.\n");
    } else {
      throw new Error("TEST 7 FAILED: Expected over-assignment rejection");
    }

    // TEST 8: Partial production assignment - Weaving assigned up to available 250 KG
    console.log("TEST 8: Assigning partial WEAVING target of 250 KG (within available stock)...");
    const partialWeavRes = await apiAssign(supervisorToken, {
      operationId: weavOpId,
      machineId: "WEAV-01",
      shift: "B · 14:00–22:00",
      date: "2026-10-15",
      operator: "Sharma Amit",
      actor: "Supervisor",
      target: 250,
    });
    console.log(`Status: ${partialWeavRes.status}, Success: ${partialWeavRes.data.success}, Remaining: ${partialWeavRes.data.remainingQuantity}`);
    if (partialWeavRes.status === 200 && partialWeavRes.data.success) {
      console.log("--> PASS: Partial production assigned and remaining quantity split safely.\n");
    } else {
      throw new Error(`TEST 8 FAILED: ${partialWeavRes.data.error}`);
    }

    // TEST 9: Double allocation prevention - Second task cannot claim the same reserved material
    console.log("TEST 9: Attempting concurrent/duplicate assignment on already committed stock...");
    const dupWeavId = crypto.randomUUID();
    await client.query(
      `INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit)
       VALUES ($1, 'OP-TEST-DUP-WEAV', $2, 'PLAN-TEST', 'WEAVING', 'PLANNED', 100, 'M')`,
      [dupWeavId, testOrderCode]
    );
    const dupWeavRes = await apiAssign(supervisorToken, {
      operationId: dupWeavId,
      machineId: "WEAV-02",
      shift: "C · 22:00–06:00",
      date: "2026-10-15",
      operator: "Sharma Amit",
      actor: "Supervisor",
      target: 100,
    });
    console.log(`Status: ${dupWeavRes.status}, Error: "${dupWeavRes.data.error}"`);
    if (dupWeavRes.status === 400 && dupWeavRes.data.error.includes("already committed")) {
      console.log("--> PASS: Concurrent/duplicate allocation correctly prevented.\n");
    } else {
      throw new Error("TEST 9 FAILED: Expected duplicate allocation prevention");
    }

    // TEST 10: Operator records weaving output, materializing WOVEN_FABRIC rolls
    console.log("TEST 10: Operator records 200 M weaving output...");
    const recordWeavRes = await apiRecordOutput(operatorToken, {
      operationId: weavOpId,
      good: 200,
      waste: 10,
      reject: 5,
      actor: "Sharma Amit",
    });
    console.log(`Status: ${recordWeavRes.status}, Success: ${recordWeavRes.data.success}`);
    if (recordWeavRes.status === 200 && recordWeavRes.data.success) {
      console.log("--> PASS: Woven fabric rolls produced in weaving storage.\n");
    } else {
      throw new Error(`TEST 10 FAILED: ${recordWeavRes.data.error}`);
    }

    // TEST 11: Dyeing cannot be assigned beyond available woven fabric (500 > 200)
    console.log("TEST 11: Attempting to assign DYEING for 500 M (exceeding available 200 M)...");
    const overDyeRes = await apiAssign(supervisorToken, {
      operationId: dyeOpId,
      machineId: "DYE-01",
      shift: "A · 06:00–14:00",
      date: "2026-10-16",
      operator: "Ajay Sharma",
      actor: "Supervisor",
      target: 500,
    });
    console.log(`Status: ${overDyeRes.status}, Error: "${overDyeRes.data.error}"`);
    if (overDyeRes.status === 400 && overDyeRes.data.error.includes("exceeds available woven fabric")) {
      console.log("--> PASS: Dyeing over-assignment rejected.\n");
    } else {
      throw new Error("TEST 11 FAILED: Expected dyeing over-assignment rejection");
    }

    // TEST 12: Dyeing assigned within available 200 M succeeds
    console.log("TEST 12: Assigning DYEING for 200 M (within available stock)...");
    const dyeAssignRes = await apiAssign(supervisorToken, {
      operationId: dyeOpId,
      machineId: "DYE-01",
      shift: "A · 06:00–14:00",
      date: "2026-10-16",
      operator: "Ajay Sharma",
      actor: "Supervisor",
      target: 200,
    });
    console.log(`Status: ${dyeAssignRes.status}, Success: ${dyeAssignRes.data.success}`);
    if (dyeAssignRes.status === 200 && dyeAssignRes.data.success) {
      console.log("--> PASS: Dyeing assigned successfully within available woven fabric.\n");
    } else {
      throw new Error(`TEST 12 FAILED: ${dyeAssignRes.data.error}`);
    }

    console.log("\n======================================================");
    console.log("ALL 12 ACCEPTANCE TESTS PASSED SUCCESSFULLY! (100%)");
    console.log("======================================================\n");
  } finally {
    // Cleanup test fixtures
    console.log("Cleaning up test fixtures...");
    await client.query("DELETE FROM operations WHERE order_code = $1", [testOrderCode]);
    await client.query("DELETE FROM fabric_rolls WHERE order_code = $1", [testOrderCode]);
    await client.query("DELETE FROM yarn_batches WHERE order_code = $1", [testOrderCode]);
    await client.query("DELETE FROM orders WHERE code = $1", [testOrderCode]);
    client.release();
    await pool.end();
    console.log("Cleanup complete.");
  }
}

runTests().catch((e) => {
  console.error("Test Suite Error:", e);
  process.exit(1);
});
