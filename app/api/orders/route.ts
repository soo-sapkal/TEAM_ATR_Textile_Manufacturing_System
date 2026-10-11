import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pool } from "@/lib/db/pool";
import { verifyToken } from "@/lib/auth/auth";
import { snakeToCamel } from "@/lib/supabase/adapter";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  
  const payload = await verifyToken(token) as any;
  let permissions = payload?.permissions || [];
  if (permissions.length === 0 && payload?.role) {
    const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
    permissions = ROLE_PERMISSIONS[payload.role]?.perms || [];
  }

  if (!payload || !permissions.includes("orders.read")) {
    return NextResponse.json({ success: false, error: "Forbidden: Requires orders.read permission" }, { status: 403 });
  }

  try {
    const [ordersRes, productsRes, bomsRes] = await Promise.all([
      pool.query("SELECT * FROM orders ORDER BY created_at DESC"),
      pool.query("SELECT * FROM products"),
      pool.query(`
        SELECT b.*, y.code as yarn_code, y.description as yarn_name, y.available as yarn_available, y.unit as yarn_unit
        FROM bill_of_materials b
        JOIN yarn_items y ON b.yarn_item_id = y.id
      `)
    ]);

    const products = productsRes.rows;
    const boms = bomsRes.rows;

    const ordersWithReadiness = ordersRes.rows.map((order) => {
      const prod = products.find(p => p.id === order.product_id || p.name === order.product || p.code === order.product);
      const prodBoms = prod ? boms.filter(b => b.product_id === prod.id) : [];

      let hasShortage = false;
      const details = prodBoms.map(b => {
        const requiredQty = parseFloat(b.quantity_required) * parseFloat(order.ordered);
        const availableQty = parseFloat(b.yarn_available || 0);
        const deficitQty = Math.max(0, requiredQty - availableQty);
        const isShort = requiredQty > availableQty;
        if (isShort) hasShortage = true;

        return {
          yarnCode: b.yarn_code,
          yarnName: b.yarn_name,
          unit: b.yarn_unit || "KG",
          requiredQty,
          availableQty,
          deficitQty,
          isShort
        };
      });

      let deficitSummary = "Sufficient Yarn (Ready to start)";
      if (hasShortage) {
        const shortItems = details.filter(d => d.isShort);
        deficitSummary = `Shortage: Need +${shortItems.map(d => `${d.deficitQty.toFixed(1)} ${d.unit} ${d.yarnCode}`).join(", ")}`;
      } else if (prodBoms.length === 0) {
        deficitSummary = "Standard stock (No BOM defined)";
      }

      return {
        ...order,
        product_id: prod?.id || order.product_id || null,
        material_shortage: hasShortage,
        at_risk: hasShortage || order.at_risk,
        material_readiness: {
          canStart: !hasShortage,
          hasShortage,
          deficitSummary,
          details
        }
      };
    });

    return NextResponse.json({ success: true, data: snakeToCamel(ordersWithReadiness) });
  } catch (error: any) {
    console.error("Orders GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch orders data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    
    const payload = await verifyToken(token) as any;
    let permissions = payload?.permissions || [];
    if (permissions.length === 0 && payload?.role) {
      const { ROLE_PERMISSIONS } = await import("@/lib/auth/permissions");
      permissions = ROLE_PERMISSIONS[payload.role]?.perms || [];
    }

    if (!payload || !permissions.includes("orders.create")) {
      return NextResponse.json({ success: false, error: "Forbidden: Requires orders.create permission" }, { status: 403 });
    }

    const body = await req.json();
    const code = body.code || `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // If the user is a BUYER, force their own identity. Otherwise, allow supervisor/owner to set it.
    let buyerName = body.buyer || "Unknown Buyer";
    let buyerId = (buyerName).toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (payload.role === "BUYER") {
      buyerName = payload.name;
      buyerId = payload.buyerId || payload.id;
    }

    const orderQty = parseFloat(body.quantity || 0);
    const revenue = orderQty * 250;

    // Resolve product_id reliably
    let resolvedProductId = body.productId || body.product_id || null;
    if (!resolvedProductId && body.product) {
      const prodLookup = await pool.query("SELECT id, name FROM products WHERE name = $1 OR code = $1", [body.product]);
      if (prodLookup.rows.length === 1) {
        resolvedProductId = prodLookup.rows[0].id;
      }
    }

    // Check BOM feasibility against current yarn stock
    let bomsRes: any;
    if (resolvedProductId) {
      bomsRes = await pool.query(`
        SELECT b.*, y.code as yarn_code, y.description as yarn_name, y.available as yarn_available, y.unit as yarn_unit
        FROM bill_of_materials b
        JOIN yarn_items y ON b.yarn_item_id = y.id
        WHERE b.product_id = $1
      `, [resolvedProductId]);
    } else {
      bomsRes = await pool.query(`
        SELECT b.*, y.code as yarn_code, y.description as yarn_name, y.available as yarn_available, y.unit as yarn_unit
        FROM bill_of_materials b
        JOIN yarn_items y ON b.yarn_item_id = y.id
        JOIN products p ON b.product_id = p.id
        WHERE p.name = $1 OR p.code = $1
      `, [body.product]);
    }

    let hasShortage = false;
    const details = bomsRes.rows.map((b: any) => {
      const requiredQty = parseFloat(b.quantity_required) * orderQty;
      const availableQty = parseFloat(b.yarn_available || 0);
      const isShort = requiredQty > availableQty;
      if (isShort) hasShortage = true;
      return {
        yarnCode: b.yarn_code,
        yarnName: b.yarn_name,
        unit: b.yarn_unit || "KG",
        requiredQty,
        availableQty,
        deficitQty: Math.max(0, requiredQty - availableQty),
        isShort
      };
    });

    const isAtRisk = hasShortage || body.priority === "URGENT";
    
    const { rows } = await pool.query(`
      INSERT INTO orders (
        code, buyer, buyer_id, product, product_id, colour, due, priority, unit, 
        ordered, remaining, status, display_status, currency, revenue,
        material_shortage, at_risk
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      code, buyerName, buyerId, body.product, resolvedProductId, body.colour, body.due, body.priority || "NORMAL", body.unit || "M",
      orderQty, orderQty, "DRAFT", "DRAFT", "INR", revenue,
      hasShortage, isAtRisk
    ]);

    const createdOrder = {
      ...rows[0],
      material_shortage: hasShortage,
      at_risk: isAtRisk,
      material_readiness: {
        canStart: !hasShortage,
        hasShortage,
        deficitSummary: hasShortage 
          ? `Shortage: Need +${details.filter((d: any) => d.isShort).map((d: any) => `${d.deficitQty.toFixed(1)} ${d.unit} ${d.yarnCode}`).join(", ")}`
          : "Sufficient Yarn (Ready to start)",
        details
      }
    };

    return NextResponse.json({ success: true, data: snakeToCamel(createdOrder) });
  } catch (error: any) {
    console.error("Orders POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
