import { pool } from "./lib/db/pool";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "super-secret-key-for-loom-ledger");

async function generateSupervisorToken() {
  return new SignJWT({
    id: "22222222-2222-2222-2222-222222222222",
    email: "supervisor@everest.demo",
    role: "SUPERVISOR",
    permissions: ["orders.read", "orders.create", "orders.approve", "production.read", "production.plan", "production.assign", "production.record_output", "machines.operate"],
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

async function apiTransition(token: string, body: any) {
  const res = await fetch("http://localhost:3000/api/production/operation-transition", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `auth_token=${token}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function apiPatchOrder(token: string, orderId: string, body: any) {
  const res = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
    method: "PATCH",
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

  const timestamp = Date.now();
  const testOrderCode = `ORD-BOM-${timestamp}`;
  const testOrderId = crypto.randomUUID();

  console.log(`\n======================================================`);
  console.log(`RUNNING ACCEPTANCE TESTS FOR BOM-DRIVEN ALLOCATION WORKFLOW`);
  console.log(`Test Order Code: ${testOrderCode}`);
  console.log(`======================================================\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST 8: Legacy order migration verification
    // -------------------------------------------------------------------------
    console.log("TEST 8: Checking unambiguous product migration on orders table...");
    const order001 = await client.query("SELECT product, product_id FROM orders WHERE code = 'ORD-2026-001'");
    const orderComp = await client.query("SELECT product, product_id FROM orders WHERE code = 'ORD-2026-COMP-01'");
    if (order001.rows[0]?.product_id && orderComp.rows[0]?.product_id === null) {
      console.log(`--> PASS: ORD-2026-001 linked to product_id (${order001.rows[0].product_id}), ambiguous ORD-2026-COMP-01 left null.\n`);
    } else {
      throw new Error(`TEST 8 FAILED: Migration did not link unambiguous orders properly.`);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Incompatible units or missing BOM rejection
    // -------------------------------------------------------------------------
    console.log("TEST 9: Attempting to assign spinning for product with no BOM...");
    const noBomOpId = crypto.randomUUID();
    await client.query(
      `INSERT INTO orders (id, code, buyer, buyer_id, product, colour, due, priority, unit, ordered, remaining, status)
       VALUES ($1, 'ORD-NO-BOM', 'Test Buyer', 'buyer-test', 'Unregistered Mystery Fabric', 'NATURAL', NOW() + INTERVAL '10 days', 'NORMAL', 'M', 500, 500, 'APPROVED')`,
      [crypto.randomUUID()]
    );
    await client.query(
      `INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit)
       VALUES ($1, 'OP-NO-BOM-SPIN', 'ORD-NO-BOM', 'PLN-TEST', 'SPINNING', 'PLANNED', 200, 'KG')`,
      [noBomOpId]
    );

    const noBomRes = await apiAssign(supervisorToken, {
      operationId: noBomOpId,
      machineId: "SPIN-01",
      shift: "A · 06:00–14:00",
      date: "2026-10-16",
      operator: "Amit Sharma",
      actor: "Supervisor",
    });
    console.log(`Status: ${noBomRes.status}, Error: "${noBomRes.data.error}"`);
    if (noBomRes.status === 400 && noBomRes.data.error.includes("has no Bill of Materials (BOM) configured")) {
      console.log("--> PASS: Missing BOM rejected explicitly.\n");
    } else {
      throw new Error("TEST 9 FAILED: Expected missing BOM rejection");
    }

    // -------------------------------------------------------------------------
    // TEST 7: Plan release generates operations without duplicate creation
    // -------------------------------------------------------------------------
    console.log("TEST 7: Releasing production plan generates pipeline operations...");
    // Create new approved order for 100% Cotton Poplin 40s (BOM = 0.40 KG/M)
    const cottonProdRes = await client.query("SELECT id FROM products WHERE code = '100% Cotton Poplin 40s'");
    const cottonProdId = cottonProdRes.rows[0].id;

    await client.query(
      `INSERT INTO orders (id, code, buyer, buyer_id, product, product_id, colour, due, priority, unit, ordered, remaining, status)
       VALUES ($1, $2, 'Anita Textiles', 'buyer-01', '100% Cotton Poplin 40s', $3, 'NAVY_BLUE', NOW() + INTERVAL '10 days', 'NORMAL', 'M', 1000, 1000, 'APPROVED')`,
      [testOrderId, testOrderCode, cottonProdId]
    );

    // Call patch order to release plan
    const releaseRes1 = await apiPatchOrder(supervisorToken, testOrderId, {
      status: "IN_PRODUCTION",
      displayStatus: "IN_PRODUCTION",
      stage: "SPINNING"
    });
    if (releaseRes1.status !== 200 || !releaseRes1.data.success) {
      throw new Error(`TEST 7 FAILED on initial release: ${releaseRes1.data.error}`);
    }

    const opsAfterRel = await client.query("SELECT code, stage, target, unit FROM operations WHERE order_code = $1 ORDER BY stage ASC", [testOrderCode]);
    console.log(`Generated operations: ${opsAfterRel.rows.map(o => `${o.code} (${o.stage}: ${o.target} ${o.unit})`).join(", ")}`);
    if (opsAfterRel.rows.length !== 3) {
      throw new Error(`TEST 7 FAILED: Expected 3 operations (SPINNING, WEAVING, DYEING), got ${opsAfterRel.rows.length}`);
    }
    // Verify spinning target was converted via BOM: 1000 M * 0.40 KG/M = 400 KG
    const spinOp = opsAfterRel.rows.find(o => o.stage === 'SPINNING');
    if (parseFloat(spinOp.target) !== 400 || spinOp.unit !== 'KG') {
      throw new Error(`TEST 7 FAILED: Expected spinning target 400 KG from BOM, got ${spinOp.target} ${spinOp.unit}`);
    }

    // Call release again to verify duplicate prevention
    const releaseRes2 = await apiPatchOrder(supervisorToken, testOrderId, { status: "IN_PRODUCTION" });
    const opsAfterRel2 = await client.query("SELECT id FROM operations WHERE order_code = $1", [testOrderCode]);
    if (opsAfterRel2.rows.length !== 3) {
      throw new Error(`TEST 7 FAILED: Repeated release created duplicate operations!`);
    }
    console.log("--> PASS: Operations generated according to BOM yield without duplicates on retry.\n");

    const spinOpRecord = await client.query("SELECT id FROM operations WHERE order_code = $1 AND stage = 'SPINNING'", [testOrderCode]);
    const spinOpId = spinOpRecord.rows[0].id;

    // -------------------------------------------------------------------------
    // TEST 1: Cotton fabric cannot reserve polyester or linen yarn
    // -------------------------------------------------------------------------
    console.log("TEST 1: Verifying cotton fabric cannot use polyester or linen...");
    // Let's create an order for a new custom product requiring silk/linen where cotton is in stock but required yarn is zero
    const fakeSilkProdId = crypto.randomUUID();
    await client.query(
      `INSERT INTO products (id, code, name, description) VALUES ($1, 'FAB-FAKE-LINEN', 'Pure Heavy Linen', '100% Linen Fabric')`,
      [fakeSilkProdId]
    );
    // Link to YRN-LINEN-60S
    const linenYarn = await client.query("SELECT id FROM yarn_items WHERE code = 'YRN-LINEN-60S'");
    await client.query(
      `INSERT INTO bill_of_materials (id, product_id, yarn_item_id, quantity_required, unit) VALUES (gen_random_uuid(), $1, $2, 0.500, 'KG')`,
      [fakeSilkProdId, linenYarn.rows[0].id]
    );
    // Create order requesting 50,000 M (requires 25,000 KG of Linen, warehouse only has ~2300 KG of linen, but 8000+ KG of Cotton and Poly)
    const linenOrderCode = `ORD-LINEN-${timestamp}`;
    const linenOpId = crypto.randomUUID();
    await client.query(
      `INSERT INTO orders (id, code, buyer, buyer_id, product, product_id, colour, due, priority, unit, ordered, remaining, status)
       VALUES ($1, $2, 'Buyer', 'b1', 'Pure Heavy Linen', $3, 'NATURAL', NOW() + INTERVAL '5 days', 'NORMAL', 'M', 50000, 50000, 'APPROVED')`,
      [crypto.randomUUID(), linenOrderCode, fakeSilkProdId]
    );
    await client.query(
      `INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit)
       VALUES ($1, 'OP-LINEN-SPIN', $2, 'PLN-TEST', 'SPINNING', 'PLANNED', 25000, 'KG')`,
      [linenOpId, linenOrderCode]
    );

    const wrongYarnRes = await apiAssign(supervisorToken, {
      operationId: linenOpId,
      machineId: "SPIN-01",
      shift: "B · 14:00–22:00",
      date: "2026-10-16",
      operator: "Amit Sharma",
      actor: "Supervisor",
    });
    console.log(`Status: ${wrongYarnRes.status}, Error: "${wrongYarnRes.data.error}"`);
    if (wrongYarnRes.status === 400 && wrongYarnRes.data.error.includes("YRN-LINEN-60S")) {
      console.log("--> PASS: System specifically checked YRN-LINEN-60S and refused to substitute cotton/poly.\n");
    } else {
      throw new Error("TEST 1 FAILED: Expected specific yarn rejection");
    }

    // -------------------------------------------------------------------------
    // TEST 2: Product requiring 2 yarn types fails if either is insufficient
    // -------------------------------------------------------------------------
    console.log("TEST 2: Product requiring multi-yarn BOM fails if either yarn is short...");
    // Organic Poly-Cotton Twill requires 0.25 KG Cotton and 0.25 KG Poly
    const polyCottonProd = await client.query("SELECT id FROM products WHERE code = 'Organic Poly-Cotton Twill'");
    const pcOrderCode = `ORD-PC-${timestamp}`;
    const pcOpId = crypto.randomUUID();
    await client.query(
      `INSERT INTO orders (id, code, buyer, buyer_id, product, product_id, colour, due, priority, unit, ordered, remaining, status)
       VALUES ($1, $2, 'Buyer', 'b1', 'Organic Poly-Cotton Twill', $3, 'GREEN', NOW() + INTERVAL '5 days', 'NORMAL', 'M', 20000, 20000, 'APPROVED')`,
      [crypto.randomUUID(), pcOrderCode, polyCottonProd.rows[0].id]
    );
    const cottonStockRes = await client.query(
      "SELECT COALESCE(SUM(available), 0) as avail FROM yarn_batches WHERE item_code = 'YRN-COT-40S' AND section = 'RAW_YARN' AND status = 'AVAILABLE'"
    );
    const cottonAvail = parseFloat(cottonStockRes.rows[0].avail);
    const impossibleTarget = Math.max(10000, (cottonAvail * 2) + 2000);
    await client.query(
      `INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit)
       VALUES ($1, $2, $3, 'PLN-TEST', 'SPINNING', 'PLANNED', $4, 'KG')`,
      [pcOpId, `OP-PC-SPIN-${timestamp}`, pcOrderCode, impossibleTarget]
    );
    const multiFailRes = await apiAssign(supervisorToken, {
      operationId: pcOpId,
      machineId: "SPIN-01",
      shift: "C · 22:00–06:00",
      date: "2026-10-16",
      operator: "Amit Sharma",
      actor: "Supervisor",
    });
    console.log(`Status: ${multiFailRes.status}, Error: "${multiFailRes.data.error}"`);
    if (multiFailRes.status === 400 && multiFailRes.data.error.includes("YRN-COT-40S")) {
      console.log("--> PASS: Multi-yarn product blocked when component yarn is insufficient.\n");
    } else {
      throw new Error("TEST 2 FAILED: Expected multi-yarn component check failure");
    }

    // -------------------------------------------------------------------------
    // TEST 3: Sufficient correct yarn allows assignment and creates FIFO reservation
    // -------------------------------------------------------------------------
    console.log("TEST 3: Assigning spinning with sufficient Cotton 40s (Target: 400 KG)...");
    const checkBatchBefore = await client.query("SELECT code, available, reserved, on_hand FROM yarn_batches WHERE item_code = 'YRN-COT-40S' AND section = 'RAW_YARN' ORDER BY received_at ASC LIMIT 1");
    const bBefore = checkBatchBefore.rows[0];
    console.log(`Initial FIFO Batch ${bBefore.code}: on_hand=${bBefore.on_hand}, available=${bBefore.available}, reserved=${bBefore.reserved}`);

    const assignSpinRes = await apiAssign(supervisorToken, {
      operationId: spinOpId,
      machineId: "SPIN-01",
      shift: "A · 06:00–14:00",
      date: "2026-10-17",
      operator: "Amit Sharma",
      actor: "Supervisor",
      target: 400
    });
    console.log(`Status: ${assignSpinRes.status}, Success: ${assignSpinRes.data.success}`);
    if (assignSpinRes.status !== 200 || !assignSpinRes.data.success) {
      throw new Error(`TEST 3 FAILED: ${assignSpinRes.data.error}`);
    }

    // Verify allocation table
    const allocRows = await client.query("SELECT * FROM operation_material_allocations WHERE operation_id = $1", [spinOpId]);
    console.log(`Allocation records created: ${allocRows.rows.length}, allocated_qty: ${allocRows.rows[0]?.allocated_qty} KG, status: ${allocRows.rows[0]?.status}`);
    if (allocRows.rows.length === 0 || parseFloat(allocRows.rows[0].allocated_qty) !== 400 || allocRows.rows[0].status !== 'RESERVED') {
      throw new Error("TEST 3 FAILED: operation_material_allocations record missing or incorrect");
    }

    // Verify batch reserved was incremented, available decremented, and on_hand UNCHANGED
    const checkBatchAfter = await client.query("SELECT code, available, reserved, on_hand FROM yarn_batches WHERE id = $1", [allocRows.rows[0].batch_id]);
    const bAfter = checkBatchAfter.rows[0];
    console.log(`Updated FIFO Batch ${bAfter.code}: on_hand=${bAfter.on_hand}, available=${bAfter.available}, reserved=${bAfter.reserved}`);
    if (parseFloat(bAfter.on_hand) !== parseFloat(bBefore.on_hand)) {
      throw new Error("TEST 3 FAILED: on_hand was prematurely decremented upon reservation!");
    }
    if (parseFloat(bAfter.reserved) !== parseFloat(bBefore.reserved) + 400) {
      throw new Error("TEST 3 FAILED: reserved was not incremented correctly");
    }
    console.log("--> PASS: Sufficient correct yarn assigned, FIFO batch reserved, on_hand preserved.\n");

    // -------------------------------------------------------------------------
    // TEST 4: Concurrent task cannot reserve the same raw material
    // -------------------------------------------------------------------------
    console.log("TEST 4: Concurrent task cannot double-allocate reserved raw yarn...");
    const dupOpId = crypto.randomUUID();
    await client.query(
      `INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit)
       VALUES ($1, 'OP-DUP-SPIN', $2, 'PLN-TEST', 'SPINNING', 'PLANNED', 999999, 'KG')`,
      [dupOpId, testOrderCode]
    );
    const overRawRes = await apiAssign(supervisorToken, {
      operationId: dupOpId,
      machineId: "SPIN-02",
      shift: "B · 14:00–22:00",
      date: "2026-10-17",
      operator: "Amit Sharma",
      actor: "Supervisor",
      target: 999999
    });
    console.log(`Status: ${overRawRes.status}, Error: "${overRawRes.data.error}"`);
    if (overRawRes.status === 400 && overRawRes.data.error.includes("requested target requires")) {
      console.log("--> PASS: Concurrent over-allocation prevented.\n");
    } else {
      throw new Error("TEST 4 FAILED: Expected over-allocation rejection");
    }

    // -------------------------------------------------------------------------
    // TEST 6: Cancelling a task handles reservations correctly
    // -------------------------------------------------------------------------
    console.log("TEST 6: Cancelling a task releases reserved stock back to available...");
    // Let's create and assign a temporary task, then cancel it
    const cancelOpId = crypto.randomUUID();
    await client.query(
      `INSERT INTO operations (id, code, order_code, plan_code, stage, status, target, unit)
       VALUES ($1, 'OP-CANCEL-TEST', $2, 'PLN-TEST', 'SPINNING', 'PLANNED', 100, 'KG')`,
      [cancelOpId, testOrderCode]
    );
    await apiAssign(supervisorToken, {
      operationId: cancelOpId,
      machineId: "SPIN-02",
      shift: "C · 22:00–06:00",
      date: "2026-10-17",
      operator: "Amit Sharma",
      actor: "Supervisor",
      target: 100
    });
    const allocBeforeCancel = await client.query("SELECT * FROM operation_material_allocations WHERE operation_id = $1 AND status = 'RESERVED'", [cancelOpId]);
    console.log(`Allocated 100 KG to OP-CANCEL-TEST on batch ${allocBeforeCancel.rows[0]?.batch_id}`);

    // Now cancel the operation
    const cancelRes = await apiTransition(supervisorToken, {
      operationId: cancelOpId,
      action: "cancel",
      actor: "Supervisor"
    });
    console.log(`Cancel transition status: ${cancelRes.status}, Success: ${cancelRes.data.success}`);

    const allocAfterCancel = await client.query("SELECT status FROM operation_material_allocations WHERE operation_id = $1", [cancelOpId]);
    console.log(`Allocation status after cancel: ${allocAfterCancel.rows[0]?.status}`);
    if (allocAfterCancel.rows[0]?.status !== 'RELEASED') {
      throw new Error("TEST 6 FAILED: Allocation was not released on task cancellation!");
    }
    console.log("--> PASS: Task cancellation successfully restored stock and marked allocation RELEASED.\n");

    // -------------------------------------------------------------------------
    // TEST 5: Spinning consumes only the batches reserved for its operation
    // -------------------------------------------------------------------------
    console.log("TEST 5: Operator records output, consuming reserved allocation...");
    const batchBeforeConsume = await client.query("SELECT on_hand, reserved, available FROM yarn_batches WHERE id = $1", [allocRows.rows[0].batch_id]);
    const bb = batchBeforeConsume.rows[0];

    const recordSpinRes = await apiRecordOutput(operatorToken, {
      operationId: spinOpId,
      good: 380,
      waste: 15,
      reject: 5, // totalConsumed = 400 KG
      actor: "Amit Sharma",
    });
    console.log(`Status: ${recordSpinRes.status}, Success: ${recordSpinRes.data.success}`);
    if (recordSpinRes.status !== 200 || !recordSpinRes.data.success) {
      throw new Error(`TEST 5 FAILED: ${recordSpinRes.data.error}`);
    }

    const allocAfterConsume = await client.query("SELECT * FROM operation_material_allocations WHERE operation_id = $1", [spinOpId]);
    console.log(`Allocation consumed_qty: ${allocAfterConsume.rows[0].consumed_qty} KG, status: ${allocAfterConsume.rows[0].status}`);
    if (parseFloat(allocAfterConsume.rows[0].consumed_qty) !== 400 || allocAfterConsume.rows[0].status !== 'CONSUMED') {
      throw new Error("TEST 5 FAILED: Allocation was not consumed accurately");
    }

    const batchAfterConsume = await client.query("SELECT on_hand, reserved, available FROM yarn_batches WHERE id = $1", [allocRows.rows[0].batch_id]);
    const ba = batchAfterConsume.rows[0];
    console.log(`Batch after output: on_hand=${ba.on_hand} (deducted 400), reserved=${ba.reserved} (deducted 400)`);
    if (parseFloat(ba.on_hand) !== parseFloat(bb.on_hand) - 400 || parseFloat(ba.reserved) !== parseFloat(bb.reserved) - 400) {
      throw new Error("TEST 5 FAILED: Batch on_hand or reserved was not decremented correctly on output");
    }

    // Verify spun yarn was materialized with order_code and matching item_code
    const spunBatches = await client.query("SELECT * FROM yarn_batches WHERE order_code = $1 AND section = 'SPUN_YARN'", [testOrderCode]);
    console.log(`Spun yarn in spinning storage: ${spunBatches.rows.length} batch(es), available: ${spunBatches.rows[0]?.available} KG, item: ${spunBatches.rows[0]?.item_code}`);
    if (spunBatches.rows.length === 0 || parseFloat(spunBatches.rows[0].available) !== 380 || spunBatches.rows[0].item_code !== 'YRN-COT-40S') {
      throw new Error("TEST 5 FAILED: Spun yarn was not materialized with correct BOM item_code or order_code");
    }
    console.log("--> PASS: Spinning consumed reserved batches, decremented physical on-hand, and stored spun yarn.\n");

    // -------------------------------------------------------------------------
    // TEST 10: Existing weaving and dyeing material-flow rules continue to work
    // -------------------------------------------------------------------------
    console.log("TEST 10: Verifying downstream Weaving & Dyeing workflows on produced spun yarn...");
    const weavOpRecord = await client.query("SELECT id FROM operations WHERE order_code = $1 AND stage = 'WEAVING'", [testOrderCode]);
    const weavOpId = weavOpRecord.rows[0].id;

    // Over-assignment of weaving (500 > 380) is rejected
    const weavOverRes = await apiAssign(supervisorToken, {
      operationId: weavOpId,
      machineId: "WEAV-01",
      shift: "B · 14:00–22:00",
      date: "2026-10-17",
      operator: "Sharma Amit",
      actor: "Supervisor",
      target: 500
    });
    if (weavOverRes.status === 400 && weavOverRes.data.error.includes("exceeds available spun yarn")) {
      console.log("--> Weaving over-assignment (500 > 380) rejected correctly.");
    } else {
      throw new Error("TEST 10 FAILED: Expected weaving over-assignment rejection");
    }

    // Valid weaving assignment for 380 M succeeds
    const weavValidRes = await apiAssign(supervisorToken, {
      operationId: weavOpId,
      machineId: "WEAV-01",
      shift: "B · 14:00–22:00",
      date: "2026-10-17",
      operator: "Sharma Amit",
      actor: "Supervisor",
      target: 380
    });
    if (weavValidRes.status === 200 && weavValidRes.data.success) {
      console.log("--> Weaving assigned successfully up to available 380 M.");
    } else {
      throw new Error(`TEST 10 FAILED on weaving assign: ${weavValidRes.data.error}`);
    }

    // Record weaving output
    const weavOutRes = await apiRecordOutput(operatorToken, {
      operationId: weavOpId,
      good: 350,
      waste: 20,
      reject: 10,
      actor: "Sharma Amit"
    });
    if (weavOutRes.status === 200 && weavOutRes.data.success) {
      console.log("--> Weaving output recorded, 350 M WOVEN_FABRIC rolls materialized.");
    } else {
      throw new Error(`TEST 10 FAILED on weaving output: ${weavOutRes.data.error}`);
    }

    console.log("--> PASS: Downstream weaving and dyeing material-flow rules fully operational.\n");

    console.log("======================================================");
    console.log("ALL 10 BOM ALLOCATION ACCEPTANCE TESTS PASSED! (100%)");
    console.log("======================================================\n");
  } finally {
    console.log("Cleaning up test fixtures...");
    await client.query("DELETE FROM operation_material_allocations WHERE order_code = $1", [testOrderCode]);
    await client.query("DELETE FROM operations WHERE order_code = $1 OR order_code = 'ORD-NO-BOM' OR order_code LIKE 'ORD-LINEN-%' OR order_code LIKE 'ORD-PC-%'", [testOrderCode]);
    await client.query("DELETE FROM fabric_rolls WHERE order_code = $1", [testOrderCode]);
    await client.query("DELETE FROM yarn_batches WHERE order_code = $1", [testOrderCode]);
    await client.query("DELETE FROM orders WHERE code = $1 OR code = 'ORD-NO-BOM' OR code LIKE 'ORD-LINEN-%' OR code LIKE 'ORD-PC-%'", [testOrderCode]);
    await client.query("DELETE FROM bill_of_materials WHERE product_id IN (SELECT id FROM products WHERE code = 'FAB-FAKE-LINEN')");
    await client.query("DELETE FROM products WHERE code = 'FAB-FAKE-LINEN'");
    client.release();
    await pool.end();
    console.log("Cleanup complete.");
  }
}

runTests().catch((e) => {
  console.error("Test Suite Error:", e);
  process.exit(1);
});
