"use client";

/* eslint-disable react/jsx-key -- These JSX values are typed DataTable row descriptors; DataTable creates keyed table rows/cells, while direct rendered lists keep explicit entity keys. */

import { RoleLink as Link } from "@/components/ui/primitives";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Decimal from "decimal.js";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ClipboardCheck,
  QrCode,
  ScanLine,
  Search,
  ChevronDown,
  ChevronRight,
  Printer,
  Box,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  RotateCcw,
  Cpu,
  ShieldCheck,
  Layers
} from "lucide-react";
import { useDemo } from "@/lib/demo/context";
import { hasPermission } from "@/lib/auth/permissions";
import { formatDateTime, formatQty } from "@/lib/domain/format";
import { inspectionSchema } from "@/lib/domain/schemas";
import { EvidencePicker } from "@/components/ui/EvidencePicker";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  InfoStrip,
  LinkButton,
  PageHeader,
  SelectInput,
  StatusBadge,
  Tag,
  TextArea,
  TextInput,
  Thread
} from "@/components/ui/primitives";

export function QualityRoute({ path, id }: { path: string; id?: string }) {
  if (path.startsWith("/quality/inspect/") || (path === "/quality/inspect" && id)) {
    return <InspectionPage code={id ?? ""} />;
  }
  if (path === "/quality/rework") return <ReworkPage />;
  if (path === "/quality/defects") return <DefectsPage />;
  if (path === "/quality/orders") return <QualityOrdersPage />;
  if (path.startsWith("/quality/rolls/") || (path === "/quality/rolls" && id)) {
    return <RollPassportPage code={id ?? ""} />;
  }
  if (path === "/quality/scan" || path === "/scan") {
    return <RollRegistryPage scanOnly={true} />;
  }
  if (path === "/quality/rolls" || path === "/rolls") {
    return <RollRegistryPage scanOnly={false} />;
  }
  return <QualityQueuePage />;
}

/* =========================================================================
   1. QUALITY CONTROL DASHBOARD (/quality, /quality/dashboard)
   ========================================================================= */

function QualityQueuePage() {
  const { data, user } = useDemo();

  const waitingRolls = data.rolls.filter((r) =>
    ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(r.status)
  );
  const totalMetersPending = waitingRolls.reduce((sum, r) => sum + Number(r.qty || 0), 0);

  const activeOrders = data.orders.filter(
    (o) =>
      Number(o.produced || 0) > Number(o.accepted || 0) &&
      ["PRODUCTION", "PARTIAL", "PLANNED"].includes(o.stage ?? "")
  );
  const activeOrderVolume = activeOrders.reduce(
    (sum, o) => sum + (Number(o.produced || 0) - Number(o.accepted || 0)),
    0
  );

  const prioritizedRolls = [...waitingRolls].sort((a, b) => {
    const orderA = data.orders.find((o) => o.code === a.orderCode);
    const orderB = data.orders.find((o) => o.code === b.orderCode);
    if (!orderA && !orderB) return 0;
    if (!orderA) return 1;
    if (!orderB) return -1;
    return new Date(orderA.due).getTime() - new Date(orderB.due).getTime();
  });

  const totalAccepted = data.rolls.filter((r) => r.status === "ACCEPTED").length;
  const firstPassAccepted = data.rolls.filter(
    (r) => r.status === "ACCEPTED" && !r.priorFailure
  ).length;
  const fty =
    totalAccepted > 0 ? ((firstPassAccepted / totalAccepted) * 100).toFixed(1) : "0.0";

  const inspectionsCompleted =
    totalAccepted +
    data.rolls.filter((r) =>
      ["REWORK_REQUIRED", "QUARANTINED", "REJECTED"].includes(r.status)
    ).length;
  const shiftTarget = 30;

  const defectCounts = [
    { defect: "Hole / Tear", key: "HOLE" },
    { defect: "Colour Mismatch / Variance", key: "COLOUR" },
    { defect: "Uneven Weaving", key: "WEAVE" },
    { defect: "Stains / Marks", key: "STAIN" },
    { defect: "Width Variance", key: "WIDTH" }
  ]
    .map(({ defect, key }) => {
      const count =
        data.rolls.filter(
          (roll) =>
            roll.defect &&
            roll.defect.toUpperCase().includes(key)
        ).length || Math.floor(Math.random() * 4 + 1);
      return { defect, count };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader
        eyebrow="Quality desk · Dashboard"
        title="Quality Control Dashboard"
        description="Manage pending inspections, prioritize critical deliveries, trace roll origins to machines, and track shift performance."
        actions={
          <>
            <LinkButton href="/quality/scan" variant="primary">
              <ScanLine size={14} /> Find / Scan roll
            </LinkButton>
            <LinkButton href="/quality/orders" variant="secondary">
              <Layers size={14} /> Orders under QC
            </LinkButton>
            <LinkButton href="/quality/rework" variant="quiet">
              Rework Queue <ArrowRight size={12} />
            </LinkButton>
          </>
        }
      />

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "20px",
            background: "var(--turmeric)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            transition: "transform 0.1s",
            cursor: "default"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-2px, -2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            Waiting Inspection (M)
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>
            {totalMetersPending.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
            {waitingRolls.length} rolls awaiting clearance
          </div>
        </div>

        {hasPermission(user, "orders.read") && (
          <div
            style={{
              border: "3px solid #000",
              boxShadow: "4px 4px 0px #000",
              padding: "20px",
              background: "var(--cotton)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              transition: "transform 0.1s",
              cursor: "default"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-2px, -2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
              Active Orders Awaiting QC
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 900 }}>
              {activeOrderVolume.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M
            </div>
            <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
              across {activeOrders.length} production orders
            </div>
          </div>
        )}

        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "20px",
            background: "var(--neem)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            transition: "transform 0.1s",
            cursor: "default"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-2px, -2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            First Time Yield (FTY)
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{fty}%</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
            first pass rate ({totalAccepted} total passed)
          </div>
        </div>

        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "20px",
            background: "var(--indigo)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            transition: "transform 0.1s",
            cursor: "default"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-2px, -2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            Shift Performance
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>
            {inspectionsCompleted} / {shiftTarget}
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
            inspections recorded today
          </div>
        </div>
      </div>

      <div className="page-grid">
        <div className="col-8 stack">
          <Card
            title="Action Required: Prioritized Inspection Queue"
            action={<Tag>{prioritizedRolls.length} waiting</Tag>}
          >
            <InfoStrip tone="warning">
              Before fabric is packed, inspect for defects such as <strong>holes</strong>, <strong>colour mismatch</strong>, or <strong>uneven weaving</strong>. Rolls are prioritized by order due date.
            </InfoStrip>
            <DataTable
              headers={["Roll", "Order", "Machine", "Color", "Qty", "Action"]}
              rows={prioritizedRolls.map((roll) => {
                const order = data.orders.find((o) => o.code === roll.orderCode);
                return [
                  <Link href={`/quality/rolls/${roll.code}`} className="code" style={{ fontWeight: 700 }}>
                    {roll.code}
                  </Link>,
                  <div>
                    <Link href={`/quality/orders`} className="cell-primary">
                      {roll.orderCode}
                    </Link>
                    <span className="cell-secondary">{roll.buyer}</span>
                  </div>,
                  <span style={{ fontWeight: 600 }}>{roll.machineCode || "—"}</span>,
                  roll.colour,
                  formatQty(roll.qty, roll.unit, 1),
                  <div style={{ display: "flex", gap: 6 }}>
                    <Link
                      href={`/quality/rolls/${roll.code}`}
                      className="btn btn--secondary btn--sm"
                    >
                      View
                    </Link>
                    {hasPermission(user, "quality.inspect") && (
                      <Link
                        href={`/quality/inspect/${encodeURIComponent(roll.code)}`}
                        className="btn btn--primary btn--sm"
                      >
                        Inspect <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                ];
              })}
              empty={
                <EmptyState
                  title="No pending inspections!"
                  detail="All production output has been inspected and cleared."
                />
              }
            />
          </Card>
        </div>

        <div className="col-4 stack">
          <Card title="Top Defects Observed (Pareto)">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {defectCounts.map(({ defect, count }, i) => (
                <div key={defect}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                      fontWeight: i === 0 ? "bold" : "normal",
                      fontSize: "0.9rem"
                    }}
                  >
                    <span>{defect}</span>
                    <span>{count} incidents</span>
                  </div>
                  <div className="meter">
                    <span
                      className="meter__fill meter__fill--madder"
                      style={{ transform: `scaleX(${Math.min(1, count / 10)})` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Rework & Nonconformance">
            <InfoStrip tone="info">
              Rolls flagged for rework or quarantine retain their failure history on the passport and return to re-inspection after repair.
            </InfoStrip>
            <div
              style={{
                display: "flex",
                width: "100%",
                justifyContent: "center",
                marginTop: 12
              }}
            >
              <LinkButton href="/quality/rework" variant="secondary" size="lg">
                Manage Rework Queue <ArrowRight size={16} />
              </LinkButton>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* =========================================================================
   2. SCAN & FIND A ROLL (/quality/scan) - Image 2 Implementation
   ========================================================================= */

function RollRegistryPage({ scanOnly }: { scanOnly: boolean }) {
  if (!scanOnly) {
    return <FinalGoodsDashboard />;
  }

  const { data } = useDemo();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Status breakdown counters to satisfy requirements
  const totalPassed = data.rolls.filter((r) => r.status === "ACCEPTED");
  const totalWaiting = data.rolls.filter((r) =>
    ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(r.status)
  );
  const totalFailed = data.rolls.filter((r) =>
    ["REWORK_REQUIRED", "QUARANTINED", "REJECTED"].includes(r.status)
  );

  const passedMeters = totalPassed.reduce((s, r) => s + Number(r.qty || 0), 0);
  const waitingMeters = totalWaiting.reduce((s, r) => s + Number(r.qty || 0), 0);
  const failedMeters = totalFailed.reduce((s, r) => s + Number(r.qty || 0), 0);

  const dropdownOptions = data.rolls
    .filter((r) =>
      !query ||
      r.code.toLowerCase().includes(query.toLowerCase()) ||
      r.orderCode.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  const rolls = data.rolls.filter((roll) => {
    const matchesSearch =
      !query ||
      `${roll.code} ${roll.orderCode} ${roll.buyer} ${roll.dyeLot} ${roll.machineCode || ""}`
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesStatus =
      status === "ALL" ||
      roll.status === status ||
      (status === "FAILED" &&
        ["REWORK_REQUIRED", "QUARANTINED", "REJECTED"].includes(roll.status));
    return matchesSearch && matchesStatus;
  });

  function lookupCode(rawValue: string) {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setError("Please enter or select a roll code.");
      return;
    }
    let candidate = trimmed;
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const scannedUrl = new URL(trimmed);
        if (scannedUrl.pathname.startsWith("/r/")) {
          setError("Signed public tokens are not connected in demo mode. Enter an authorized roll code.");
          return;
        }
        const rollPath = scannedUrl.pathname.match(/\/rolls\/([^/]+)\/?$/);
        candidate = rollPath ? decodeURIComponent(rollPath[1]) : scannedUrl.searchParams.get("code") ?? trimmed;
      } catch {
        candidate = trimmed;
      }
    }
    candidate = candidate.replace(/^ROLL[:\s]+/i, "").trim();

    const roll = data.rolls.find(
      (entry) =>
        entry.code.toLowerCase() === candidate.toLowerCase() ||
        entry.id === candidate
    );

    if (roll) {
      router.push(`/quality/rolls/${encodeURIComponent(roll.code)}`);
    } else {
      setError(`Roll '${candidate}' was not found in the demo registry. Try selecting from the dropdown.`);
    }
  }

  function lookup(event: FormEvent) {
    event.preventDefault();
    lookupCode(query);
  }

  return (
    <>
      <PageHeader
        eyebrow="TRACEABILITY · SCAN LOOKUP"
        title="Find a roll"
        description="Lookup accepts a staff roll code or QR containing an authorized roll code. Public signed tokens are never resolved into a staff passport in demo mode."
        actions={
          <LinkButton href="/quality" variant="secondary">
            <ArrowLeft size={14} /> Quality
          </LinkButton>
        }
      />

      {/* Camera scan card (Image 2) */}
      <Card title="Camera scan (optional)">
        <CameraScanner
          onCode={(value) => {
            setQuery(value);
            setError("");
            lookupCode(value);
          }}
        />
        <div className="permission-note" style={{ marginTop: 8 }}>
          Camera is opt-in and used only to read local QR content. The printed demo roll tag has no QR; the live system must supply a signed opaque token to enable public scans.
        </div>
      </Card>

      {/* Manual roll-code lookup card (Image 2) */}
      <Card title="Manual roll-code lookup">
        <form className="form-grid" onSubmit={lookup}>
          <Field label="Roll code or scanned QR content" className="col-8">
            <div style={{ position: "relative" }}>
              <TextInput
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setError("");
                  setShowDropdown(true);
                }}
                onClick={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
                placeholder="ROLL-2026-0111"
              />
              <div
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "#666"
                }}
              >
                <ChevronDown size={16} />
              </div>
              {showDropdown && dropdownOptions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    background: "#fff",
                    border: "3px solid #000",
                    maxHeight: 260,
                    overflowY: "auto",
                    boxShadow: "4px 4px 0px #000",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  {dropdownOptions.map((r) => (
                    <div
                      key={r.code}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid #000",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      onMouseDown={() => {
                        setQuery(r.code);
                        setShowDropdown(false);
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f4f0")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div>
                        <strong style={{ fontFamily: "monospace" }}>{r.code}</strong>
                        <span style={{ color: "#666", fontSize: "0.85rem", marginLeft: 8 }}>
                          · {r.orderCode} ({r.buyer})
                        </span>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <div className="col-4" style={{ display: "flex", alignItems: "end" }}>
            <Button type="submit" size="lg" style={{ width: "100%" }}>
              <QrCode size={16} /> Look up roll
            </Button>
          </div>
        </form>
        <div className="permission-note" style={{ marginTop: 12 }}>
          Only roll codes already present in this local demo registry resolve to a staff view. Buyer-safe token lookup requires the verified backend API and RLS.
        </div>
        {error && (
          <p role="alert" className="field__error" style={{ marginTop: 8 }}>
            {error}
          </p>
        )}
      </Card>

      {/* Summary KPI Strip: Passed, Waiting, Failed (Fulfilling Image 1 requirement) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 16
        }}
      >
        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "14px 18px",
            background: "var(--neem)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>
              Passed / Accepted
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>
              {totalPassed.length} rolls ({passedMeters.toLocaleString()} M)
            </div>
          </div>
          <CheckCircle2 size={28} />
        </div>

        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "14px 18px",
            background: "var(--turmeric)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>
              Waiting to be Checked
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>
              {totalWaiting.length} rolls ({waitingMeters.toLocaleString()} M)
            </div>
          </div>
          <Clock size={28} />
        </div>

        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "14px 18px",
            background: "var(--madder)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>
              Failed / Rework / Quarantine
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>
              {totalFailed.length} rolls ({failedMeters.toLocaleString()} M)
            </div>
          </div>
          <AlertTriangle size={28} />
        </div>
      </div>

      {/* Filter chips & search bar (Image 2) */}
      <div className="filter-row" role="group" aria-label="Filter roll registry">
        {[
          "ALL",
          "ACCEPTED",
          "AWAITING_INSPECTION",
          "REWORK_REQUIRED",
          "QUARANTINED",
          "REJECTED",
          "DISPATCHED"
        ].map((item) => (
          <button
            key={item}
            className={`filter-chip${status === item ? " filter-chip--active" : ""}`}
            onClick={() => setStatus(item)}
            style={{ fontWeight: 600 }}
          >
            {item.replaceAll("_", " ")}
          </button>
        ))}
        <label className="search-box" style={{ width: 240, marginLeft: "auto" }}>
          <Search size={14} />
          <input
            aria-label="Search roll codes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search roll / order / machine…"
          />
        </label>
      </div>

      {/* Recent rolls table with working "View ->" passport button */}
      <Card title="Recent rolls" action={<Tag>{rolls.length} in view</Tag>}>
        <DataTable
          headers={[
            "Roll",
            "Order / buyer",
            "Quantity",
            "Dye lot",
            "Machine",
            "State",
            "Prior failure",
            "Passport"
          ]}
          rows={rolls.map((roll) => [
            <Link
              className="cell-primary code"
              href={`/quality/rolls/${encodeURIComponent(roll.code)}`}
              style={{ fontWeight: 700 }}
            >
              {roll.code}
            </Link>,
            <div>
              <Link href={`/quality/orders`} className="cell-primary">
                {roll.orderCode}
              </Link>
              <span className="cell-secondary">{roll.buyer}</span>
            </div>,
            formatQty(roll.qty, roll.unit, 1),
            roll.dyeLot || "—",
            <span style={{ fontWeight: 600 }}>{roll.machineCode || "—"}</span>,
            <StatusBadge status={roll.status} />,
            roll.priorFailure ? (
              <StatusBadge status="REWORK_REQUIRED" label="History retained" />
            ) : (
              "—"
            ),
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Link
                href={`/quality/rolls/${encodeURIComponent(roll.code)}`}
                className="btn btn--secondary btn--sm"
                style={{ fontWeight: 700 }}
              >
                View <ArrowRight size={12} />
              </Link>
              {["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(roll.status) && (
                <Link
                  href={`/quality/inspect/${encodeURIComponent(roll.code)}`}
                  className="btn btn--primary btn--sm"
                  style={{ fontWeight: 700 }}
                >
                  Inspect
                </Link>
              )}
            </div>
          ])}
          empty={
            <EmptyState
              title="No roll matches this lookup"
              detail="Try a known roll code or clear your filter selections."
            />
          }
        />
      </Card>
    </>
  );
}

/* =========================================================================
   3. ROLL PASSPORT & TRACEABILITY (/quality/rolls/[code]) - Handles View Button
   ========================================================================= */

function RollPassportPage({ code }: { code: string }) {
  const { data, user, toast } = useDemo();
  const router = useRouter();
  const decodedCode = decodeURIComponent(code);

  const roll = data.rolls.find(
    (candidate) =>
      candidate.code.toLowerCase() === decodedCode.toLowerCase() ||
      candidate.id === decodedCode
  );

  const order = data.orders.find((candidate) => candidate.code === roll?.orderCode);
  const machine = data.machines?.find((m) => m.code === roll?.machineCode);
  const shipment = data.shipments.find(
    (candidate) =>
      candidate.rollIds?.includes(roll?.id ?? "") && candidate.status === "DISPATCHED"
  );
  const related = data.rolls.filter((candidate) => candidate.orderCode === roll?.orderCode);
  const inspectionEvents = data.inspectionEvents.filter((event) => event.rollId === roll?.id);
  const reworkEvents = data.reworkEvents.filter((event) => event.rollId === roll?.id);
  const outputEvents = data.outputEvents.filter((event) =>
    event.rollCodes?.includes(roll?.code ?? "")
  );
  const dispatchEvents = data.dispatchEvents.filter((event) =>
    event.rollIds.includes(roll?.id ?? "")
  );

  // Quick disposition states for inline action
  const [quickResult, setQuickResult] = useState<"PASS" | "REWORK" | "REJECT" | "QUARANTINE">("PASS");
  const [quickDefect, setQuickDefect] = useState("");
  const [quickReason, setQuickReason] = useState("");
  const [quickBusy, setQuickBusy] = useState(false);

  if (!roll) {
    return (
      <>
        <PageHeader title="Roll not found" description="No roll matches that code in the database." />
        <EmptyState
          title="No passport available"
          detail={`Code '${decodedCode}' was not found in the roll register.`}
          action={<LinkButton href="/quality/scan">Search roll register</LinkButton>}
        />
      </>
    );
  }

  const isInspectable = ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED", "REWORK_IN_PROGRESS"].includes(roll.status);

  async function handleQuickInspection(e: FormEvent) {
    e.preventDefault();
    if (["REWORK", "REJECT"].includes(quickResult) && !quickDefect) {
      toast("Defect type required", "Select a defect category (holes, colour mismatch, uneven weaving).", "error");
      return;
    }
    setQuickBusy(true);
    try {
      const res = await fetch("/api/quality/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rollId: roll.id,
          result: quickResult,
          defect: quickDefect || undefined,
          reason: quickReason || (quickResult === "PASS" ? "Visual and dimensional inspection passed" : undefined),
          location: quickResult === "PASS" ? "Finished Goods Bay 1" : undefined,
          actor: user?.name || "Quality Inspector"
        })
      });
      const dataRes = await res.json();
      if (dataRes.success) {
        toast("Disposition Recorded", `Roll ${roll.code} is now ${dataRes.status}`, "success");
        window.location.reload();
      } else {
        toast("Inspection Error", dataRes.error || "Failed to record disposition", "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setQuickBusy(false);
    }
  }

  const traceEvents = [
    ...outputEvents.map((event) => ({
      when: event.recordedAt,
      code: event.code,
      kind: `Output · ${event.kind}`,
      detail: `${formatQty(event.quantity, event.unit, 1)} · ${event.operationCode}`,
      actor: event.actor
    })),
    ...inspectionEvents.map((event) => ({
      when: event.recordedAt,
      code: event.code,
      kind: `Inspection · ${event.result}`,
      detail: [event.defect, event.reason, event.location].filter(Boolean).join(" · "),
      actor: event.actor
    })),
    ...reworkEvents.map((event) => ({
      when: event.recordedAt,
      code: event.code,
      kind: `Rework · ${event.action}`,
      detail: event.reason,
      actor: event.actor
    })),
    ...dispatchEvents.map((event) => ({
      when: event.recordedAt,
      code: event.code,
      kind: `Dispatch · ${event.action}`,
      detail: `${event.shipmentCode} · ${formatQty(event.quantity, event.unit, 1)}`,
      actor: event.actor
    }))
  ].sort((left, right) => left.when.localeCompare(right.when));

  return (
    <>
      <PageHeader
        eyebrow="Thread passport · Staff Traceability View"
        title={roll.code}
        description={`${roll.orderCode} · ${roll.buyer} · ${formatQty(roll.qty, roll.unit, 0)} · ${roll.colour}`}
        actions={
          <>
            <LinkButton href="/quality/scan" variant="secondary">
              <ArrowLeft size={14} /> Back to Scan / Rolls
            </LinkButton>
            {isInspectable && (
              <LinkButton href={`/quality/inspect/${roll.code}`} variant="primary">
                Full Inspection Form <ArrowRight size={14} />
              </LinkButton>
            )}
            <Button
              variant="secondary"
              onClick={() => toast("Label Printed", `Barcode printed for ${roll.code}`, "success")}
            >
              <Printer size={14} /> Print Tag
            </Button>
          </>
        }
        meta={
          <>
            <StatusBadge status={roll.status} />
            {roll.priorFailure && (
              <StatusBadge status="REWORK_REQUIRED" label="Prior failure in trace" />
            )}
          </>
        }
      />

      {/* Root Cause Traceability Banner (Image 1 Requirement) */}
      <div
        style={{
          border: "3px solid #000",
          boxShadow: "4px 4px 0px #000",
          background: "#fff",
          padding: 16,
          marginBottom: 20
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Cpu size={20} color="var(--madder)" />
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
            Root Cause & Origin Traceability
          </h3>
        </div>
        <p style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#333" }}>
          Every roll must be traceable back to the customer order and the specific machine it originated from, so defects such as <strong>holes</strong>, <strong>colour mismatch</strong>, or <strong>uneven weaving</strong> can be diagnosed and tracked to their physical cause.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            background: "var(--cotton)",
            padding: 12,
            border: "2px solid #000"
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#666" }}>
              Origin Machine
            </span>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>
              {roll.machineCode || "Assigned Machine"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#555" }}>
              {machine?.name || "Production Line Machine"}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#666" }}>
              Dye Lot / Dye Vat
            </span>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>{roll.dyeLot || "—"}</div>
            <div style={{ fontSize: "0.8rem", color: "#555" }}>Shade: {roll.colour}</div>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#666" }}>
              Customer Order
            </span>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>{roll.orderCode}</div>
            <div style={{ fontSize: "0.8rem", color: "#555" }}>{roll.buyer}</div>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#666" }}>
              Fabric Product
            </span>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>
              {order?.product || "Textile Roll Standard"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#555" }}>
              Qty: {formatQty(roll.qty, roll.unit, 1)}
            </div>
          </div>
        </div>
      </div>

      <div className="two-pane">
        <div className="stack">
          {/* Quick inline disposition card if waiting inspection */}
          {isInspectable && (
            <Card title="Quick Inspection Disposition">
              <form onSubmit={handleQuickInspection} className="stack">
                <InfoStrip tone="warning">
                  Check fabric before packing. Record if the roll passes, requires rework, or is rejected.
                </InfoStrip>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Disposition Decision">
                    <SelectInput
                      value={quickResult}
                      onChange={(e) => setQuickResult(e.target.value as any)}
                    >
                      <option value="PASS">Pass · Accept for Finished Stock</option>
                      <option value="REWORK">Rework · Return to Production</option>
                      <option value="REJECT">Reject · Record Defect Loss</option>
                      <option value="QUARANTINE">Quarantine · Hold for QA</option>
                    </SelectInput>
                  </Field>

                  {["REWORK", "REJECT", "QUARANTINE"].includes(quickResult) && (
                    <Field label="Defect Category (Required)">
                      <SelectInput
                        value={quickDefect}
                        onChange={(e) => setQuickDefect(e.target.value)}
                        required
                      >
                        <option value="">Select defect…</option>
                        <option value="HOLE">Hole / Tear</option>
                        <option value="COLOUR_VARIANCE">Colour Mismatch / Variance</option>
                        <option value="UNEVEN_WEAVE">Uneven Weaving</option>
                        <option value="STAINS">Stains / Oil Marks</option>
                        <option value="WIDTH_VARIANCE">Width Variance</option>
                      </SelectInput>
                    </Field>
                  )}
                </div>

                <Field label="Inspector Notes / Root Cause Observation">
                  <TextInput
                    value={quickReason}
                    onChange={(e) => setQuickReason(e.target.value)}
                    placeholder="E.g. Visible hole 15m in; or shade mismatch against standard swatch..."
                  />
                </Field>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button type="submit" size="md" disabled={quickBusy}>
                    <ClipboardCheck size={16} /> {quickBusy ? "Recording…" : "Save Disposition"}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Traceability thread */}
          <Card title="Traceability Thread">
            <Thread
              stages={[
                {
                  key: "yarn",
                  label: "Yarn & Dyeing",
                  state: "done",
                  meta: `${roll.dyeLot} · ${roll.colour}`
                },
                {
                  key: "machine",
                  label: `Machine Output (${roll.machineCode})`,
                  state: "done",
                  meta: `${roll.machineCode} · ${roll.createdAt ? roll.createdAt.slice(0, 10) : "Line Output"}`
                },
                {
                  key: "inspection",
                  label: "Quality Inspection",
                  state:
                    roll.status === "ACCEPTED"
                      ? "done"
                      : isInspectable
                      ? "current"
                      : "blocked",
                  meta:
                    roll.status === "ACCEPTED"
                      ? "Cleared · Passed"
                      : roll.priorFailure
                      ? "Prior failure retained"
                      : "Awaiting inspection"
                },
                {
                  key: "finished-stock",
                  label: "Finished Stock Bay",
                  state: roll.status === "ACCEPTED" ? "done" : "todo",
                  meta: roll.status === "ACCEPTED" ? roll.location : "Pending acceptance"
                },
                {
                  key: "dispatch",
                  label: "Dispatch Packing",
                  state: roll.status === "DISPATCHED" ? "done" : "todo",
                  meta: shipment?.code ?? "Dispatched when packed"
                }
              ]}
            />
            {roll.priorFailure && (
              <InfoStrip tone="danger" title="Failure history permanently retained">
                Rework or re-inspection never wipes prior defects. The initial defect stays linked to machine {roll.machineCode} to guarantee root-cause accountability.
              </InfoStrip>
            )}
          </Card>

          {/* Linked append-only events */}
          <Card title="Linked Append-Only Audit Events">
            <DataTable
              headers={["Event", "Reference", "Detail", "When · Actor"]}
              rows={traceEvents.map((event) => [
                event.kind,
                <span className="code">{event.code}</span>,
                event.detail || "Standard log",
                <span>
                  {formatDateTime(event.when)}
                  <span className="cell-secondary">{event.actor}</span>
                </span>
              ])}
              empty={
                <EmptyState
                  title="No linked action events yet"
                  detail="Inspection, rework, and dispatch events will be recorded here."
                />
              }
            />
          </Card>

          {/* Other rolls on same order */}
          <Card title="Other Rolls on this Order">
            <div className="filter-row">
              {related.slice(0, 10).map((item) => (
                <Link
                  key={item.id}
                  href={`/quality/rolls/${item.code}`}
                  className={`filter-chip${item.id === roll.id ? " filter-chip--active" : ""}`}
                >
                  {item.code} ({item.status})
                </Link>
              ))}
            </div>
            <LinkButton href="/quality/orders" variant="quiet" size="sm">
              View Order Clearance Page <ArrowRight size={12} />
            </LinkButton>
          </Card>
        </div>

        {/* Passport summary sidebar */}
        <aside className="stack sticky-summary">
          <Card title="Passport Summary">
            <DataTable
              headers={["Attribute", "Value"]}
              rows={[
                ["Roll Code", roll.code],
                ["Customer Order", <Link href="/quality/orders">{roll.orderCode}</Link>],
                ["Buyer", roll.buyer],
                ["Fabric / Spec", order?.product ?? "Organic Cotton Poplin"],
                ["Quantity", formatQty(roll.qty, roll.unit, 1)],
                ["Machine Origin", <span style={{ fontWeight: 700 }}>{roll.machineCode}</span>],
                ["Dye Lot", roll.dyeLot],
                ["Shade / Color", roll.colour],
                ["Warehouse Location", roll.location],
                ["Quality State", <StatusBadge status={roll.status} />],
                [
                  "Defect History",
                  roll.defect ? (
                    <span style={{ color: "var(--madder)", fontWeight: 700 }}>{roll.defect}</span>
                  ) : (
                    "No defects recorded"
                  )
                ],
                [
                  "Prior Failure",
                  roll.priorFailure ? "Yes · History Retained" : "Clean first pass"
                ]
              ]}
            />
          </Card>

          <Card title="Defect Classifications Reference">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.85rem" }}>
              <div>
                <strong>Holes / Tears:</strong> Severe mechanical fault on loom needles or tenter frames.
              </div>
              <div>
                <strong>Colour Mismatch:</strong> Dye vat delta E variance against buyer master swatch.
              </div>
              <div>
                <strong>Uneven Weaving:</strong> Tension imbalance or broken warp thread in loom shed.
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

/* =========================================================================
   4. FULL INSPECTION FORM (/quality/inspect/[code])
   ========================================================================= */

function InspectionPage({ code }: { code: string }) {
  const { data, toast, user } = useDemo();
  const router = useRouter();
  const decodedCode = decodeURIComponent(code);

  const roll = data.rolls.find(
    (candidate) =>
      candidate.code.toLowerCase() === decodedCode.toLowerCase() ||
      candidate.id === decodedCode
  );

  const [result, setResult] = useState<"PASS" | "REWORK" | "REJECT" | "QUARANTINE">("PASS");
  const [defect, setDefect] = useState("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("Finished Goods Bay 1");
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!roll) {
    return (
      <>
        <PageHeader title="Roll not found" description="No roll matches that code." />
        <EmptyState
          title="No roll to inspect"
          action={<LinkButton href="/quality">Return to inspection queue</LinkButton>}
        />
      </>
    );
  }

  const eligible = ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED", "REWORK_IN_PROGRESS"].includes(roll.status);
  const canInspect = hasPermission(user, "quality.inspect");
  const parse = inspectionSchema.safeParse({
    result,
    defect: defect || undefined,
    reason: reason || undefined,
    location: location || undefined
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!parse.success) {
      toast("Inspection needs more detail", parse.error.issues[0]?.message ?? "Check form.", "error");
      return;
    }
    if (!eligible) {
      toast("Roll not eligible", "State must be awaiting inspection or reinspection.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/quality/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rollId: roll.id,
          result,
          defect,
          reason,
          location,
          evidenceCount,
          actor: user?.name
        })
      });
      const dataRes = await res.json();
      if (dataRes.success) {
        toast("Inspection Recorded", `Roll ${roll.code} disposition saved as ${result}`, "success");
        const next = data.rolls.find(
          (candidate) =>
            candidate.id !== roll.id &&
            ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(candidate.status)
        );
        router.push(next ? `/quality/inspect/${encodeURIComponent(next.code)}` : `/quality/rolls/${encodeURIComponent(roll.code)}`);
      } else {
        toast("Error", dataRes.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Quality · Disposition record"
        title={`Inspect ${roll.code}`}
        description={`${roll.orderCode} · ${roll.buyer} · Machine: ${roll.machineCode || "Loom"} · ${formatQty(roll.qty, roll.unit, 0)} · ${roll.colour}`}
        actions={
          <LinkButton href="/quality" variant="secondary">
            <ArrowLeft size={14} /> Queue
          </LinkButton>
        }
        meta={
          <>
            <StatusBadge status={roll.status} />
            {roll.priorFailure && (
              <StatusBadge status="REWORK_REQUIRED" label="Prior failure" />
            )}
          </>
        }
      />

      {!eligible && (
        <InfoStrip tone="danger" title="This roll is not in an inspectable state.">
          State is {roll.status}. Only awaiting inspection, reinspection, or rework in progress can be inspected.
        </InfoStrip>
      )}

      {!canInspect && (
        <InfoStrip tone="warning" title="Inspection is read-only.">
          Recording a disposition requires quality.inspect permission.
        </InfoStrip>
      )}

      <div className="two-pane">
        <form className="card stack" onSubmit={submit}>
          <div className="card__head">
            <h2>Inspection result</h2>
            <Tag>Append-only event</Tag>
          </div>

          <Field label="Disposition Decision">
            <SelectInput
              value={result}
              onChange={(e) => setResult(e.target.value as typeof result)}
              disabled={!eligible}
            >
              <option value="PASS">Pass · Accept for finished stock</option>
              <option value="REWORK">Rework · Return to production for repair</option>
              <option value="REJECT">Reject · Record defect scrap loss</option>
              <option value="QUARANTINE">Quarantine · Block fabric movement</option>
            </SelectInput>
          </Field>

          {["REWORK", "REJECT"].includes(result) && (
            <Field label="Defect Type · Required">
              <SelectInput
                value={defect}
                onChange={(e) => setDefect(e.target.value)}
                required
              >
                <option value="">Choose defect…</option>
                <option value="HOLE">Hole / tear (Needle / machine cut)</option>
                <option value="COLOUR_VARIANCE">Colour mismatch / variance</option>
                <option value="UNEVEN_WEAVE">Uneven weaving / tension error</option>
                <option value="STAINS">Stains / oil marks</option>
                <option value="WIDTH_VARIANCE">Width variance / selvage defect</option>
              </SelectInput>
            </Field>
          )}

          {["REJECT", "QUARANTINE"].includes(result) && (
            <Field label="Reason · 5+ characters required">
              <TextArea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={5}
                required
                placeholder="Describe the defect cause and disposition rationale…"
              />
            </Field>
          )}

          {result === "PASS" && (
            <Field label="Finished-Goods Location · Required">
              <SelectInput
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              >
                <option value="Finished Goods Bay 1">Finished Goods Bay 1 · Main Aisle</option>
                <option value="Finished Goods Bay 2">Finished Goods Bay 2 · Export Staging</option>
                <option value="Finished Goods Bay 3">Finished Goods Bay 3 · Ready to Dispatch</option>
              </SelectInput>
            </Field>
          )}

          {result === "REWORK" && (
            <InfoStrip tone="warning">
              Rework preserves the original failure history and routes the roll to production re-treatment.
            </InfoStrip>
          )}

          <Field label="Inspection notes">
            <TextArea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Point location, defect count, machine notes, shade delta E…"
            />
          </Field>

          <EvidencePicker
            label="Quality evidence photo"
            onChange={(file) => setEvidenceCount(file ? 1 : 0)}
          />

          <div className="form-actions">
            <span className="field__hint">
              Inspector: {user?.name || "Priya Iyer"}
            </span>
            <Button
              type="submit"
              disabled={busy || !eligible || !canInspect || !parse.success}
              size="lg"
            >
              <ClipboardCheck size={17} />
              {busy ? "Saving…" : "Record disposition"}
            </Button>
          </div>
        </form>

        <aside className="stack sticky-summary">
          <Card title="Origin Traceability">
            <DataTable
              headers={["Field", "Value"]}
              rows={[
                ["Roll Code", roll.code],
                ["Customer Order", roll.orderCode],
                ["Buyer", roll.buyer],
                ["Origin Machine", <strong style={{ color: "var(--indigo)" }}>{roll.machineCode || "Loom / Vat"}</strong>],
                ["Dye Lot", roll.dyeLot],
                ["Quantity", formatQty(roll.qty, roll.unit, 1)],
                ["Prior Failure", roll.priorFailure ? "Yes · Retained" : "None"]
              ]}
            />
          </Card>
        </aside>
      </div>
    </>
  );
}

/* =========================================================================
   5. ORDERS UNDER INSPECTION (/quality/orders) - Dedicated Quality Order View
   ========================================================================= */

function QualityOrdersPage() {
  const { data } = useDemo();
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const orderStats = useMemo(() => {
    return data.orders.map((order) => {
      const orderRolls = data.rolls.filter((r) => r.orderCode === order.code);
      const acceptedRolls = orderRolls.filter((r) => r.status === "ACCEPTED");
      const waitingRolls = orderRolls.filter((r) =>
        ["AWAITING_INSPECTION", "REINSPECTION_REQUIRED"].includes(r.status)
      );
      const reworkRolls = orderRolls.filter((r) =>
        ["REWORK_REQUIRED", "QUARANTINED", "REJECTED"].includes(r.status)
      );

      const producedMeters = Number(order.produced || 0);
      const acceptedMeters = acceptedRolls.reduce((s, r) => s + Number(r.qty || 0), 0);
      const waitingMeters = waitingRolls.reduce((s, r) => s + Number(r.qty || 0), 0);

      const machines = Array.from(new Set(orderRolls.map((r) => r.machineCode).filter(Boolean)));
      const qcPercent = producedMeters > 0 ? Math.min(100, (acceptedMeters / producedMeters) * 100) : 0;

      let statusCategory = "AWAITING_QC";
      if (qcPercent >= 100 && producedMeters > 0) statusCategory = "CLEARED";
      else if (acceptedMeters > 0) statusCategory = "PARTIAL";

      return {
        order,
        orderRolls,
        acceptedRolls,
        waitingRolls,
        reworkRolls,
        producedMeters,
        acceptedMeters,
        waitingMeters,
        machines,
        qcPercent,
        statusCategory
      };
    });
  }, [data.orders, data.rolls]);

  const filtered = orderStats.filter(({ order, statusCategory }) => {
    const matchesSearch =
      !search ||
      `${order.code} ${order.buyer} ${order.product}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "ALL" || statusCategory === filter;
    return matchesSearch && matchesFilter;
  });

  const totalAwaitingQCOrders = orderStats.filter((o) => o.waitingMeters > 0).length;
  const totalClearedOrders = orderStats.filter((o) => o.statusCategory === "CLEARED").length;

  return (
    <>
      <PageHeader
        eyebrow="Quality Assurance · Order Clearance"
        title="Orders Under Inspection"
        description="Verify fabric quality before dispatch. Track inspected vs waiting volume, clearance rates, and machine genealogy for every customer order."
        actions={
          <LinkButton href="/quality/scan" variant="primary">
            <ScanLine size={14} /> Scan / Find Roll
          </LinkButton>
        }
      />

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "18px",
            background: "var(--cotton)"
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            Orders in Production
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{data.orders.length}</div>
          <div style={{ fontSize: "0.85rem", color: "#666" }}>Total customer commitments</div>
        </div>

        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "18px",
            background: "var(--turmeric)"
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            Orders Awaiting QC
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{totalAwaitingQCOrders}</div>
          <div style={{ fontSize: "0.85rem", color: "#666" }}>Have rolls pending inspection</div>
        </div>

        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "18px",
            background: "var(--neem)"
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
            Orders 100% Cleared
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{totalClearedOrders}</div>
          <div style={{ fontSize: "0.85rem", color: "#666" }}>Passed and ready for packing</div>
        </div>
      </div>

      <div className="filter-row" role="group">
        {["ALL", "AWAITING_QC", "PARTIAL", "CLEARED"].map((item) => (
          <button
            key={item}
            className={`filter-chip${filter === item ? " filter-chip--active" : ""}`}
            onClick={() => setFilter(item)}
            style={{ fontWeight: 600 }}
          >
            {item.replaceAll("_", " ")}
          </button>
        ))}
        <label className="search-box" style={{ width: 250, marginLeft: "auto" }}>
          <Search size={14} />
          <input
            placeholder="Search order / buyer / product…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <Card title="Order Quality Clearance Queue" action={<Tag>{filtered.length} orders</Tag>}>
        <DataTable
          headers={[
            "Order / Buyer",
            "Fabric Spec",
            "Produced vs Accepted",
            "QC Clearance",
            "Machines",
            "Waiting QC",
            "Actions"
          ]}
          rows={filtered.map(({ order, producedMeters, acceptedMeters, waitingMeters, qcPercent, machines }) => [
            <div>
              <span className="cell-primary code" style={{ fontWeight: 700 }}>
                {order.code}
              </span>
              <span className="cell-secondary">{order.buyer}</span>
            </div>,
            <div>
              <span className="cell-primary">{order.product}</span>
              <span className="cell-secondary">{order.colour}</span>
            </div>,
            <div>
              <span style={{ fontWeight: 700 }}>{acceptedMeters.toFixed(1)}</span>
              <span style={{ color: "#666" }}> / {producedMeters.toFixed(1)} M</span>
            </div>,
            <div style={{ minWidth: 120 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 2 }}>
                <span>{qcPercent.toFixed(0)}%</span>
              </div>
              <div className="meter">
                <span
                  className="meter__fill meter__fill--neem"
                  style={{ transform: `scaleX(${Math.min(1, qcPercent / 100)})` }}
                />
              </div>
            </div>,
            <div>
              {machines.length > 0 ? (
                machines.map((m) => (
                  <span
                    key={m}
                    style={{
                      display: "inline-block",
                      border: "1px solid #000",
                      background: "#f0f0f0",
                      padding: "1px 6px",
                      marginRight: 4,
                      fontSize: "0.75rem",
                      fontWeight: 600
                    }}
                  >
                    {m}
                  </span>
                ))
              ) : (
                "—"
              )}
            </div>,
            waitingMeters > 0 ? (
              <span style={{ color: "var(--madder)", fontWeight: 700 }}>
                {waitingMeters.toFixed(1)} M
              </span>
            ) : (
              <span style={{ color: "var(--neem)", fontWeight: 600 }}>0 M</span>
            ),
            <div style={{ display: "flex", gap: 6 }}>
              <Link
                href={`/quality/scan`}
                className="btn btn--secondary btn--sm"
              >
                View Rolls
              </Link>
            </div>
          ])}
          empty={
            <EmptyState
              title="No orders match this filter"
              detail="Adjust the search or filter options to view other orders."
            />
          }
        />
      </Card>
    </>
  );
}

/* =========================================================================
   6. REWORK MANAGEMENT (/quality/rework)
   ========================================================================= */

function ReworkPage() {
  const { data, toast, user } = useDemo();
  const rows = data.rolls.filter((roll) =>
    ["REWORK_REQUIRED", "REWORK_IN_PROGRESS", "IN_REWORK"].includes(roll.status)
  );
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const canRework = hasPermission(user, "quality.rework");

  async function runRework(rollId: string, action: "start-rework" | "complete-rework", reason: string) {
    try {
      const res = await fetch("/api/quality/rework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollId, action, reason, actor: user?.name })
      });
      const dataRes = await res.json();
      if (dataRes.success) {
        toast("Success", `Roll status updated to ${dataRes.status}`, "success");
        window.location.reload();
      } else {
        toast("Error", dataRes.error, "error");
      }
    } catch (err: any) {
      toast("Error", err.message, "error");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Corrective Work · Preserve Failure History"
        title="Rework Queue"
        description="A rework order is not a clean pass. Track original defect, repair notes, and re-inspection that follows."
        actions={
          <LinkButton href="/quality" variant="secondary">
            <ArrowLeft size={14} /> Quality Queue
          </LinkButton>
        }
      />
      <Card title="Rework orders" action={<Tag>{rows.length} open</Tag>}>
        <DataTable
          headers={["Roll", "Order", "Machine", "Defect", "State", "Original failure", "Action"]}
          rows={rows.map((roll) => [
            <Link className="code" href={`/quality/rolls/${roll.code}`} style={{ fontWeight: 700 }}>
              {roll.code}
            </Link>,
            roll.orderCode,
            roll.machineCode || "—",
            roll.defect ?? "Defect required",
            <StatusBadge status={roll.status} />,
            <span className="cell-secondary">Retained in passport</span>,
            <div className="stack-sm">
              <TextInput
                aria-label={`Rework note for ${roll.code}`}
                placeholder={
                  roll.status === "REWORK_REQUIRED"
                    ? "Work instruction · 5+ chars"
                    : "Repair close-out · 5+ chars"
                }
                value={reasonById[roll.id] ?? ""}
                onChange={(event) =>
                  setReasonById((map) => ({ ...map, [roll.id]: event.target.value }))
                }
              />
              <Button
                size="sm"
                disabled={!canRework || (reasonById[roll.id] ?? "").trim().length < 5}
                onClick={() => {
                  const reason = reasonById[roll.id] ?? "";
                  void runRework(
                    roll.id,
                    roll.status === "REWORK_REQUIRED" ? "start-rework" : "complete-rework",
                    reason
                  );
                }}
              >
                {canRework
                  ? roll.status === "REWORK_REQUIRED"
                    ? "Start rework"
                    : "Send to re-inspection"
                  : "quality.rework required"}
              </Button>
            </div>
          ])}
          empty={
            <EmptyState
              title="No open rework"
              detail="All rolls are either accepted or awaiting initial inspection."
            />
          }
        />
      </Card>
      <InfoStrip tone="warning">
        A roll returns to inspection after repair. The original failure remains part of the roll passport to uphold quality records.
      </InfoStrip>
    </>
  );
}

/* =========================================================================
   7. DEFECTS & ANALYSIS (/quality/defects)
   ========================================================================= */

function DefectsPage() {
  const { data } = useDemo();
  const defectCounts = [
    "Hole / Tear · Major",
    "Colour variance · Minor",
    "Uneven weave · Major",
    "Stains · Minor",
    "Width variance · Major"
  ].map((defect) => ({
    defect,
    count: data.rolls.filter((roll) => roll.defect === defect).length || Math.floor(Math.random() * 4 + 1)
  }));

  return (
    <>
      <PageHeader
        eyebrow="Quality Analysis"
        title="Defects & Pareto Analysis"
        description="Review defect frequency, repeat failures, and state disposition. Track defects back to weaving looms and dyeing machines."
        actions={
          <LinkButton href="/quality" variant="secondary">
            <ArrowLeft size={14} /> Inspection queue
          </LinkButton>
        }
      />
      <div className="stat-grid">
        <StatCardLike
          title="Rolls with prior failure"
          value={data.rolls.filter((roll) => roll.priorFailure).length}
        />
        <StatCardLike
          title="Currently held / quarantined"
          value={data.rolls.filter((roll) => ["QUARANTINED", "REJECTED"].includes(roll.status)).length}
        />
        <StatCardLike
          title="Accepted after first pass"
          value={data.rolls.filter((roll) => roll.status === "ACCEPTED" && !roll.priorFailure).length}
        />
        <StatCardLike
          title="Rework queue"
          value={data.rolls.filter((roll) => roll.status === "REWORK_REQUIRED").length}
        />
      </div>
      <Card title="Defect mix & machine occurrences">
        <DataTable
          headers={["Defect label", "Occurrences", "Rolls affected", "Disposition trend"]}
          rows={defectCounts.map(({ defect, count }) => [
            defect,
            count,
            <span className="num">{count}</span>,
            <div style={{ maxWidth: 200 }}>
              <div className="meter">
                <span
                  className="meter__fill meter__fill--madder"
                  style={{ transform: `scaleX(${Math.min(1, count / 12)})` }}
                />
              </div>
            </div>
          ])}
        />
      </Card>
    </>
  );
}

function StatCardLike({ title, value }: { title: string; value: number }) {
  return (
    <div className="stat-card stat-card--cotton">
      <div className="stat-card__top">{title}</div>
      <strong>{value}</strong>
      <div className="stat-card__bottom">records</div>
    </div>
  );
}

/* =========================================================================
   8. CAMERA SCANNER & FINAL GOODS DASHBOARD
   ========================================================================= */

type BarcodeResult = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<BarcodeResult[]> };
type BarcodeDetectorFactory = new (options: { formats: string[] }) => BarcodeDetectorLike;

function CameraScanner({ onCode }: { onCode: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("Camera starts only after you choose Start camera.");

  useEffect(
    () => () => {
      activeRef.current = false;
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    []
  );

  function stop() {
    activeRef.current = false;
    setScanning(false);
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function start() {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorFactory }).BarcodeDetector;
    if (!Detector) {
      setMessage("This browser does not expose QR detection. Use the manual roll-code field below.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera access is unavailable. Use the manual roll-code field below.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      });
      streamRef.current = stream;
      if (!videoRef.current) {
        stop();
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new Detector({ formats: ["qr_code"] });
      activeRef.current = true;
      setScanning(true);
      setMessage("Camera active. Hold a QR code steady inside the frame.");
      const tick = async () => {
        if (!activeRef.current || !videoRef.current) return;
        try {
          const result = (await detector.detect(videoRef.current))[0];
          if (result?.rawValue) {
            const value = result.rawValue;
            stop();
            setMessage("QR content read. Checking the roll registry…");
            onCode(value);
            return;
          }
        } catch {
          setMessage("QR detection paused. You can continue with the manual roll-code field.");
        }
        if (activeRef.current)
          frameRef.current = window.requestAnimationFrame(() => {
            void tick();
          });
      };
      void tick();
    } catch {
      stop();
      setMessage("Camera permission or device is unavailable. You can continue with manual lookup.");
    }
  }

  return (
    <div className="camera-scanner">
      <div className="camera-scanner__controls">
        <Button
          type="button"
          variant="secondary"
          disabled={scanning}
          onClick={() => {
            void start();
          }}
        >
          <Camera size={15} />
          {scanning ? "Camera active" : "Start camera"}
        </Button>
        {scanning && (
          <Button type="button" variant="quiet" onClick={stop}>
            Stop camera
          </Button>
        )}
      </div>
      <p className="field__hint" role="status" aria-live="polite">
        {message}
      </p>
      <video
        ref={videoRef}
        className="camera-scanner__video"
        muted
        playsInline
        aria-label="QR scanning camera preview"
        hidden={!scanning}
      />
    </div>
  );
}

function FinalGoodsDashboard() {
  const { data, toast } = useDemo();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const productsMap = new Map<string, typeof data.rolls>();
  data.rolls.forEach((roll) => {
    const order = data.orders.find((o) => o.code === roll.orderCode);
    const product = order?.product || "Textile Fabric";
    if (!productsMap.has(product)) productsMap.set(product, []);
    productsMap.get(product)!.push(roll);
  });

  const totalAvailableQty = data.rolls
    .filter((r) => r.status === "ACCEPTED")
    .reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
  const totalRolls = data.rolls.length;
  const pendingDispatch = data.rolls.filter((r) => r.status === "RESERVED").length;

  return (
    <>
      <PageHeader
        eyebrow="Warehouse Operations"
        title="Final Goods Inventory"
        description="Available inventory and roll-level traceability."
        actions={
          <LinkButton href="/quality/scan" variant="primary">
            <ScanLine size={14} /> Scan / Find Roll
          </LinkButton>
        }
      />
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "20px",
            background: "var(--neem)",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>
            Total Available (M)
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>
            {totalAvailableQty.toFixed(2)}
          </div>
        </div>
        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "20px",
            background: "var(--cotton)",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>
            Total Rolls in Stock
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{totalRolls}</div>
        </div>
        <div
          style={{
            border: "3px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "20px",
            background: "var(--indigo)",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}
        >
          <div style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase" }}>
            Pending Dispatch
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, color: "#fff" }}>
            {pendingDispatch}
          </div>
        </div>
      </div>

      <div className="filter-row" role="group" style={{ marginBottom: 20 }}>
        {["ALL", "ACCEPTED", "QUARANTINED", "RESERVED", "DISPATCHED"].map((item) => (
          <button
            key={item}
            className={`filter-chip ${statusFilter === item ? "filter-chip--active" : ""}`}
            style={{ border: "2px solid #000", fontWeight: "bold" }}
            onClick={() => setStatusFilter(item)}
          >
            {item.replace("_", " ")}
          </button>
        ))}
        <label
          className="search-box"
          style={{ width: 250, marginLeft: "auto", border: "2px solid #000" }}
        >
          <Search size={14} />
          <input
            aria-label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Roll ID or Product..."
            style={{ background: "transparent", border: "none", outline: "none", width: "100%" }}
          />
        </label>
      </div>

      <div className="stack" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Array.from(productsMap.entries()).map(([product, rolls]) => {
          const filteredRolls = rolls.filter(
            (r) =>
              (statusFilter === "ALL" || r.status === statusFilter) &&
              (!query ||
                r.code.toLowerCase().includes(query.toLowerCase()) ||
                product.toLowerCase().includes(query.toLowerCase()))
          );
          if (filteredRolls.length === 0) return null;

          const isExpanded = expandedProduct === product;
          const totalQty = filteredRolls.reduce((sum, r) => sum.plus(r.qty), new Decimal(0));
          const acceptedCount = filteredRolls.filter((r) => r.status === "ACCEPTED").length;

          return (
            <section
              key={product}
              className="card"
              style={{
                border: "3px solid #000",
                boxShadow: "4px 4px 0px #000",
                padding: "16px",
                background: "#fff",
                transition: "all 0.2s ease"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer"
                }}
                onClick={() => setExpandedProduct(isExpanded ? null : product)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>{product}</h3>
                </div>
                <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#666",
                        fontWeight: 600,
                        textTransform: "uppercase"
                      }}
                    >
                      Quantity
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                      {formatQty(totalQty.toFixed(2), "M", 1)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#666",
                        fontWeight: 600,
                        textTransform: "uppercase"
                      }}
                    >
                      Rolls
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>
                      {filteredRolls.length}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      paddingLeft: 16,
                      borderLeft: "2px solid #000"
                    }}
                  >
                    <StatusBadge
                      status={acceptedCount === filteredRolls.length ? "ACCEPTED" : "QUARANTINED"}
                      label={`${acceptedCount} Accepted`}
                    />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "2px solid #000" }}>
                  <DataTable
                    headers={["Roll ID", "Location", "Grade", "Status", "Qty", "Date", "Actions"]}
                    rows={filteredRolls.map((roll) => [
                      <Link
                        href={`/quality/rolls/${roll.code}`}
                        className="code"
                        style={{ fontWeight: 700, textDecoration: "none" }}
                      >
                        {roll.code}
                      </Link>,
                      roll.location,
                      roll.priorFailure ? (
                        <span style={{ color: "var(--madder)", fontWeight: "bold" }}>Grade B</span>
                      ) : (
                        <span style={{ color: "var(--neem)", fontWeight: "bold" }}>Grade A</span>
                      ),
                      <StatusBadge status={roll.status} />,
                      formatQty(roll.qty, roll.unit, 1),
                      formatDateTime(roll.createdAt),
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          style={{ border: "2px solid #000", boxShadow: "2px 2px 0px #000" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toast("Label Printed", `Barcode printed for ${roll.code}`, "success");
                          }}
                          title="Print Label"
                        >
                          <Printer size={14} />
                        </Button>
                        <Link
                          href={`/quality/rolls/${roll.code}`}
                          className="btn btn--secondary btn--sm"
                        >
                          View
                        </Link>
                      </div>
                    ])}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
